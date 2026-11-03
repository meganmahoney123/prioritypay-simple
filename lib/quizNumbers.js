// Shared, deterministic tax estimates built from the person's quiz answers and
// the optional numbers they entered. The chat never does this arithmetic itself;
// the quiz engine uses the same numbers to rank ideas by dollars.
// 2026 figures: IRS Rev. Proc. 2025-32 (brackets, standard deduction).

const BAND_FLOOR = { "<75k": 0, "75-150k": 75000, "150-250k": 150000, "250-500k": 250000, "500k+": 500000 };
const STD = { single: 16100, mfj: 32200, hoh: 24150 };
const TOPS = {
  single: [[12400, 10], [50400, 12], [105700, 22], [201775, 24], [256225, 32], [640600, 35], [Infinity, 37]],
  mfj: [[24800, 10], [100800, 12], [211400, 22], [403550, 24], [512450, 32], [768700, 35], [Infinity, 37]],
  hoh: [[17700, 10], [67450, 12], [105700, 22], [201750, 24], [256200, 32], [640600, 35], [Infinity, 37]],
};
const SS_WAGE_BASE = 184500; // 2026 Social Security wage base (unverified; shown as a rough estimate)

export function hasStaff(answers = {}, n = {}) {
  return (answers.work || []).includes("business_owner") || (n.employees || 0) > 0;
}

// Returns null when there is nothing to compute from.
export function taxFacts(answers = {}, n = {}) {
  const np = n.netProfit || 0;
  const wages = n.wages || 0;
  const fs = answers.filingStatus === "mfj" ? "mfj" : answers.filingStatus === "hoh" ? "hoh" : "single";
  const band = BAND_FLOOR[answers.income] || 0;
  if (!np && !wages && !band) return null;

  const staff = hasStaff(answers, n);
  const seBase = np * 0.9235;
  const se = np ? 0.124 * Math.min(seBase, SS_WAGE_BASE) + 0.029 * seBase : 0;
  const adj = np ? np - se / 2 : 0;
  const gross = Math.max(np + wages, band);
  const taxable = Math.max(0, gross - se / 2 - STD[fs]);
  const rate = (TOPS[fs].find(([top]) => taxable <= top) || [0, 37])[1];

  const f = { np, wages, fs, se, adj, taxable, rate, staff, solo: null };
  if (np && !staff) {
    const employee = Math.min(24500, Math.max(0, adj));
    const employer = Math.max(0, Math.min(0.2 * adj, 72000 - employee));
    const room = employee + employer;
    const remaining = Math.max(0, room - (n.contributed || 0));
    f.solo = { employee, employer, room, remaining, mega: Math.max(0, 72000 - room) };
  }
  return f;
}

// Rough yearly saving from electing S-corp status. Assumes a salary of the
// owner's stated pay, or half of net profit, and about $2,000 of added cost.
export function scorpSavings(f, n = {}) {
  if (!f || !f.np || f.np < 60000) return 0;
  const salary = n.ownerPay || f.np * 0.5;
  const payroll = 0.124 * Math.min(salary, SS_WAGE_BASE) + 0.029 * salary;
  return Math.max(0, f.se - payroll - 2000);
}

// Rough saving from the 20 percent QBI deduction (only when income is in the
// range where the full deduction usually applies).
export function qbiSavings(f) {
  if (!f || !f.np || f.rate > 24) return 0;
  const ded = Math.min(0.2 * f.adj, 0.2 * f.taxable);
  return Math.max(0, ded * (f.rate / 100));
}
