import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { plaidClient } from "@/lib/plaid";

// DEV/DEMO ONLY. Populates the calling user's account with fake but
// realistic-looking linked accounts, purely so the dashboard/accounts UI
// can be previewed without clicking through Plaid Link's sandbox flow by
// hand N times.
//
// This still mints real Plaid Sandbox items (via
// `/sandbox/public_token/create`, sandbox-only) so each row has a genuine
// plaid_item_id/access_token behind it -- but it deliberately SKIPS the
// Dwolla funding-source step that a real Link session runs
// (see exchange-public-token/route.js). Reason: Dwolla's sandbox appears to
// treat every Plaid-sandbox-sourced processor token as the *same*
// underlying test bank regardless of which Plaid sandbox institution
// generated it, so only the first funding source per customer succeeds and
// every subsequent one 409s as "Bank already exists." That's a sandbox
// environment quirk (real bank connections in production each carry their
// own real account/routing numbers, so this shouldn't recur there), but it
// means this endpoint can't fully replicate the real linking flow today.
// Since the only goal here is a populated-looking dashboard, seeded rows
// get a placeholder dwolla_funding_source_id and a curated display balance
// instead of a real one. Don't use these rows to actually move money.
const SEED_ACCOUNTS = [
  { displayInstitution: "Chase", accountName: "Total Checking", mask: "4821", subtype: "checking", balance: 8432.17 },
  { displayInstitution: "Bank of America", accountName: "Advantage Checking", mask: "0193", subtype: "checking", balance: 3120.55 },
  { displayInstitution: "Ally Bank", accountName: "Business Checking", mask: "7756", subtype: "checking", balance: 12890.4 },
  { displayInstitution: "PayPal", accountName: "PayPal Balance", mask: "3310", subtype: "checking", balance: 642.1 },
  { displayInstitution: "Cash App", accountName: "Cash App Balance", mask: "9042", subtype: "prepaid", balance: 310.75 },
];

// Always the same non-OAuth sandbox institution (Plaid's own docs flag
// custom-user balance overrides as unreliable at OAuth institutions like
// real Chase/BofA -- First Platypus Bank is one of the two they recommend
// instead). institution_name/account_name are cosmetic overrides at insert
// time regardless, same as the real "Connect These Apps" buttons.
const SANDBOX_INSTITUTION_ID = "ins_109508"; // First Platypus Bank

export async function POST(request) {
  if ((process.env.PLAID_ENV || "sandbox") !== "sandbox") {
    return Response.json({ error: "Only available in Plaid sandbox." }, { status: 400 });
  }

  const user = await requireUser();
  if (!user) return unauthorized();

  const admin = supabaseAdmin();

  // Idempotent: wipe any previously seeded demo rows for this user (matched
  // by name) before re-inserting, so this can be safely re-run.
  const seedNames = SEED_ACCOUNTS.map((s) => s.accountName);
  await admin.from("simple_accounts").delete().eq("user_id", user.id).in("account_name", seedNames);

  const results = [];
  const errors = [];

  for (const seed of SEED_ACCOUNTS) {
    try {
      // Plaid's Sandbox "custom user" feature: passing override_username
      // "user_custom" plus a JSON-stringified config as override_password
      // lets us set an exact starting_balance per account instead of
      // getting whatever random/default balance the test institution
      // normally hands back (~$100), entirely server-side, no Link UI.
      const sandboxRes = await plaidClient.sandboxPublicTokenCreate({
        institution_id: SANDBOX_INSTITUTION_ID,
        initial_products: ["transactions"],
        options: {
          override_username: "user_custom",
          override_password: JSON.stringify({
            override_accounts: [
              {
                type: "depository",
                subtype: seed.subtype,
                starting_balance: seed.balance,
              },
            ],
          }),
        },
      });
      const publicToken = sandboxRes.data.public_token;

      const exchange = await plaidClient.itemPublicTokenExchange({ public_token: publicToken });
      const accessToken = exchange.data.access_token;
      const itemId = exchange.data.item_id;

      const accountsRes = await plaidClient.accountsGet({ access_token: accessToken });
      const plaidAccount =
        accountsRes.data.accounts.find((a) => a.subtype === "checking") || accountsRes.data.accounts[0];

      const { data: inserted, error: dbError } = await admin
        .from("simple_accounts")
        .insert({
          user_id: user.id,
          institution_name: seed.displayInstitution,
          account_name: seed.accountName,
          mask: seed.mask || plaidAccount?.mask,
          plaid_item_id: itemId,
          plaid_access_token: accessToken,
          plaid_account_id: plaidAccount?.account_id,
          dwolla_funding_source_id: `demo-seed-${itemId}`,
          current_balance: seed.balance,
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
