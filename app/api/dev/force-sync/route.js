import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { syncNewTransactions } from "@/lib/plaidSync";
import { runSplit } from "@/lib/runSplit";

// TEMP QA-ONLY ENDPOINT. Manually runs the exact same post-baseline sync +
// deposit-detection + runSplit logic the real Plaid webhook
// (app/api/plaid/webhook) runs, but triggered directly instead of waiting
// on Plaid's async webhook delivery -- lets QA confirm whether Plaid
// Sandbox's fire_webhook call actually produced a new "added" transaction,
// decoupled from whether the webhook delivery itself arrived. Delete after
// QA.
export async function POST(request) {
  if ((process.env.PLAID_ENV || "sandbox") !== "sandbox") {
    return Response.json({ error: "Only available in Plaid sandbox." }, { status: 400 });
  }

  const user = await requireUser();
  if (!user) return unauthorized();

  let accountId;
  try {
    ({ accountId } = await request.json());
  } catch {}

  const admin = supabaseAdmin();
  let query = admin
    .from("simple_accounts")
    .select("id, user_id, plaid_access_token, plaid_account_id, plaid_cursor, account_name")
    .eq("user_id", user.id)
    .not("plaid_access_token", "is", null);
  if (accountId) query = query.eq("id", accountId);
  const { data: accounts } = await query;
  const account = accounts?.[0];
  if (!account) return Response.json({ error: "No linked account." }, { status: 404 });

  const { added, cursor } = await syncNewTransactions(account.plaid_access_token, account.plaid_cursor || null);
  await admin.from("simple_accounts").update({ plaid_cursor: cursor }).eq("id", account.id);

  const allAdded = added.map((t) => ({
    id: t.transaction_id,
    account_id: t.account_id,
    amount: t.amount,
    pending: t.pending,
    name: t.name,
  }));

  const deposits = added.filter((t) => t.account_id === account.plaid_account_id && !t.pending && t.amount < 0);

  const results = [];
  for (const txn of deposits) {
    const result = await runSplit({
      admin,
      userId: account.user_id,
      amount: Math.abs(txn.amount),
      sourceAccountId: account.id,
      trigger: "auto_deposit",
      plaidTransactionId: txn.transaction_id,
    });
    results.push({ txn: txn.transaction_id, amount: Math.abs(txn.amount), result });
  }

  return Response.json({ account: account.account_name, allAdded, depositsFound: deposits.length, results });
}
