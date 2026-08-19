import { requireUser, unauthorized } from "@/lib/apiAuth";
import { plaidClient } from "@/lib/plaid";
import { CountryCode, Products } from "plaid";

// Same shape as create-credit-link-token, for the same reason: a business
// checking/savings account linked here is for balance visibility only,
// never a split/transfer source or destination, so it never needs the
// Auth product or a Dwolla funding source. account_filters restricts Link
// to checking/savings so this flow can't accidentally capture a credit
// card (that already has its own dedicated flow) or an investment account.
// Only surfaced to the "Business Owner (With Employees)" persona -- see
// the Team & Plan Obligations section of app/(app)/closeout/page.js.
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
      account_filters: { depository: { account_subtypes: ["checking", "savings"] } },
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/closeout`,
      webhook: `${process.env.NEXT_PUBLIC_APP_URL}/api/plaid/webhook`,
    });
    return Response.json({ link_token: response.data.link_token });
  } catch (err) {
    console.error("Plaid create-business-link-token failed:", err?.response?.data || err);
    return Response.json({ error: "Could not start Plaid Link." }, { status: 500 });
  }
}
