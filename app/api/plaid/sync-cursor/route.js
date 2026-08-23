import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { syncNewTransactions } from "@/lib/plaidSync";
import { decryptToken } from "@/lib/tokenCrypto";

// Runs right after either a fresh link (exchange-public-token) or an
// update-mode re-consent (create-update-link-token) finishes -- does a
// "silent" first sync purely to establish accounts.plaid_cursor, so the
// account's existing transaction history is never mistaken for a newly
// detected deposit once the webhook (app/api/plaid/webhook) starts
// watching it for real.
export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const { accountId } = await request.json();
  const admin = supabaseAdmin();

  const { data: account } = await admin
    .from("simple_accounts")
    .select("id, plaid_access_token")
    .eq("id", accountId)
    .eq("user_id", user.id)
    .single();

  if (!account?.plaid_access_token) {
    return Response.json({ error: "Account not found." }, { status: 404 });
  }

  try {
    const { cursor } = await syncNewTransactions(decryptToken(account.plaid_access_token), null);
    await admin.from("simple_accounts").update({ plaid_cursor: cursor }).eq("id", account.id);
    return Response.json({ ok: true });
  } catch (err) {
    const detail = err?.response?.data || err?.message || String(err);
    console.error("Sync cursor failed for account", accountId, detail);
    return Response.json({ ok: false, error: detail }, { status: 500 });
  }
}
