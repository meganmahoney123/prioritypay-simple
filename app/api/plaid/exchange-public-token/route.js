import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { plaidClient } from "@/lib/plaid";
import { dwollaClient } from "@/lib/dwolla";

// Runs after Plaid Link succeeds in the browser. Three steps:
//  1. Exchange the public_token for a real access_token (server-only, never
//     sent to the client).
//  2. Ask Plaid for a Dwolla-flavored processor token for the account the
//     user picked.
//  3. Hand that processor token to Dwolla to attach it as a funding source
//     on the user's Dwolla Customer -- this is what makes the account
//     actually usable as a transfer source/destination.
// We don't try to establish a transaction-sync cursor here: Plaid's
// backend hasn't necessarily finished its initial data pull the instant
// linking finishes, so an eager sync call can come back "not ready yet."
// Instead the webhook (app/api/plaid/webhook) handles this itself the
// first time it hears from this Item -- see the comment there.
export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const { public_token, account_id, institution_name, account_name, mask } = await request.json();
  if (!public_token || !account_id) {
    return Response.json({ error: "Missing public_token or account_id." }, { status: 400 });
  }

  const admin = supabaseAdmin();

  const { data: dwollaCustomer } = await admin
    .from("simple_dwolla_customers")
    .select("dwolla_customer_url")
    .eq("user_id", user.id)
    .single();

  if (!dwollaCustomer) {
    return Response.json(
      { error: "Complete identity verification (Dwolla) before linking a bank account." },
      { status: 400 }
    );
  }

  try {
    const exchange = await plaidClient.itemPublicTokenExchange({ public_token });
    const accessToken = exchange.data.access_token;
    const itemId = exchange.data.item_id;

    const processorTokenRes = await plaidClient.processorTokenCreate({
      access_token: accessToken,
      account_id,
      processor: "dwolla",
    });
    const processorToken = processorTokenRes.data.processor_token;

    const fundingSourceRes = await dwollaClient().post(
      `${dwollaCustomer.dwolla_customer_url}/funding-sources`,
      { plaidToken: processorToken, name: account_name || "Checking" }
    );
    const fundingSourceUrl = fundingSourceRes.headers.get("location");
    const fundingSourceId = fundingSourceUrl.split("/").pop();

    const { data: inserted, error: dbError } = await admin
      .from("simple_accounts")
      .insert({
        user_id: user.id,
        institution_name: institution_name || "Bank",
        account_name: account_name || "Account",
        mask,
        plaid_item_id: itemId,
        plaid_access_token: accessToken,
        plaid_account_id: account_id,
        dwolla_funding_source_id: fundingSourceId,
      })
      .select("id, institution_name, account_name, mask, current_balance, created_at")
      .single();
    if (dbError) throw dbError;

    return Response.json({ account: inserted });
  } catch (err) {
    const detail = err?.response?.data || err?.body || err?.message || String(err);
    console.error("Plaid/Dwolla link failed:", detail);
    return Response.json({ error: "Could not finish linking that account.", detail }, { status: 500 });
  }
}
