import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { nanoid } from "nanoid";
import { z } from "zod";
import { runHumanizeJob } from "@/lib/jobs/runHumanizeJob";
import { writeJob } from "@/lib/jobs/store";
import type { HumanizeJobRecord } from "@/lib/jobs/types";
import { ensureDataDirs, sessionFile } from "@/lib/paths";
import type { SessionRecord } from "@/lib/session-types";

const BodySchema = z.object({
  sessionId: z.string().min(1),
  documentId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    ensureDataDirs();
    const json = await req.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const { sessionId, documentId } = parsed.data;
    const sf = sessionFile(sessionId);
    if (!fs.existsSync(sf)) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    const session = JSON.parse(fs.readFileSync(sf, "utf8")) as SessionRecord;
    const doc = session.documents.find((d) => d.id === documentId);
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const now = new Date().toISOString();
    const job: HumanizeJobRecord = {
      id: nanoid(),
      status: "queued",
      progress: { current: 0, total: 0 },
      sessionId,
      documentId,
      filename: doc.filename,
      createdAt: now,
      updatedAt: now,
    };
    writeJob(job);

    void runHumanizeJob(job).catch(() => {
      /* logged inside worker */
    });

    return NextResponse.json({ jobId: job.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Humanize failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
