import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { plaidClient } from "@/lib/plaid";
import { syncNewTransactions } from "@/lib/plaidSync";

// TEMP QA-ONLY ENDPOINT. Simulates a real client deposit landing in a
// linked account, end-to-end through the actual production webhook path
// (not a shortcut) -- delete after QA.
//
// Two-step, matching how the real webhook code (app/api/plaid/webhook)
// already treats a brand-new account: the first sync after linking is
// always a "baseline" (accounts.plaid_cursor null -> establishes cursor,
// consumes Plaid Sandbox's pre-seeded default transaction history,
// deliberately does NOT split anything). So:
//  1. If plaid_cursor isn't set yet, run that baseline sync ourselves
//     first (same call the real webhook makes) so it's out of the way.
//  2. Call Plaid Sandbox's /sandbox/item/fire_webhook with
//     webhook_code SYNC_UPDATES_AVAILABLE, which makes Plaid inject one
//     new mock transaction AND asynchronously deliver a real webhook to
//     our /api/plaid/webhook URL -- the exact same code path a genuine
//     client payment would trigger in production.
export async function POST(request) {
  if ((process.env.PLAID_ENV || "sandbox") !== "sandbox") {
    return Response.json({ error: "Only available in Plaid sandbox." }, { status: 400 });
  }

  const user = await requireUser();
  if (!user) return unauthorized();

  let accountId, body;
  try {
    body = await request.json();
    accountId = body?.accountId;
  } catch {
    // no body
  }

  const admin = supabaseAdmin();

  let query = admin
    .from("simple_accounts")
    .select("id, plaid_access_token, plaid_cursor, account_name")
    .eq("user_id", user.id)
    .not("plaid_access_token", "is", null);
  if (accountId) query = query.eq("id", accountId);

  const { data: accounts } = await query;
  const account = accounts?.[0];
  if (!account) {
    return Response.json({ error: "No linked Plaid account found." }, { status: 404 });
  }

  const steps = {};

  if (!account.plaid_cursor) {
    const { cursor } = await syncNewTransactions(account.plaid_access_token, null);
    await admin.from("simple_accounts").update({ plaid_cursor: cursor }).eq("id", account.id);
    steps.baseline = { ran: true, cursorEstablished: !!cursor };
  } else {
    steps.baseline = { ran: false, alreadyHadCursor: true };
  }

  // Plaid Sandbox's fire_webhook alone does NOT conjure new transaction
  // data out of nowhere -- per Plaid's docs, SYNC_UPDATES_AVAILABLE only
  // fires (and /transactions/sync only returns something new) once real
  // new data exists for the Item. /sandbox/transactions/create is the
  // actual mechanism for injecting a custom mock transaction (simulating
  // a /transactions/refresh discovering it), so this deposit amount is
  // real, custom test data -- not Plaid's random default backlog.
  const depositAmount = Number(body?.amount) > 0 ? Number(body.amount) : 500;
  // Calling the REST endpoint directly instead of a plaidClient.* SDK
  // method -- sandboxTransactionsCreate isn't present on this plaidClient
  // instance in this SDK version ("is not a function"), so this bypasses
  // that mystery entirely and just hits Plaid's documented HTTP API the
  // same way the SDK would under the hood (client_id/secret in the JSON
  // body is Plaid's standard non-header auth option).
  try {
    const plaidBase =
      (process.env.PLAID_ENV || "sandbox") === "sandbox"
        ? "https://sandbox.plaid.com"
        : "https://production.plaid.com";
    const createRes = await fetch(`${plaidBase}/sandbox/transactions/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.PLAID_CLIENT_ID,
        secret: process.env.PLAID_SECRET,
        access_token: account.plaid_access_token,
        transactions: [
          {
            date_transacted: new Date().toISOString().slice(0, 10),
            date_posted: new Date().toISOString().slice(0, 10),
            // Plaid convention: negative = money IN (a deposit).
            amount: -depositAmount,
            description: "QA simulated client payment",
          },
        ],
      }),
    });
    const createBody = await createRes.json();
    if (!createRes.ok) {
      steps.createTransaction = { ok: false, status: createRes.status, detail: createBody };
      return Response.json({ account: account.account_name, steps }, { status: 200 });
    }
    steps.createTransaction = { ok: true, amount: depositAmount, raw: createBody };
  } catch (err) {
    steps.createTransaction = { ok: false, detail: err?.message || String(err) };
    return Response.json({ account: account.account_name, steps }, { status: 200 });
  }

  try {
    const fireRes = await plaidClient.sandboxItemFireWebhook({
      access_token: account.plaid_access_token,
      webhook_code: "SYNC_UPDATES_AVAILABLE",
    });
    steps.fireWebhook = { ok: true, raw: fireRes.data };
  } catch (err) {
    steps.fireWebhook = { ok: false, detail: err?.response?.data || err?.message || String(err) };
    return Response.json({ account: account.account_name, steps }, { status: 200 });
  }

  return Response.json({
    account: account.account_name,
    steps,
    note: "Plaid delivers the real webhook to /api/plaid/webhook asynchronously -- check simple_transfers in a few seconds.",
  });
}
