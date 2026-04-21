"use client";

import { useCallback, useEffect, useState } from "react";

type UploadDoc = { id: string; filename: string; mime: string };

type PassageMatch = {
  docAFilename: string;
  docBFilename: string;
  semanticScore: number;
  previewA: string;
  previewB: string;
};

type PairwisePlagiarism = {
  docAFilename: string;
  docBFilename: string;
  maxSemanticSimilarity: number;
  avgTopSemanticSimilarity: number;
  lexicalJaccard: string;
  worstPassages: PassageMatch[];
};

type AiScoreRow = {
  documentId: string;
  filename: string;
  heuristic: { score: number; factors: Record<string, number> };
  rubricAvg: number | null;
  combinedIndicativeScore: number;
  rubricSamples: { spanPreview: string; llmScore: number; rationale: string }[];
};

type AnalyzeResponse = {
  plagiarism: PairwisePlagiarism[];
  aiScores: AiScoreRow[];
  disclaimer: string;
};

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [docs, setDocs] = useState<UploadDoc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResponse | null>(
    null,
  );
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [ackHumanize, setAckHumanize] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [humanizeBusy, setHumanizeBusy] = useState(false);

  const onFiles = useCallback(async (list: FileList | null) => {
    if (!list?.length) return;
    setUploading(true);
    setAnalyzeResult(null);
    setAnalyzeError(null);
    setJobId(null);
    setJobStatus(null);
    try {
      const fd = new FormData();
      for (const f of Array.from(list)) {
        fd.append("files", f);
      }
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setSessionId(data.sessionId);
      setDocs(data.documents);
      setSelectedDocId(data.documents[0]?.id ?? null);
    } catch (e) {
      setAnalyzeError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, []);

  const runAnalyze = useCallback(async () => {
    if (!sessionId) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analyze failed");
      setAnalyzeResult({
        plagiarism: data.plagiarism,
        aiScores: data.aiScores,
        disclaimer: data.disclaimer,
      });
    } catch (e) {
      setAnalyzeError(e instanceof Error ? e.message : "Analyze failed");
    } finally {
      setAnalyzing(false);
    }
  }, [sessionId]);

  const startHumanize = useCallback(async () => {
    if (!sessionId || !selectedDocId || !ackHumanize) return;
    setHumanizeBusy(true);
    setJobError(null);
    setJobId(null);
    setJobStatus(null);
    setJobProgress(null);
    try {
      const res = await fetch("/api/humanize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, documentId: selectedDocId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start humanize job");
      setJobId(data.jobId);
      setJobStatus("queued");
    } catch (e) {
      setJobError(e instanceof Error ? e.message : "Humanize failed");
    } finally {
      setHumanizeBusy(false);
    }
  }, [sessionId, selectedDocId, ackHumanize]);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    const tick = async () => {
      const res = await fetch(`/api/jobs/${jobId}`);
      const data = await res.json();
      if (cancelled) return;
      if (!res.ok) {
        setJobError(data.error ?? "Job poll failed");
        return;
      }
      setJobStatus(data.status);
      setJobProgress(data.progress);
      if (data.error) setJobError(data.error);
    };
    void tick();
    const id = setInterval(tick, 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [jobId]);

  return (
    <div className="min-h-full flex flex-col bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white px-6 py-4">
        <h1 className="text-xl font-semibold tracking-tight">
          Document similarity and rewrite
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Cross-upload plagiarism-style similarity, indicative AI-style scores,
          and optional rewriting via OpenRouter.
        </p>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-8">
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-medium">Important</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>
              Similarity and “AI-style” scores are <strong>heuristic</strong>{" "}
              only—not proof for academic or legal use.
            </li>
            <li>
              Rewriting must follow your institution or workplace rules;
              bypassing integrity policies may violate them.
            </li>
            <li>
              Long jobs run in the background; keep this tab open while
              processing. For production, use a dedicated job runner (e.g.
              Inngest).
            </li>
          </ul>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium">1. Upload documents</h2>
          <p className="mt-1 text-sm text-zinc-600">
            PDF or Word (.docx). Multiple files supported.
          </p>
          <label className="mt-4 flex cursor-pointer flex-col items-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-sm text-zinc-600 hover:bg-zinc-100">
            <input
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              multiple
              className="hidden"
              onChange={(e) => void onFiles(e.target.files)}
            />
            {uploading ? "Uploading…" : "Click to select files"}
          </label>
          {docs.length > 0 && (
            <ul className="mt-4 space-y-1 text-sm">
              {docs.map((d) => (
                <li key={d.id} className="text-zinc-700">
                  {d.filename}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium">2. Analyze</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Embeddings compare passages across uploads; shingles add lexical
            overlap. Requires{" "}
            <code className="rounded bg-zinc-100 px-1">OPENROUTER_API_KEY</code>
            .
          </p>
          <button
            type="button"
            disabled={!sessionId || analyzing}
            onClick={() => void runAnalyze()}
            className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {analyzing ? "Analyzing…" : "Run analysis"}
          </button>
        </section>

        {analyzeError && (
          <p className="text-sm text-red-600">{analyzeError}</p>
        )}

        {analyzeResult && (
          <>
            <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-medium">Cross-document similarity</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Semantic scores are cosine similarity of passage embeddings (0–1).
                Higher suggests more overlap between <em>uploaded</em> files.
              </p>
              {analyzeResult.plagiarism.length === 0 ? (
                <p className="mt-4 text-sm text-zinc-500">
                  Upload at least two documents to compare pairs.
                </p>
              ) : (
                <div className="mt-4 space-y-6">
                  {analyzeResult.plagiarism.map((row, i) => (
                    <div
                      key={`${row.docAFilename}-${row.docBFilename}-${i}`}
                      className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-4"
                    >
                      <p className="text-sm font-medium">
                        {row.docAFilename} ↔ {row.docBFilename}
                      </p>
                      <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
                        <div>
                          <dt className="text-zinc-500">Max semantic</dt>
                          <dd>
                            {(row.maxSemanticSimilarity * 100).toFixed(1)}%
                          </dd>
                        </div>
                        <div>
                          <dt className="text-zinc-500">Avg top chunks</dt>
                          <dd>
                            {(row.avgTopSemanticSimilarity * 100).toFixed(1)}%
                          </dd>
                        </div>
                        <div>
                          <dt className="text-zinc-500">Lexical (5-gram)</dt>
                          <dd>{row.lexicalJaccard}</dd>
                        </div>
                      </dl>
                      {row.worstPassages.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                            Highest-overlap passages
                          </p>
                          {row.worstPassages.map((w, j) => (
                            <div
                              key={j}
                              className="grid gap-2 rounded border border-zinc-200 bg-white p-3 text-xs sm:grid-cols-2"
                            >
                              <div>
                                <p className="text-zinc-500">
                                  {(w.semanticScore * 100).toFixed(1)}% — A
                                </p>
                                <p className="mt-1 text-zinc-800">
                                  {w.previewA}…
                                </p>
                              </div>
                              <div>
                                <p className="text-zinc-500">B</p>
                                <p className="mt-1 text-zinc-800">
                                  {w.previewB}…
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-medium">Indicative AI-style scores</h2>
              <p className="mt-1 text-sm text-zinc-600">
                {analyzeResult.disclaimer}
              </p>
              <div className="mt-4 space-y-4">
                {analyzeResult.aiScores.map((row) => (
                  <div
                    key={row.documentId}
                    className="rounded-lg border border-zinc-100 p-4"
                  >
                    <p className="text-sm font-medium">{row.filename}</p>
                    <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-zinc-500">Heuristic</dt>
                        <dd>{row.heuristic.score} / 100</dd>
                      </div>
                      <div>
                        <dt className="text-zinc-500">Combined indicative</dt>
                        <dd>{row.combinedIndicativeScore} / 100</dd>
                      </div>
                      {row.rubricAvg != null && (
                        <div>
                          <dt className="text-zinc-500">LLM sample rubric avg</dt>
                          <dd>{row.rubricAvg} / 100</dd>
                        </div>
                      )}
                    </dl>
                    <details className="mt-2 text-xs text-zinc-600">
                      <summary className="cursor-pointer">Factors</summary>
                      <pre className="mt-2 overflow-x-auto rounded bg-zinc-50 p-2">
                        {JSON.stringify(row.heuristic.factors, null, 2)}
                      </pre>
                    </details>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium">3. Humanize & export</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Rewrites one document in chunks. Default model is tuned for speed (
            <code className="rounded bg-zinc-100 px-1">qwen/qwen-turbo</code>
            ); set{" "}
            <code className="rounded bg-zinc-100 px-1">OPENROUTER_CHAT_MODEL</code>{" "}
            in{" "}
            <code className="rounded bg-zinc-100 px-1">.env.local</code> to e.g.{" "}
            <code className="rounded bg-zinc-100 px-1">
              google/gemini-2.0-flash-001
            </code>{" "}
            or{" "}
            <code className="rounded bg-zinc-100 px-1">openai/gpt-4o-mini</code>.
            Optional env:{" "}
            <code className="rounded bg-zinc-100 px-1">
              OPENROUTER_HUMANIZE_STYLE
            </code>{" "}
            <code className="rounded bg-zinc-100 px-1">minimal</code> (default,
            light copy-edit, keeps your phrasing) or{" "}
            <code className="rounded bg-zinc-100 px-1">standard</code> (deeper
            rewrite).{" "}
            <code className="rounded bg-zinc-100 px-1">
              OPENROUTER_HUMANIZE_CHUNK_CHARS
            </code>{" "}
            (800–8000),{" "}
            <code className="rounded bg-zinc-100 px-1">
              OPENROUTER_HUMANIZE_CONCURRENCY
            </code>{" "}
            (1–6),{" "}
            <code className="rounded bg-zinc-100 px-1">
              OPENROUTER_HUMANIZE_TEMPERATURE
            </code>{" "}
            (unset uses ~0.48 for minimal / ~0.68 for standard). Third-party
            detectors are unreliable; heavy rewrites often score worse than light
            edits. Em/en dash punctuation is stripped from output.
          </p>
          {docs.length > 0 && (
            <div className="mt-4">
              <label className="text-sm font-medium text-zinc-700">
                Document
              </label>
              <select
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                value={selectedDocId ?? ""}
                onChange={(e) => setSelectedDocId(e.target.value || null)}
              >
                {docs.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.filename}
                  </option>
                ))}
              </select>
            </div>
          )}
          <label className="mt-4 flex items-start gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={ackHumanize}
              onChange={(e) => setAckHumanize(e.target.checked)}
              className="mt-1"
            />
            <span>
              I confirm I am allowed to rewrite this content and will not use the
              output to violate academic or workplace integrity rules.
            </span>
          </label>
          <button
            type="button"
            disabled={
              !sessionId ||
              !selectedDocId ||
              !ackHumanize ||
              humanizeBusy ||
              Boolean(jobId && jobStatus === "running")
            }
            onClick={() => void startHumanize()}
            className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {humanizeBusy || jobStatus === "running"
              ? "Working…"
              : "Start humanize job"}
          </button>
          {jobId && (
            <div className="mt-4 rounded-lg bg-zinc-50 p-4 text-sm">
              <p>
                Job <code className="text-xs">{jobId}</code> —{" "}
                <strong>{jobStatus}</strong>
              </p>
              {jobProgress && jobProgress.total > 0 && (
                <p className="mt-1 text-zinc-600">
                  Chunks {jobProgress.current} / {jobProgress.total}
                </p>
              )}
              {jobError && <p className="mt-2 text-red-600">{jobError}</p>}
              {jobStatus === "completed" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={`/api/export?jobId=${encodeURIComponent(jobId)}&format=docx`}
                    className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium"
                  >
                    Download DOCX
                  </a>
                  <a
                    href={`/api/export?jobId=${encodeURIComponent(jobId)}&format=pdf`}
                    className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium"
                  >
                    Download PDF
                  </a>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
