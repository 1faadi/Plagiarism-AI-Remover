import "server-only";
import fs from "node:fs";
import path from "node:path";
import { extractDocumentText, segmentText } from "@/lib/extract";
import { humanizeSegments } from "@/lib/humanize";
import { humanizeChunkMaxChars } from "@/lib/openrouter";
import { ensureDataDirs, sessionFile } from "@/lib/paths";
import type { SessionRecord } from "@/lib/session-types";
import { patchJob, writeJob } from "./store";
import type { HumanizeJobRecord } from "./types";

function loadSession(sessionId: string): SessionRecord | null {
  const f = sessionFile(sessionId);
  if (!fs.existsSync(f)) return null;
  try {
    return JSON.parse(fs.readFileSync(f, "utf8")) as SessionRecord;
  } catch {
    return null;
  }
}

export async function runHumanizeJob(job: HumanizeJobRecord): Promise<void> {
  ensureDataDirs();
  writeJob({
    ...job,
    status: "running",
    progress: { current: 0, total: 1 },
    updatedAt: new Date().toISOString(),
  });

  try {
    const session = loadSession(job.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }
    const doc = session.documents.find((d) => d.id === job.documentId);
    if (!doc) {
      throw new Error("Document not found in session");
    }

    const abs = path.join(process.cwd(), doc.storagePath);
    if (!fs.existsSync(abs)) {
      throw new Error("Uploaded file missing on disk");
    }

    const buf = fs.readFileSync(abs);
    const text = await extractDocumentText(buf, doc.mime);
    // Overlap would duplicate boundary text across chunks after rewrite; keep 0 for humanize.
    const segments = segmentText(text, humanizeChunkMaxChars(), 0);

    if (segments.length === 0) {
      patchJob(job.id, {
        status: "completed",
        humanizedText: "",
        progress: { current: 0, total: 0 },
      });
      return;
    }

    const humanized = await humanizeSegments(segments, (p) => {
      patchJob(job.id, {
        progress: p,
      });
    });

    patchJob(job.id, {
      status: "completed",
      humanizedText: humanized,
      progress: { current: segments.length, total: segments.length },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    patchJob(job.id, {
      status: "failed",
      error: message,
    });
  }
}
