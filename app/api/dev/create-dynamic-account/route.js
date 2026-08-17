import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { plaidClient } from "@/lib/plaid";
import { dwollaClient } from "@/lib/dwolla";

// TEMP QA-ONLY ENDPOINT. /sandbox/transactions/create (used by
// simulate-deposit to inject a real mock deposit) only works on Items
// created with Plaid's special `user_transactions_dynamic` Sandbox test
// user -- our existing accounts were linked with the real OAuth sandbox
// flow (Chase/First Platypus Bank) or `user_custom` (QA Savings), neither
// of which qualifies. This mints one more real Plaid Sandbox item
// specifically with that test user, runs it through the same
// processorTokenCreate + Dwolla funding-source-attach steps as a real
// Link session, so it can be used as the deposit-simulation SOURCE
// account. Delete after QA.
export async function POST() {
  if ((process.env.PLAID_ENV || "sandbox") !== "sandbox") {
    return Response.json({ error: "Only available in Plaid sandbox." }, { status: 400 });
  }

  const user = await requireUser();
  if (!user) return unauthorized();

  const admin = supabaseAdmin();

  const { data: dwollaCustomer } = await admin
    .from("simple_dwolla_customers")
    .select("dwolla_customer_url")
    .eq("user_id", user.id)
    .single();
  if (!dwollaCustomer) {
    return Response.json({ error: "No Dwolla customer for this user." }, { status: 400 });
  }

  try {
    const sandboxRes = await plaidClient.sandboxPublicTokenCreate({
      institution_id: "ins_109508", // First Platypus Bank
      initial_products: ["transactions"],
      options: {
        override_username: "user_transactions_dynamic",
        override_password: "any_password",
      },
    });
    const publicToken = sandboxRes.data.public_token;

    const exchange = await plaidClient.itemPublicTokenExchange({ public_token: publicToken });
    const accessToken = exchange.data.access_token;
    const itemId = exchange.data.item_id;

    const accountsRes = await plaidClient.accountsGet({ access_token: accessToken });
    const plaidAccount = accountsRes.data.accounts.find((a) => a.subtype === "checking") || accountsRes.data.accounts[0];

    const processorTokenRes = await plaidClient.processorTokenCreate({
      access_token: accessToken,
      account_id: plaidAccount.account_id,
      processor: "dwolla",
    });
    const processorToken = processorTokenRes.data.processor_token;

    let fundingSourceId;
    try {
      const fundingSourceRes = await dwollaClient().post(
        `${dwollaCustomer.dwolla_customer_url}/funding-sources`,
        { plaidToken: processorToken, name: "QA Dynamic Source" }
      );
      const fundingSourceUrl = fundingSourceRes.headers.get("location");
      fundingSourceId = fundingSourceUrl.split("/").pop();
    } catch (dwollaErr) {
      return Response.json({
        step: "dwolla-funding-source-attach",
        error: true,
        detail: dwollaErr?.body || dwollaErr?.message || String(dwollaErr),
      }, { status: 200 });
    }

    const { data: inserted, error: dbError } = await admin
      .from("simple_accounts")
      .insert({
        user_id: user.id,
        institution_name: "First Platypus Bank",
        account_name: "QA Dynamic Source",
        mask: plaidAccount?.mask || "0000",
        plaid_item_id: itemId,
        plaid_access_token: accessToken,
        plaid_account_id: plaidAccount?.account_id,
        dwolla_funding_source_id: fundingSourceId,
      })
      .select("id, institution_name, account_name, mask")
      .single();
    if (dbError) throw dbError;

    return Response.json({ ok: true, account: inserted, fundingSourceId });
  } catch (err) {
    return Response.json({ step: "plaid", error: true, detail: err?.response?.data || err?.message || String(err) }, { status: 200 });
  }
}
