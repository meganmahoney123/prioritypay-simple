import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { investmentTypeFromLabel } from "@/lib/allocations";

export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const { persona, businessName, entityType, retirementProfile, splitRules } = await request.json();
  const admin = supabaseAdmin();
  const rp = retirementProfile || {};

  const { error: profileError } = await admin
    .from("simple_profiles")
    .update({
      persona,
      business_name: businessName,
      entity_type: entityType,
      income_handling: rp.incomeHandling,
      has_w2_plan: rp.hasW2Plan,
      w2_elective_deferral_ytd: rp.w2ElectiveDeferralYTD,
      age_bracket: rp.ageBracket,
      onboarded: true,
    })
    .eq("id", user.id);
  if (profileError) return Response.json({ error: profileError.message }, { status: 500 });

  // Insert-then-delete-old-ids, not delete-then-insert -- same reasoning
  // as PUT /api/split-rules: a failed insert should never leave someone
  // with zero split rules, even here where it's less likely to matter
  // (onboarding hasn't necessarily saved much yet) since mid-onboarding
  // steps already PUT real rows via saveSplitRulesNow before this final
  // step runs.
  const { data: existingRows } = await admin
    .from("simple_split_rules_percent")
    .select("id")
    .eq("user_id", user.id);
  const oldIds = (existingRows || []).map((r) => r.id);

  const percent = splitRules?.percent || [];

  if (percent.length) {
    const rows = percent.map((r) => ({
      user_id: user.id,
      label: r.label,
      group_name: r.group || null,
      pct: Number(r.pct) || 0,
      cap: r.max === null || r.max === undefined || r.max === "" ? null : Number(r.max),
      balance_cap: r.balanceCap === null || r.balanceCap === undefined || r.balanceCap === "" ? null : Number(r.balanceCap),
      color: r.color,
      account_id: r.accountId || null,
      retirement_type: r.retirementType || null,
      // Same derivation as /api/split-rules -- see the comment there.
      investment_type: r.group === "Investments" && !r.retirementType ? investmentTypeFromLabel(r.label) : null,
    }));
    const { error } = await admin.from("simple_split_rules_percent").insert(rows);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }

  if (oldIds.length) {
    await admin.from("simple_split_rules_percent").delete().in("id", oldIds);
  }

  return Response.json({ ok: true });
}
