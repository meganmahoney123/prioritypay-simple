import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { plaidClient } from "@/lib/plaid";

// Refreshes each account's balance from Plaid on every load (and caches the
// result in current_balance) so the Dashboard's "keep this much in the
// account for autopay" comparison is based on a real, current number rather
// than whatever was true the moment the account was first linked. A failed
// refresh for one account (e.g. the Item needs re-auth) falls back to the
// last cached value instead of failing the whole list.
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
    .select("id, institution_name, account_name, mask, current_balance, plaid_access_token, plaid_account_id, plaid_cursor, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const accounts = await Promise.all(
    (data || []).map(async (acc) => {
      let balance = acc.current_balance;
      if (acc.plaid_access_token && acc.plaid_account_id) {
        try {
          const res = await plaidClient.accountsBalanceGet({ access_token: acc.plaid_access_token });
          const match = res.data.accounts.find((a) => a.account_id === acc.plaid_account_id);
          if (match) {
            const fresh = match.balances.available ?? match.balances.current;
            if (fresh !== null && fresh !== undefined && fresh !== acc.current_balance) {
              await admin.from("simple_accounts").update({ current_balance: fresh }).eq("id", acc.id);
            }
            if (fresh !== null && fresh !== undefined) balance = fresh;
          }
        } catch (err) {
          console.error("Plaid balance refresh failed for account", acc.id, err?.response?.data || err?.message);
        }
      }
      return {
        id: acc.id,
        institution_name: acc.institution_name,
        account_name: acc.account_name,
        mask: acc.mask,
        current_balance: balance,
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
