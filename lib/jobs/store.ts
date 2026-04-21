import "server-only";
import fs from "node:fs";
import path from "node:path";
import { jobFile } from "@/lib/paths";
import type { HumanizeJobRecord } from "./types";

export function readJob(id: string): HumanizeJobRecord | null {
  const p = jobFile(id);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as HumanizeJobRecord;
  } catch {
    return null;
  }
}

export function writeJob(record: HumanizeJobRecord): void {
  const p = jobFile(record.id);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(record, null, 2), "utf8");
}

export function patchJob(
  id: string,
  patch: Partial<HumanizeJobRecord>,
): HumanizeJobRecord | null {
  const cur = readJob(id);
  if (!cur) return null;
  const next: HumanizeJobRecord = {
    ...cur,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  writeJob(next);
  return next;
}
