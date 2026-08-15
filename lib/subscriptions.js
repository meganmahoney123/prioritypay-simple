// Recurring-charge detection for the Subscriptions tab.
//
// Heuristic, not machine learning: group outgoing transactions by a
// normalized merchant name, then look for merchants that charged at least
// twice with a roughly consistent interval and amount. That's enough to
// flag "this looks like a subscription" without needing any external
// subscription database -- it works purely off the transaction history
// Plaid already gives us, the same way a bank statement app would.

// Internal money movement (PriorityPay's own splits moving between a
// person's own connected accounts) should never show up as a "subscription."
// Plaid's personal_finance_category flags these reasonably well; this
// mirrors the same exclusion Close-Out uses.
function isInternalTransfer(t) {
  const pfc = t.personal_finance_category?.primary || "";
  return pfc === "TRANSFER_IN" || pfc === "TRANSFER_OUT";
}

function normalizeMerchant(t) {
  const raw = (t.merchant_name || t.name || "").toLowerCase();
  return raw
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b\d{3,}\b/g, " ") // drop long numeric suffixes (order/ref numbers)
    .replace(/\s+/g, " ")
    .trim();
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24));
}

function median(nums) {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Classifies a median interval (in days) into a human cadence label, or
// null if it doesn't look like a recognizable recurring pattern.
const CADENCES = [
  { label: "Weekly", days: 7, tolerance: 2 },
  { label: "Biweekly", days: 14, tolerance: 3 },
  { label: "Monthly", days: 30, tolerance: 5 },
  { label: "Quarterly", days: 91, tolerance: 10 },
  { label: "Annual", days: 365, tolerance: 20 },
];

function classifyCadence(medianDays) {
  for (const c of CADENCES) {
    if (Math.abs(medianDays - c.days) <= c.tolerance) return c;
  }
  return null;
}

// `transactions` is an array of { ...plaidTransaction, accountId, accountLabel }.
// Returns every detected recurring charge, each with a predicted next
// charge date, sorted soonest-first.
export function detectRecurringCharges(transactions) {
  const outgoing = (transactions || []).filter(
    (t) => !t.pending && t.amount > 0 && !isInternalTransfer(t)
  );

  const groups = new Map();
  for (const t of outgoing) {
    const key = normalizeMerchant(t);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }

  const results = [];
  for (const [key, txns] of groups) {
    if (txns.length < 2) continue;
    txns.sort((a, b) => new Date(a.date) - new Date(b.date));

    const intervals = [];
    for (let i = 1; i < txns.length; i++) {
      intervals.push(daysBetween(txns[i - 1].date, txns[i].date));
    }
    const medianInterval = median(intervals);
    const cadence = classifyCadence(medianInterval);
    if (!cadence) continue;

    const amounts = txns.map((t) => t.amount);
    const avgAmount = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const maxDrift = Math.max(...amounts.map((a) => Math.abs(a - avgAmount)));
    // Subscriptions are typically flat-fee -- allow some drift (taxes,
    // small price changes) but not enough to still call it "recurring."
    if (maxDrift > Math.max(avgAmount * 0.2, 2)) continue;

    const last = txns[txns.length - 1];
    // Project forward from the last seen charge using the detected
    // cadence until we land on the next occurrence that hasn't happened
    // yet -- a charge last seen months ago with a weekly cadence should
    // predict "next week from today," not a stale date buried in the past.
    const stepDays = Math.max(Math.round(medianInterval), 1);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const nextDate = new Date(last.date);
    while (nextDate <= today) {
      nextDate.setUTCDate(nextDate.getUTCDate() + stepDays);
    }

    results.push({
      key,
      merchant: last.merchant_name || last.name || "Unknown",
      cadence: cadence.label,
      cadenceDays: Math.round(medianInterval),
      amount: Math.round(avgAmount * 100) / 100,
      occurrences: txns.length,
      lastChargeDate: last.date,
      nextChargeDate: nextDate.toISOString().slice(0, 10),
      accountLabel: last.accountLabel || null,
    });
  }

  results.sort((a, b) => new Date(a.nextChargeDate) - new Date(b.nextChargeDate));
  return results;
}

// Subscriptions whose predicted next charge falls within `days` of today.
export function upcomingWithin(subscriptions, days = 30) {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() + days);
  return subscriptions.filter((s) => {
    const d = new Date(s.nextChargeDate);
    return d >= now && d <= cutoff;
  });
}

export function monthlyEstimate(subscriptions) {
  const perMonth = { Weekly: 4.33, Biweekly: 2.17, Monthly: 1, Quarterly: 1 / 3, Annual: 1 / 12 };
  return subscriptions.reduce((sum, s) => sum + s.amount * (perMonth[s.cadence] || 0), 0);
}
