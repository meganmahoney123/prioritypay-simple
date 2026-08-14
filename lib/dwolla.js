import dwolla from "dwolla-v2";

function env() {
  return process.env.DWOLLA_ENV || "sandbox";
}

// Server-only. DWOLLA_SECRET must never reach the browser -- only import
// this inside app/api/** route handlers. dwolla-v2's Client handles OAuth
// token exchange/refresh for you on each request.
//
// Built lazily (not at module load) because dwolla-v2 throws immediately
// if `key`/`secret` are missing -- and during `next build`, Next.js
// imports every route module to collect metadata *before* real env vars
// are necessarily set, which would otherwise crash the build itself.
let _client = null;
export function dwollaClient() {
  if (!_client) {
    _client = new dwolla.Client({
      key: process.env.DWOLLA_KEY,
      secret: process.env.DWOLLA_SECRET,
      environment: env(), // 'sandbox' | 'production'
    });
  }
  return _client;
}

// We only store the *id* half of a funding-source/customer resource
// locally (see supabase/schema.sql comments on why) and rebuild the full
// API URL here when we need to reference it in a request body.
export function dwollaApiBase() {
  return env() === "production" ? "https://api.dwolla.com" : "https://api-sandbox.dwolla.com";
}

export function fundingSourceUrl(fundingSourceId) {
  return `${dwollaApiBase()}/funding-sources/${fundingSourceId}`;
}
