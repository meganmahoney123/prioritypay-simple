// Federal income tax estimate engine, shared by the public calculators
// under app/calculators/* (Tax Estimator today; Emergency Fund and Debt
// Payoff also lean on estimateSelfEmployedTax/estimateW2Tax for
// persona-aware take-home estimates). Reuses the SE-tax math already
// built for the Solo 401k/SEP IRA simulator (lib/retirementCalculator.js)
// rather than re-deriving it, so the two stay in sync. Estimate only, not
// tax advice -- same disclaimer posture as the retirement room math
// elsewhere in the app.
import { adjustedSelfEmploymentEarnings, SS_WAGE_BASE_2026 } from "@/lib/retirementCalculator";

// 2026 federal brackets (IRS Rev. Proc. 2025-32, as adjusted by the OBBBA).
// Each entry's `upTo` is the top of that bracket; the bracket below picks
// up where the previous one's `upTo` ends.
export const FEDERAL_BRACKETS_2026 = {
  single: [
    { rate: 0.10, upTo: 12400 },
    { rate: 0.12, upTo: 50400 },
    { rate: 0.22, upTo: 105700 },
    { rate: 0.24, upTo: 201775 },
    { rate: 0.32, upTo: 256225 },
    { rate: 0.35, upTo: 640600 },
    { rate: 0.37, upTo: Infinity },
  ],
  mfj: [
    { rate: 0.10, upTo: 24800 },
    { rate: 0.12, upTo: 100800 },
    { rate: 0.22, upTo: 211400 },
    { rate: 0.24, upTo: 403550 },
    { rate: 0.32, upTo: 512450 },
    { rate: 0.35, upTo: 768700 },
    { rate: 0.37, upTo: Infinity },
  ],
  hoh: [
    { rate: 0.10, upTo: 17700 },
    { rate: 0.12, upTo: 67450 },
    { rate: 0.22, upTo: 105700 },
    { rate: 0.24, upTo: 201775 },
    { rate: 0.32, upTo: 256200 },
    { rate: 0.35, upTo: 640600 },
    { rate: 0.37, upTo: Infinity },
  ],
};

export const STANDARD_DEDUCTION_2026 = { single: 16100, mfj: 32200, hoh: 24150 };

export const FILING_STATUSES = [
  { value: "single", label: "Single" },
  { value: "mfj", label: "Married filing jointly" },
  { value: "hoh", label: "Head of household" },
];

// Sec. 199A qualified business income deduction -- 20% of pass-through
// business income, phasing in limits above these thresholds for 2026.
// This calculator applies the full 20% regardless (most freelancers/small
// owners are under the threshold) and just flags it when someone's over,
// rather than modeling the full phase-in -- that's genuinely accountant
// territory, not a free-calculator one.
export const QBI_DEDUCTION_RATE = 0.20;
export const QBI_PHASEOUT_START_2026 = { single: 201775, mfj: 403500, hoh: 201775 };

export function standardDeduction(filingStatus) {
  return STANDARD_DEDUCTION_2026[filingStatus] || STANDARD_DEDUCTION_2026.single;
}

// Progressive bracket tax on already-net-of-deductions taxable income --
// only the slice of income inside each bracket is taxed at that bracket's
// rate, same mechanic as the real IRS tables.
export function calcProgressiveTax(taxableIncome, filingStatus) {
  const income = Math.max(0, Number(taxableIncome) || 0);
  const brackets = FEDERAL_BRACKETS_2026[filingStatus] || FEDERAL_BRACKETS_2026.single;
  let tax = 0;
  let lower = 0;
  let marginalRate = 0;
  for (const b of brackets) {
    if (income <= lower) break;
    const taxableInBracket = Math.min(income, b.upTo) - lower;
    tax += taxableInBracket * b.rate;
    marginalRate = b.rate;
    if (income <= b.upTo) break;
    lower = b.upTo;
  }
  return { tax, marginalRate };
}

