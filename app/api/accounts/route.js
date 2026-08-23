import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { plaidClient } from "@/lib/plaid";
import { decryptToken, encryptToken, isLegacyPlaintext } from "@/lib/tokenCrypto";

// How long current_balance is trusted as a running ledger before this
// route bothers Plaid for a real reconciliation check. See PHASE K,
// supabase/schema.sql, for the full reasoning -- short version: PHASE J's
// 24-hour cache still meant a daily-active user cost one live Balance
// call ($0.10) per account per calendar day, scaling with app-opens, not
// with anything PriorityPay actually needs. Now current_balance is kept
// current by app/api/plaid/webhook adjusting it in place as each real
// transaction syncs in (data already being fetched for auto-split,
// costing nothing extra) -- this route only makes a live call to correct
// for drift (a pending charge that posts for a different amount, a fee,
// an odd hold), roughly once a month, fully decoupled from how many times
// the app gets opened. Deposit detection, split calculation, and
// deposit-alert SMS never touch Balance at all (see runSplit.js) -- only
// the cosmetic "current balance" figure is affected by any of this.
const RECONCILE_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000; // ~30 days

// Reconciles each account's ledger balance against Plaid's real Balance
// endpoint only when it's never been seeded (a brand-new account) or the
// last reconciliation has aged past RECONCILE_INTERVAL_MS -- otherwise
// serves current_balance exactly as the webhook last left it, with zero
// Plaid calls. A failed reconciliation for one account (e.g. the Item
// needs re-auth) falls back to the last known ledger value instead of
// failing the whole list.
//
// Never returns plaid_access_token or dwolla_funding_source_id to the
// client -- those stay server-side. The client only ever sees the id it
// needs to reference an account when connecting a category to it.
export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();

  const admin = supabaseAdmin();

  const { data, error } = await admin
    .from("simple_accounts")
    .select("id, institution_name, account_name, mask, current_balance, balance_updated_at, balance_reconciled_at, subtype, plaid_access_token, plaid_account_id, plaid_cursor, account_type, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const now = Date.now();
  const accounts = await Promise.all(
    (data || []).map(async (acc) => {
      let balance = acc.current_balance;
      let subtype = acc.subtype || null;
      const needsReconcile =
        !acc.balance_reconciled_at || now - new Date(acc.balance_reconciled_at).getTime() > RECONCILE_INTERVAL_MS;

      if (acc.plaid_access_token && acc.plaid_account_id && needsReconcile) {
        try {
          const accessToken = decryptToken(acc.plaid_access_token);
          const res = await plaidClient.accountsBalanceGet({ access_token: accessToken });
          const match = res.data.accounts.find((a) => a.account_id === acc.plaid_account_id);
          if (match) {
            const fresh = match.balances.available ?? match.balances.current;
            subtype = match.subtype || null;
            const nowIso = new Date().toISOString();
            if (fresh !== null && fresh !== undefined) balance = fresh;
            await admin
              .from("simple_accounts")
              .update({
                ...(fresh !== null && fresh !== undefined ? { current_balance: fresh } : {}),
                subtype,
                balance_updated_at: nowIso,
                balance_reconciled_at: nowIso,
                // Self-healing migration to encrypted-at-rest (see
                // lib/tokenCrypto.js): every account gets read here at
                // least once a month, so re-saving a legacy plaintext
                // token in encrypted form here converges the whole table
                // without a separate backfill script.
                ...(isLegacyPlaintext(acc.plaid_access_token)
                  ? { plaid_access_token: encryptToken(accessToken) }
                  : {}),
              })
              .eq("id", acc.id);
          }
        } catch (err) {
          console.error("Plaid balance reconcile failed for account", acc.id, err?.response?.data || err?.message);
        }
      }

      return {
        id: acc.id,
        institution_name: acc.institution_name,
        account_name: acc.account_name,
        mask: acc.mask,
        account_type: acc.account_type || "depository",
        current_balance: balance,
        // Cached, refreshed on the same schedule as balance above -- see
        // AccountSelect's excludeSubtypes, which uses it to keep checking
        // accounts out of the Investments picker.
        subtype,
        // Whether a deposit landing here gets auto-split via the Plaid
        // webhook, or still needs the manual "Split $X now" button --
        // false for accounts linked before Transactions/webhook support
        // existed, until they go through the update-mode re-consent flow.
        autoDetectEnabled: !!acc.plaid_cursor,
        created_at: acc.created_at,
      };
    })
  );

  return Response.json({ accounts });
}
