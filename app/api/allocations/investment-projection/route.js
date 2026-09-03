import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// Powers the Dashboard's "Your Investment Projections" / "Your Retirement
// Projections" cards (components/InvestmentGrowthProjection.js). Scoped to
// a single simple_split_rules_percent group at a time -- pass
// ?group=Investments or ?group=Retirement (see lib/allocations.js
// GROUPED_BUCKETS) -- every other group (Tax Reserve, Savings, Emergency
// Fund, OPEX, or a custom row) is deliberately excluded.
//
// Retirement additionally supports narrowing to one specific account type
// via ?retirementType=solo_401k or ?retirementType=sep_ira (matches
// simple_split_rules_percent.retirement_type, the same fixed identifier
// lib/allocations.js already uses to tell the two retirement rows apart
// regardless of whatever label text the user has on them) -- this powers
// the Retirement card showing Solo 401k and SEP IRA as two separate
// sub-projections instead of one blended number.
//
// Returns:
//   startingOnly       -- sum of starting_balance across every matching
//                          row (null treated as 0). Powers Scenario 1,
//                          "Pre-PriorityPay", and the "Total Before
//                          PriorityPay" figure shown above the monthly
//                          contribution input.
//   currentTotalFrozen -- sum of each of those rows' real current balance
//                          (starting_balance + lifetime transfer
//                          allocations - lifetime category-sourced
//                          withdrawal allocations), same math as
//                          /api/allocations/balances, just pre-filtered
//                          and pre-summed to the requested scope. Powers
//                          Scenario 2, "Current Progress" (and, client-
//                          side, Scenario 3 "Future Progress" once the
//                          user's editable monthly-contribution amount is
//                          added on top).
//   hasGroupedCategories -- whether the user has any split-rule rows in
//                          the requested scope at all, so the card can
//                          show its empty state instead of an all-zero
//                          chart.
//   liveBalance         -- the REAL, live Plaid balance behind this scope
//                          right now, as opposed to currentTotalFrozen's
//                          tracked ledger number. For Retirement, this is
//                          the actual linked 401k/IRA account's real
//                          balance (simple_retirement_accounts.account_id
//                          -> simple_accounts.current_balance), which can
//                          run ahead of or behind currentTotalFrozen since
//                          real market growth/contributions there aren't
//                          reflected in the ledger math at all. For
//                          Investments there's no equivalent separate
//                          "real account" link table -- this sums the real
//                          balance of whatever account(s) the matching
//                          categories are actually linked to (deduped, so
//                          two categories sharing one brokerage account
//                          aren't double-counted).
//   liveBalanceKnown    -- false when nothing in scope has a real account
//                          linked yet, so the UI can omit the row instead
//                          of showing a misleading $0.
//
// The monthly contribution used for Scenario 3 is not computed here --
// it's a plain editable number input on the card itself (default $50),
// so this route doesn't need to know about simple_profiles account age or
// lifetime contribution averages.
export async function GET(request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const { searchParams } = new URL(request.url);
  // "Retirement (Side Income)" (added Sept 2026, see GROUPED_BUCKETS in
  // lib/allocations.js) is W2-With-Side-Hustle's Solo 401k group, separate
  // from the plain "Retirement" workplace lineup -- needs to be accepted
  // here too, not just coerced into "Investments" the way any other
  // unrecognized group string is.
  const rawGroup = searchParams.get("group");
  const group = rawGroup === "Retirement" || rawGroup === "Retirement (Side Income)" ? rawGroup : "Investments";
  const retirementType = searchParams.get("retirementType"); // "solo_401k" | "sep_ira" | null

  const [{ data: rules }, { data: allocRows }, { data: withdrawalRows }, { data: accountRows }, { data: retirementLinkRows }] = await Promise.all([
    admin
      .from("simple_split_rules_percent")
      .select("label, group_name, retirement_type, starting_balance, account_id")
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
    admin.from("simple_retirement_accounts").select("retirement_type, account_id").eq("user_id", user.id),
  ]);

  const accountBalanceById = {};
  (accountRows || []).forEach((a) => {
    accountBalanceById[a.id] = Number(a.current_balance) || 0;
  });

  const grouped = new Set(
    (rules || [])
      .filter((r) => r.group_name === group && (!retirementType || r.retirement_type === retirementType))
      .map((r) => r.label)
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

  // Real accounts backing this scope, deduped -- see the liveBalance
  // comment above for why Retirement and Investments resolve this
  // differently.
  const realAccountIds = new Set();
  if (group === "Retirement" || group === "Retirement (Side Income)") {
    (retirementLinkRows || [])
      .filter((r) => !retirementType || r.retirement_type === retirementType)
      .forEach((r) => realAccountIds.add(r.account_id));
  } else {
    (rules || []).forEach((r) => {
      if (grouped.has(r.label) && r.account_id) realAccountIds.add(r.account_id);
    });
  }
  const liveBalance = [...realAccountIds].reduce((s, id) => s + (accountBalanceById[id] || 0), 0);

  return Response.json({
    startingOnly,
    currentTotalFrozen,
    hasGroupedCategories: grouped.size > 0,
    liveBalance,
    liveBalanceKnown: realAccountIds.size > 0,
  });
}
