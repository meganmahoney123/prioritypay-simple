import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { getDefaultSplitRules, PERSONA_W2_WITH_SIDE_HUSTLE, PERSONA_W2_NO_SIDE_HUSTLE } from "@/lib/allocations";

// DEV/TESTING ONLY. Lets the calling (already-signed-in) user switch their
// own persona and reset their split rules to that persona's defaults, in
// one call -- so testing the four onboarding personas (see BUSINESS_TYPES
// in app/onboarding/page.js) never requires actually creating a second
// account and re-running the whole signup/Plaid/Stripe flow. Same
// insert-first-then-delete-old-ids safety pattern as
// /api/dev/reset-split-rules -- see the comment there. Surfaced from a
// small "Testing" panel on the Settings page, not linked anywhere else.
export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();
  const { persona } = await request.json();
  if (!persona) return Response.json({ error: "persona required" }, { status: 400 });

  const { error: profileError } = await admin
    .from("simple_profiles")
    .update({
      persona,
      has_w2_plan: persona === PERSONA_W2_WITH_SIDE_HUSTLE || persona === PERSONA_W2_NO_SIDE_HUSTLE,
    })
    .eq("id", user.id);
  if (profileError) return Response.json({ error: profileError.message }, { status: 500 });

  const { data: existingRows } = await admin
    .from("simple_split_rules_percent")
    .select("id")
    .eq("user_id", user.id);
  const oldIds = (existingRows || []).map((r) => r.id);

  const rows = getDefaultSplitRules(persona).percent.map((r) => ({
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
  const { error: rowsError } = await admin.from("simple_split_rules_percent").insert(rows);
  if (rowsError) return Response.json({ error: rowsError.message }, { status: 500 });

  if (oldIds.length) {
    await admin.from("simple_split_rules_percent").delete().in("id", oldIds);
  }

  return Response.json({ ok: true, persona, restored: rows.length });
}
