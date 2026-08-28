import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// Powers the Dashboard's "Where your investments could go" projection
// card (components/InvestmentGrowthProjection.js). Scoped ONLY to
// simple_split_rules_percent rows whose group is "Investments" or
// "Retirement" (see lib/allocations.js GROUPED_BUCKETS) -- every other
// group (Tax Reserve, Savings, Emergency Fund, OPEX, or a custom row) is
// deliberately excluded, and the two groups are blended into one number
// rather than shown separately, per spec.
//
// Returns:
//   startingOnly       -- sum of starting_balance across every
//                          Investments/Retirement row (null treated as 0).
//   currentTotalFrozen -- sum of each of those rows' real current balance
//                          (starting_balance + lifetime transfer
//                          allocations - lifetime category-sourced
//                          withdrawal allocations), same math as
//                          /api/allocations/balances, just pre-filtered
//                          and pre-summed to the two groups.
//   monthlyContribution / isRealAverage -- average real dollars/month
//                          that have landed in Investments/Retirement
//                          categories, computed from actual
//                          simple_transfer_allocations history divided by
//                          the number of full calendar months since the
//                          account was created (simple_profiles.created_at).
//                          Only used (isRealAverage: true) once the
//                          account is at least 3 full months old; before
//                          that there isn't a reliable average yet, so
//                          the caller falls back to a clearly-labeled
//                          $50/month placeholder instead.
//   monthsAsCustomer   -- whole months since simple_profiles.created_at,
//                          floored, so the component can decide whether
//                          to trust monthlyContribution or use the
//                          placeholder + "first 3 months" copy.
export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const [{ data: profile }, { data: rules }, { data: allocRows }, { data: withdrawalRows }] = await Promise.all([
    admin.from("simple_profiles").select("created_at").eq("id", user.id).single(),
    admin.from("simple_split_rules_percent").select("label, group_name, starting_balance").eq("user_id", user.id),
    admin
      .from("simple_transfer_allocations")
      .select("label, amount, simple_transfers!inner(user_id, status, created_at)")
      .eq("simple_transfers.user_id", user.id)
      .neq("status", "failed")
      .neq("status", "needs_approval"),
    admin
      .from("simple_withdrawal_allocations")
      .select("label, amount, source_type, simple_withdrawals!inner(user_id)")
      .eq("simple_withdrawals.user_id", user.id)
      .eq("source_type", "category"),
  ]);

  const grouped = new Set(
    (rules || []).filter((r) => r.group_name === "Investments" || r.group_name === "Retirement").map((r) => r.label)
  );

  let startingOnly = 0;
  const byLabel = {};
  (rules || []).forEach((r) => {
    if (!grouped.has(r.label)) return;
    const start = Number(r.starting_balance) || 0;
    startingOnly += start;
    byLabel[r.label] = (byLabel[r.label] || 0) + start;
  });

  let lifetimeContributions = 0;
  (allocRows || []).forEach((r) => {
    if (!grouped.has(r.label)) return;
    const amt = Number(r.amount) || 0;
    byLabel[r.label] = (byLabel[r.label] || 0) + amt;
    lifetimeContributions += amt;
  });
  (withdrawalRows || []).forEach((r) => {
    if (!r.label || !grouped.has(r.label)) return;
    byLabel[r.label] = (byLabel[r.label] || 0) - (Number(r.amount) || 0);
  });

  const currentTotalFrozen = Object.values(byLabel).reduce((s, v) => s + v, 0);

  const createdAt = profile?.created_at ? new Date(profile.created_at) : null;
  const now = new Date();
  const monthsAsCustomer = createdAt
    ? Math.max(
        0,
        (now.getUTCFullYear() - createdAt.getUTCFullYear()) * 12 + (now.getUTCMonth() - createdAt.getUTCMonth())
      )
    : 0;

  const isRealAverage = monthsAsCustomer >= 3;
  const monthlyContribution = isRealAverage ? lifetimeContributions / monthsAsCustomer : 50;

  return Response.json({
    startingOnly,
    currentTotalFrozen,
    monthlyContribution,
    isRealAverage,
    monthsAsCustomer,
    hasGroupedCategories: grouped.size > 0,
  });
}
