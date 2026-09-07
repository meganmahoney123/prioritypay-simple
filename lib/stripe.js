import Stripe from "stripe";

// Server-only. STRIPE_SECRET_KEY must never reach the browser -- only
// import this inside app/api/** route handlers.
//
// Built lazily (not at module load), same reasoning as dwollaClient() in
// lib/dwolla.js -- next build imports every route module to collect
// metadata before real env vars are necessarily set, and the Stripe SDK
// constructor doesn't like being handed `undefined`.
let _client = null;
export function stripeClient() {
  if (!_client) {
    _client = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
  }
  return _client;
}

// The $19/mo PriorityPay Subscription Price object, created once in the
// Stripe dashboard (Product catalog) -- not created on the fly per
// checkout, so every subscriber shares one Price/MRR line in Stripe's own
// reporting.
export function priceId() {
  return process.env.STRIPE_PRICE_ID;
}

// The Business tier Price object (PHASE T) -- a separate, higher-priced
// Price created once in the Stripe dashboard, same "not created on the fly
// per checkout" reasoning as priceId() above. Initial pricing is ~$79-99/mo
// (see /areas/priority-pay.md); the exact number lives in Stripe, not here.
export function businessPriceId() {
  return process.env.STRIPE_BUSINESS_PRICE_ID;
}

// Maps a Stripe Price id off a completed Checkout Session back to which
// plan it bought. Used only by the webhook (checkout.session.completed),
// which is the one place a plan actually gets assigned -- see PHASE T's
// comment in supabase/migrations/20260907_business_tier.sql for why plan is its own column rather
// than inferred from persona.
export function planForPriceId(stripePriceId) {
  if (stripePriceId && stripePriceId === businessPriceId()) return "business";
  return "simple";
}
