import { plaidClient } from "@/lib/plaid";
import { decryptToken, encryptToken, isLegacyPlaintext } from "@/lib/tokenCrypto";

// Extracted from app/api/accounts/route.js's own live-balance refresh
// (see the PHASE T comment there for why this app never trusts a
// locally-maintained running total for a number people make decisions
// from) so the same "ask Plaid directly, right now" behavior is
// available to any write path that needs to enforce a real-dollar limit
// at the moment it actually matters -- not just when the Accounts or
// Dashboard page happens to have been loaded recently. Room checks like
// checkAccountRoomForLabel/checkAccountUnallocatedRoom (lib/categoryRoom.js)
// read simple_accounts.current_balance from the database; calling this
// first, right before either check runs, is what makes that number the
// bank's real balance as of right now rather than whatever was cached the
// last time someone happened to open Accounts.
//
// Best-effort: on any failure (expired Item, Plaid outage, no Plaid
// connection on this account at all -- e.g. a manually-added account),
// this silently falls back to leaving current_balance as whatever's
// already in the database rather than blocking the caller. A room check
// against a slightly-stale balance is still far safer than no check at
// all, and this app already accepts that same tradeoff everywhere else
// current_balance is read.
export async function refreshAccountBalance(admin, accountId) {
  const { data: acc } = await admin
    .from("simple_accounts")
    .select("id, current_balance, plaid_access_token, plaid_account_id")
    .eq("id", accountId)
    .maybeSingle();
  if (!acc?.plaid_access_token || !acc?.plaid_account_id) return;

  try {
    const accessToken = decryptToken(acc.plaid_access_token);
    const res = await plaidClient.accountsBalanceGet({ access_token: accessToken });
    const match = res.data.accounts.find((a) => a.account_id === acc.plaid_account_id);
    const fresh = match ? match.balances.available ?? match.balances.current : null;
    if (fresh === null || fresh === undefined) return;

    const nowIso = new Date().toISOString();
    await admin
      .from("simple_accounts")
      .update({
        current_balance: fresh,
        balance_updated_at: nowIso,
        balance_reconciled_at: nowIso,
        ...(isLegacyPlaintext(acc.plaid_access_token) ? { plaid_access_token: encryptToken(accessToken) } : {}),
      })
      .eq("id", accountId);
  } catch (err) {
    console.error("[refreshAccountBalance] live Plaid balance check failed for account", accountId, err?.response?.data || err?.message);
  }
}
