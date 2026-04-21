/**
 * Enforce plain punctuation: no em/en dashes (common LLM tells).
 */
export function stripForbiddenDashes(text: string): string {
  return (
    text
      // em dash, figure dash → comma (no U+2014 in output)
      .replace(/\u2014/g, ", ")
      .replace(/\u2015/g, ", ")
      // en dash → ASCII hyphen (ranges, compounds)
      .replace(/\u2013/g, "-")
      .replace(/,\s*,+/g, ", ")
      .replace(/\s+,/g, ",")
      .replace(/,\s*$/gm, "")
  );
}
