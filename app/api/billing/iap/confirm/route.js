import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { getRevenueCatSubscriber, planForProductId } from "@/lib/revenuecat";

// The Apple IAP counterpart to /api/onboarding/confirm-payment -- called
// right after a RevenueCat purchase (Purchases.purchaseStoreProduct)
// resolves successfully on-device, so the profile flips to active
// immediately rather than waiting on RevenueCat's webhook to arrive
// (app/api/revenuecat/webhook/route.js), which can lag by a few seconds
// the same way Stripe's webhook can. Both are idempotent against the same
// RevenueCat subscriber state, so there's no harm if both run.
//
// Unlike the Stripe confirm route, there's no session id to verify
// ownership with -- RevenueCat's app_user_id IS this user's id (see
// lib/revenuecat.js), so looking up "my own subscriber record" is
// inherently scoped to the signed-in user. We still re-fetch from
// RevenueCat's API rather than trusting whatever the client claims it
// purchased, so a tampered client request can't grant entitlement it
// didn't actually pay for.
export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const { onboarding } = await request.json().catch(() => ({}));

  let subscriber;
  try {
    subscriber = await getRevenueCatSubscriber(user.id);
  } catch (err) {
    console.error("IAP confirm: RevenueCat lookup failed", user.id, err);
    return Response.json({ error: "Could not verify your purchase with Apple. Please try again." }, { status: 502 });
  }

  const entitlements = subscriber?.subscriber?.entitlements || {};
  const activeEntitlement = Object.values(entitlements).find((e) => {
    if (!e.expires_date) return true; // non-expiring/lifetime entitlement
    return new Date(e.expires_date).getTime() > Date.now();
  });

  if (!activeEntitlement) {
    return Response.json({ error: "No active purchase found for your account yet." }, { status: 402 });
  }

  const productId = activeEntitlement.product_identifier;
  const plan = planForProductId(productId);

  const admin = supabaseAdmin();
  const profileUpdate = {
    subscription_status: "active",
    subscription_source: "apple",
    plan,
    cancel_at_period_end: false,
  };
  if (activeEntitlement.expires_date) {
    profileUpdate.current_period_end = activeEntitlement.expires_date;
  }
  // Mirrors /api/onboarding/confirm-payment's onboarding:true write --
  // only set it when this confirm call is actually the onboarding flow's
  // payment step, not a later Business-tier upgrade from Settings.
  if (onboarding) profileUpdate.onboarded = true;

  const { error } = await admin.from("simple_profiles").update(profileUpdate).eq("id", user.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true, plan });
}
