import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { plaidClient } from "@/lib/plaid";
import { CountryCode, Products } from "plaid";

// "Update mode for new products" -- lets someone re-consent an *already
// linked* account to Transactions without going through a full new Link
// flow. This matters because a full new Link flow would end with us
// calling exchange-public-token again, which tries to attach a brand-new
// Dwolla funding source -- and in Sandbox specifically, re-linking with
// the default test credentials always resolves to the exact same canned
// account/routing number, so Dwolla correctly rejects it as a duplicate
// of the funding source that's already there. Passing `access_token`
// (instead of requesting fresh `products`) tells Plaid this is the same
// Item asking for broader consent, not a new one; `additional_consented_products`
// is what actually grants Transactions on top of whatever it already had.
export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const { accountId } = await request.json();
  if (!accountId) return Response.json({ error: "Missing accountId." }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: account } = await admin
    .from("simple_accounts")
    .select("id, plaid_access_token")
    .eq("id", accountId)
    .eq("user_id", user.id)
    .single();

  if (!account?.plaid_access_token) {
    return Response.json({ error: "Account not found." }, { status: 404 });
  }

  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: "PriorityPay Simple",
      country_codes: [CountryCode.Us],
      language: "en",
      access_token: account.plaid_access_token,
      additional_consented_products: [Products.Transactions],
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/accounts`,
      webhook: `${process.env.NEXT_PUBLIC_APP_URL}/api/plaid/webhook`,
    });
    return Response.json({ link_token: response.data.link_token });
  } catch (err) {
    console.error("Plaid create-update-link-token failed:", err?.response?.data || err);
    return Response.json({ error: "Could not start Plaid Link update." }, { status: 500 });
  }
}
