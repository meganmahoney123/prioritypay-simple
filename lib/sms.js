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
// deposit split over a missing text message -- same no-op-if-unconfigured
// pattern used elsewhere in lib/runSplit.js's manual_approval mode.
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
//
// `lines` is one { label, pct, amount } per category this deposit was
// split into (built in runSplit.js from the same `allocated` map it just
// recorded). Whatever wasn't allocated stays where it was deposited and is
// listed last as "Guilt-Free Spending", with its percentage derived from
// the dollars so the text always adds up to the deposit.
export const GUILT_FREE_LABEL = "Guilt-Free Spending";

// "$720" for whole dollars, "$720.50" otherwise -- keeps the text short.
function smsMoney(n) {
  const v = Number(n) || 0;
  const whole = Math.abs(v - Math.round(v)) < 0.005;
  return v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  });
}

function smsPct(n) {
  return `${Math.round((Number(n) || 0) * 10) / 10}%`;
}

export function buildDepositAlertText({ depositAmount, lines = [], dashboardUrl }) {
  const total = Number(depositAmount) || 0;
  const rows = lines
    .filter((l) => Number(l.amount) > 0)
    .map((l) => `${l.label} (${smsPct(l.pct)}): ${smsMoney(l.amount)}`);

  const allocatedSum = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const remainder = Math.round((total - allocatedSum) * 100) / 100;
  if (remainder > 0 && total > 0) {
    rows.push(`${GUILT_FREE_LABEL} (${smsPct((remainder / total) * 100)}): ${smsMoney(remainder)}`);
  }

  return [
    `PrioritySave: ${smsMoney(total)} deposit detected. Your split:`,
    ...rows,
    `Approve split: ${dashboardUrl}`,
  ].join("\n");
}

export async function sendDepositAlertSms({ phoneNumber, depositAmount, lines = [], dashboardUrl }) {
  const body = buildDepositAlertText({ depositAmount, lines, dashboardUrl });
  return sendSms(phoneNumber, body);
}

// Distinct from sendDepositAlertSms above -- this fires when a real
// cross-account transfer the user already knew about (a One-Time Transfer
// or Close-Out, tracked via simple_transfer_allocations' needs_approval ->
// in_transit -> completed flow) is CONFIRMED to have actually landed in
// the destination account, via lib/reconcileTransfers.js's Plaid match or
// the webhook's own inline check. Copy is deliberately different so it's
// never mistaken for "new money showed up, here's your split" -- this is
// "the transfer you already approved arrived."
export async function sendTransferLandedSms({ phoneNumber, amount, destLabel, dashboardUrl }) {
  const amountStr = Number(amount).toLocaleString("en-US", { style: "currency", currency: "USD" });
  const body = `PrioritySave: Your ${amountStr} transfer to ${destLabel} has landed. ${dashboardUrl}`;
  return sendSms(phoneNumber, body);
}

// Weekly summary text (notification_frequency = 'weekly').
export async function sendWeeklyDigestSms({ phoneNumber, count, total, depositsUrl }) {
  const totalStr = Number(total).toLocaleString("en-US", { style: "currency", currency: "USD" });
  const body = `PrioritySave weekly summary: ${count} ${count === 1 ? "deposit is" : "deposits are"} ready to split (${totalStr}). ${depositsUrl}`;
  return sendSms(phoneNumber, body);
}
