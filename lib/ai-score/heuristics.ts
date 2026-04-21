/**
 * Indicative stylistic heuristics only — not proof of AI authorship.
 */
export type AiHeuristicResult = {
  score: number;
  factors: {
    sentenceLengthVariance: number;
    typeTokenRatio: number;
    bigramRepetition: number;
    punctuationEvenness: number;
    avgSentenceLength: number;
  };
};

function tokenizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function computeAiHeuristicScore(text: string): AiHeuristicResult {
  const sents = sentences(text);
  const lengths = sents.map((s) => s.split(/\s+/).length).filter((n) => n > 0);
  const mean =
    lengths.length === 0 ? 0 : lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance =
    lengths.length < 2
      ? 0
      : lengths.reduce((acc, l) => acc + (l - mean) ** 2, 0) / lengths.length;

  const words = tokenizeWords(text);
  const unique = new Set(words);
  const ttr = words.length === 0 ? 0 : unique.size / words.length;

  const bigrams: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.push(`${words[i]} ${words[i + 1]}`);
  }
  const bigramCounts = new Map<string, number>();
  for (const b of bigrams) {
    bigramCounts.set(b, (bigramCounts.get(b) ?? 0) + 1);
  }
  let repeated = 0;
  for (const c of bigramCounts.values()) {
    if (c > 1) repeated += c - 1;
  }
  const bigramRep =
    bigrams.length === 0 ? 0 : Math.min(1, repeated / bigrams.length);

  const punct = (text.match(/[,:;—–-]/g) ?? []).length;
  const periods = (text.match(/[.!?]/g) ?? []).length;
  const punctEven =
    periods === 0 ? 0.5 : Math.min(1, punct / (periods * 3));

  // Map rough signals to 0–100 "AI-like" style score (higher = more uniform / repetitive).
  const varNorm = Math.max(0, 1 - Math.min(1, variance / 80));
  const ttrNorm = Math.max(0, 1 - Math.min(1, ttr / 0.55));
  const repNorm = bigramRep;
  const punctNorm = Math.max(0, 1 - Math.abs(0.35 - punctEven) / 0.35);

  const score = Math.round(
    100 *
      (0.3 * varNorm +
        0.25 * ttrNorm +
        0.25 * repNorm +
        0.2 * punctNorm),
  );

  return {
    score: Math.min(100, Math.max(0, score)),
    factors: {
      sentenceLengthVariance: Math.round(variance * 10) / 10,
      typeTokenRatio: Math.round(ttr * 1000) / 1000,
      bigramRepetition: Math.round(bigramRep * 1000) / 1000,
      punctuationEvenness: Math.round(punctEven * 1000) / 1000,
      avgSentenceLength: Math.round(mean * 10) / 10,
    },
  };
}
