import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { plaidClient } from "@/lib/plaid";
import { decryptToken } from "@/lib/tokenCrypto";

// Lets someone actually remove a linked account -- until this route
// existed, the Accounts page had no way to disconnect anything once
// linked, even though the Privacy Policy ("Your Choices") has always
// promised "disconnect linked accounts at any time from the Accounts
// page." Revokes the Plaid Item itself (so the access token is dead on
// Plaid's side too, not just deleted locally) and removes the account
// row. Split rules, transfer history, and close-out records that
// referenced this account are left alone -- their account_id just goes
// null (see supabase/schema.sql's "on delete set null" foreign keys),
// which is exactly the same "nowhere to send this yet" state the UI
// already handles for a rule that's never been assigned an account.
export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const { accountId } = await request.json();
  if (!accountId) return Response.json({ error: "Missing accountId." }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: account } = await admin
    .from("simple_accounts")
    .select("id, plaid_item_id, plaid_access_token")
    .eq("id", accountId)
    .eq("user_id", user.id)
    .single();

  if (!account) {
    return Response.json({ error: "Account not found." }, { status: 404 });
  }

  // A single Plaid Item can back more than one row here (e.g. checking +
  // savings picked in the same Link session both resolve to the same
  // plaid_item_id). Revoking the Item would silently kill the OTHER
  // account's access too, so only call itemRemove when this is the last
  // row still using that Item.
  const { data: siblings } = await admin
    .from("simple_accounts")
    .select("id")
    .eq("plaid_item_id", account.plaid_item_id)
    .neq("id", account.id);

  if (account.plaid_access_token && (!siblings || siblings.length === 0)) {
    try {
      await plaidClient.itemRemove({ access_token: decryptToken(account.plaid_access_token) });
    } catch (err) {
      // Best-effort: Plaid may already consider the Item gone (e.g. the
      // user revoked access from their bank's side first), and either
      // way we still want PriorityPay's own record of it gone. Log and
      // keep going rather than blocking the person from disconnecting.
      console.error("Plaid itemRemove failed during disconnect:", err?.response?.data || err);
    }
  }

  const { error: dbError } = await admin
    .from("simple_accounts")
    .delete()
    .eq("id", accountId)
    .eq("user_id", user.id);

  if (dbError) {
    return Response.json({ error: "Could not disconnect that account." }, { status: 500 });
  }

  return Response.json({ ok: true });
}
