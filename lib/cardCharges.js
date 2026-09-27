import { ensureCloseoutForPeriod } from "@/lib/closeoutSync";

// DESIGN DECISION (confirmed, not left implicit): this file tracks card
// charges on an ACCRUAL basis -- a charge counts against Guilt-Free
// Spending the moment it POSTS, not whenever the statement actually gets
// paid off. This is intentional and stays correct for someone who revolves
// a balance, not just someone who pays in full every month: the point of
// subtracting a card charge here isn't "how much cash do I have," it's
// "how much of this period's money is already spoken for" -- reserving it
// the moment the debt is incurred, one period at a time. A charge from a
// PRIOR period already reserved its own dollar out of THAT period's
// Guilt-Free number; if this file instead waited for the cash payment, an
// unpaid balance would either never get reserved (if payment is delayed
// past the period the charge posted in) or get reserved a second time (if
// the later cash payment also counted here) -- both worse than the
// current behavior. This is also why a card PAYMENT (money moving from
// checking to settle the card) must never reduce gross charges below
// (isCardPaymentLike, used in computeCardChargesForPeriod) -- that would
// double-release a dollar the instant the bill gets paid, exactly the
// failure mode above.
//
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

// A negative-amount (direction:"in") transaction on a credit account is
// EITHER a real merchant refund (should net against gross card charges,
// same dollar shouldn't stay "reserved" once the purchase it funded got
// undone) OR a payment settling the balance from checking (already
// reserved for when it was charged -- must never ALSO reduce gross, that
// would double-release the same dollar the moment the bill gets paid).
// Plaid represents both identically as "money moving into the card," so
// this is the one place that distinguishes them, using the same raw
// personal_finance_category lib/closeoutSync.js now persists per
// transaction (pfc_primary/pfc_detailed -- see
// supabase/migrations/20260927_closeout_pfc.sql). A payment/transfer shows
// up as LOAN_PAYMENTS, a TRANSFER_IN/OUT, or a detailed value naming the
// credit-card-payment type; anything else with a negative amount here is
// left as a refund by elimination. suggestCategory() in closeoutSync.js
// can't be reused for this -- it deliberately lumps both cases into one
// "exclude" bucket for Close-Out's income/expense purposes, which is the
// right call there but loses exactly the distinction this needs.
function isCardPaymentLike(pfcPrimary, pfcDetailed) {
  if (pfcPrimary === "LOAN_PAYMENTS" || pfcPrimary === "TRANSFER_IN" || pfcPrimary === "TRANSFER_OUT") return true;
  if ((pfcDetailed || "").includes("CREDIT_CARD_PAYMENT")) return true;
  return false;
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
  if (!creditAccountIds.size) return { grossCardCharges: 0, refundedCardCharges: 0, excludedByWithdrawal: 0, netCardCharges: 0 };

  const cardTxns = (transactions || []).filter((t) => creditAccountIds.has(t.account_id) && t.direction === "out");
  const grossChargesOnly = cardTxns.reduce((s, t) => s + (Number(t.amount) || 0), 0);

  // Only transactions imported after supabase/migrations/20260927_closeout_pfc.sql
  // carry pfc_primary/pfc_detailed -- an older row (both columns null) is
  // simply never treated as a refund, same as before this fix (no netting,
  // not a false positive either way).
  const cardRefunds = (transactions || []).filter(
    (t) => creditAccountIds.has(t.account_id) && t.direction === "in" && !isCardPaymentLike(t.pfc_primary, t.pfc_detailed)
  );
  const refundedCardCharges = cardRefunds.reduce((s, t) => s + (Number(t.amount) || 0), 0);

  const grossCardCharges = Math.max(0, grossChargesOnly - refundedCardCharges);
  if (!cardTxns.length) return { grossCardCharges, refundedCardCharges, excludedByWithdrawal: 0, netCardCharges: grossCardCharges };

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
    refundedCardCharges,
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
