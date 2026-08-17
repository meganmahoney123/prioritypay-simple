import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// TEMP QA-ONLY ENDPOINT. Injects real, dated custom Plaid Sandbox
// transactions (via /sandbox/transactions/create, raw fetch -- see prior
// QA session notes on why not the SDK method) into a user_transactions_dynamic
// test account, so the close-out flow (which pulls REAL transactions per
// date range from Plaid, not from our own transfers table) has something
// real to review for a past month. Delete after QA.
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
    .select("id, plaid_access_token, account_name")
    .eq("user_id", user.id)
    .not("plaid_access_token", "is", null);
  if (accountId) query = query.eq("id", accountId);
  const { data: accounts } = await query;
  const account = accounts?.[0];
  if (!account) return Response.json({ error: "No linked account." }, { status: 404 });

  const transactions = [
    { date_transacted: "2026-07-03", date_posted: "2026-07-03", amount: -4800, description: "Client payment - Acme Co" },
    { date_transacted: "2026-07-10", date_posted: "2026-07-10", amount: 1200, description: "Office supplies" },
    { date_transacted: "2026-07-15", date_posted: "2026-07-15", amount: -3200, description: "Client payment - Beta LLC" },
    { date_transacted: "2026-07-22", date_posted: "2026-07-22", amount: 450, description: "Software subscription" },
    { date_transacted: "2026-07-28", date_posted: "2026-07-28", amount: -2900, description: "Client payment - Gamma Inc" },
  ];

  const plaidBase = "https://sandbox.plaid.com";
  const res = await fetch(`${plaidBase}/sandbox/transactions/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.PLAID_CLIENT_ID,
      secret: process.env.PLAID_SECRET,
      access_token: account.plaid_access_token,
      transactions,
    }),
  });
  const body = await res.json();
  return Response.json({ account: account.account_name, ok: res.ok, status: res.status, body, injected: transactions.length });
}
