// Simple keyword retrieval over PrioritySave's own tax guides (Drive docs),
// so the chat can answer in depth from PrioritySave's content instead of
// from memory. Server-only.
import chunks from "@/lib/guideChunks.json";

const STOP = new Set("the a an and or of to for in on is are can i my me do does how what should with that this it be as at by from your you about get have".split(" "));

function tokens(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/401\(k\)/g, "401k")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

const INDEX = chunks.map((c) => ({ c, title: new Set(tokens(c.title)), body: tokens(c.text) }));

export function searchGuides(query, { limit = 7, maxChars = 17000 } = {}) {
  const q = [...new Set(tokens(query))];
  if (!q.length) return [];
  const scored = INDEX.map(({ c, title, body }) => {
    let score = 0;
    for (const t of q) {
      if (title.has(t)) score += 4;
      let n = 0;
      for (const b of body) if (b === t) n++;
      score += Math.min(n, 4);
    }
    if (c.tier.startsWith("PRIMARY")) score *= 1.25;
    return { c, score };
  })
    .filter((x) => x.score > 3)
    .sort((a, b) => b.score - a.score);
  const out = [];
  let used = 0;
  for (const { c } of scored) {
    if (out.length >= limit || used + c.text.length > maxChars) continue;
    out.push(c);
    used += c.text.length;
  }
  return out;
}
