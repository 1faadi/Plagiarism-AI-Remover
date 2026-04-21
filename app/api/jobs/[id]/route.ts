import { NextResponse } from "next/server";
import { readJob } from "@/lib/jobs/store";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  const job = readJob(id);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  return NextResponse.json({
    id: job.id,
    status: job.status,
    progress: job.progress,
    error: job.error,
    filename: job.filename,
    hasResult: Boolean(job.humanizedText && job.status === "completed"),
  });
}
