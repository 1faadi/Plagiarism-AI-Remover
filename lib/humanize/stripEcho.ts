/**
 * Remove common patterns where the model repeats the source or adds wrappers.
 */
export function stripModelEcho(text: string): string {
  let t = text.trim();
  if (!t) return t;

  t = stripMarkdownFence(t);

  // Labeled dual blocks: keep only the second part
  t = stripLabeledPair(
    t,
    /\bOriginal(?:\s+text|\s+passage|\s+version)?\s*:\s*/i,
    /\bRewritten(?:\s+text|\s+passage|\s+version)?\s*:\s*/i,
  );
  t = stripLabeledPair(
    t,
    /\bBefore\s*:\s*/i,
    /\bAfter\s*:\s*/i,
  );
  t = stripLabeledPair(
    t,
    /\bInput\s*:\s*/i,
    /\bOutput\s*:\s*/i,
  );

  const singleRewritten = t.match(
    /^(?:\*\*)?Rewritten(?:\s+version)?(?:\*\*)?\s*:\s*([\s\S]+)/i,
  );
  if (singleRewritten && singleRewritten[1].trim().length > 20) {
    t = singleRewritten[1].trim();
  }

  t = stripLeadingPreambleLines(t);
  return t.trim();
}

function stripMarkdownFence(s: string): string {
  if (!s.startsWith("```")) return s;
  const m = s.match(/^```[a-z0-9]*\s*\n?([\s\S]*?)\n?```\s*$/i);
  return m ? m[1].trim() : s.replace(/^```[a-z0-9]*\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
}

/** Only strip when both labels appear near the top (model boilerplate), not mid-document citations. */
function stripLabeledPair(
  text: string,
  firstLabel: RegExp,
  secondLabel: RegExp,
): string {
  const head = text.slice(0, 2500);
  const m1 = firstLabel.exec(head);
  const m2 = secondLabel.exec(head);
  if (!m1 || !m2 || m1.index >= m2.index) return text;
  if (m1.index > 180) return text;
  if (m2.index - m1.index > 2000) return text;
  return text.slice(m2.index + m2[0].length).trim();
}

const PREAMBLE_LINE =
  /^(here'?s|here is)\b|^the (following|rewritten|edited|revised|updated)\b|^below (is|you('?ll)? find)\b|^edited (passage|text|version)\s*:\s*$/i;

function stripLeadingPreambleLines(text: string): string {
  let t = text;
  for (let i = 0; i < 12; i++) {
    const lines = t.split("\n");
    const first = (lines[0] ?? "").trim();
    if (!first) {
      t = lines.slice(1).join("\n").trim();
      continue;
    }
    if (first.length < 140 && PREAMBLE_LINE.test(first)) {
      t = lines.slice(1).join("\n").trim();
      continue;
    }
    if (
      /^(rewritten|edited|revised|updated output)\s*:\s*$/i.test(first) &&
      lines.length > 1
    ) {
      t = lines.slice(1).join("\n").trim();
      continue;
    }
    break;
  }
  return t;
}
