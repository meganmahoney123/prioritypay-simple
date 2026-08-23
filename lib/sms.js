// Thin wrapper around Twilio's REST API (plain fetch, no SDK dependency --
// one endpoint, not worth the package) for the deposit-threshold text alert
// feature (see runSplit.js's call to sendDepositAlertSms below, and the
// Notifications card in app/(app)/settings/page.js where a user sets a
// phone number + threshold).
//
// Silently no-ops (rather than throwing) if Twilio isn't configured, so a
// dev/preview environment without TWILIO_* env vars set never breaks a
// deposit split over a missing text message -- see the same pattern as
// Dwolla being optional in lib/runSplit.js's manual_approval mode.
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;

export function smsConfigured() {
  return Boolean(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM_NUMBER);
}

async function sendSms(to, body) {
  if (!smsConfigured()) {
    console.warn("[sms] Twilio not configured (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_FROM_NUMBER) -- skipping SMS send.");
    return { skipped: true };
  }
  if (!to) return { skipped: true };

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: TWILIO_FROM_NUMBER, Body: body }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[sms] Twilio send failed", res.status, detail);
    return { error: detail || `Twilio responded ${res.status}` };
  }
  return { ok: true };
}

// Called from runSplit() once a deposit's split has been calculated and
// recorded, only when the user has SMS alerts on and this deposit's total
// meets or exceeds their configured threshold. Never blocks or fails the
// split itself -- runSplit() fires this and doesn't await-fail on it (see
// the try/catch around the call site).
export async function sendDepositAlertSms({ phoneNumber, depositAmount, dashboardUrl }) {
  const amountStr = Number(depositAmount).toLocaleString("en-US", { style: "currency", currency: "USD" });
  const body = `PriorityPay: ${amountStr} deposit detected. Your split is calculated and ready — confirm each transfer here: ${dashboardUrl}`;
  return sendSms(phoneNumber, body);
}
