import { supabaseAdmin } from "@/lib/supabaseServer";
import { syncNewTransactions } from "@/lib/plaidSync";
import { runSplit } from "@/lib/runSplit";
import { decryptToken, encryptToken, isLegacyPlaintext } from "@/lib/tokenCrypto";
import { matchInTransitAllocation, markAllocationCompleted, maybeRecordNearMissCandidate } from "@/lib/reconcileTransfers";

// This is what makes PriorityPay actually live up to "splits the moment it
// hits your account," instead of requiring someone to open Payments and
// click a button. Plaid calls this URL (registered via the `webhook` param
// on linkTokenCreate) whenever something changes on a linked Item; we only
// act on TRANSACTIONS / SYNC_UPDATES_AVAILABLE, which means new data is
// ready via /transactions/sync.
//
// Every account keeps its own sync cursor (accounts.plaid_cursor). The
// very first time we ever sync an account (cursor is null/empty), Plaid's
// /transactions/sync returns its whole visible transaction history as
// "added" -- that's not new deposits, that's backlog, so this first pass
// just establishes the baseline cursor and doesn't split anything. From
// the *next* sync onward, "added" really does mean newly posted, and each
// qualifying (non-pending, money-in) transaction is run through the same
// split logic as the manual button -- fully automatically.
//
// This also self-heals a real Plaid quirk: right after linking or
// granting a new product, Plaid's backend hasn't necessarily finished its
// initial data pull yet, so a sync can come back with an empty cursor
// ("not ready yet"). Since accounts.plaid_cursor stays effectively falsy
// until a real cursor comes back, every webhook delivery in the meantime
// safely retries the baseline step instead of misfiring.
export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ ok: true });
  }

  const { webhook_type, webhook_code, item_id } = payload || {};
  if (webhook_type !== "TRANSACTIONS" || webhook_code !== "SYNC_UPDATES_AVAILABLE" || !item_id) {
    return Response.json({ ok: true });
  }

  const admin = supabaseAdmin();

  const { data: accounts } = await admin
    .from("simple_accounts")
    .select("id, user_id, plaid_access_token, plaid_account_id, plaid_cursor, current_balance, balance_reconciled_at")
    .eq("plaid_item_id", item_id);

  if (!accounts || accounts.length === 0) {
    console.warn("Plaid webhook for unknown item_id:", item_id);
    return Response.json({ ok: true });
  }

  for (const account of accounts) {
    const isBaseline = !account.plaid_cursor;
    try {
      const wasLegacyPlaintext = isLegacyPlaintext(account.plaid_access_token);
      const accessToken = decryptToken(account.plaid_access_token);
      // Self-healing migration to encrypted-at-rest (see lib/tokenCrypto.js)
      // -- every actively-used account gets a webhook delivery on basically
      // every new transaction, so re-saving a legacy plaintext token here
      // converges the whole table to encrypted form with no backfill script.
      if (wasLegacyPlaintext) {
        await admin
          .from("simple_accounts")
          .update({ plaid_access_token: encryptToken(accessToken) })
          .eq("id", account.id);
      }
      const { added, cursor } = await syncNewTransactions(accessToken, account.plaid_cursor || null);

      if (isBaseline) {
        console.log(
          `Baseline sync for account ${account.id}: consumed ${added.length} historical transaction(s), cursor ${
            cursor ? "established" : "still not ready -- will retry next delivery"
          }.`
        );
      } else {
        // Ledger balance maintenance (see PHASE K, supabase/schema.sql):
        // apply every newly-POSTED transaction on this account -- not just
        // deposits, every direction -- to current_balance, so the figure
        // shown in the UI stays live without a separate Balance API call.
        // Only runs once an account has a real seeded baseline
        // (balance_reconciled_at set by GET /api/accounts's first live
        // check); before that, there's nothing correct to adjust from, so
        // it's left alone until that first live call happens.
        //
        // Deliberately only `added`, matching syncNewTransactions' own
        // scope -- a transaction that later gets modified (a pending
        // charge settling for a different amount) or removed won't be
        // reflected here. That's the accepted trade-off: the periodic
        // reconciliation in app/api/accounts/route.js corrects any drift
        // this causes. Pending transactions ARE included in this sum
        // (unlike the deposit-split filter below), since Plaid's own
        // available balance already reflects pending holds -- excluding
        // them here would make the ledger drift the other direction.
        if (account.balance_reconciled_at && account.current_balance !== null) {
          const accountTxns = added.filter((t) => t.account_id === account.plaid_account_id);
          if (accountTxns.length) {
            const netOut = accountTxns.reduce((sum, t) => sum + t.amount, 0);
            const newBalance = Number(account.current_balance) - netOut;
            await admin
              .from("simple_accounts")
              .update({ current_balance: newBalance, balance_updated_at: new Date().toISOString() })
              .eq("id", account.id);
            account.current_balance = newBalance;
          }
        }

        // Plaid's convention for depository accounts: negative amount =
        // money moving in (a deposit). Positive = money moving out.
        // Pending transactions get skipped -- we wait for them to post so
        // we're splitting a real, settled amount, not one that could
        // still change.
        const deposits = added.filter(
          (t) => t.account_id === account.plaid_account_id && !t.pending && t.amount < 0
        );

        // Before treating any of these "deposits" as fresh income, check
        // whether it's actually the OTHER side of a real cross-account
        // transfer the user already told us about (a One-Time Transfer or
        // Close-Out, tracked via simple_transfer_allocations' needs_approval
        // -> in_transit -> completed flow -- see lib/closeoutTransfer.js
        // and app/(app)/transfers/page.js). That money already got split
        // once when it left the source account; running it through
        // runSplit again here would double-split it and fire an incorrect
        // "you got a deposit!" alert. Same matching rules as
        // lib/reconcileTransfers.js's hourly sweep (amount tolerance +
        // confirmed_at date floor), shared via matchInTransitAllocation so
        // there's exactly one place that logic lives. This is purely a
        // faster path than the hourly reconciler -- if the reconciler gets
        // there first, this query just finds nothing 'in_transit' left to
        // match, so there's no double-processing either way.
        let inTransitRows = [];
        if (deposits.length) {
          const { data } = await admin
            .from("simple_transfer_allocations")
            .select("id, amount, transfer_id, dest_account_id, dest_account_label, confirmed_at, candidate_transaction_id, candidate_last_dismissed_transaction_id")
            .eq("dest_account_id", account.id)
            .eq("status", "in_transit");
          inTransitRows = data || [];
        }
        const usedTransactionIds = new Set();

        for (const txn of deposits) {
          const matchedRow = inTransitRows.find((row) =>
            matchInTransitAllocation({
              amount: txn.amount,
              date: txn.date,
              transactionId: txn.transaction_id,
              allocationRow: row,
              usedTransactionIds,
            })
          );

          if (matchedRow) {
            usedTransactionIds.add(txn.transaction_id);
            // Remove it from the candidate pool so a second real deposit in
            // this same delivery can't also match it.
            inTransitRows = inTransitRows.filter((r) => r.id !== matchedRow.id);
            const settledAtIso = new Date().toISOString();
            await markAllocationCompleted(admin, matchedRow, settledAtIso);
            console.log(`Matched incoming transfer ${txn.transaction_id} to in-transit allocation ${matchedRow.id} -- marked completed, skipped auto-split.`);
            continue;
          }

          // No exact match -- but this deposit might still be an
          // under/over-sent version of a transfer the user already
          // confirmed (see lib/reconcileTransfers.js's near-miss
          // candidate logic). Only proposes a candidate when exactly one
          // in_transit row for this account plausibly explains it; if so,
          // hold off on auto-splitting it as fresh income (same reasoning
          // as an exact match -- this money may already have been
          // accounted for once when it left the source account) until the
          // user confirms or dismisses the "is this your transfer?"
          // prompt this creates on the dashboard.
          const nearMissRow = await maybeRecordNearMissCandidate(admin, {
            transactionId: txn.transaction_id,
            amount: txn.amount,
            date: txn.date,
            candidateRows: inTransitRows,
          });
          if (nearMissRow) {
            console.log(`Recorded near-miss candidate ${txn.transaction_id} on in-transit allocation ${nearMissRow.id} -- waiting on user confirm/dismiss, skipped auto-split.`);
            continue;
          }

          const result = await runSplit({
            admin,
            userId: account.user_id,
            amount: Math.abs(txn.amount),
            sourceAccountId: account.id,
            trigger: "auto_deposit",
            plaidTransactionId: txn.transaction_id,
          });
          if (result.error) {
            console.error("Auto-split failed for transaction", txn.transaction_id, result.error);
          } else if (result.skipped) {
            console.log("Auto-split skipped (already processed):", txn.transaction_id);
          } else {
            console.log(`Auto-split ran for deposit ${txn.transaction_id}: $${Math.abs(txn.amount)}`);
          }
        }

        // Note: deposit detection, split calculation, and the "send $X to
        // Y" checklist above are entirely driven by Transactions, not
        // Balance -- none of that depends on the ledger update above being
        // perfectly accurate. That update exists purely so the cosmetic
        // "current balance" figure in the UI stays live without a
        // dedicated Balance API call per account per page view (see PHASE
        // K, supabase/schema.sql, and app/api/accounts/route.js).
      }

      await admin.from("simple_accounts").update({ plaid_cursor: cursor }).eq("id", account.id);
    } catch (err) {
      console.error("Plaid webhook sync failed for account", account.id, err?.response?.data || err);
    }
  }

  return Response.json({ ok: true });
}
