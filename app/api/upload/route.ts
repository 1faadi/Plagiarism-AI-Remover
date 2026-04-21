import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { nanoid } from "nanoid";
import { ensureDataDirs, uploadsDir, sessionFile } from "@/lib/paths";
import type { SessionRecord, StoredDocument } from "@/lib/session-types";
import { isDocxMime, isPdfMime } from "@/lib/extract";

const ALLOWED = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function guessMime(filename: string, declared: string): string {
  const d = (declared || "").toLowerCase();
  if (d && d !== "application/octet-stream") return d;
  const name = filename.toLowerCase();
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  return d || "application/octet-stream";
}

function extForMime(mime: string): string {
  if (mime === "application/pdf") return "pdf";
  return "docx";
}

export async function POST(req: NextRequest) {
  try {
    ensureDataDirs();
    const form = await req.formData();
    const files = form.getAll("files") as File[];
    if (!files.length) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    const sessionId = nanoid();
    const dir = uploadsDir(sessionId);
    fs.mkdirSync(dir, { recursive: true });

    const documents: StoredDocument[] = [];

    for (const file of files) {
      const mime = guessMime(file.name, file.type || "").toLowerCase();
      if (!ALLOWED.has(mime) && !(isPdfMime(mime) || isDocxMime(mime))) {
        return NextResponse.json(
          { error: `Unsupported type: ${file.name} (${mime})` },
          { status: 400 },
        );
      }
      const buf = Buffer.from(await file.arrayBuffer());
      const docId = nanoid();
      const resolvedMime = ALLOWED.has(mime)
        ? mime
        : isPdfMime(mime)
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      const ext = extForMime(resolvedMime);
      const filename = `${docId}.${ext}`;
      const abs = path.join(dir, filename);
      fs.writeFileSync(abs, buf);
      const storagePath = path.relative(process.cwd(), abs);
      documents.push({
        id: docId,
        filename: file.name,
        mime: resolvedMime,
        storagePath,
      });
    }

    const session: SessionRecord = {
      id: sessionId,
      createdAt: new Date().toISOString(),
      documents,
    };
    fs.writeFileSync(sessionFile(sessionId), JSON.stringify(session, null, 2));

    return NextResponse.json({
      sessionId,
      documents: documents.map((d) => ({
        id: d.id,
        filename: d.filename,
        mime: d.mime,
      })),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
