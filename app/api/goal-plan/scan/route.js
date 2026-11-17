import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// Reads a plan someone already has (a pro's quote, a spreadsheet export, a
// photo of a page) and proposes changes to the goal's planner. Nothing is
// saved here: the page shows the proposal and the person confirms first.
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
const MAX_BYTES = 8 * 1024 * 1024;
export const maxDuration = 60;

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export async function POST(req) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: "Plan scanning isn't turned on yet." }, { status: 503 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const label = String(form?.get("label") || "");
  if (!file || typeof file === "string" || !label) return Response.json({ error: "Choose a file." }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "That file is over 8 MB. Try a smaller copy." }, { status: 400 });

  const type = file.type || "";
  const name = (file.name || "").toLowerCase();
  const buf = Buffer.from(await file.arrayBuffer());
  let block;
  if (type === "application/pdf" || name.endsWith(".pdf")) {
    block = { type: "document", source: { type: "base64", media_type: "application/pdf", data: buf.toString("base64") } };
  } else if (/^image\/(png|jpeg|gif|webp)$/.test(type)) {
    block = { type: "image", source: { type: "base64", media_type: type, data: buf.toString("base64") } };
  } else if (type.startsWith("text/") || /\.(csv|txt|md)$/.test(name)) {
    block = { type: "text", text: `The plan file contents:\n${buf.toString("utf8").slice(0, 60000)}` };
  } else if (/\.(xlsx|xls|numbers|docx?)$/.test(name)) {
    return Response.json({ error: "Spreadsheets and Word files can't be read yet. Save it as a PDF or CSV, or take a photo, and upload that." }, { status: 400 });
  } else {
    return Response.json({ error: "Upload a PDF, a photo, or a CSV or text file." }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const [{ data: groups }, { data: items }] = await Promise.all([
    admin.from("simple_goal_groups").select("id, name").eq("user_id", user.id).eq("label", label),
    admin.from("simple_goal_items").select("id, group_id, name, amount").eq("user_id", user.id).eq("label", label),
  ]);
  const gname = Object.fromEntries((groups || []).map((g) => [g.id, g.name]));
  const existing = (items || []).map((i) => ({ id: i.id, group: gname[i.group_id] || "", name: i.name, amount: Number(i.amount) || 0 }));

  const prompt = `You read a plan for something a person is saving for ("${label}") and list its costs.
Return ONLY JSON, no other text, shaped exactly like: {"items":[{"group":"short category name","name":"what it is","amount":1234}]}
Rules:
- One entry per cost line. amount is a plain number in US dollars. Use 0 if no amount is shown.
- Use the plan's own category names for "group" when it has them; otherwise choose a short sensible one.
- Skip totals, subtotals, tax-summary lines that repeat other lines, headers and notes.
- Do not invent items or amounts. If the file has no costs, return {"items":[]}.
Existing items already in the person's planner (reuse these exact names and groups when a line is clearly the same thing):
${JSON.stringify(existing.map((e) => ({ group: e.group, name: e.name })))}`;

  let text = "";
  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: 4000, messages: [{ role: "user", content: [block, { type: "text", text: prompt }] }] }),
      signal: AbortSignal.timeout(55000),
    });
    const data = await res.json();
    if (!res.ok) return Response.json({ error: "The scan didn't work this time. Try again." }, { status: 502 });
    text = (data.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
  } catch {
    return Response.json({ error: "The scan took too long. Try a smaller file." }, { status: 504 });
  }

  let parsed;
  try { parsed = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)); } catch { parsed = null; }
  const found = Array.isArray(parsed?.items) ? parsed.items : null;
  if (!found) return Response.json({ error: "I couldn't read costs from that file." }, { status: 422 });

  const byName = new Map(existing.map((e) => [norm(e.name), e]));
  const proposals = found.slice(0, 80).map((f) => {
    const nm = String(f.name || "").trim().slice(0, 140);
    const amount = Math.max(0, Number(f.amount) || 0);
    const hit = byName.get(norm(nm));
    const row = { group: String(f.group || "Costs").trim().slice(0, 80) || "Costs", name: nm, amount };
    if (hit) { row.existingId = hit.id; row.oldAmount = hit.amount; row.kind = hit.amount === amount ? "same" : "changed"; if (hit.group) row.group = hit.group; }
    else row.kind = "new";
    return row;
  }).filter((r) => r.name);
  return Response.json({ proposals });
}
