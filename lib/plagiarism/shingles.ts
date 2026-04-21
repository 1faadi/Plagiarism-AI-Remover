export function shingleSet(text: string, n = 5): Set<string> {
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
  const set = new Set<string>();
  if (normalized.length < n) {
    if (normalized) set.add(normalized);
    return set;
  }
  for (let i = 0; i <= normalized.length - n; i++) {
    set.add(normalized.slice(i, i + n));
  }
  return set;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) {
    if (b.has(x)) inter++;
  }
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function lexicalSimilarity(textA: string, textB: string): number {
  return jaccard(shingleSet(textA), shingleSet(textB));
}
