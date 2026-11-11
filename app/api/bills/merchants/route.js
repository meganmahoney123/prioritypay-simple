import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { decryptToken } from "@/lib/tokenCrypto";
import { getTransactionsForRange } from "@/lib/plaidSync";
import { nextOccurrence, toIso } from "@/lib/bills";
import { guessLabel, labeledName } from "@/lib/billLabels";

// Every company the person has been charged by (last 24 months, all linked
// accounts), so they can search for the charge instead of typing amounts.
const SKIP = /transfer|withdrawal|check\s*#|atm|payroll|deposit|interest|refund|payment thank you|autopay payment|credit card/i;
const DAY = 86400000;
const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 24);
const ms = (iso) => Date.parse(`${iso}T00:00:00Z`);

function guessFrequency(dates) {
  // Charges within 2 days of each other count once (several renewals on one day).
  const days = [];
  [...dates].sort().forEach((d) => { if (!days.length || ms(d) - ms(days[days.length - 1]) > 2 * DAY) days.push(d); });
  if (days.length < 2) return null;
  const gaps = [];
  for (let i = 1; i < days.length; i++) gaps.push((ms(days[i]) - ms(days[i - 1])) / DAY);
  gaps.sort((a, b) => a - b);
  const g = gaps[Math.floor(gaps.length / 2)];
  if (g >= 5 && g <= 9) return "weekly";
  if (g >= 12 && g <= 16) return "biweekly";
  if (g >= 26 && g <= 35) return "monthly";
  if (g >= 80 && g <= 100) return "quarterly";
  if (g >= 165 && g <= 200) return "semiannual";
  if (g >= 350 && g <= 380) return "yearly";
  return null;
}

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();
  const { data: accounts } = await admin.from("simple_accounts").select("id, plaid_access_token, plaid_account_id").eq("user_id", user.id).not("plaid_access_token", "is", null);

  const t = new Date();
  const end = toIso(new Date(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate())));
  const start = toIso(new Date(Date.UTC(t.getFullYear() - 2, t.getMonth(), t.getDate())));
  const tokens = [...new Set((accounts || []).map((a) => a.plaid_access_token))];
  let transactions = [];
  for (const enc of tokens) {
    try { transactions = transactions.concat(await getTransactionsForRange(decryptToken(enc), start, end)); }
    catch (err) { console.error("Merchants: history lookup failed", err?.response?.data || err?.message); }
  }

  const by = new Map();
  for (const x of transactions) {
    const amount = Number(x.amount);
    if (x.pending || !(amount > 0)) continue;
    const display = String(x.merchant_name || x.name || "").replace(/\s+/g, " ").trim();
    if (!display || SKIP.test(`${x.name || ""} ${display}`)) continue;
    if (/^(TRANSFER_IN|TRANSFER_OUT|INCOME)$/.test(x.personal_finance_category?.primary || "")) continue;
    const key = slug(display);
    if (!key) continue;
    if (!by.has(key)) by.set(key, { display, charges: [], detailed: x.personal_finance_category?.detailed || "" });
    by.get(key).charges.push({ date: x.date, amount, accountId: x.account_id });
  }

  const merchants = [];
  for (const [key, m] of by) {
    m.charges.sort((a, b) => (a.date < b.date ? 1 : -1));
    const last = m.charges[0];
    const frequency = guessFrequency(m.charges.map((c) => c.date));
    const account = (accounts || []).find((a) => a.plaid_account_id === last.accountId);
    const guess = guessLabel({ name: m.display, detailed: m.detailed, amount: last.amount, frequency });
    merchants.push({
      key,
      merchant: m.display,
      name: labeledName(m.display, guess),
      guessed: Boolean(guess),
      count: m.charges.length,
      lastDate: last.date,
      lastAmount: Math.round(last.amount * 100) / 100,
      frequency,
      nextDue: frequency ? nextOccurrence({ next_due: last.date, frequency }, end) : null,
      accountId: account?.id || null,
    });
  }
  merchants.sort((a, b) => (a.lastDate < b.lastDate ? 1 : -1));
  return Response.json({ merchants: merchants.slice(0, 400) });
}
