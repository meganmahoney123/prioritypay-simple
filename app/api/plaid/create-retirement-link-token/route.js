import { requireUser, unauthorized } from "@/lib/apiAuth";
import { plaidClient } from "@/lib/plaid";
import { CountryCode, Products } from "plaid";

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
  if (retirementType !== "sep_ira" && retirementType !== "solo_401k") {
    return Response.json({ error: "Invalid retirementType." }, { status: 400 });
  }

  const subtypes = retirementType === "sep_ira" ? ["sep ira"] : ["401k"];

  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: "PriorityPay Simple",
      products: [Products.Auth, Products.Transactions, Products.Investments],
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
