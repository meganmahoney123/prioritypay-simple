import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { plaidClient } from "@/lib/plaid";
import { encryptToken } from "@/lib/tokenCrypto";

// DEV/DEMO ONLY. Sibling of /api/dev/seed-accounts, kept as its own
// endpoint on purpose: seed-accounts is idempotent by deleting+reinserting
// every row whose account_name is in its own list, which would regenerate
// brand new ids for the original six demo accounts (breaking every split
// rule that already points at those ids by accountId) if this were just
// appended to that array instead. This endpoint only ever touches its own
// two names, so it's safe to (re)run without disturbing anything already
// connected elsewhere.
const SEED_ACCOUNTS = [
  { displayInstitution: "Fidelity", accountName: "Solo 401k", mask: "8842", subtype: "savings", balance: 6340.2 },
  { displayInstitution: "Charles Schwab", accountName: "SEP IRA", mask: "2107", subtype: "savings", balance: 2180.75 },
];

const SANDBOX_INSTITUTION_ID = "ins_109508"; // First Platypus Bank

export async function POST() {
  if ((process.env.PLAID_ENV || "sandbox") !== "sandbox") {
    return Response.json({ error: "Only available in Plaid sandbox." }, { status: 400 });
  }

  const user = await requireUser();
  if (!user) return unauthorized();

  const admin = supabaseAdmin();

  const seedNames = SEED_ACCOUNTS.map((s) => s.accountName);
  await admin.from("simple_accounts").delete().eq("user_id", user.id).in("account_name", seedNames);

  const results = [];
  const errors = [];

  for (const seed of SEED_ACCOUNTS) {
    try {
      const sandboxRes = await plaidClient.sandboxPublicTokenCreate({
        institution_id: SANDBOX_INSTITUTION_ID,
        initial_products: ["transactions"],
        options: {
          override_username: "user_custom",
          override_password: JSON.stringify({
            override_accounts: [{ type: "depository", subtype: seed.subtype, starting_balance: seed.balance }],
          }),
        },
      });
      const publicToken = sandboxRes.data.public_token;

      const exchange = await plaidClient.itemPublicTokenExchange({ public_token: publicToken });
      const accessToken = exchange.data.access_token;
      const itemId = exchange.data.item_id;

      const accountsRes = await plaidClient.accountsGet({ access_token: accessToken });
      const plaidAccount =
        accountsRes.data.accounts.find((a) => a.subtype === seed.subtype) || accountsRes.data.accounts[0];

      const { data: inserted, error: dbError } = await admin
        .from("simple_accounts")
        .insert({
          user_id: user.id,
          institution_name: seed.displayInstitution,
          account_name: seed.accountName,
          mask: seed.mask || plaidAccount?.mask,
          plaid_item_id: itemId,
          plaid_access_token: encryptToken(accessToken),
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
      console.error(`Retirement seed failed for ${seed.displayInstitution}:`, detail);
      errors.push({ institution: seed.displayInstitution, detail });
    }
  }

  return Response.json({ created: results, errors });
}
