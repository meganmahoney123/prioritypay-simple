import { ensureCloseoutForPeriod } from "@/lib/closeoutSync";

// A card charge that got matched, from the Withdrawals tab, to a specific
// category (source_type='card' withdrawal whose allocations include a
// source_type='category' row) has already reduced that category's
// balance -- so it must NOT also reduce Guilt-Free Spending / a card's
// "net owed" figure a second time. This file is the one place that
// exclusion is computed, shared by the Dashboard's per-period flow calc
// and the Accounts page's per-card all-time balance.
//
// Sums, per withdrawal id, how much of it was funded by a real tracked
// category, capped at that withdrawal's own amount so a data-entry slip
// (allocating more to categories than the withdrawal itself) can never
// over-exclude.
async function categoryFundedAmountByWithdrawalId(admin, withdrawalIds) {
  if (!withdrawalIds.length) return {};
  const { data } = await admin
    .from("simple_withdrawal_allocations")
    .select("withdrawal_id, amount")
    .eq("source_type", "category")
    .in("withdrawal_id", withdrawalIds);
  const byId = {};
  (data || []).forEach((a) => {
    byId[a.withdrawal_id] = (byId[a.withdrawal_id] || 0) + (Number(a.amount) || 0);
  });
  return byId;
}

// THIS PERIOD's net credit card charges, for the Dashboard's Guilt-Free
// flow calc (see app/api/allocations/category-summary/route.js).
// Deliberately reuses Close-Out's own transaction import
// (ensureCloseoutForPeriod) so the current, still-open period's card
// activity is pulled the moment someone looks at the Dashboard, not just
// when they visit Close-Out.
//
// NOTE: for the current (draft) period this triggers a live Plaid
// transactionsGet call per linked account on every call -- fine for a
// handful of users, but this should move to the webhook's cursor sync (or
// get a short cache) before this scales past a few real users.
export async function computeCardChargesForPeriod(admin, userId, period) {
  const { transactions } = await ensureCloseoutForPeriod(admin, userId, period);

  const { data: accounts } = await admin
    .from("simple_accounts")
    .select("id")
    .eq("user_id", userId)
    .eq("account_type", "credit");
  const creditAccountIds = new Set((accounts || []).map((a) => a.id));
  if (!creditAccountIds.size) return { grossCardCharges: 0, excludedByWithdrawal: 0, netCardCharges: 0 };

  const cardTxns = (transactions || []).filter((t) => creditAccountIds.has(t.account_id) && t.direction === "out");
  const grossCardCharges = cardTxns.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  if (!cardTxns.length) return { grossCardCharges: 0, excludedByWithdrawal: 0, netCardCharges: 0 };

  const txnIds = cardTxns.map((t) => t.id);
  const { data: cardWithdrawals } = await admin
    .from("simple_withdrawals")
    .select("id, amount, closeout_transaction_id")
    .eq("user_id", userId)
    .eq("source_type", "card")
    .in("closeout_transaction_id", txnIds);

  const categoryFundedByWithdrawalId = await categoryFundedAmountByWithdrawalId(admin, (cardWithdrawals || []).map((w) => w.id));
  const excludedByWithdrawal = (cardWithdrawals || []).reduce((sum, w) => {
    const capped = Math.min(categoryFundedByWithdrawalId[w.id] || 0, Number(w.amount) || 0);
    return sum + capped;
  }, 0);

  return {
    grossCardCharges,
    excludedByWithdrawal,
    netCardCharges: Math.max(0, grossCardCharges - excludedByWithdrawal),
  };
}

// ALL-TIME per-card balance breakdown, for the Accounts page. Pure DB
// reads, no Plaid call -- a card's live balance already reflects every
// charge and payment ever made, so "already accounted for" here is the
// all-time total of category-funded card withdrawals matched against that
// card's transactions, regardless of period (not just this month's, since
// the balance itself isn't scoped to a period either).
export async function computeCardBalances(admin, userId) {
  const { data: accounts } = await admin
    .from("simple_accounts")
    .select("id, account_name, institution_name, mask, current_balance")
    .eq("user_id", userId)
    .eq("account_type", "credit");
  if (!accounts?.length) return [];

  const { data: cardWithdrawals } = await admin
    .from("simple_withdrawals")
    .select("id, amount, simple_closeout_transactions!inner(account_id)")
    .eq("user_id", userId)
    .eq("source_type", "card");

  const categoryFundedByWithdrawalId = await categoryFundedAmountByWithdrawalId(admin, (cardWithdrawals || []).map((w) => w.id));
  const excludedByAccount = {};
  (cardWithdrawals || []).forEach((w) => {
    const accountId = w.simple_closeout_transactions?.account_id;
    if (!accountId) return;
    const capped = Math.min(categoryFundedByWithdrawalId[w.id] || 0, Number(w.amount) || 0);
    excludedByAccount[accountId] = (excludedByAccount[accountId] || 0) + capped;
  });

  return accounts.map((a) => {
    const liveBalance = a.current_balance === null || a.current_balance === undefined ? null : Number(a.current_balance);
    const excludedByWithdrawal = excludedByAccount[a.id] || 0;
    const netOwed = liveBalance === null ? null : Math.max(0, liveBalance - excludedByWithdrawal);
    return {
      accountId: a.id,
      name: `${a.institution_name || "Card"} ${a.account_name || ""} •••• ${a.mask || ""}`.trim(),
      liveBalance,
      excludedByWithdrawal,
      netOwed,
    };
  });
}
