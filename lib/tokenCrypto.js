import crypto from "crypto";

// Encrypts Plaid access_token values before they ever touch Postgres.
// simple_accounts.plaid_access_token used to be stored as plain text,
// protected only by RLS + the fact that the browser client is never sent
// this column (see the comment atop app/api/accounts/route.js) -- real
// defense in depth for the one column in this database that can actually
// move money if it leaked. See PHASE L, supabase/schema.sql (no schema
// change needed -- the column stays `text`, it just now holds an
// encrypted blob instead of a raw token) and README.md for the
// PLAID_TOKEN_ENCRYPTION_KEY setup step this requires.
//
// AES-256-GCM: a 12-byte random IV per encryption (never reused with the
// same key, which is what GCM's security depends on) plus a 16-byte auth
// tag, so a tampered ciphertext fails to decrypt instead of silently
// returning garbage. Both are stored alongside the ciphertext itself,
// base64-encoded together with a version prefix -- there's nothing secret
// about an IV or auth tag, only the key (which never touches the
// database) needs to stay private.
const ALGO = "aes-256-gcm";
const ENC_PREFIX = "enc:v1:";
const IV_LEN = 12;
const TAG_LEN = 16;

function getKey() {
  const raw = process.env.PLAID_TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "PLAID_TOKEN_ENCRYPTION_KEY is not set. Required to encrypt/decrypt Plaid access tokens -- see README.md's environment variable setup."
    );
  }
  const key = Buffer.from(raw, "hex");
  if (key.length !== 32) {
    throw new Error("PLAID_TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes) for AES-256-GCM.");
  }
  return key;
}

// True if a stored value predates encryption being added -- a real Plaid
// access token, not one of our own encrypted blobs. Used both by
// decryptToken (to know whether there's anything to decrypt at all) and
// by callers that already have a row in hand, to opportunistically
// re-save it in encrypted form the next time that row is touched. That
// self-healing is deliberate instead of a one-off backfill script: every
// account that's actually in use gets read by GET /api/accounts or the
// Plaid webhook constantly, so the whole table converges to
// encrypted-at-rest on its own within the normal request/webhook
// lifecycle, with no separate migration to run or coordinate.
export function isLegacyPlaintext(stored) {
  return !!stored && !stored.startsWith(ENC_PREFIX);
}

export function encryptToken(plaintext) {
  if (!plaintext) return plaintext;
  const key = getKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return ENC_PREFIX + Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

// Passes legacy plaintext tokens through unchanged (see isLegacyPlaintext
// above) -- this is what lets encryption roll out without breaking every
// account linked before this change shipped. A value that DOES have the
// enc:v1: prefix but fails to decrypt (wrong key, corrupted data) throws
// rather than silently returning garbage -- callers already wrap Plaid
// calls in try/catch (see app/api/accounts/route.js, the webhook), so
// this fails the same way an expired/revoked Item already does.
export function decryptToken(stored) {
  if (!stored) return stored;
  if (isLegacyPlaintext(stored)) return stored;

  const key = getKey();
  const payload = Buffer.from(stored.slice(ENC_PREFIX.length), "base64");
  const iv = payload.subarray(0, IV_LEN);
  const authTag = payload.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ciphertext = payload.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
