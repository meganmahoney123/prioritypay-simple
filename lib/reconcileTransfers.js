import { decryptToken } from "@/lib/tokenCrypto";
import { getTransactionsForRange } from "@/lib/plaidSync";

// How long an 'in_transit' allocation goes before reconciliation bothers
// Plaid about it again. This runs opportunistically from GET /api/accounts
// (see the call site there) -- without a throttle, someone with a
// stubborn in-transit line who checks their dashboard five times a day
// would trigger five transactionsGet calls a day for the same unresolved
// row. An hour is generous relative to how fast ACH actually moves (1-3
// business days), so this never meaningfully delays a real match.
const RECHECK_INTERVAL_MS = 60 * 60 * 1000;

// Small dollar tolerance so a transfer that posts a few cents off (a fee
// shaved off somewhere, a rounding difference) still matches. Not a
// percentage -- these are small dollar amounts by nature (a slice of one
// deposit), so a flat tolerance is simpler and safer than a percentage
// that'd get sloppy on larger amounts.
const AMOUNT_TOLERANCE = 1;

// Looks for a real, already-landed Plaid transaction matching each
// 'in_transit' allocation for this user, and flips matches to 'completed'
// + sets settled_at. This is what keeps category totals honestly aligned
// with what Plaid can actually see, instead of trusting "I sent this"
// forever -- see PHASE S, supabase/schema.sql, and the confirm route's
// comment for the full reasoning. Deliberately best-effort: any Plaid
// error for one account is caught and logged, never thrown, so a
// reconciliation hiccup never breaks the page that called this (currently
// only GET /api/accounts).
export async function reconcileInTransitAllocations(admin, userId) {
  const now = Date.now();

  const { data: allocations } = await admin
    .from("simple_transfer_allocations")
    .select("id, amount, dest_account_id, confirmed_at, reconcile_checked_at, simple_transfers!inner(user_id)")
    .eq("simple_transfers.user_id", userId)
    .eq("status", "in_transit")
    .not("dest_account_id", "is", null);

  const due = (allocations || []).filter(
    (a) => !a.reconcile_checked_at || now - new Date(a.reconcile_checked_at).getTime() > RECHECK_INTERVAL_MS
  );
  if (!due.length) return;

  const destAccountIds = [...new Set(due.map((a) => a.dest_account_id))];
  const { data: destAccounts } = await admin
    .from("simple_accounts")
    .select("id, plaid_access_token, plaid_account_id")
    .in("id", destAccountIds);
  const accountsById = Object.fromEntries((destAccounts || []).map((a) => [a.id, a]));

  const byAccount = {};
  due.forEach((a) => {
    (byAccount[a.dest_account_id] ||= []).push(a);
  });

  for (const [accountId, rows] of Object.entries(byAccount)) {
    const account = accountsById[accountId];
    if (!account?.plaid_access_token || !account?.plaid_account_id) continue;

    const checkedAtIso = new Date().toISOString();
    let transactions = [];
    try {
      const accessToken = decryptToken(account.plaid_access_token);
      const earliest = rows.reduce((min, r) => (r.confirmed_at && r.confirmed_at < min ? r.confirmed_at : min), rows[0].confirmed_at || checkedAtIso);
      const startDate = new Date(earliest);
      startDate.setDate(startDate.getDate() - 1);
      transactions = await getTransactionsForRange(
        accessToken,
        startDate.toISOString().slice(0, 10),
        new Date().toISOString().slice(0, 10)
      );
    } catch (err) {
      console.error("[reconcileTransfers] fetch failed for account", accountId, err?.response?.data || err?.message);
      continue;
    }

    // Plaid convention: a negative amount is money added to the account
    // (a credit/deposit), positive is money leaving it.
    const credits = transactions.filter((t) => t.account_id === account.plaid_account_id && t.amount < 0);
    const usedTransactionIds = new Set();

    for (const row of rows) {
      const rowConfirmedDate = row.confirmed_at ? row.confirmed_at.slice(0, 10) : null;
      const match = credits.find(
        (t) =>
          !usedTransactionIds.has(t.transaction_id) &&
          Math.abs(Math.abs(t.amount) - Number(row.amount)) <= AMOUNT_TOLERANCE &&
          (!rowConfirmedDate || t.date >= rowConfirmedDate)
      );

      if (match) {
        usedTransactionIds.add(match.transaction_id);
        await admin
          .from("simple_transfer_allocations")
          .update({ status: "completed", settled_at: checkedAtIso, reconcile_checked_at: checkedAtIso })
          .eq("id", row.id);
      } else {
        await admin
          .from("simple_transfer_allocations")
          .update({ reconcile_checked_at: checkedAtIso })
          .eq("id", row.id);
      }
    }
  }
}
