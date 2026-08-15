import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { plaidClient } from "@/lib/plaid";
import { dwollaClient } from "@/lib/dwolla";

// DEV/DEMO ONLY. Populates the calling user's account with a batch of fake
// Plaid Sandbox items so the dashboard/accounts UI can be previewed with
// realistic data, without having to click through Plaid Link's sandbox UI
// by hand N times. Uses Plaid's `/sandbox/public_token/create` endpoint
// (sandbox-only -- fails outside PLAID_ENV=sandbox) to mint items directly,
// server-side, then runs them through the exact same
// exchange -> processor token -> Dwolla funding source -> DB insert chain
// that a real Link session hits in exchange-public-token/route.js.
//
// institution_id is always Plaid's stable "First Platypus Bank" sandbox
// institution (supports full auth+transactions with user_good/pass_good).
// displayInstitution/accountName are cosmetic overrides so the seeded
// row shows up looking like "Chase Checking" or "PayPal" in the UI --
// mirrors how the real "Connect These Apps" buttons work today (they're
// cosmetic labels on top of a normal Plaid Link session; whichever bank
// the user actually picks becomes the stored institution_name).
const SEED_ACCOUNTS = [
  { displayInstitution: "Chase", accountName: "Total Checking", mask: "4821" },
  { displayInstitution: "Bank of America", accountName: "Advantage Checking", mask: "0193" },
  { displayInstitution: "Ally Bank", accountName: "Business Checking", mask: "7756" },
  { displayInstitution: "PayPal", accountName: "PayPal Balance", mask: "3310" },
  { displayInstitution: "Cash App", accountName: "Cash App Balance", mask: "9042" },
];

const SANDBOX_INSTITUTION_ID = "ins_109508"; // First Platypus Bank

export async function POST(request) {
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
    return Response.json(
      { error: "Complete identity verification (Dwolla) before seeding accounts." },
      { status: 400 }
    );
  }

  const results = [];
  const errors = [];

  for (const seed of SEED_ACCOUNTS) {
    try {
      const sandboxRes = await plaidClient.sandboxPublicTokenCreate({
        institution_id: SANDBOX_INSTITUTION_ID,
        initial_products: ["auth", "transactions"],
      });
      const publicToken = sandboxRes.data.public_token;

      const exchange = await plaidClient.itemPublicTokenExchange({ public_token: publicToken });
      const accessToken = exchange.data.access_token;
      const itemId = exchange.data.item_id;

      const accountsRes = await plaidClient.accountsGet({ access_token: accessToken });
      const plaidAccount =
        accountsRes.data.accounts.find((a) => a.subtype === "checking") || accountsRes.data.accounts[0];

      const processorTokenRes = await plaidClient.processorTokenCreate({
        access_token: accessToken,
        account_id: plaidAccount.account_id,
        processor: "dwolla",
      });
      const processorToken = processorTokenRes.data.processor_token;

      const fundingSourceRes = await dwollaClient().post(
        `${dwollaCustomer.dwolla_customer_url}/funding-sources`,
        { plaidToken: processorToken, name: seed.accountName }
      );
      const fundingSourceUrl = fundingSourceRes.headers.get("location");
      const fundingSourceId = fundingSourceUrl.split("/").pop();

      const { data: inserted, error: dbError } = await admin
        .from("simple_accounts")
        .insert({
          user_id: user.id,
          institution_name: seed.displayInstitution,
          account_name: seed.accountName,
          mask: seed.mask || plaidAccount.mask,
          plaid_item_id: itemId,
          plaid_access_token: accessToken,
          plaid_account_id: plaidAccount.account_id,
          dwolla_funding_source_id: fundingSourceId,
          current_balance: plaidAccount.balances?.current ?? null,
        })
        .select("id, institution_name, account_name, mask, current_balance")
        .single();
      if (dbError) throw dbError;

      results.push(inserted);
    } catch (err) {
      const detail = err?.response?.data || err?.body || err?.message || String(err);
      console.error(`Seed failed for ${seed.displayInstitution}:`, detail);
      errors.push({ institution: seed.displayInstitution, detail });
    }
  }

  return Response.json({ created: results, errors });
}
