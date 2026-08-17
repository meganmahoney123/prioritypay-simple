import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { DEFAULT_SPLIT_RULES } from "@/lib/allocations";

// DEV/TESTING ONLY. Overwrites the calling user's split rules with
// PriorityPay Simple's stock defaults (see DEFAULT_SPLIT_RULES in
// lib/allocations.js) -- every account/cap left unset, same as a brand
// new signup. Handy after test data gets wiped by something unrelated
// (schema changes, manual DB edits, etc.) without re-entering seven rows
// by hand through the UI. Same insert-first-then-delete-old-ids safety
// pattern as PUT /api/split-rules -- see the comment there.
export async function POST() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const { data: existingRows } = await admin
    .from("simple_split_rules_percent")
    .select("id")
    .eq("user_id", user.id);
  const oldIds = (existingRows || []).map((r) => r.id);

  const rows = DEFAULT_SPLIT_RULES.percent.map((r) => ({
    user_id: user.id,
    label: r.label,
    group_name: r.group || null,
    pct: r.pct,
    cap: r.max ?? null,
    balance_cap: r.balanceCap ?? null,
    color: r.color,
    account_id: null,
    retirement_type: r.retirementType || null,
    investment_type: null,
  }));
  const { error } = await admin.from("simple_split_rules_percent").insert(rows);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  if (oldIds.length) {
    await admin.from("simple_split_rules_percent").delete().in("id", oldIds);
  }

  return Response.json({ ok: true, restored: rows.length });
}
