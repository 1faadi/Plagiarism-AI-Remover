import "server-only";
import { getOpenRouterClient, embeddingModel } from "@/lib/openrouter";

const BATCH = 32;

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const client = getOpenRouterClient();
  const model = embeddingModel();
  const all: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH);
    const res = await client.embeddings.create({
      model,
      input: batch,
    });
    const vectors = res.data
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding as number[]);
    all.push(...vectors);
  }

  return all;
}
