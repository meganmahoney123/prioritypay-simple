import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// Powers the Dashboard's "Your Investment Projections" / "Your Retirement
// Projections" cards (components/InvestmentGrowthProjection.js). Scoped to
// a single simple_split_rules_percent group at a time -- pass
// ?group=Investments or ?group=Retirement (see lib/allocations.js
// GROUPED_BUCKETS) -- every other group (Tax Reserve, Savings, Emergency
// Fund, OPEX, or a custom row) is deliberately excluded, and the two
// groups are no longer blended together: each card fetches its own group.
//
// Returns:
//   startingOnly       -- sum of starting_balance across every row in the
//                          requested group (null treated as 0). Powers
//                          Scenario 1, "Pre-PriorityPay".
//   currentTotalFrozen -- sum of each of those rows' real current balance
//                          (starting_balance + lifetime transfer
//                          allocations - lifetime category-sourced
//                          withdrawal allocations), same math as
//                          /api/allocations/balances, just pre-filtered
//                          and pre-summed to the one requested group.
//                          Powers Scenario 2, "Current Progress" (and,
//                          client-side, Scenario 3 "Future Progress" once
//                          the user's editable monthly-contribution amount
//                          is added on top).
//   hasGroupedCategories -- whether the user has any split-rule rows in
//                          the requested group at all, so the card can
//                          show its empty state instead of an all-zero
//                          chart.
//
// The monthly contribution used for Scenario 3 is no longer computed
// here -- it's a plain editable number input on the card itself
// (components/InvestmentGrowthProjection.js), defaulting to $50, so this
// route doesn't need to know about simple_profiles account age or lifetime
// contribution averages anymore.
export async function GET(request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const { searchParams } = new URL(request.url);
  const group = searchParams.get("group") === "Retirement" ? "Retirement" : "Investments";

  const [{ data: rules }, { data: allocRows }, { data: withdrawalRows }] = await Promise.all([
    admin.from("simple_split_rules_percent").select("label, group_name, starting_balance").eq("user_id", user.id),
    admin
      .from("simple_transfer_allocations")
      .select("label, amount, simple_transfers!inner(user_id, status)")
      .eq("simple_transfers.user_id", user.id)
      .neq("status", "failed")
      .neq("status", "needs_approval"),
    admin
      .from("simple_withdrawal_allocations")
      .select("label, amount, source_type, simple_withdrawals!inner(user_id)")
      .eq("simple_withdrawals.user_id", user.id)
      .eq("source_type", "category"),
  ]);

  const grouped = new Set((rules || []).filter((r) => r.group_name === group).map((r) => r.label));

  let startingOnly = 0;
  const byLabel = {};
  (rules || []).forEach((r) => {
    if (!grouped.has(r.label)) return;
    const start = Number(r.starting_balance) || 0;
    startingOnly += start;
    byLabel[r.label] = (byLabel[r.label] || 0) + start;
  });

  (allocRows || []).forEach((r) => {
    if (!grouped.has(r.label)) return;
    byLabel[r.label] = (byLabel[r.label] || 0) + (Number(r.amount) || 0);
  });
  (withdrawalRows || []).forEach((r) => {
    if (!r.label || !grouped.has(r.label)) return;
    byLabel[r.label] = (byLabel[r.label] || 0) - (Number(r.amount) || 0);
  });

  const currentTotalFrozen = Object.values(byLabel).reduce((s, v) => s + v, 0);

  return Response.json({
    startingOnly,
    currentTotalFrozen,
    hasGroupedCategories: grouped.size > 0,
  });
}
