import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// Undo (or redo) one "this paid for the goal" change. Lowering a goal when a
// withdrawal pays for it is recorded in simple_goal_payments (see
// app/api/withdrawals/route.js). Undo puts the amount back on the category's
// total cap and marks the row undone; redo lowers it again.
export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const admin = supabaseAdmin();

  const { data: pay, error } = await admin
    .from("simple_goal_payments")
    .select("*")
    .eq("id", body.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !pay) return Response.json({ error: "That goal change couldn't be found." }, { status: 404 });

  const undo = body.action !== "redo";
  if (undo && pay.undone_at) return Response.json({ ok: true, undone: true });
  if (!undo && !pay.undone_at) return Response.json({ ok: true, undone: false });

  const { data: rule } = await admin
    .from("simple_split_rules_percent")
    .select("id, category_cap")
    .eq("user_id", user.id)
    .eq("label", pay.label)
    .not("category_cap", "is", null)
    .limit(1)
    .maybeSingle();

  const amount = Number(pay.amount) || 0;
  // If the goal was removed since, there is nothing to restore -- just record it.
  if (rule) {
    const cap = Number(rule.category_cap) || 0;
    const next = undo ? cap + amount : Math.max(0, cap - amount);
    const { error: upErr } = await admin.from("simple_split_rules_percent").update({ category_cap: next }).eq("id", rule.id);
    if (upErr) return Response.json({ error: upErr.message }, { status: 500 });
  }
  await admin.from("simple_goal_payments").update({ undone_at: undo ? new Date().toISOString() : null }).eq("id", pay.id);
  return Response.json({ ok: true, undone: undo, label: pay.label, amount });
}
