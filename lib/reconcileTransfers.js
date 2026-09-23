import { decryptToken } from "@/lib/tokenCrypto";
import { getTransactionsForRange } from "@/lib/plaidSync";
import { sendTransferLandedSms } from "@/lib/sms";
import { sendTransferLandedEmail } from "@/lib/email";
import { sendTransferLandedPush } from "@/lib/push";

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
export const AMOUNT_TOLERANCE = 1;

// Shared matching logic between this file's own hourly sweep and the
// webhook's inline check (app/api/plaid/webhook/route.js). Given a list of
// already-fetched Plaid transactions considered "credits" to `accountId`
// (Plaid convention: negative amount = money added), finds the single
// best 'in_transit' allocation row (already loaded by the caller) that a
// given real transaction (amount + date) matches, honoring:
//   - AMOUNT_TOLERANCE dollars
//   - the transaction date must be on/after the allocation's confirmed_at
//     (a transfer can't be matched to a transaction that posted before it
//     was even marked as sent)
//   - usedTransactionIds, so the same real transaction is never matched to
//     two different pending allocations in one pass
//
// This is intentionally just the "does (amount, date) match this one
// candidate row" question, called once per candidate row by both callers,
// so there is exactly one place amount tolerance + date logic lives.
export function matchInTransitAllocation({ amount, date, transactionId, allocationRow, usedTransactionIds }) {
  if (usedTransactionIds.has(transactionId)) return false;
  const rowConfirmedDate = allocationRow.confirmed_at ? allocationRow.confirmed_at.slice(0, 10) : null;
  const amountMatches = Math.abs(Math.abs(amount) - Number(allocationRow.amount)) <= AMOUNT_TOLERANCE;
  const dateMatches = !rowConfirmedDate || date >= rowConfirmedDate;
  return amountMatches && dateMatches;
}

// Marks an 'in_transit' allocation row as landed, and fires the
// "your transfer landed" notification -- deliberately distinct from the
// normal deposit alert (see lib/sms.js / lib/email.js / lib/push.js's
// sendTransferLanded* functions and lib/runSplit.js's sendDepositAlert*
// for why these must never be confused: one says "new money showed up
// and here's the split," the other says "the transfer you already knew
// about arrived").
export async function markAllocationCompleted(admin, row, settledAtIso) {
  await admin
    .from("simple_transfer_allocations")
    .update({ status: "completed", settled_at: settledAtIso, reconcile_checked_at: settledAtIso })
    .eq("id", row.id);

  // Mirrors the "was this the last needs_approval line?" check already in
  // confirm/route.js and skip/route.js. A completed row is neither
  // needs_approval nor in_transit, so re-using that exact same check is
  // still correct here -- nothing about this new status changes what
  // "still waiting on the user" means for the parent transfer.
  if (row.transfer_id) {
    const { data: remaining } = await admin
      .from("simple_transfer_allocations")
      .select("id")
      .eq("transfer_id", row.transfer_id)
      .eq("status", "needs_approval");

    if (!remaining || remaining.length === 0) {
      await admin.from("simple_transfers").update({ status: "completed" }).eq("id", row.transfer_id);
    }
  }

  // Best-effort notification -- never let a notification failure undo or
  // block the status flip above.
  try {
    await notifyTransferLanded(admin, row);
  } catch (err) {
    console.error("[transfer-landed notify] failed for allocation", row.id, err);
  }
}

async function notifyTransferLanded(admin, row) {
  // row comes from either this file's own query or the webhook's, so it
  // may or may not already carry the user's notification prefs -- look
  // them up fresh via the parent transfer, same join + simple_profiles
  // shape runSplit.js's own deposit-alert block uses.
  const { data: transferRow } = await admin
    .from("simple_transfers")
    .select("user_id")
    .eq("id", row.transfer_id)
    .single();
  const userId = transferRow?.user_id;
  if (!userId) return;

  const { data: profile } = await admin
    .from("simple_profiles")
    .select("phone_number, sms_notifications_enabled, sms_threshold, email_notifications_enabled, alert_email")
    .eq("id", userId)
    .single();
  if (!profile) return;

  const amount = Number(row.amount);
  const destLabel = row.dest_account_label || "your account";
  // Same shared dollar-threshold column as runSplit.js's deposit alerts --
  // someone who set a $100 minimum for "money showed up" alerts shouldn't
  // get buzzed for a $12 transfer landing either. A never-configured
  // (null) threshold means every landing notifies, same convention as
  // runSplit.js.
  const threshold = profile.sms_threshold === null || profile.sms_threshold === undefined ? 0 : Number(profile.sms_threshold);
  if (amount < threshold) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://prioritypay.co";
  const dashboardUrl = `${appUrl}/dashboard`;

  const sends = [];
  if (profile.sms_notifications_enabled && profile.phone_number) {
    sends.push(sendTransferLandedSms({ phoneNumber: profile.phone_number, amount, destLabel, dashboardUrl }));
  }
  if (profile.email_notifications_enabled) {
    let toEmail = profile.alert_email || null;
    if (!toEmail) {
      const { data: authUser } = await admin.auth.admin.getUserById(userId);
      toEmail = authUser?.user?.email;
    }
    if (toEmail) sends.push(sendTransferLandedEmail({ toEmail, amount, destLabel, dashboardUrl }));
  }
  const { data: pushTokens } = await admin.from("simple_push_tokens").select("token").eq("user_id", userId);
  (pushTokens || []).forEach((t) => {
    sends.push(sendTransferLandedPush({ token: t.token, amount, destLabel, dashboardUrl }));
  });

  await Promise.all(sends);
}

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
    .select("id, amount, transfer_id, dest_account_id, dest_account_label, confirmed_at, reconcile_checked_at, simple_transfers!inner(user_id)")
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
      const match = credits.find((t) =>
        matchInTransitAllocation({
          amount: t.amount,
          date: t.date,
          transactionId: t.transaction_id,
          allocationRow: row,
          usedTransactionIds,
        })
      );

      if (match) {
        usedTransactionIds.add(match.transaction_id);
        await markAllocationCompleted(admin, row, checkedAtIso);
      } else {
        await admin
          .from("simple_transfer_allocations")
          .update({ reconcile_checked_at: checkedAtIso })
          .eq("id", row.id);
      }
    }
  }
}
