// Pure helpers for the credit-card spending cap and the per-card category totals.
// Input is a list of Plaid transactions for ONE card. Plaid sends purchases and
// fees as positive amounts and payments or refunds as negative amounts.

const PFC_LABELS = {
  FOOD_AND_DRINK: "Food & Drink",
  GENERAL_MERCHANDISE: "Shopping",
  GENERAL_SERVICES: "Services",
  TRANSPORTATION: "Transportation",
  TRAVEL: "Travel",
  ENTERTAINMENT: "Entertainment",
  RENT_AND_UTILITIES: "Rent & Utilities",
  HOME_IMPROVEMENT: "Home",
  MEDICAL: "Medical",
  PERSONAL_CARE: "Personal Care",
  LOAN_PAYMENTS: "Loan Payments",
  BANK_FEES: "Bank Fees",
  GOVERNMENT_AND_NON_PROFIT: "Government & Giving",
};

export function categoryLabel(pfc) {
  if (!pfc) return "Other";
  return PFC_LABELS[pfc] || pfc.toLowerCase().split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function monthKey(dateStr) {
  return String(dateStr).slice(0, 7);
}

// The three full calendar months before `today` (a Date), oldest first.
export function lastThreeMonths(today) {
  const out = [];
  for (let i = 3; i >= 1; i -= 1) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 1));
    out.push({ key: d.toISOString().slice(0, 7), label: MONTH_NAMES[d.getUTCMonth()] });
  }
  return out;
}

// Payments to the card and transfers are not spending.
function isPaymentLike(t) {
  const p = t.personal_finance_category?.primary || "";
  const d = t.personal_finance_category?.detailed || "";
  return p === "LOAN_PAYMENTS" || p === "TRANSFER_IN" || p === "TRANSFER_OUT" || d.includes("CREDIT_CARD_PAYMENT");
}

// Net spending on the card: purchases and fees count, refunds subtract, payments
// and transfers are ignored. Returns a signed amount for one transaction.
function spendOf(t) {
  if (t.pending) return 0;
  if (isPaymentLike(t)) return 0;
  return Number(t.amount) || 0;
}

export function roundUpTo50(n) {
  return Math.max(50, Math.ceil(n / 50) * 50);
}

export function summarizeCard(txns, today = new Date()) {
  const byMonth = {};
  const cats = {}; // monthKey -> { label -> amount }
  (txns || []).forEach((t) => {
    const amt = spendOf(t);
    if (!amt) return;
    const mk = monthKey(t.date);
    byMonth[mk] = (byMonth[mk] || 0) + amt;
    const label = categoryLabel(t.personal_finance_category?.primary);
    cats[mk] = cats[mk] || {};
    cats[mk][label] = (cats[mk][label] || 0) + amt;
  });

  const thisKey = today.toISOString().slice(0, 7);
  const prior = lastThreeMonths(today);
  // A month counts only if the card has charges in it. Fewer than 3 months of history
  // averages what exists.
  const used = prior.filter((m) => (byMonth[m.key] || 0) > 0).map((m) => ({ label: m.label, key: m.key, amount: Math.round(byMonth[m.key]) }));
  const avg = used.length ? used.reduce((s, m) => s + byMonth[m.key], 0) / used.length : 0;

  const dayOfMonth = today.getUTCDate();
  const daysInMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0)).getUTCDate();
  const spent = Math.max(0, byMonth[thisKey] || 0);

  // This month's categories next to each category's average over the months used.
  const thisCats = cats[thisKey] || {};
  const labels = new Set(Object.keys(thisCats));
  const categories = [...labels]
    .map((label) => {
      const monthly = used.map((m) => Math.max(0, cats[m.key]?.[label] || 0));
      const catAvg = used.length ? monthly.reduce((s, v) => s + v, 0) / used.length : 0;
      return { label, amount: Math.round(Math.max(0, thisCats[label]) * 100) / 100, average: Math.round(catAvg) };
    })
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  return {
    spent: Math.round(spent * 100) / 100,
    projected: dayOfMonth > 0 ? Math.round((spent / dayOfMonth) * daysInMonth) : Math.round(spent),
    daysLeft: daysInMonth - dayOfMonth,
    categories,
    suggestion: used.length
      ? { amount: roundUpTo50(avg), average: Math.round(avg), months: used, monthsUsed: used.length }
      : null,
  };
}

// "none" (no cap), "ok", "near" (80% or more), "over".
export function capStatus(spent, cap) {
  if (!(cap > 0)) return "none";
  if (spent >= cap) return "over";
  if (spent >= cap * 0.8) return "near";
  return "ok";
}
