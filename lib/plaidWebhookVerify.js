import crypto from "crypto";
import { plaidClient } from "@/lib/plaid";

// Verifies Plaid's "Plaid-Verification" header (a short-lived ES256 JWT) the
// way Plaid documents it: the JWT's key id is looked up with
// webhook_verification_key/get, the signature is checked, the token must be
// under 5 minutes old, and its request_body_sha256 must match the raw body.
// Without this, anyone who knew the webhook URL could post fake events.
//
// Escape hatch: set PLAID_WEBHOOK_VERIFY=off in Vercel to skip the check
// (only if Plaid deliveries start failing and you need splits running again).
const keyCache = new Map();

const b64u = (s) => Buffer.from(s, "base64url");

export async function verifyPlaidWebhook(rawBody, token, getKey) {
  try {
    if (!token) return false;
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const header = JSON.parse(b64u(parts[0]).toString());
    if (header.alg !== "ES256" || !header.kid) return false;

    let jwk = keyCache.get(header.kid);
    if (!jwk) {
      jwk = await (getKey || defaultGetKey)(header.kid);
      if (!jwk) return false;
      keyCache.set(header.kid, jwk);
    }
    const ok = crypto.verify(
      "sha256",
      Buffer.from(`${parts[0]}.${parts[1]}`),
      { key: crypto.createPublicKey({ key: jwk, format: "jwk" }), dsaEncoding: "ieee-p1363" },
      b64u(parts[2])
    );
    if (!ok) return false;

    const claims = JSON.parse(b64u(parts[1]).toString());
    if (!claims.iat || Math.floor(Date.now() / 1000) - claims.iat > 300) return false;
    const digest = crypto.createHash("sha256").update(rawBody).digest("hex");
    const a = Buffer.from(String(claims.request_body_sha256 || ""));
    const b = Buffer.from(digest);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

async function defaultGetKey(kid) {
  const { data } = await plaidClient.webhookVerificationKeyGet({ key_id: kid });
  return data?.key || null;
}
