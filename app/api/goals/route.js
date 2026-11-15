import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// A savings goal is a category with a total cap: the cap is the target. This
// route joins those caps with the extras in simple_goals (target date, cover,
// uploaded photo) so the Dashboard cards and the Savings Goals pages share one
// source. Setting a target here writes the category's cap, so the splitting
// rules (which stop sending money at the cap) keep working unchanged.
export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const { data: rules } = await admin
    .from("simple_split_rules_percent")
    .select("label, category_cap")
    .eq("user_id", user.id)
    .not("category_cap", "is", null);
  const { data: metaRows } = await admin.from("simple_goals").select("*").eq("user_id", user.id);
  const meta = {};
  for (const m of metaRows || []) meta[m.label] = m;

  const goals = [];
  const seen = new Set();
  for (const r of rules || []) {
    const target = Number(r.category_cap) || 0;
    if (target <= 0 || seen.has(r.label)) continue;
    seen.add(r.label);
    const m = meta[r.label] || {};
    let photoUrl = null;
    if (m.photo_path) {
      const { data: signed } = await admin.storage.from("goal-photos").createSignedUrl(m.photo_path, 3600);
      photoUrl = signed?.signedUrl || null;
    }
    goals.push({ label: r.label, target, goalDate: m.goal_date || null, cover: m.cover || null, photoUrl, kind: m.kind || null });
  }
  return Response.json({ goals });
}

// Create or edit a goal. { label, target?, goalDate?, cover?, photoPath?, kind?, remove? }
export async function PUT(request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const label = String(body.label || "").trim();
  if (!label) return Response.json({ error: "Pick a category for this goal." }, { status: 400 });
  const admin = supabaseAdmin();

  if (body.remove) {
    await admin.from("simple_split_rules_percent").update({ category_cap: null }).eq("user_id", user.id).eq("label", label);
    await admin.from("simple_goals").delete().eq("user_id", user.id).eq("label", label);
    return Response.json({ ok: true });
  }

  if (body.target !== undefined) {
    const target = Number(body.target);
    if (!(target > 0)) return Response.json({ error: "Enter a target amount greater than $0." }, { status: 400 });
    const { data: upd, error } = await admin
      .from("simple_split_rules_percent")
      .update({ category_cap: target })
      .eq("user_id", user.id)
      .eq("label", label)
      .select("id");
    if (error) return Response.json({ error: error.message }, { status: 500 });
    if (!upd?.length) return Response.json({ error: "That category couldn't be found." }, { status: 404 });
  }

  const row = { user_id: user.id, label };
  if (body.goalDate !== undefined) row.goal_date = body.goalDate || null;
  if (body.cover !== undefined) row.cover = body.cover || null;
  if (body.photoPath !== undefined) row.photo_path = body.photoPath || null;
  if (body.kind !== undefined) row.kind = body.kind || null;
  const { error: metaErr } = await admin.from("simple_goals").upsert(row, { onConflict: "user_id,label" });
  if (metaErr) return Response.json({ error: `Saved the target, but not the picture or date: ${metaErr.message}` }, { status: 500 });
  return Response.json({ ok: true });
}
