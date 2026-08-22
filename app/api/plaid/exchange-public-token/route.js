import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { plaidClient } from "@/lib/plaid";
import { dwollaClient } from "@/lib/dwolla";
import { isReadOnly, getBillingProfile, readOnlyError } from "@/lib/subscription";
import { TRANSFER_EXECUTION_MODE } from "@/lib/executionMode";

// Runs after Plaid Link succeeds in the browser. Three steps:
//  1. Exchange the public_token for a real access_token (server-only, never
//     sent to the client).
//  2. Ask Plaid for a Dwolla-flavored processor token for the account the
//     user picked.
//  3. Hand that processor token to Dwolla to attach it as a funding source
//     on the user's Dwolla Customer -- this is what makes the account
//     actually usable as a transfer source/destination.
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
  // reasoning as credit cards, never a transfer source/destination, so
  // identity verification/Dwolla is skipped for these too.
  const isBusiness = account_type === "business";
  // In manual_approval mode PriorityPay never originates a transfer to or
  // from ANY account -- the user sends every transfer themselves -- so
  // there's nothing for a Dwolla funding source to do yet, on any account
  // type. This also matters for correctness, not just cost: identity
  // verification (Dwolla KYC) was intentionally removed from onboarding
  // and the Accounts page (see those pages' comments), so no one has a
  // simple_dwolla_customers row anymore. Without this check, every regular
  // account link would 400 below with "Complete identity verification"
  // for a step that no longer exists anywhere in the product. Flips back
  // to attaching real funding sources automatically once
  // TRANSFER_EXECUTION_MODE is 'dwolla_auto'.
  const skipDwolla = isCredit || isBusiness || TRANSFER_EXECUTION_MODE !== "dwolla_auto";

  const admin = supabaseAdmin();

  // Read-only trial gate (see lib/subscription.js): connecting a NEW
  // account is blocked once the 30-day trial has passed with no active
  // subscription. Existing accounts/split rules stay fully visible --
  // this only stops adding more.
  const billingProfile = await getBillingProfile(admin, user.id);
  if (isReadOnly(billingProfile)) return readOnlyError();

  // Credit cards and business accounts skip identity verification and
  // Dwolla entirely -- neither is ever a transfer source/destination,
  // only a close-out expense feed (credit) or a balance to glance at
  // (business), so there's nothing for Dwolla to attach a funding
  // source to.
  let dwollaCustomer = null;
  if (!skipDwolla) {
    const { data } = await admin
      .from("simple_dwolla_customers")
      .select("dwolla_customer_url")
      .eq("user_id", user.id)
      .single();
    dwollaCustomer = data;

    if (!dwollaCustomer) {
      return Response.json(
        { error: "Complete identity verification (Dwolla) before linking a bank account." },
        { status: 400 }
      );
    }
  }

  try {
    const exchange = await plaidClient.itemPublicTokenExchange({ public_token });
    const accessToken = exchange.data.access_token;
    const itemId = exchange.data.item_id;

    let fundingSourceId = null;
    if (!skipDwolla) {
      const processorTokenRes = await plaidClient.processorTokenCreate({
        access_token: accessToken,
        account_id,
        processor: "dwolla",
      });
      const processorToken = processorTokenRes.data.processor_token;

      const fundingSourceRes = await dwollaClient().post(
        `${dwollaCustomer.dwolla_customer_url}/funding-sources`,
        { plaidToken: processorToken, name: account_name || "Checking" }
      );
      const fundingSourceUrl = fundingSourceRes.headers.get("location");
      fundingSourceId = fundingSourceUrl.split("/").pop();
    }

    const { data: inserted, error: dbError } = await admin
      .from("simple_accounts")
      .insert({
        user_id: user.id,
        institution_name: institution_name || "Bank",
        account_name: account_name || "Account",
        mask,
        plaid_item_id: itemId,
        plaid_access_token: accessToken,
        plaid_account_id: account_id,
        dwolla_funding_source_id: fundingSourceId,
        account_type: isCredit ? "credit" : isBusiness ? "business" : "depository",
      })
      .select("id, institution_name, account_name, mask, current_balance, account_type, created_at")
      .single();
    if (dbError) throw dbError;

    return Response.json({ account: inserted });
  } catch (err) {
    const detail = err?.response?.data || err?.body || err?.message || String(err);
    console.error("Plaid/Dwolla link failed:", detail);
    return Response.json({ error: "Could not finish linking that account.", detail }, { status: 500 });
  }
}
