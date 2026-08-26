// Sends real iOS push notifications via Apple Push Notification service
// (APNs), completing the Phase 3 scaffolding started in lib/native.js
// (registerForPushNotifications) and app/api/push/register. That route has
// been storing device tokens in simple_push_tokens since Phase 2 -- this
// file is what actually turns a stored token into a notification on
// someone's phone.
//
// APNs auth uses a JWT signed with an ES256 (P-256) private key -- the .p8
// "Auth Key" downloaded once from App Store Connect (Certificates,
// Identifiers & Profiles -> Keys), not a per-device certificate, so one key
// covers every device/build. Built on Node's built-in `crypto` and `http2`
// modules rather than adding the `apn` or `jsonwebtoken` packages -- same
// "one endpoint, not worth the package" call as lib/sms.js's raw Twilio
// fetch().
//
// Same silently-no-ops-if-unconfigured pattern as lib/sms.js: a preview/dev
// environment without the APNS_* env vars set never breaks a deposit split
// over a missing push.
import { createSign } from "crypto";
import http2 from "http2";

const APNS_KEY = process.env.APNS_KEY; // contents of the downloaded .p8 file, PEM format
const APNS_KEY_ID = process.env.APNS_KEY_ID; // "Key ID" shown next to the key in App Store Connect
const APNS_TEAM_ID = process.env.APNS_TEAM_ID; // Apple Developer "Team ID"
const APNS_BUNDLE_ID = process.env.APNS_BUNDLE_ID || "co.prioritypay.app"; // must match capacitor.config.json's appId
// Sandbox APNs (api.sandbox.push.apple.com) is what Xcode-run debug builds
// register against; api.push.apple.com is for TestFlight/App Store builds.
// Defaults to production since that's the common case once this is actually
// wired up -- set APNS_ENV=sandbox locally while testing against a
// simulator/debug build.
const APNS_HOST = process.env.APNS_ENV === "sandbox" ? "api.sandbox.push.apple.com" : "api.push.apple.com";

export function pushConfigured() {
  return Boolean(APNS_KEY && APNS_KEY_ID && APNS_TEAM_ID);
}

function base64url(input) {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// APNs provider tokens are valid up to an hour and Apple asks providers not
// to generate a new one on every request -- cached at module scope so it's
// reused across invocations within the same warm serverless instance.
// Regenerated a few minutes early (55 vs the 60 min limit) to avoid ever
// sending a token that expires mid-flight.
let cachedToken = null;
let cachedTokenExpiresAt = 0;

function getProviderToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && now < cachedTokenExpiresAt) return cachedToken;

  const header = base64url(JSON.stringify({ alg: "ES256", kid: APNS_KEY_ID }));
  const payload = base64url(JSON.stringify({ iss: APNS_TEAM_ID, iat: now }));
  const signer = createSign("SHA256");
  signer.update(`${header}.${payload}`);
  // APNs expects the raw (r || s) signature format, not the DER encoding
  // Node's default "ES256"-labeled output would need conversion for --
  // dsaEncoding: "ieee-p1363" gets Node to emit that raw format directly.
  const signature = signer.sign({ key: APNS_KEY, dsaEncoding: "ieee-p1363" });

  cachedToken = `${header}.${payload}.${base64url(signature)}`;
  cachedTokenExpiresAt = now + 55 * 60;
  return cachedToken;
}

// Sends one push to one device token. Never throws -- returns
// { ok: true } / { skipped: true } / { error } so callers (runSplit.js)
// can log without needing their own try/catch around every call.
async function sendPush(token, { title, body, url }) {
  if (!pushConfigured()) {
    console.warn("[push] APNs not configured (APNS_KEY/APNS_KEY_ID/APNS_TEAM_ID) -- skipping push send.");
    return { skipped: true };
  }
  if (!token) return { skipped: true };

  return new Promise((resolve) => {
    let client;
    try {
      client = http2.connect(`https://${APNS_HOST}`);
    } catch (err) {
      resolve({ error: err?.message || "failed to connect to APNs" });
      return;
    }

    client.on("error", (err) => {
      resolve({ error: err?.message || "APNs connection error" });
    });

    const payload = JSON.stringify({
      aps: { alert: { title, body }, sound: "default" },
      // Carried through to the app's push-notification tap handler (not yet
      // wired up client-side) so tapping a deposit alert can deep-link
      // straight to the dashboard instead of just opening the app cold.
      url,
    });

    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${token}`,
      authorization: `bearer ${getProviderToken()}`,
      "apns-topic": APNS_BUNDLE_ID,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json",
    });

    let responseBody = "";
    let status = null;
    req.on("response", (headers) => {
      status = headers[":status"];
    });
    req.on("data", (chunk) => {
      responseBody += chunk;
    });
    req.on("end", () => {
      client.close();
      if (status === 200) {
        resolve({ ok: true });
      } else {
        console.error("[push] APNs send failed", status, responseBody);
        resolve({ error: responseBody || `APNs responded ${status}` });
      }
    });
    req.on("error", (err) => {
      client.close();
      resolve({ error: err?.message || "APNs request error" });
    });

    req.write(payload);
    req.end();
  });
}

// Called from runSplit.js alongside sendDepositAlertSms, once per registered
// device token for the user (someone can have more than one device signed
// in). Mirrors sendDepositAlertSms's signature/shape on purpose.
export async function sendDepositAlertPush({ token, depositAmount, dashboardUrl }) {
  const amountStr = Number(depositAmount).toLocaleString("en-US", { style: "currency", currency: "USD" });
  return sendPush(token, {
    title: "Deposit detected",
    body: `${amountStr} deposit detected. Your split is calculated and ready to confirm.`,
    url: dashboardUrl,
  });
}
