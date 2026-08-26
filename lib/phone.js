// Deposit text alerts (lib/sms.js) only ever work for US numbers today --
// Twilio's "To" address needs E.164 (+1XXXXXXXXXX), and onboarding now
// requires a phone number before someone can finish (see app/onboarding/
// page.js's Deposit Alerts step -- the whole product depends on this
// working, so a phone number is no longer skippable the way it used to be).
// This is the one place that decides whether whatever someone typed counts
// as a real US mobile number, used both to enable/disable onboarding's
// Continue button and to normalize what actually gets saved.

// Accepts any of: "5551234567", "555-123-4567", "(555) 123-4567",
// "1 555 123 4567", "+15551234567" -- anything that reduces to exactly 10
// digits (optionally prefixed with a US country code "1") once formatting
// is stripped out. Rejects anything shorter/longer or with a non-"1"
// country code, since Twilio SMS sending here is US-only.
export function normalizeUSPhone(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+1${digits.slice(1)}`;
  return null;
}

export function isValidUSPhone(raw) {
  return normalizeUSPhone(raw) !== null;
}
