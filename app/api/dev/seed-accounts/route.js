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
  { displayInstitution: "Chase", accountName: "Total Checking", mask: "4821", searchName: "First Platypus Bank", balance: 8432.17 },
  { displayInstitution: "Bank of America", accountName: "Advantage Checking", mask: "0193", searchName: "Tattersall Federal Credit Union", balance: 3120.55 },
  { displayInstitution: "Ally Bank", accountName: "Business Checking", mask: "7756", searchName: "Tartan Bank", balance: 12890.4 },
  { displayInstitution: "PayPal", accountName: "PayPal Balance", mask: "3310", searchName: null, balance: 642.1 },
  { displayInstitution: "Cash App", accountName: "Cash App Balance", mask: "9042", searchName: null, balance: 310.75 },
];

async function resolveInstitutionId(name) {
  const res = await plaidClient.institutionsSearch({
    query: name,
    products: ["transactions"],
    country_codes: ["US"],
  });
  const match = res.data.institutions[0];
  if (!match) throw new Error(`No sandbox institution found for "${name}"`);
  return match.institution_id;
}

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
      const institutionId = await resolveInstitutionId(seed.searchName || "First Platypus Bank");
      const sandboxRes = await plaidClient.sandboxPublicTokenCreate({
        institution_id: institutionId,
        initial_products: ["transactions"],
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
