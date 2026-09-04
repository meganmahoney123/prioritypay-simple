// Thin wrapper around Telnyx's Messages API (plain fetch, no SDK dependency
// -- one endpoint, not worth the package) for the deposit-threshold text
// alert feature (see runSplit.js's call to sendDepositAlertSms below, and
// the Notifications card in app/(app)/settings/page.js where a user sets a
// phone number + threshold).
//
// Switched from Twilio (Sep 2026) -- Twilio's Trust Hub compliance profile
// for this business kept getting rejected on EIN verification, which was
// blocking A2P registration entirely. Telnyx's toll-free number + Toll-Free
// Verification path is a separate review track from 10DLC brand/campaign
// vetting (which every provider, Telnyx included, still requires for LOCAL
// numbers) -- toll-free verification is typically same-day-to-a-few-days
// instead of 1-3 weeks, which is why this uses a toll-free TELNYX_FROM_NUMBER
// rather than a local one. See TELNYX_SETUP.md for the account setup this
// code depends on.
//
// Silently no-ops (rather than throwing) if Telnyx isn't configured, so a
// dev/preview environment without TELNYX_* env vars set never breaks a
// deposit split over a missing text message -- see the same pattern as
// Dwolla being optional in lib/runSplit.js's manual_approval mode.
const TELNYX_API_KEY = process.env.TELNYX_API_KEY;
const TELNYX_FROM_NUMBER = process.env.TELNYX_FROM_NUMBER;

export function smsConfigured() {
  return Boolean(TELNYX_API_KEY && TELNYX_FROM_NUMBER);
}

async function sendSms(to, body) {
  if (!smsConfigured()) {
    console.warn("[sms] Telnyx not configured (TELNYX_API_KEY/TELNYX_FROM_NUMBER) -- skipping SMS send.");
    return { skipped: true };
  }
  if (!to) return { skipped: true };

  const res = await fetch("https://api.telnyx.com/v2/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TELNYX_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: TELNYX_FROM_NUMBER, to, text: body }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[sms] Telnyx send failed", res.status, detail);
    return { error: detail || `Telnyx responded ${res.status}` };
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
