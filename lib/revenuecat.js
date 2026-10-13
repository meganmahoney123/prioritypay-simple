// Server-only RevenueCat helpers -- the Apple IAP counterpart to
// lib/stripe.js. RevenueCat's app_user_id is always set to this app's own
// Supabase user id (passed as appUserID when the iOS client configures
// Purchases -- see the native purchase flow in app/onboarding/page.js and
// app/(app)/settings/page.js), so looking up a RevenueCat subscriber is
// just "look up by our own user id," the same way stripe_customer_id
// looks up a Stripe customer -- no separate mapping table needed.
//
// REVENUECAT_SECRET_API_KEY is the server-side (not the client-facing
// "public") key, from RevenueCat > Project Settings > API Keys. Must
// never reach the browser -- only import this inside app/api/** route
// handlers, same rule as lib/stripe.js's STRIPE_SECRET_KEY.
const REVENUECAT_API_BASE = "https://api.revenuecat.com/v2";

async function revenueCatFetch(path, options = {}) {
  const res = await fetch(`${REVENUECAT_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.REVENUECAT_SECRET_API_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`RevenueCat API ${path} failed: ${res.status} ${body}`);
  }
  return res.json();
}

// Fetches a RevenueCat customer's current entitlements/subscriptions by
// our own Supabase user id. Used by /api/billing/iap/confirm right after
// a purchase completes on-device, the same "don't wait for the webhook"
// fast-path reasoning as app/api/onboarding/confirm-payment/route.js --
// RevenueCat's own webhook (app/api/revenuecat/webhook/route.js) still
// fires and performs the same profile update, so both are safe to run.
export async function getRevenueCatSubscriber(userId) {
  return revenueCatFetch(`/projects/${process.env.REVENUECAT_PROJECT_ID}/customers/${encodeURIComponent(userId)}`);
}

// Maps an Apple subscription product id to which PriorityPay plan it
// buys -- the IAP equivalent of lib/stripe.js's planForPriceId(). Product
// ids are created once in App Store Connect (In-App Purchases) and
// imported into RevenueCat as Products, not created on the fly.
const PRODUCT_ID_TO_PLAN = {
  "co.prioritypay.simple.monthly": "simple",
  "co.prioritypay.business.monthly": "business",
};

export function planForProductId(productId) {
  return PRODUCT_ID_TO_PLAN[productId] || "simple";
}

// RevenueCat's webhook payload uses `active`/`expired` plus an
// `expiration_at_ms` field rather than Stripe's status strings. Maps onto
// the same subscription_status values Stripe writes (trialing/active/
// past_due/canceled) so every other route (lib/subscription.js) keeps
// working unchanged regardless of which payment platform a user is on.
export function statusForRevenueCatEvent(eventType) {
  switch (eventType) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "UNCANCELLATION":
    case "PRODUCT_CHANGE":
      return "active";
    case "CANCELLATION":
      // A cancellation at period end is still "active" with
      // cancel_at_period_end=true -- mirrors how app/api/billing/cancel
      // handles a Stripe cancel-at-period-end, and keeps isReadOnly()
      // correct until the period actually runs out.
      return "active";
    case "EXPIRATION":
      return "canceled";
    case "BILLING_ISSUE":
      return "past_due";
    default:
      return null;
  }
}
