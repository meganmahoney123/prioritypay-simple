// Recurring bills: frequencies, projecting upcoming payments, summaries.
// Pure functions, used by the API and the Bills page.

export const FREQUENCIES = [
  { value: "weekly", label: "Weekly", days: 7 },
  { value: "biweekly", label: "Every 2 weeks", days: 14 },
  { value: "semimonthly", label: "Twice a month", days: 15 },
  { value: "monthly", label: "Monthly", months: 1 },
  { value: "quarterly", label: "Every 3 months", months: 3 },
  { value: "semiannual", label: "Every 6 months", months: 6 },
  { value: "yearly", label: "Yearly", months: 12 },
];
export const FREQUENCY_VALUES = FREQUENCIES.map((f) => f.value);
export const frequencyLabel = (v) => FREQUENCIES.find((f) => f.value === v)?.label || "Monthly";

// Plaid's recurring-stream frequencies -> ours. UNKNOWN is not usable.
export function fromPlaidFrequency(v) {
  return { WEEKLY: "weekly", BIWEEKLY: "biweekly", SEMI_MONTHLY: "semimonthly", MONTHLY: "monthly", ANNUALLY: "yearly" }[v] || null;
}

const pad = (n) => String(n).padStart(2, "0");
export const toIso = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
export const parseIso = (s) => {
  const [y, m, d] = String(s).slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
};

function addMonths(base, n) {
  const y = base.getUTCFullYear();
  const m = base.getUTCMonth() + n;
  const day = base.getUTCDate();
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(day, last)));
}

// Every payment date for a bill from `start` through `end` (inclusive ISO dates).
export function occurrencesBetween(bill, start, end) {
  const f = FREQUENCIES.find((x) => x.value === bill.frequency) || FREQUENCIES[3];
  if (!bill.next_due) return [];
  const base = parseIso(bill.next_due);
  const s = parseIso(start);
  const e = parseIso(end);
  const out = [];
  for (let i = 0; i < 500; i++) {
    const d = f.months ? addMonths(base, i * f.months) : new Date(base.getTime() + i * f.days * 86400000);
    if (d > e) break;
    if (d >= s) out.push(toIso(d));
  }
  return out;
}

// First payment on or after `from`.
export function nextOccurrence(bill, from) {
  const far = new Date(parseIso(from).getTime() + 800 * 86400000);
  return occurrencesBetween(bill, from, toIso(far))[0] || null;
}

// Summary for the next `days` days: every upcoming payment, sorted by date.
export function upcoming(bills, fromIso, days = 30) {
  const end = toIso(new Date(parseIso(fromIso).getTime() + days * 86400000));
  const items = [];
  bills.forEach((b) => occurrencesBetween(b, fromIso, end).forEach((date) => items.push({ bill: b, date })));
  items.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return items;
}

// ---- Deciding what counts as a bill ------------------------------------
// Only routine payments: weekly, every 2 weeks, twice a month, monthly,
// every 3 months, every 6 months or yearly. What keeps the list short is the
// kind of payment, not how often it repeats: groceries, rides, shopping and
// person-to-person payments are left out so nobody sorts through every charge.

const DAY = 86400000;
export const BILL_FREQUENCIES = ["weekly", "biweekly", "semimonthly", "monthly", "quarterly", "semiannual", "yearly"];

// Frequency from how far apart the first and last payment are and how many
// there were. Plaid has no name for every 3 or 6 months, so this finds those.
export function classifyStream({ frequency, firstDate, lastDate, count }) {
  const named = fromPlaidFrequency(frequency);
  if (named) return named; // Plaid already names weekly, every 2 weeks, twice a month, monthly and yearly
  if (!firstDate || !lastDate || !(count >= 2)) return null;
  const gap = (parseIso(lastDate) - parseIso(firstDate)) / DAY / (count - 1);
  if (gap >= 26 && gap <= 35) return "monthly";
  if (gap >= 80 && gap <= 100) return "quarterly";
  if (gap >= 165 && gap <= 200) return "semiannual";
  if (gap >= 350 && gap <= 380) return "yearly";
  return null;
}

// Plaid's own category for the payment: bills and subscriptions, not shopping.
const BILL_CATEGORIES = new Set([
  "RENT_AND_UTILITIES", "LOAN_PAYMENTS", "GENERAL_SERVICES", "ENTERTAINMENT", "PERSONAL_CARE",
  "MEDICAL", "GOVERNMENT_AND_NON_PROFIT", "HOME_IMPROVEMENT", "BANK_FEES",
]);
const NOT_A_BILL_NAME = /transfer|withdrawal|check\s*#|atm|payroll|deposit/i;
// Person-to-person apps. Fine when the same person is paid the same amount on
// a schedule (a trainer, a cleaner, a babysitter), not for one-off payments.
const PEER_TO_PEER = /venmo|zelle|cash app|cashapp|paypal|apple cash/i;

// steady: the amount is about the same each time.
export function looksLikeBill({ name, primaryCategory, steady = true }) {
  const n = String(name || "");
  if (PEER_TO_PEER.test(n)) return Boolean(steady);
  if (NOT_A_BILL_NAME.test(n)) return false;
  if (primaryCategory && !BILL_CATEGORIES.has(primaryCategory)) return false;
  return true;
}
