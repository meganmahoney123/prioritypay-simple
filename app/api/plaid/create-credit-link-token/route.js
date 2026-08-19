import { requireUser, unauthorized } from "@/lib/apiAuth";
import { plaidClient } from "@/lib/plaid";
import { CountryCode, Products } from "plaid";

// Separate from create-link-token on purpose: credit cards never need the
// Auth product (no routing/account number, never a Dwolla funding source),
// and account_filters restricts Link to credit-card subtypes only so a
// checking/savings account never accidentally lands in this flow. Linked
// purely so close-out (app/api/closeout/[period]) can see credit-card
// spending alongside bank transactions for a complete expense picture.
export async function POST() {
  const user = await requireUser();
  if (!user) return unauthorized();

  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: "PriorityPay Simple",
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: "en",
      account_filters: { credit: { account_subtypes: ["credit card"] } },
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/accounts`,
      webhook: `${process.env.NEXT_PUBLIC_APP_URL}/api/plaid/webhook`,
    });
    return Response.json({ link_token: response.data.link_token });
  } catch (err) {
    console.error("Plaid create-credit-link-token failed:", err?.response?.data || err);
    return Response.json({ error: "Could not start Plaid Link." }, { status: 500 });
  }
}
