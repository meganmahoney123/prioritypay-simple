// Masks personal identifiers before any text leaves for the AI. Used in the
// browser (so the "See what was sent" panel shows exactly what goes out) and
// again on the server (so it holds even if the browser code is bypassed).
const RULES = [
  [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email removed]"],
  [/\b\d{3}[- ]?\d{2}[- ]?\d{4}\b/g, "[ID number removed]"],
  [/\b(?:\d[ -]?){13,19}\b/g, "[card or account number removed]"],
  [/(?:\+?1[ .-]?)?\(?\b\d{3}\)?[ .-]\d{3}[ .-]\d{4}\b/g, "[phone removed]"],
  [/\b\d{9,17}\b/g, "[account number removed]"],
];

export function maskSensitive(text) {
  let out = String(text || "");
  let count = 0;
  for (const [re, label] of RULES) {
    out = out.replace(re, () => {
      count += 1;
      return label;
    });
  }
  return { text: out, masked: count };
}

// The chat is plain text only: no markdown symbols, no long dashes.
export function plainText(text) {
  return String(text || "")
    .replace(/\*\*?|__|`{1,3}/g, "")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-•]\s+/gm, "- ")
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
