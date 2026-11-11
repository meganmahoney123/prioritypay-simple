// Finds quarterly, twice-a-year and yearly bills by looking for the same
// company charging a similar amount on about the same date 3, 6 or 12 months
// apart. It works across every linked card and account, so a renewal that moved
// to a new card is still found. Charges from one company that land within a
// couple of days of each other (like several domain renewals) count as one bill.
// A match is only a suggestion: the person says yes before anything is added.
import { guessLabel, labeledName } from "./billLabels";

const DAY = 86400000;
const INTERVALS = [
  { frequency: "yearly", months: 12 },
  { frequency: "semiannual", months: 6 },
  { frequency: "quarterly", months: 3 },
];
const SKIP_NAME = /transfer|withdrawal|check\s*#|atm|payroll|deposit|venmo|zelle|cash\s*app|cashapp|paypal|apple cash|interest|refund/i;
const SKIP_CATEGORY = /^(TRANSFER_IN|TRANSFER_OUT|INCOME|FOOD_AND_DRINK)$/;
const DATE_WINDOW_DAYS = 4; // banks post weekend and holiday charges a day or two late
const GROUP_DAYS = 2;       // charges this close together are one bill
const AMOUNT_TOLERANCE = 0.15;

const ms = (iso) => Date.parse(`${iso}T00:00:00Z`);
const toIso = (t) => new Date(t).toISOString().slice(0, 10);
const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 24);

function monthsBefore(iso, n) {
  const d = new Date(ms(iso));
  const y = d.getUTCFullYear(), m = d.getUTCMonth() - n, day = d.getUTCDate();
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return Date.UTC(y, m, Math.min(day, last));
}

function similar(a, b) {
  return Math.abs(a - b) <= Math.max(a, b) * AMOUNT_TOLERANCE;
}

// Same bill if the totals are close, or if at least half of this period's
// individual charges also appeared (about the same amount) in the other period.
function sameBill(cur, prev) {
  if (similar(cur.total, prev.total)) return true;
  const pool = prev.items.map((i) => i.amount);
  let hits = 0;
  for (const it of cur.items) {
    const k = pool.findIndex((p) => similar(it.amount, p));
    if (k >= 0) { hits += 1; pool.splice(k, 1); }
  }
  return hits >= Math.ceil(cur.items.length / 2);
}

function cluster(charges) {
  const sorted = [...charges].sort((a, b) => (a.date < b.date ? -1 : 1));
  const out = [];
  for (const t of sorted) {
    const last = out[out.length - 1];
    if (last && ms(t.date) - ms(last.start) <= GROUP_DAYS * DAY) {
      last.items.push(t); last.total += t.amount; last.date = t.date;
    } else {
      out.push({ start: t.date, date: t.date, items: [t], total: t.amount });
    }
  }
  return out;
}

// transactions: Plaid transactions (amount > 0 is money leaving).
// existing: { names: [current bill names], dismissed: [suggestion ids] }
export function findSuggestions(transactions, existing, todayIso) {
  const today = ms(todayIso);
  const have = (existing.names || []).map(slug);
  const dismissed = new Set(existing.dismissed || []);
  const byMerchant = new Map();
  for (const t of transactions) {
    const amount = Number(t.amount);
    if (t.pending || !(amount > 0)) continue;
    const display = String(t.merchant_name || t.name || "").replace(/\s+/g, " ").trim();
    if (!display || SKIP_NAME.test(`${t.name || ""} ${display}`)) continue;
    if (SKIP_CATEGORY.test(t.personal_finance_category?.primary || "")) continue;
    const key = slug(display);
    if (!key) continue;
    if (!byMerchant.has(key)) byMerchant.set(key, { display, charges: [], detailed: t.personal_finance_category?.detailed || "" });
    byMerchant.get(key).charges.push({ date: t.date, amount, accountId: t.account_id });
  }

  const out = [];
  for (const [key, { display, charges, detailed }] of byMerchant) {
    if (have.some((h) => h && (h.includes(key) || key.includes(h)))) continue;
    const groups = cluster(charges);
    // Three or more bills in the last 5 months means monthly (or not a bill): regular detection handles it.
    if (groups.filter((g) => today - ms(g.date) <= 150 * DAY).length > 2) continue;
    let found = null;
    for (const cur of [...groups].reverse()) {
      const sinceCur = (today - ms(cur.date)) / DAY;
      if (sinceCur < 0) continue;
      for (const iv of INTERVALS) {
        if (sinceCur > iv.months * 30.5 + 35) continue; // already overdue by more than a month
        const target = monthsBefore(cur.start, iv.months);
        const prev = groups.find((g) => g !== cur && Math.abs(ms(g.start) - target) <= DATE_WINDOW_DAYS * DAY);
        if (prev && sameBill(cur, prev)) { found = { cur, prev, iv }; break; }
      }
      if (found) break;
    }
    if (!found) continue;
    const { cur, prev, iv } = found;
    const total = Math.round(cur.total * 100) / 100;
    const id = `suggest:${iv.frequency}:${key}:${Math.round(total)}`;
    if (dismissed.has(id)) continue;
    const guess = guessLabel({ name: display, detailed, amount: total, frequency: iv.frequency });
    out.push({
      id,
      name: labeledName(display, guess),
      merchant: display,
      guessed: Boolean(guess),
      frequency: iv.frequency,
      amount: total,
      count: cur.items.length,
      lastDate: cur.date,
      prevDate: prev.date,
      plaidAccountId: cur.items[0].accountId,
    });
  }
  return out;
}
