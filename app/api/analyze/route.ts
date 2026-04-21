import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { extractDocumentText, segmentText } from "@/lib/extract";
import {
  compareAllPairs,
  embedTexts,
  type DocChunks,
} from "@/lib/plagiarism";
import { computeAiHeuristicScore, sampleLlmRubric } from "@/lib/ai-score";
import { sessionFile } from "@/lib/paths";
import type { SessionRecord } from "@/lib/session-types";

const BodySchema = z.object({
  sessionId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const { sessionId } = parsed.data;
    const sf = sessionFile(sessionId);
    if (!fs.existsSync(sf)) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    const session = JSON.parse(fs.readFileSync(sf, "utf8")) as SessionRecord;

    const texts: { doc: (typeof session.documents)[0]; text: string }[] = [];
    for (const doc of session.documents) {
      const abs = path.join(process.cwd(), doc.storagePath);
      if (!fs.existsSync(abs)) {
        return NextResponse.json(
          { error: `Missing file: ${doc.filename}` },
          { status: 500 },
        );
      }
      const buf = fs.readFileSync(abs);
      const text = await extractDocumentText(buf, doc.mime);
      texts.push({ doc, text });
    }

    const chunks: DocChunks[] = [];
    const allSegmentTexts: string[] = [];

    for (let di = 0; di < texts.length; di++) {
      const { doc, text } = texts[di];
      const segments = segmentText(text, 1500, 200);
      for (const seg of segments) {
        allSegmentTexts.push(seg.text);
      }
      chunks.push({
        documentId: doc.id,
        filename: doc.filename,
        segments,
        embeddings: [],
      });
    }

    const flatEmbeddings = await embedTexts(allSegmentTexts);
    let offset = 0;
    for (const c of chunks) {
      const n = c.segments.length;
      c.embeddings = flatEmbeddings.slice(offset, offset + n);
      offset += n;
    }

    const plagiarism = compareAllPairs(chunks);

    const aiScores = await Promise.all(
      texts.map(async ({ doc, text }) => {
        const heuristic = computeAiHeuristicScore(text);
        let rubricSamples: Awaited<ReturnType<typeof sampleLlmRubric>> = [];
        try {
          rubricSamples = await sampleLlmRubric(text, 2, 1200);
        } catch {
          rubricSamples = [];
        }
        const rubricAvg =
          rubricSamples.length === 0
            ? null
            : Math.round(
                rubricSamples.reduce((a, s) => a + s.llmScore, 0) /
                  rubricSamples.length,
              );
        return {
          documentId: doc.id,
          filename: doc.filename,
          heuristic,
          rubricSamples,
          rubricAvg,
          combinedIndicativeScore: Math.round(
            rubricAvg != null ? (heuristic.score + rubricAvg) / 2 : heuristic.score,
          ),
        };
      }),
    );

    return NextResponse.json({
      sessionId,
      plagiarism,
      aiScores,
      disclaimer:
        "Similarity and AI-style scores are indicative only and are not legal or academic proof.",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Analyze failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
