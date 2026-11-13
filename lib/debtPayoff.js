// Debt payoff math, shared by the plan page and its tests. Pure functions, no
// network. Money is dollars, rates are APR percentages (22.9 means 22.9%).
//
// How a month works: interest accrues on every open balance first, then the
// whole monthly payment (every minimum plus the extra) goes out. Minimums are
// paid on each open debt first, and whatever is left goes to the debt the
// method picks. A debt that is paid off keeps its minimum in the pot, so that
// money rolls on to the next debt. That is the whole "snowball" effect.

export const DEBT_TYPES = [
  { value: "credit_card", label: "Credit card" },
  { value: "student_loan", label: "Student loan" },
  { value: "auto_loan", label: "Car loan" },
  { value: "personal_loan", label: "Personal loan" },
  { value: "mortgage", label: "Mortgage" },
  { value: "home_equity", label: "Home equity loan or HELOC" },
  { value: "bnpl", label: "Buy now, pay later" },
  { value: "medical", label: "Medical bill" },
  { value: "tax", label: "Tax debt (IRS or state)" },
  { value: "family", label: "Loan from family or a friend" },
  { value: "business", label: "Business loan or line of credit" },
  { value: "other", label: "Other" },
];
export const debtTypeLabel = (v) => DEBT_TYPES.find((t) => t.value === v)?.label || "Other";

export const METHODS = ["avalanche", "snowball"];
export const MAX_MONTHS = 600; // 50 years: past this we say it never pays off
export const HIGH_APR = 15; // at or above this, interest is usually expensive
export const LOW_APR = 8; // at or below this, paying down vs investing is a closer call

const cents = (n) => Math.round((Number(n) || 0) * 100) / 100;

function order(debts, method) {
  const list = debts.map((d, i) => ({ ...d, i }));
  if (method === "snowball") {
    return list.sort((a, b) => a.balance - b.balance || b.apr - a.apr || a.i - b.i);
  }
  // avalanche: highest rate first; the smaller balance goes first on a tie
  return list.sort((a, b) => b.apr - a.apr || a.balance - b.balance || a.i - b.i);
}

// debts: [{ id, name, balance, apr, minPayment }], extra: dollars per month
// Returns { months, totalInterest, neverPaysOff, payoff: { [id]: monthNumber } }
export function simulate(debts, extra = 0, method = "avalanche") {
  const open = debts
    .map((d) => ({ id: d.id, balance: cents(d.balance), apr: Number(d.apr) || 0, min: cents(d.minPayment) }))
    .filter((d) => d.balance > 0);
  const payoff = {};
  if (!open.length) return { months: 0, totalInterest: 0, neverPaysOff: false, payoff };

  const pot = cents(open.reduce((s, d) => s + d.min, 0) + Math.max(0, Number(extra) || 0));
  const rank = order(open, method).map((d) => d.id);
  const byId = Object.fromEntries(open.map((d) => [d.id, d]));
  let totalInterest = 0;
  let month = 0;

  while (month < MAX_MONTHS && open.some((d) => d.balance > 0.005)) {
    month += 1;
    for (const d of open) {
      if (d.balance <= 0) continue;
      const interest = (d.balance * d.apr) / 1200;
      d.balance += interest;
      totalInterest += interest;
    }
    let left = pot;
    for (const d of open) {
      if (d.balance <= 0) continue;
      const pay = Math.min(d.min, d.balance, left);
      d.balance -= pay;
      left -= pay;
    }
    for (const id of rank) {
      const d = byId[id];
      if (left <= 0) break;
      if (d.balance <= 0) continue;
      const pay = Math.min(left, d.balance);
      d.balance -= pay;
      left -= pay;
    }
    for (const d of open) {
      if (d.balance <= 0.005 && payoff[d.id] === undefined) {
        d.balance = 0;
        payoff[d.id] = month;
      }
    }
  }
  const neverPaysOff = open.some((d) => d.balance > 0.005);
  return { months: neverPaysOff ? null : month, totalInterest: cents(totalInterest), neverPaysOff, payoff };
}

// Full picture for the page: the chosen plan, the same plan with minimums only,
// and what the other method would do, so the page can show the difference.
export function buildPlan(debts, extra, method) {
  const active = debts.filter((d) => Number(d.balance) > 0);
  const plan = simulate(active, extra, method);
  const minimumsOnly = simulate(active, 0, method);
  const other = simulate(active, extra, method === "snowball" ? "avalanche" : "snowball");
  const totalOwed = cents(active.reduce((s, d) => s + Number(d.balance), 0));
  const minimums = cents(active.reduce((s, d) => s + (Number(d.minPayment) || 0), 0));
  const rank = order(
    active.map((d) => ({ ...d, balance: Number(d.balance), apr: Number(d.apr) || 0 })),
    method
  );
  // The order they are paid off in, not the order the method targets them.
  const payoffOrder = [...active].sort((a, b) => (plan.payoff[a.id] ?? Infinity) - (plan.payoff[b.id] ?? Infinity));
  return { plan, minimumsOnly, other, totalOwed, minimums, target: rank.map((d) => d.id), payoffOrder };
}

export function addMonths(date, n) {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}
export function monthLabel(date) {
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
// "Jun 2029" for a month count from the start of this month
export function payoffLabel(months, from = new Date()) {
  if (months === null || months === undefined) return "Not at this payment";
  return monthLabel(addMonths(new Date(from.getFullYear(), from.getMonth(), 1), months));
}

// Choices shown under "How much extra each month?". Always includes $0 and the
// current value; the rest are round numbers around the suggestion.
export function extraOptions(current, suggested) {
  const base = Math.max(25, Math.round((suggested || 200) / 50) * 50);
  const set = new Set([0, base / 2, base, base * 1.5, Math.max(0, Math.round(current || 0))].map((n) => Math.round(n)));
  return [...set].sort((a, b) => a - b).slice(0, 5);
}

// Plain-language notes. These describe the debts and general ideas; they never
// tell anyone what they must do.
export function suggestions(debts, extra) {
  const active = debts.filter((d) => Number(d.balance) > 0);
  const out = [];
  const high = active.filter((d) => Number(d.apr) >= HIGH_APR);
  const low = active.filter((d) => Number(d.apr) <= LOW_APR && Number(d.apr) >= 0);
  if (high.length) {
    out.push({
      title: `${high.length === 1 ? "One debt is" : `${high.length} debts are`} at ${HIGH_APR}% or more.`,
      text: "Interest that high usually costs more than investing earns, so many people pay these first.",
    });
  }
  if (low.length) {
    out.push({
      title: `${low.map((d) => d.name).join(" and ")} ${low.length === 1 ? "is" : "are"} at ${LOW_APR}% or less.`,
      text: "A mix of paying these down and investing can also make sense.",
    });
  }
  const missing = active.filter((d) => !(Number(d.minPayment) > 0));
  if (missing.length) {
    out.push({
      title: "Some debts have no minimum payment entered.",
      text: `Add the minimum for ${missing.map((d) => d.name).join(", ")} so the dates are right. Your lender's statement shows it.`,
    });
  }
  if (active.length && !(Number(extra) > 0)) {
    out.push({
      title: "With minimums only, this can take a long time.",
      text: "Even a small extra amount each month can move your payoff date a lot. Try the options above.",
    });
  }
  out.push({
    title: "Keep a small emergency fund.",
    text: "That way a surprise bill does not go back on a card.",
  });
  return out;
}
