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
