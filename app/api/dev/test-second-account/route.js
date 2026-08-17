import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { plaidClient } from "@/lib/plaid";
import { dwollaClient } from "@/lib/dwolla";

// TEMP QA-ONLY ENDPOINT. Mints a second real Plaid Sandbox item (savings
// account, First Platypus Bank) entirely server-side -- no Link UI -- and
// runs it through the EXACT same processorTokenCreate + Dwolla
// funding-source-attach steps as a real Plaid Link session
// (see exchange-public-token/route.js), on purpose, to directly test
// whether Dwolla sandbox actually rejects a second funding source per
// customer as "Bank already exists" (documented as a suspected quirk in
// seed-accounts/route.js, never previously confirmed). Not for production
// use -- delete after QA.
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
        override_username: "user_custom",
        override_password: JSON.stringify({
          override_accounts: [{ type: "depository", subtype: "savings", starting_balance: 2500 }],
        }),
      },
    });
    const publicToken = sandboxRes.data.public_token;

    const exchange = await plaidClient.itemPublicTokenExchange({ public_token: publicToken });
    const accessToken = exchange.data.access_token;
    const itemId = exchange.data.item_id;

    const accountsRes = await plaidClient.accountsGet({ access_token: accessToken });
    const plaidAccount = accountsRes.data.accounts.find((a) => a.subtype === "savings") || accountsRes.data.accounts[0];

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
        { plaidToken: processorToken, name: "QA Savings" }
      );
      const fundingSourceUrl = fundingSourceRes.headers.get("location");
      fundingSourceId = fundingSourceUrl.split("/").pop();
    } catch (dwollaErr) {
      return Response.json({
        step: "dwolla-funding-source-attach",
        error: true,
        status: dwollaErr?.body?.code || dwollaErr?.status,
        detail: dwollaErr?.body || dwollaErr?.message || String(dwollaErr),
      }, { status: 200 });
    }

    const { data: inserted, error: dbError } = await admin
      .from("simple_accounts")
      .insert({
        user_id: user.id,
        institution_name: "First Platypus Bank",
        account_name: "QA Savings",
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
    return Response.json({
      step: "plaid",
      error: true,
      detail: err?.response?.data || err?.message || String(err),
    }, { status: 200 });
  }
}
