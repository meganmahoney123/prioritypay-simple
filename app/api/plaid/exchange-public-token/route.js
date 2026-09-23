import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { plaidClient } from "@/lib/plaid";
import { isReadOnly, getBillingProfile, readOnlyError } from "@/lib/subscription";
import { encryptToken } from "@/lib/tokenCrypto";

// Runs after Plaid Link succeeds in the browser: exchanges the public_token
// for a real access_token (server-only, never sent to the client) and
// stores the linked account. PriorityPay never originates a transfer
// itself -- it only calculates a split and tells the user exactly what to
// send, where -- so there's no payment-rail attachment step here for any
// account type.
// We don't try to establish a transaction-sync cursor here: Plaid's
// backend hasn't necessarily finished its initial data pull the instant
// linking finishes, so an eager sync call can come back "not ready yet."
// Instead the webhook (app/api/plaid/webhook) handles this itself the
// first time it hears from this Item -- see the comment there.
export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const { public_token, account_id, institution_name, account_name, mask, account_type } = await request.json();
  if (!public_token || !account_id) {
    return Response.json({ error: "Missing public_token or account_id." }, { status: 400 });
  }
  const isCredit = account_type === "credit";
  // Business accounts (Business Owner With Employees persona) are linked
  // purely for balance visibility next to Team & Plan Obligations -- same
  // reasoning as credit cards, never a transfer source/destination.
  const isBusiness = account_type === "business";

  const admin = supabaseAdmin();

  // Read-only trial gate (see lib/subscription.js): connecting a NEW
  // account is blocked once the 30-day trial has passed with no active
  // subscription. Existing accounts/split rules stay fully visible --
  // this only stops adding more.
  const billingProfile = await getBillingProfile(admin, user.id);
  if (isReadOnly(billingProfile)) return readOnlyError();

  try {
    const exchange = await plaidClient.itemPublicTokenExchange({ public_token });
    const accessToken = exchange.data.access_token;
    const itemId = exchange.data.item_id;

    const { data: inserted, error: dbError } = await admin
      .from("simple_accounts")
      .insert({
        user_id: user.id,
        institution_name: institution_name || "Bank",
        account_name: account_name || "Account",
        mask,
        plaid_item_id: itemId,
        plaid_access_token: encryptToken(accessToken),
        plaid_account_id: account_id,
        account_type: isCredit ? "credit" : isBusiness ? "business" : "depository",
      })
      .select("id, institution_name, account_name, mask, current_balance, account_type, created_at")
      .single();
    if (dbError) throw dbError;

    return Response.json({ account: inserted });
  } catch (err) {
    const detail = err?.response?.data || err?.body || err?.message || String(err);
    console.error("Plaid link failed:", detail);
    return Response.json({ error: "Could not finish linking that account.", detail }, { status: 500 });
  }
}
