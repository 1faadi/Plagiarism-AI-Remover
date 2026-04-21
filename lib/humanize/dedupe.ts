/**
 * Drop consecutive paragraphs that are nearly the same (e.g. chunk overlap artifacts).
 */
export function dedupeNearDuplicateParagraphs(
  text: string,
  threshold = 0.91,
): string {
  const paras = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];

  for (const p of paras) {
    const prev = out[out.length - 1];
    if (prev) {
      if (normalizePara(p) === normalizePara(prev)) continue;
      if (
        p.length > 80 &&
        prev.length > 80 &&
        tokenJaccard(prev, p) >= threshold
      ) {
        continue;
      }
    }
    out.push(p);
  }
  return out.join("\n\n");
}

function normalizePara(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

function tokens(s: string): Set<string> {
  const m = s.toLowerCase().match(/[\p{L}\p{N}']+/gu);
  return new Set(m ?? []);
}

function tokenJaccard(a: string, b: string): number {
  const A = tokens(a);
  const B = tokens(b);
  if (A.size === 0 && B.size === 0) return 1;
  let inter = 0;
  for (const x of A) {
    if (B.has(x)) inter++;
  }
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}
