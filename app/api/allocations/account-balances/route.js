import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// Plaid's investment/retirement account subtypes -- an account with one of
// these fluctuates with the market (or, for retirement ones, is also
// subject to contribution/withdrawal rules outside this app's control),
// so "categorized total > real balance" there is much more likely to mean
// "you've put in more than it's currently worth" than an actual
// bookkeeping mistake. Everything else (checking, savings, CD, money
// market, prepaid, or unknown) keeps the "check for a mistake" framing,
// since a plain deposit account's balance only moves by real dollars
// actually entering or leaving it.
const MARKET_BASED_SUBTYPES = new Set([
  "401k", "401a", "403b", "457b", "529", "brokerage", "cash isa", "crypto exchange",
  "education savings account", "fixed annuity", "gic", "health reimbursement arrangement",
  "hsa", "isa", "ira", "lif", "lira", "lrif", "lrsp", "mutual fund", "non-taxable brokerage account",
  "pension", "prif", "profit sharing plan", "rdsp", "resp", "retirement", "rlif", "roth",
  "roth 401k", "rrif", "rrsp", "sarsep", "sep ira", "simple ira", "sipp", "stock plan",
  "thrift savings plan", "tfsa", "trust", "ugma", "utma", "variable annuity",
]);

// Per-account breakdown of category balances, for the small pie chart
// under each account Card on the Accounts page (components/
// AccountCategoryBreakdown.js). Same current-balance math as
// /api/allocations/balances (starting_balance + lifetime
// transfer_allocations - lifetime category-sourced withdrawal_
// allocations, matched by label), just grouped by
// simple_split_rules_percent.account_id instead of flattened to one
// number per label. Only categories with a non-null account_id are
// included -- a category with no linked account isn't "in" any account
// yet, so it has nothing to contribute to this view.
//
// Each account entry also carries two "how stale is this" signals so the
// component can flag it rather than silently show a number that doesn't
// match what's actually in the bank right now:
//   lastCloseoutAt    -- confirmed_at of this user's most recently
//                         CONFIRMED monthly close-out (simple_monthly_
//                         closeouts), or null if they've never confirmed
//                         one. The category balances above are always
//                         live/real-time regardless of close-out status --
//                         this is just displayed as a "current as of"
//                         caveat since categorization (and therefore the
//                         label a dollar sits under) can still shift
//                         between close-outs.
//   uncategorizedCount -- count of this account's simple_closeout_
//                         transactions rows still sitting at
//                         confirmed_category = null (the same "pending"
//                         definition the Close-Out page itself uses) --
//                         a signal that recent activity on this account
//                         hasn't been fully accounted for yet.
//
// Every non-credit, non-business account is included, even ones with ZERO
// linked categories -- those still get a chart, just 100% "Unallocated"
// (see the accounts loop below, which now iterates every eligible account
// rather than only ones that show up in byAccount). A depository/
// investment account is never invisible on the Accounts page just because
// nothing's been categorized into it yet.
//
// Each category also carries its RAW balance (which can go negative if a
// withdrawal overdrew it -- e.g. spent more on Wedding than Wedding had)
// alongside a DISPLAY balance/pct clamped to zero, per an explicit product
// decision: a category that's been spent past zero still shows up in the
// account's pie at $0 / 0%, not as a negative slice. `overdrawnBy` on that
// category is how much past zero it went, so the UI can prompt "where did
// the extra money come from" (see POST /api/allocations/category-transfer)
// instead of just silently clamping. The account's own real balance
// (simple_accounts.current_balance) is included as `accountBalance`, and
// `unallocated` is whatever's left of that real balance once every
// category's (clamped) claim is subtracted -- money physically sitting in
// the account that isn't earmarked for any category yet.
export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const [{ data: rules }, { data: allocRows }, { data: withdrawalRows }, { data: lastCloseout }, { data: pendingTxns }, { data: accountRows }] =
    await Promise.all([
      admin
        .from("simple_split_rules_percent")
        .select("label, account_id, starting_balance")
        .eq("user_id", user.id)
        .not("account_id", "is", null),
      admin
        .from("simple_transfer_allocations")
        .select("label, amount, simple_transfers!inner(user_id, status)")
        .eq("simple_transfers.user_id", user.id)
        .neq("status", "failed")
        .neq("status", "needs_approval")
    .neq("status", "skipped"),
      admin
        .from("simple_withdrawal_allocations")
        .select("label, amount, source_type, simple_withdrawals!inner(user_id, occurred_at)")
        .eq("simple_withdrawals.user_id", user.id)
        .eq("source_type", "category"),
      admin
        .from("simple_monthly_closeouts")
        .select("confirmed_at")
        .eq("user_id", user.id)
        .not("confirmed_at", "is", null)
        .order("confirmed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from("simple_closeout_transactions")
        .select("account_id")
        .eq("user_id", user.id)
        .is("confirmed_category", null),
      // Manual top-ups/category-to-category transfers (see
      // simple_manual_contributions / POST /api/allocations/manual-
      // contribution and /api/allocations/category-transfer) also affect a
      // category's balance here -- covered below via a second pass rather
      // than a third query, since it shares the same table as the
      // Dashboard's category-summary route.
      admin.from("simple_accounts").select("id, current_balance, subtype, account_type").eq("user_id", user.id),
    ]);

  const { data: manualRows } = await admin
    .from("simple_manual_contributions")
    .select("label, amount, note, occurred_at")
    .eq("user_id", user.id);

  // label -> account_id, so the (net) transfer/withdrawal passes below
  // can attribute dollars to the right account without a second query.
  const accountByLabel = {};
  const balanceByLabel = {};
  // Same totals as balanceByLabel, but split out by SOURCE instead of
  // summed together -- only used to build `breakdown` below, so a person
  // staring at an "over the real balance" warning can see which of the
  // four ingredients (a starting balance entered too high, a real
  // transfer, a manual one-time contribution, or a withdrawal recorded
  // against the wrong category) is actually driving the drift, instead of
  // just being told a discrepancy exists. See componentsByLabel usage
  // further down.
  const componentsByLabel = {};
  const ensureComponents = (label) =>
    (componentsByLabel[label] ||= { startingBalance: 0, transferAllocations: 0, manualContributions: 0, withdrawals: 0, recentManual: [], recentWithdrawals: [] });
  (rules || []).forEach((r) => {
    accountByLabel[r.label] = r.account_id;
    balanceByLabel[r.label] = (balanceByLabel[r.label] || 0) + (Number(r.starting_balance) || 0);
    ensureComponents(r.label).startingBalance += Number(r.starting_balance) || 0;
  });
  (allocRows || []).forEach((r) => {
    if (!(r.label in accountByLabel)) return;
    balanceByLabel[r.label] = (balanceByLabel[r.label] || 0) + (Number(r.amount) || 0);
    ensureComponents(r.label).transferAllocations += Number(r.amount) || 0;
  });
  (manualRows || []).forEach((r) => {
    if (!(r.label in accountByLabel)) return;
    balanceByLabel[r.label] = (balanceByLabel[r.label] || 0) + (Number(r.amount) || 0);
    const c = ensureComponents(r.label);
    c.manualContributions += Number(r.amount) || 0;
    c.recentManual.push({ amount: Number(r.amount) || 0, note: r.note || null, occurredAt: r.occurred_at });
  });
  (withdrawalRows || []).forEach((r) => {
    if (!r.label || !(r.label in accountByLabel)) return;
    balanceByLabel[r.label] = (balanceByLabel[r.label] || 0) - (Number(r.amount) || 0);
    const c = ensureComponents(r.label);
    c.withdrawals += Number(r.amount) || 0;
    c.recentWithdrawals.push({ amount: Number(r.amount) || 0, occurredAt: r.simple_withdrawals?.occurred_at || null });
  });
  // Trim each category's recent-activity lists to the 3 most recent so the
  // response stays small -- these are diagnostic hints, not a full ledger.
  Object.values(componentsByLabel).forEach((c) => {
    c.recentManual = c.recentManual.sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt)).slice(0, 3);
    c.recentWithdrawals = c.recentWithdrawals.sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt)).slice(0, 3);
  });

  const uncategorizedByAccount = {};
  (pendingTxns || []).forEach((t) => {
    if (!t.account_id) return;
    uncategorizedByAccount[t.account_id] = (uncategorizedByAccount[t.account_id] || 0) + 1;
  });

  const accountBalanceById = {};
  const accountSubtypeById = {};
  (accountRows || []).forEach((a) => {
    accountBalanceById[a.id] = Number(a.current_balance) || 0;
    accountSubtypeById[a.id] = a.subtype || null;
  });
  // Credit and business accounts get their own dedicated UI on the
  // Accounts page (spending/visibility notices, not a category pie) and
  // are never a split-rule destination in the first place, so they're
  // excluded here same as everywhere else category balances are computed.
  const eligibleAccountIds = (accountRows || [])
    .filter((a) => a.account_type !== "credit" && a.account_type !== "business")
    .map((a) => a.id);

  const byAccount = {};
  Object.entries(balanceByLabel).forEach(([label, rawBalance]) => {
    const accountId = accountByLabel[label];
    if (!accountId) return;
    if (!byAccount[accountId]) byAccount[accountId] = [];
    byAccount[accountId].push({
      label,
      balance: Math.max(0, rawBalance),
      rawBalance,
      overdrawnBy: rawBalance < 0 ? Math.abs(rawBalance) : 0,
      breakdown: componentsByLabel[label] || null,
    });
  });

  const accounts = eligibleAccountIds.map((accountId) => {
    const categories = byAccount[accountId] || [];
    const accountBalance = accountBalanceById[accountId] ?? null;
    const categorized = categories.reduce((s, c) => s + c.balance, 0);
    const unallocated = accountBalance === null ? null : Math.max(0, accountBalance - categorized);
    // Percent of the ACCOUNT's real balance, not just of what's
    // categorized -- so the pie always reads as "100% of what's actually
    // in this account," Unallocated slice included, per spec. BUT: the
    // category ledger (starting_balance + contributions - withdrawals,
    // computed above) can drift ahead of Plaid's real current_balance --
    // e.g. a starting_balance entered too high, or a withdrawal recorded
    // against the wrong account -- and if it does, using the smaller real
    // balance as the denominator would push slices over 100%, which is
    // never a valid reading (a pie can't be more than whole). So the
    // denominator is whichever is LARGER: once categorized balances
    // exceed the real balance, the categorized total itself becomes the
    // 100% baseline (unallocated correctly reads $0/0% in that case,
    // rather than going negative), and `overCategorizedBy` flags the drift
    // so the UI can surface it instead of silently normalizing it away.
    const overCategorizedBy = accountBalance !== null ? Math.max(0, categorized - accountBalance) : 0;
    const pctBase = Math.max(accountBalance || 0, categorized) || 1;
    return {
      accountId,
      accountBalance,
      isMarketBased: MARKET_BASED_SUBTYPES.has((accountSubtypeById[accountId] || "").toLowerCase()),
      overCategorizedBy,
      lastCloseoutAt: lastCloseout?.confirmed_at || null,
      uncategorizedCount: uncategorizedByAccount[accountId] || 0,
      categories: categories.map((c) => ({ ...c, pct: Math.round((c.balance / pctBase) * 100) })),
      otherCategoryLabels: categories.map((c) => c.label),
      unallocated,
      unallocatedPct: unallocated === null ? null : Math.round((unallocated / pctBase) * 100),
      totalBalance: categorized,
    };
  });

  return Response.json({ accounts });
}
