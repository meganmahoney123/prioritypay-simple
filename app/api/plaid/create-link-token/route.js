import { requireUser, unauthorized } from "@/lib/apiAuth";
import { plaidClient } from "@/lib/plaid";
import { CountryCode, Products } from "plaid";

export async function POST() {
  const user = await requireUser();
  if (!user) return unauthorized();

  try {
    // Transactions (alongside Auth) is what lets us detect deposits
    // automatically -- see app/api/plaid/webhook. `webhook` registers where
    // Plaid should notify us when new transaction data is ready for an
    // Item created from this link_token; `redirect_uri` is required for
    // OAuth institutions (Chase, Bank of America, Wells Fargo) to redirect
    // back into our app instead of falling back to Plaid's own generic
    // cdn.plaid.com handoff page. This exact redirect URL must also be
    // added to the Allowed redirect URIs list in the Plaid dashboard (Team
    // Settings -> API), or Plaid will ignore it.
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: "PriorityPay Simple",
      products: [Products.Auth, Products.Transactions],
      country_codes: [CountryCode.Us],
      language: "en",
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/accounts`,
      webhook: `${process.env.NEXT_PUBLIC_APP_URL}/api/plaid/webhook`,
    });
    return Response.json({ link_token: response.data.link_token });
  } catch (err) {
    console.error("Plaid create-link-token failed:", err?.response?.data || err);
    return Response.json({ error: "Could not start Plaid Link." }, { status: 500 });
  }
}
