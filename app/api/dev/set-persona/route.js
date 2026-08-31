import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { getDefaultSplitRules, PERSONA_W2_WITH_SIDE_HUSTLE, PERSONA_W2_NO_SIDE_HUSTLE } from "@/lib/allocations";

// DEV/TESTING ONLY -- restricted to Megan's own account (see
// ALLOWED_EMAILS below). Lets her switch her own persona and reset her
// split rules to that persona's defaults, in one call -- so testing the
// four onboarding personas (see BUSINESS_TYPES in app/onboarding/page.js)
// never requires actually creating a second account and re-running the
// whole signup/Plaid/Stripe flow. Same insert-first-then-delete-old-ids
// safety pattern as /api/dev/reset-split-rules -- see the comment there.
// Every other /api/dev/* route in this project has always assumed only
// trusted people can reach it at all (no real customer knows these URLs
// exist), which was fine for build/seed helpers nobody but Megan would
// ever call. This one is surfaced from a visible Settings-page button
// though, which any signed-in real customer could see and click -- an
// email allowlist is the actual gate here, not obscurity.
const ALLOWED_EMAILS = new Set(["megan@ignitemysite.com"]);

export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (!ALLOWED_EMAILS.has((user.email || "").toLowerCase())) {
    return Response.json({ error: "Not available on this account." }, { status: 403 });
  }
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
