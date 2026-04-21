import fs from "node:fs";
import path from "node:path";

const DATA_ROOT = path.join(
  /* turbopackIgnore: true */ process.cwd(),
  ".data",
);

export function ensureDataDirs(): void {
  fs.mkdirSync(path.join(DATA_ROOT, "uploads"), { recursive: true });
  fs.mkdirSync(path.join(DATA_ROOT, "sessions"), { recursive: true });
  fs.mkdirSync(path.join(DATA_ROOT, "jobs"), { recursive: true });
}

export function dataRoot(): string {
  return DATA_ROOT;
}

export function uploadsDir(sessionId: string): string {
  return path.join(DATA_ROOT, "uploads", sessionId);
}

export function sessionFile(sessionId: string): string {
  return path.join(DATA_ROOT, "sessions", `${sessionId}.json`);
}

export function jobFile(jobId: string): string {
  return path.join(DATA_ROOT, "jobs", `${jobId}.json`);
}
