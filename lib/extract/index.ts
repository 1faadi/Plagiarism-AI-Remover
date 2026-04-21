import "server-only";
import { extractDocxText } from "./docx";
import { extractPdfText } from "./pdf";
import { normalizeText } from "./normalize";
import { segmentText, type TextSegment } from "./segment";

export type { TextSegment };
export { normalizeText, segmentText };

const PDF_MIMES = new Set([
  "application/pdf",
  "application/x-pdf",
]);
const DOCX_MIMES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export function isPdfMime(mime: string): boolean {
  return PDF_MIMES.has(mime.toLowerCase());
}

export function isDocxMime(mime: string): boolean {
  return DOCX_MIMES.has(mime.toLowerCase());
}

export async function extractDocumentText(
  buffer: Buffer,
  mime: string,
): Promise<string> {
  let raw = "";
  if (isPdfMime(mime)) {
    raw = await extractPdfText(buffer);
  } else if (isDocxMime(mime)) {
    raw = await extractDocxText(buffer);
  } else if (mime === "application/octet-stream") {
    try {
      raw = await extractPdfText(buffer);
    } catch {
      raw = await extractDocxText(buffer);
    }
  } else {
    throw new Error(`Unsupported file type: ${mime}`);
  }
  return normalizeText(raw);
}
