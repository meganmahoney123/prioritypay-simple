import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { GROUPED_BUCKETS } from "@/lib/allocations";

// Powers the Projections tab's combined calculator
// (components/InvestmentGrowthProjection.js). Previously this route was
// scoped to one group/retirementType at a time (?group=Investments,
// ?group=Retirement&retirementType=solo_401k, etc.) so the card could show
// Investments, 401k, IRA, and Solo 401k as separate side-by-side blocks.
// The tab is now a single combined calculator across everything the person
// is investing for, so this always sums across every GROUPED_BUCKETS group
// (Investments, Retirement, Retirement (Side Income)) at once -- there is
// no ?group= param anymore, and this is the sole caller of this route (see
// app/(app)/projections/page.js).
//
// Returns:
//   startingOnly       -- sum of starting_balance across every row in any
//                          grouped bucket (null treated as 0).
//   currentTotalFrozen -- sum of each of those rows' real current balance
//                          (starting_balance + lifetime transfer
//                          allocations - lifetime category-sourced
//                          withdrawal allocations), same math as
//                          /api/allocations/balances, just pre-summed
//                          across every grouped bucket.
//   hasGroupedCategories -- whether the user has any split-rule rows in a
//                          grouped bucket at all, so the card can show its
//                          empty state instead of an all-zero calculator.
//   liveBalance         -- the REAL, live Plaid balance behind all of this
//                          combined, as opposed to currentTotalFrozen's
//                          tracked ledger number. Investments rows use
//                          their own linked account_id; Retirement rows use
//                          simple_retirement_accounts (which link a
//                          retirement_type to a real simple_accounts row)
//                          -- both sets are deduped together so an account
//                          backing more than one row/type is never
//                          double-counted.
//   liveBalanceKnown    -- false when nothing has a real account linked
//                          yet, so the UI can omit the row instead of
//                          showing a misleading $0.
export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const [{ data: rules }, { data: allocRows }, { data: withdrawalRows }, { data: accountRows }, { data: retirementLinkRows }] = await Promise.all([
    admin
      .from("simple_split_rules_percent")
      .select("label, group_name, starting_balance, account_id")
      .eq("user_id", user.id),
    admin
      .from("simple_transfer_allocations")
      .select("label, amount, simple_transfers!inner(user_id, status)")
      .eq("simple_transfers.user_id", user.id)
      .neq("status", "failed")
      .neq("status", "needs_approval")
    .neq("status", "skipped"),
    admin
      .from("simple_withdrawal_allocations")
      .select("label, amount, source_type, simple_withdrawals!inner(user_id)")
      .eq("simple_withdrawals.user_id", user.id)
      .eq("source_type", "category"),
    admin.from("simple_accounts").select("id, current_balance").eq("user_id", user.id),
    admin.from("simple_retirement_accounts").select("account_id").eq("user_id", user.id),
  ]);

  const accountBalanceById = {};
  (accountRows || []).forEach((a) => {
    accountBalanceById[a.id] = Number(a.current_balance) || 0;
  });

  const grouped = new Set(
    (rules || []).filter((r) => GROUPED_BUCKETS.includes(r.group_name)).map((r) => r.label)
  );
  // Only "Investments" rows carry their own account_id for the live-balance
  // lookup below -- Retirement rows resolve their real account through
  // simple_retirement_accounts instead (see the comment above).
  const investmentLabels = new Set(
    (rules || []).filter((r) => r.group_name === "Investments").map((r) => r.label)
  );

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

  const realAccountIds = new Set();
  (rules || []).forEach((r) => {
    if (investmentLabels.has(r.label) && r.account_id) realAccountIds.add(r.account_id);
  });
  (retirementLinkRows || []).forEach((r) => {
    if (r.account_id) realAccountIds.add(r.account_id);
  });
  const liveBalance = [...realAccountIds].reduce((s, id) => s + (accountBalanceById[id] || 0), 0);

  return Response.json({
    startingOnly,
    currentTotalFrozen,
    hasGroupedCategories: grouped.size > 0,
    liveBalance,
    liveBalanceKnown: realAccountIds.size > 0,
  });
}
