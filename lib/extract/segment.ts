export type TextSegment = {
  index: number;
  text: string;
  startChar: number;
  endChar: number;
};

/**
 * Sliding windows up to maxChars with overlap, breaking on paragraph or space.
 */
export function segmentText(
  text: string,
  maxChars = 1500,
  overlap = 200,
): TextSegment[] {
  const segments: TextSegment[] = [];
  let start = 0;
  let index = 0;

  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length);
    if (end < text.length) {
      const window = text.slice(start, end);
      const paraBreak = window.lastIndexOf("\n\n");
      const spaceBreak = window.lastIndexOf(" ");
      const preferPara = paraBreak > maxChars * 0.35;
      const breakOffset = preferPara
        ? paraBreak + 2
        : spaceBreak > maxChars * 0.35
          ? spaceBreak + 1
          : end - start;
      end = Math.min(start + breakOffset, text.length);
    }

    const chunk = text.slice(start, end).trim();
    if (chunk.length > 0) {
      segments.push({
        index: index++,
        text: chunk,
        startChar: start,
        endChar: end,
      });
    }

    if (end >= text.length) break;
    const nextStart = end - overlap;
    start = nextStart > start ? nextStart : end;
  }

  return segments;
}
