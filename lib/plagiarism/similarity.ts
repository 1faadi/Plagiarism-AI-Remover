import { cosineSimilarity } from "./math";
import { lexicalSimilarity } from "./shingles";
import type { TextSegment } from "@/lib/extract/segment";

export type DocChunks = {
  documentId: string;
  filename: string;
  segments: TextSegment[];
  embeddings: number[][];
};

export type PassageMatch = {
  docAId: string;
  docAFilename: string;
  segmentIndexA: number;
  docBId: string;
  docBFilename: string;
  segmentIndexB: number;
  semanticScore: number;
  previewA: string;
  previewB: string;
};

export type PairwisePlagiarism = {
  docAId: string;
  docAFilename: string;
  docBId: string;
  docBFilename: string;
  maxSemanticSimilarity: number;
  avgTopSemanticSimilarity: number;
  lexicalJaccard: string;
  worstPassages: PassageMatch[];
};

function topMean(values: number[], k: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => b - a);
  const take = Math.min(k, sorted.length);
  let s = 0;
  for (let i = 0; i < take; i++) s += sorted[i];
  return s / take;
}

export function compareDocumentPair(
  a: DocChunks,
  b: DocChunks,
  topK = 8,
): PairwisePlagiarism {
  const pairSims: { i: number; j: number; sim: number }[] = [];

  for (let i = 0; i < a.embeddings.length; i++) {
    for (let j = 0; j < b.embeddings.length; j++) {
      const sim = cosineSimilarity(a.embeddings[i], b.embeddings[j]);
      pairSims.push({ i, j, sim });
    }
  }

  const maxSemantic =
    pairSims.length === 0
      ? 0
      : Math.max(...pairSims.map((p) => p.sim));

  const perChunkMax: number[] = [];
  for (let i = 0; i < a.embeddings.length; i++) {
    let m = 0;
    for (let j = 0; j < b.embeddings.length; j++) {
      const sim = cosineSimilarity(a.embeddings[i], b.embeddings[j]);
      if (sim > m) m = sim;
    }
    if (a.embeddings.length > 0) perChunkMax.push(m);
  }

  const avgTopSemantic = topMean(perChunkMax, topK);

  const fullA = a.segments.map((s) => s.text).join("\n\n");
  const fullB = b.segments.map((s) => s.text).join("\n\n");
  const lex = lexicalSimilarity(fullA, fullB);

  const worstPassages: PassageMatch[] = [...pairSims]
    .sort((x, y) => y.sim - x.sim)
    .slice(0, 5)
    .map((p) => ({
      docAId: a.documentId,
      docAFilename: a.filename,
      segmentIndexA: p.i,
      docBId: b.documentId,
      docBFilename: b.filename,
      segmentIndexB: p.j,
      semanticScore: p.sim,
      previewA: a.segments[p.i]?.text.slice(0, 280) ?? "",
      previewB: b.segments[p.j]?.text.slice(0, 280) ?? "",
    }));

  return {
    docAId: a.documentId,
    docAFilename: a.filename,
    docBId: b.documentId,
    docBFilename: b.filename,
    maxSemanticSimilarity: maxSemantic,
    avgTopSemanticSimilarity: avgTopSemantic,
    lexicalJaccard: lex.toFixed(4),
    worstPassages,
  };
}

export function compareAllPairs(chunks: DocChunks[]): PairwisePlagiarism[] {
  const out: PairwisePlagiarism[] = [];
  for (let i = 0; i < chunks.length; i++) {
    for (let j = i + 1; j < chunks.length; j++) {
      out.push(compareDocumentPair(chunks[i], chunks[j]));
    }
  }
  return out;
}
