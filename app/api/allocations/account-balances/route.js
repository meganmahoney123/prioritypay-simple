import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

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
// Accounts with zero linked categories are omitted from the response
// entirely; the Accounts page just skips rendering a chart for those.
export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const [{ data: rules }, { data: allocRows }, { data: withdrawalRows }, { data: lastCloseout }, { data: pendingTxns }] =
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
        .neq("status", "needs_approval"),
      admin
        .from("simple_withdrawal_allocations")
        .select("label, amount, source_type, simple_withdrawals!inner(user_id)")
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
    ]);

  // label -> account_id, so the (net) transfer/withdrawal passes below
  // can attribute dollars to the right account without a second query.
  const accountByLabel = {};
  const balanceByLabel = {};
  (rules || []).forEach((r) => {
    accountByLabel[r.label] = r.account_id;
    balanceByLabel[r.label] = (balanceByLabel[r.label] || 0) + (Number(r.starting_balance) || 0);
  });
  (allocRows || []).forEach((r) => {
    if (!(r.label in accountByLabel)) return;
    balanceByLabel[r.label] = (balanceByLabel[r.label] || 0) + (Number(r.amount) || 0);
  });
  (withdrawalRows || []).forEach((r) => {
    if (!r.label || !(r.label in accountByLabel)) return;
    balanceByLabel[r.label] = (balanceByLabel[r.label] || 0) - (Number(r.amount) || 0);
  });

  const uncategorizedByAccount = {};
  (pendingTxns || []).forEach((t) => {
    if (!t.account_id) return;
    uncategorizedByAccount[t.account_id] = (uncategorizedByAccount[t.account_id] || 0) + 1;
  });

  const byAccount = {};
  Object.entries(balanceByLabel).forEach(([label, balance]) => {
    const accountId = accountByLabel[label];
    if (!accountId) return;
    if (!byAccount[accountId]) byAccount[accountId] = [];
    byAccount[accountId].push({ label, balance });
  });

  const accounts = Object.entries(byAccount).map(([accountId, categories]) => ({
    accountId,
    lastCloseoutAt: lastCloseout?.confirmed_at || null,
    uncategorizedCount: uncategorizedByAccount[accountId] || 0,
    categories,
    totalBalance: categories.reduce((s, c) => s + c.balance, 0),
  }));

  return Response.json({ accounts });
}
