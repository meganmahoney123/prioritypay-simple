import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { plaidClient } from "@/lib/plaid";
import { decryptToken, encryptToken, isLegacyPlaintext } from "@/lib/tokenCrypto";
import { reconcileInTransitAllocations } from "@/lib/reconcileTransfers";

// PHASE T: account balance is now ALWAYS a live Plaid Balance call, not the
// incrementally-adjusted ledger app/api/plaid/webhook/route.js used to
// maintain. That ledger had a real bug: Plaid's /transactions/sync
// represents a pending transaction settling as a REMOVE of the pending
// entry plus an ADD of a new, differently-id'd posted one -- and the
// webhook only ever applied `added` transactions (see its comment),
// never `removed`. So every deposit that was first seen pending and then
// posted got applied to the ledger twice, permanently inflating the
// balance -- confirmed against a real customer account showing several
// thousand dollars more than Plaid's actual balance. Rather than also
// patch the webhook to handle removed/modified transactions correctly
// (a real fix, but one more surface to keep correct forever), the
// simpler and more trustworthy choice is to stop trusting any locally
// -maintained running total for the number people actually make
// decisions from, and always ask Plaid directly. This costs one Balance
// call ($0.10) per connected account per page load instead of roughly
// once a month -- worth it for a number people are trusting to be
// accurate. A failed live call (e.g. the Item needs re-auth) falls back
// to the last known value instead of failing the whole list.
//
// current_balance is still kept as a column (and the webhook still
// updates it incrementally between page loads, for other code that reads
// it synchronously) -- this route just no longer trusts that value as
// authoritative; it overwrites it with Plaid's real answer on every call.
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

  // Best-effort: checks any 'in_transit' manual transfers against Plaid's
  // real transaction data and settles matches to 'completed' (see
  // lib/reconcileTransfers.js). Runs here because this route is already
  // the "what does Plaid actually show right now" checkpoint the app hits
  // on every Dashboard/Accounts load -- never blocks the accounts list
  // itself if it fails.
  await reconcileInTransitAllocations(admin, user.id).catch((err) =>
    console.error("[accounts] reconcile in-transit allocations failed", err?.message)
  );

  const accounts = await Promise.all(
    (data || []).map(async (acc) => {
      let balance = acc.current_balance;
      let subtype = acc.subtype || null;

      if (acc.plaid_access_token && acc.plaid_account_id) {
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
