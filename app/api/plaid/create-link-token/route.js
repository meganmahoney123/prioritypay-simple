import { requireUser, unauthorized } from "@/lib/apiAuth";
import { plaidClient } from "@/lib/plaid";
import { CountryCode, Products } from "plaid";
import { TRANSFER_EXECUTION_MODE } from "@/lib/executionMode";

export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  // Optional body -- callers that want this connect flow restricted to
  // savings accounts only (percent-split rows: "the idea is that they're
  // saving this money, and sending it to another checking account won't
  // work") pass { savingsOnly: true }. Callers that need to catch deposits
  // (onboarding's Connect Accounts step, the general Accounts page) send no
  // body at all and get every account type, since a client could pay into
  // checking, Venmo, Cash App, etc.
  let savingsOnly = false;
  try {
    const body = await request.json();
    savingsOnly = Boolean(body?.savingsOnly);
  } catch {
    // no body sent -- fine, defaults to unrestricted
  }

  try {
    // Auth ($1.50/account, one-time) only matters once PriorityPay actually
    // originates a Dwolla transfer to/from this account -- in
    // manual_approval mode it never does (the user sends every transfer
    // themselves), so requesting it here is pure unused cost. Accounts
    // linked without it pick up Auth later the same way they already pick
    // up Transactions today, via create-update-link-token's
    // additional_consented_products -- see lib/executionMode.js.
    const products = TRANSFER_EXECUTION_MODE === "dwolla_auto" ? [Products.Auth, Products.Transactions] : [Products.Transactions];
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: "PriorityPay Simple",
      products,
      country_codes: [CountryCode.Us],
      language: "en",
      ...(savingsOnly ? { account_filters: { depository: { account_subtypes: ["savings"] } } } : {}),
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/accounts`,
      webhook: `${process.env.NEXT_PUBLIC_APP_URL}/api/plaid/webhook`,
    });
    return Response.json({ link_token: response.data.link_token });
  } catch (err) {
    console.error("Plaid create-link-token failed:", err?.response?.data || err);
    return Response.json({ error: "Could not start Plaid Link." }, { status: 500 });
  }
}
