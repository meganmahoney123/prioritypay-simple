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
