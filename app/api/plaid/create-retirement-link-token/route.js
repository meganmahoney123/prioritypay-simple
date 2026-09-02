import { requireUser, unauthorized } from "@/lib/apiAuth";
import { plaidClient } from "@/lib/plaid";
import { CountryCode, Products } from "plaid";
import { TRANSFER_EXECUTION_MODE } from "@/lib/executionMode";

// Same as create-link-token, but scoped with account_filters so the only
// accounts selectable in Link are retirement accounts -- a regular checking
// or savings account never shows up as an option here, on purpose, so
// there's no chance of accidentally wiring SEP IRA/Solo 401k money to the
// wrong kind of account. Requires the Investments product in addition to
// Auth/Transactions, since that's the product family Plaid categorizes
// these subtypes under.
export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { retirementType } = await request.json();
  // sep_ira/solo_401k: self-employed retirement accounts a person might
  // eventually open with money they've been saving up manually elsewhere.
  // traditional_401k/traditional_ira/hsa (added Sept 2026): the W2
  // workplace lineup -- these are usually ALREADY funded via payroll
  // deduction, so this scoped Link flow lets someone connect the real
  // account directly (instead of a savings account holding money for
  // later, the pattern the two self-employed types use) so PriorityPay can
  // show its live balance growing. See isEmployerRetirementRow, lib/
  // allocations.js.
  const SUBTYPES_BY_RETIREMENT_TYPE = {
    sep_ira: ["sep ira"],
    solo_401k: ["401k"],
    traditional_401k: ["401k"],
    traditional_ira: ["ira"],
    hsa: ["hsa"],
  };
  const subtypes = SUBTYPES_BY_RETIREMENT_TYPE[retirementType];
  if (!subtypes) {
    return Response.json({ error: "Invalid retirementType." }, { status: 400 });
  }

  try {
    // Same Auth cost-skip as create-link-token -- see lib/executionMode.js.
    const products = TRANSFER_EXECUTION_MODE === "dwolla_auto"
      ? [Products.Auth, Products.Transactions, Products.Investments]
      : [Products.Transactions, Products.Investments];
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: "PriorityPay",
      products,
      country_codes: [CountryCode.Us],
      language: "en",
      account_filters: {
        investment: { account_subtypes: subtypes },
      },
      // Must be a URI already on the Allowed redirect URIs list in the
      // Plaid dashboard -- reusing /accounts (already registered for the
      // other Link flows) instead of registering a new one for /dashboard.
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/accounts`,
      webhook: `${process.env.NEXT_PUBLIC_APP_URL}/api/plaid/webhook`,
    });
    return Response.json({ link_token: response.data.link_token });
  } catch (err) {
    console.error("Plaid create-retirement-link-token failed:", err?.response?.data || err);
    return Response.json({ error: "Could not start Plaid Link." }, { status: 500 });
  }
}