// Sole prop / single-member LLC / partnership K-1: net self-employment
// income -> SE tax (12.4% Social Security up to the wage base + 2.9%
// Medicare, both on 92.35% of net) + federal income tax on
// (net income - half of SE tax - 20% QBI deduction - standard deduction).
export function estimateSelfEmployedTax({ netIncome, filingStatus }) {
  const income = Math.max(0, Number(netIncome) || 0);
  const { seTax, halfSeTax } = adjustedSelfEmploymentEarnings(income);
  const qbiDeduction = income * QBI_DEDUCTION_RATE;
  const stdDeduction = standardDeduction(filingStatus);
  const taxableIncome = Math.max(0, income - halfSeTax - qbiDeduction - stdDeduction);
  const { tax: incomeTax, marginalRate } = calcProgressiveTax(taxableIncome, filingStatus);
  const totalTax = seTax + incomeTax;
  return {
    persona: "self_employed",
    netIncome: income,
    seTax,
    halfSeTax,
    qbiDeduction,
    stdDeduction,
    taxableIncome,
    incomeTax,
    totalTax,
    marginalRate,
    effectiveRate: income > 0 ? totalTax / income : 0,
    overQbiThreshold: income > (QBI_PHASEOUT_START_2026[filingStatus] || QBI_PHASEOUT_START_2026.single),
  };
}

// Business owner paying themselves partly in W2 wages and partly as an
// owner's draw/distribution (the common S-corp pattern). Only the wages
// portion is subject to payroll tax; the draw is still ordinary taxable
// income but escapes that 15.3% -- which is the actual reason this split
// exists, so the calculator surfaces the comparison directly rather than
// burying it.
export function estimateBusinessOwnerTax({ businessProfit, wagesToSelf, filingStatus }) {
  const profit = Math.max(0, Number(businessProfit) || 0);
  const wages = Math.max(0, Math.min(Number(wagesToSelf) || 0, profit));
  const draw = profit - wages;
  const ssPortion = Math.min(wages, SS_WAGE_BASE_2026) * 0.124;
  const medicarePortion = wages * 0.029;
  const payrollTax = ssPortion + medicarePortion;
  const halfPayrollTax = payrollTax / 2;
  const qbiDeduction = draw * QBI_DEDUCTION_RATE;
  const stdDeduction = standardDeduction(filingStatus);
  const taxableIncome = Math.max(0, wages + draw - halfPayrollTax - qbiDeduction - stdDeduction);
  const { tax: incomeTax, marginalRate } = calcProgressiveTax(taxableIncome, filingStatus);
  const totalTax = payrollTax + incomeTax;
  const allSelfEmployed = estimateSelfEmployedTax({ netIncome: profit, filingStatus });
  return {
    persona: "business_owner",
    businessProfit: profit,
    wages,
    draw,
    payrollTax,
    halfPayrollTax,
    qbiDeduction,
    stdDeduction,
    taxableIncome,
    incomeTax,
    totalTax,
    marginalRate,
    effectiveRate: profit > 0 ? totalTax / profit : 0,
    vsAllSelfEmployedTax: allSelfEmployed.totalTax,
    potentialSavingsVsSelfEmployed: Math.max(0, allSelfEmployed.totalTax - totalTax),
    overQbiThreshold: profit > (QBI_PHASEOUT_START_2026[filingStatus] || QBI_PHASEOUT_START_2026.single),
  };
}

// W2: payroll tax is already withheld automatically by the employer, so
// it's not something to plan around the way SE tax is -- just federal
// income tax on (gross salary - standard deduction).
export function estimateW2Tax({ grossSalary, filingStatus }) {
  const salary = Math.max(0, Number(grossSalary) || 0);
  const stdDeduction = standardDeduction(filingStatus);
  const taxableIncome = Math.max(0, salary - stdDeduction);
  const { tax: incomeTax, marginalRate } = calcProgressiveTax(taxableIncome, filingStatus);
  return {
    persona: "w2",
    grossSalary: salary,
    stdDeduction,
    taxableIncome,
    incomeTax,
    totalTax: incomeTax,
    marginalRate,
    effectiveRate: salary > 0 ? incomeTax / salary : 0,
  };
}
