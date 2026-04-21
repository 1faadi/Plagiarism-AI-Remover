import { NextRequest, NextResponse } from "next/server";
import { buildDocxBuffer, buildPdfBuffer } from "@/lib/export";
import { readJob } from "@/lib/jobs/store";

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId");
  const format = req.nextUrl.searchParams.get("format") ?? "docx";
  if (!jobId) {
    return NextResponse.json({ error: "jobId required" }, { status: 400 });
  }
  const job = readJob(jobId);
  if (!job || job.status !== "completed" || !job.humanizedText) {
    return NextResponse.json(
      { error: "Result not ready or job failed" },
      { status: 400 },
    );
  }

  const baseName = job.filename.replace(/\.[^/.]+$/, "") || "humanized";
  const body = job.humanizedText.trim();

  try {
    if (format === "pdf") {
      const buf = await buildPdfBuffer(body);
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${baseName}-humanized.pdf"`,
        },
      });
    }

    const buf = await buildDocxBuffer(body);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${baseName}-humanized.docx"`,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Export failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
