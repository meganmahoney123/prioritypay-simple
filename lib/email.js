// Thin wrapper around Resend's REST API (plain fetch, no SDK dependency --
// one endpoint, not worth the package, same "raw fetch" call as Twilio in
// lib/sms.js and APNs in lib/push.js) for the deposit-threshold EMAIL
// alert feature.
//
// Standing in for SMS while Twilio's A2P 10DLC business verification is
// stuck (see the "Deposit email alerts" card in app/(app)/settings/
// page.js and the equivalent onboarding step) -- lib/sms.js/sendDepositAlertSms
// and the phone-number UI it depended on are untouched and ready to come
// back once Twilio clears, this is purely an additional channel wired in
// alongside it.
//
// Silently no-ops (rather than throwing) if Resend isn't configured, so a
// dev/preview environment without RESEND_API_KEY set never breaks a
// deposit split over a missing email -- same pattern as smsConfigured()/
// pushConfigured().
const RESEND_API_KEY = process.env.RESEND_API_KEY;
// Must be an address on a domain verified in Resend's dashboard --
// defaults to PriorityPay's own domain, overridable per-environment (e.g.
// Resend's sandbox "onboarding@resend.dev" sender while a real domain is
// still being verified).
const ALERTS_FROM_EMAIL = process.env.ALERTS_FROM_EMAIL || "PriorityPay <alerts@prioritypay.co>";

export function emailConfigured() {
  return Boolean(RESEND_API_KEY);
}

async function sendEmail({ to, subject, html, text }) {
  if (!emailConfigured()) {
    console.warn("[email] Resend not configured (RESEND_API_KEY) -- skipping email send.");
    return { skipped: true };
  }
  if (!to) return { skipped: true };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: ALERTS_FROM_EMAIL, to, subject, html, text }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[email] Resend send failed", res.status, detail);
    return { error: detail || `Resend responded ${res.status}` };
  }
  return { ok: true };
}

// Called from runSplit() once a deposit's split has been calculated and
// recorded, only when the user has email alerts on and this deposit's
// total meets or exceeds their configured threshold (same
// sms_threshold column both channels share -- see runSplit.js). Never
// blocks or fails the split itself -- runSplit() fires this and doesn't
// await-fail on it (see the try/catch around the call site).
export async function sendDepositAlertEmail({ toEmail, depositAmount, dashboardUrl }) {
  const amountStr = Number(depositAmount).toLocaleString("en-US", { style: "currency", currency: "USD" });
  return sendEmail({
    to: toEmail,
    subject: `${amountStr} deposit detected — your split is ready`,
    text: `A ${amountStr} deposit just landed. Your split is calculated and ready to confirm — head to ${dashboardUrl} to confirm and send each transfer.`,
    html: `<p>A <strong>${amountStr}</strong> deposit just landed.</p><p>Your split is calculated and ready to confirm.</p><p><a href="${dashboardUrl}">Confirm and send each transfer →</a></p>`,
  });
}
