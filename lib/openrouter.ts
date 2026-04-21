import "server-only";
import OpenAI from "openai";

export function getOpenRouterClient(): OpenAI {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: key,
    defaultHeaders: {
      "HTTP-Referer":
        process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      "X-Title": "Document Plagiarism & Humanize",
    },
  });
}

/**
 * Default targets speed + cost on OpenRouter. Override with OPENROUTER_CHAT_MODEL.
 * Fast options to try: qwen/qwen-turbo, google/gemini-2.0-flash-001, openai/gpt-4o-mini
 * (verify IDs on https://openrouter.ai/models )
 */
export function chatModel(): string {
  return process.env.OPENROUTER_CHAT_MODEL ?? "qwen/qwen-turbo";
}

/** Parallel chunk rewrites; raise for faster models, lower if you hit rate limits. */
export function humanizeConcurrency(): number {
  const raw = process.env.OPENROUTER_HUMANIZE_CONCURRENCY;
  const n = raw ? parseInt(raw, 10) : 4;
  return Math.min(6, Math.max(1, Number.isFinite(n) ? n : 4));
}

export type HumanizeStyle = "minimal" | "standard";

/**
 * minimal = light edit (default): keep your phrasing; fewer detector-style “polished essay” rewrites.
 * standard = heavier paraphrase (previous behaviour).
 */
export function humanizeStyle(): HumanizeStyle {
  const s = (process.env.OPENROUTER_HUMANIZE_STYLE ?? "minimal").toLowerCase();
  if (s === "standard" || s === "full" || s === "deep") return "standard";
  return "minimal";
}

/** Chunk size for humanize only (no overlap). Larger = fewer seams; 800–8000. */
export function humanizeChunkMaxChars(): number {
  const raw = process.env.OPENROUTER_HUMANIZE_CHUNK_CHARS;
  const n = raw ? parseInt(raw, 10) : NaN;
  if (Number.isFinite(n) && n >= 800 && n <= 8000) return n;
  return humanizeStyle() === "minimal" ? 2200 : 1500;
}

/**
 * Lower default for minimal (stay close to source). Set OPENROUTER_HUMANIZE_TEMPERATURE to override.
 */
export function humanizeTemperature(): number {
  const raw = process.env.OPENROUTER_HUMANIZE_TEMPERATURE;
  if (raw != null && raw !== "") {
    const t = parseFloat(raw);
    if (Number.isFinite(t)) return Math.min(2, Math.max(0, t));
  }
  return humanizeStyle() === "minimal" ? 0.48 : 0.68;
}

export function embeddingModel(): string {
  return (
    process.env.OPENROUTER_EMBEDDING_MODEL ?? "openai/text-embedding-3-small"
  );
}

export function rubricModel(): string | undefined {
  const m = process.env.OPENROUTER_RUBRIC_MODEL;
  return m && m !== "0" ? m : undefined;
}
