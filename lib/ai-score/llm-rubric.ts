import "server-only";
import { getOpenRouterClient, rubricModel } from "@/lib/openrouter";

export type RubricSampleResult = {
  spanStart: number;
  spanPreview: string;
  llmScore: number;
  rationale: string;
};

/**
 * Cheap sampled rubric on short excerpts. Indicative only.
 */
export async function sampleLlmRubric(
  text: string,
  maxSamples = 2,
  spanLen = 1200,
): Promise<RubricSampleResult[]> {
  const model = rubricModel();
  if (!model || text.length < 100) return [];

  const client = getOpenRouterClient();
  const positions: number[] = [];
  const n = Math.min(maxSamples, 3);
  for (let i = 0; i < n; i++) {
    const start = Math.floor((text.length / (n + 1)) * (i + 1));
    positions.push(Math.min(start, Math.max(0, text.length - spanLen)));
  }

  const results: RubricSampleResult[] = [];

  for (const start of positions) {
    const span = text.slice(start, start + spanLen);
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.2,
      max_tokens: 300,
      messages: [
        {
          role: "system",
          content:
            'You assess whether prose reads like uniform LLM output vs human drafting. Reply JSON only: {"score":0-100,"rationale":"short"}. Score higher when prose is highly uniform, generic, or template-like. This is not proof.',
        },
        {
          role: "user",
          content: span,
        },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let llmScore = 50;
    let rationale = "";
    try {
      const parsed = JSON.parse(raw) as { score?: number; rationale?: string };
      llmScore = Math.min(100, Math.max(0, Number(parsed.score ?? 50)));
      rationale = String(parsed.rationale ?? "");
    } catch {
      /* ignore */
    }
    results.push({
      spanStart: start,
      spanPreview: span.slice(0, 200).replace(/\s+/g, " "),
      llmScore,
      rationale,
    });
  }

  return results;
}
