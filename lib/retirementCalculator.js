// Standalone "how much CAN I contribute" simulator for the Close Out tab's
// SEP IRA / Solo 401k sections -- deliberately separate from
// estimateRetirementRoom/suggestedMonthlyCap in lib/allocations.js, which
// are simplified estimates used to auto-cap the monthly split (SEP: flat
// 25% of that month's income; Solo 401k: employee-deferral portion only,
// no employer/profit-sharing side at all). This module does the fuller,
// more accurate version of the math for someone actively deciding how much
// to send: self-employment-tax-adjusted compensation, both halves of a
// Solo 401k (employee deferral + employer profit share), and the
// corporate (W-2 wages, no SE-tax adjustment) path. It never reads any of
// the user's real PriorityPay data -- every input is typed in by hand, on
// purpose, so this is explicitly a what-if simulator and not a live
// tracker. Still just an estimate, not tax advice.
import { RETIREMENT_LIMITS_2026, electiveDeferralLimit } from "@/lib/allocations";

// 2026 Social Security wage base -- the ceiling on the 12.4% Social
// Security portion of self-employment tax. Medicare's 2.9% portion is
// uncapped. (The additional 0.9% Medicare surtax above $200k/$250k/$125k
// depending on filing status is real but doesn't factor into the
// deductible "half of SE tax" used below, so it's left out of this calc on
// purpose -- it doesn't change retirement-plan compensation.)
export const SS_WAGE_BASE_2026 = 184500;
const SE_TAX_NET_EARNINGS_FACTOR = 0.9235; // IRC 1402(a)(12)
const SE_TAX_SS_RATE = 0.124;
const SE_TAX_MEDICARE_RATE = 0.029;

// SEP IRA has no age-based catch-up, so unlike Solo 401k it's always
// capped at the flat under-50 dollar limit regardless of age.
export function sepAnnualCap() {
  return RETIREMENT_LIMITS_2026.overallDC.under50;
}

// Sole prop / single-member LLC / partnership K-1 path: "compensation" for
// a self-employed person isn't their raw net profit -- it's net profit
// minus the deduction for half of self-employment tax. Solving the
// circular reference in the 25%-of-compensation rule (compensation is
// itself reduced by the contribution being calculated) algebraically
// simplifies to a flat 20% of (net profit - half SE tax) -- the same
// "20% rule" every SEP/Solo-401k calculator uses, not an approximation.
export function adjustedSelfEmploymentEarnings(netIncome) {
  const net = Math.max(0, Number(netIncome) || 0);
  const seTaxableBase = net * SE_TAX_NET_EARNINGS_FACTOR;
  const socialSecurityPortion = Math.min(seTaxableBase, SS_WAGE_BASE_2026) * SE_TAX_SS_RATE;
  const medicarePortion = seTaxableBase * SE_TAX_MEDICARE_RATE;
  const seTax = socialSecurityPortion + medicarePortion;
  const halfSeTax = seTax / 2;
  const compensation = Math.max(0, net - halfSeTax);
  return { netIncome: net, seTax, halfSeTax, compensation };
}

// businessType: "self_employed" (sole prop / single-member LLC / K-1
// partner -- SE-tax-adjusted 20% rule) or "corp" (S-corp/C-corp paying
// itself real W-2 wages -- straight 25% of those wages, no SE-tax
// adjustment, since payroll tax is already handled separately).
export function employerOrProfitShareContribution({ netIncome, businessType }) {
  if (businessType === "corp") {
    const wages = Math.max(0, Number(netIncome) || 0);
    return { compensation: wages, contribution: wages * 0.25 };
  }
  const { compensation } = adjustedSelfEmploymentEarnings(netIncome);
  return { compensation, contribution: compensation * 0.2 };
}

// SEP IRA: employer-only contribution, capped at the flat (no catch-up)
// annual dollar limit. hasEmployees doesn't change the math for this
// person -- it changes whether contributing at all commits you to
// contributing the same percentage for every eligible employee too, which
// the UI surfaces separately as a cost warning, not a math input.
export function calculateSepIra({ netIncome, businessType }) {
  const { compensation, contribution } = employerOrProfitShareContribution({ netIncome, businessType });
  const cap = sepAnnualCap();
  return {
    compensation,
    uncappedContribution: contribution,
    contribution: Math.min(contribution, cap),
    cap,
    cappedByAnnualLimit: contribution > cap,
  };
}

// SEP IRA's hard rule for anyone with eligible employees: whatever
// percentage of your own compensation you contribute for yourself, you
// must contribute that same percentage of compensation for every eligible
// employee too (IRC 408(k) nondiscrimination). "Percentage" here is the
// owner's REAL effective rate -- contribution / compensation -- not the
// flat 20%/25% statutory rate, because someone whose contribution got
// capped by the annual dollar limit (cappedByAnnualLimit above) is
// actually contributing a lower effective percentage of their own
// compensation than the uncapped formula would suggest, and that's the
// rate employees are legally owed too, not the higher uncapped one.
// `employeePayroll` is a single rough total across the whole team (no
// payroll integration exists to know individual employee compensation),
// so this is necessarily an estimate -- real parity math is done against
// each employee's actual eligible compensation, capped at their own
// dollar limit too, which a tax professional or payroll provider should
// confirm before actually funding anything.
export function calculateSepIraEmployerParity({ netIncome, businessType, employeePayroll }) {
  const base = calculateSepIra({ netIncome, businessType });
  const effectiveRate = base.compensation > 0 ? base.contribution / base.compensation : 0;
  const employeeParityContribution = Math.max(0, Number(employeePayroll) || 0) * effectiveRate;
  return {
    ...base,
    effectiveRate,
    employeeParityContribution,
    totalCostWithParity: base.contribution + employeeParityContribution,
  };
}

// Solo 401k: employee elective deferral (own paycheck-style deferral, up
// to the dollar limit for their age bracket, reduced by anything already
// deferred this year at another employer's plan -- that limit is shared
// across every plan one person participates in, not per-plan) PLUS an
// employer/profit-sharing contribution (20% of SE-tax-adjusted
// compensation, or 25% of W-2 wages for a corp), with the combined total
// backstopped by the age-adjusted overall defined-contribution dollar
// limit.
export function calculateSolo401k({ netIncome, businessType, ageBracket, otherPlanDeferralYTD }) {
  const { compensation, contribution: employerContribution } = employerOrProfitShareContribution({
    netIncome,
    businessType,
  });
  const deferralLimit = electiveDeferralLimit(ageBracket);
  const remainingSharedDeferralRoom = Math.max(0, deferralLimit - (Number(otherPlanDeferralYTD) || 0));
  const employeeDeferral = Math.max(0, Math.min(compensation, remainingSharedDeferralRoom));
  const overallCap = RETIREMENT_LIMITS_2026.overallDC[ageBracket] || RETIREMENT_LIMITS_2026.overallDC.under50;
  const uncappedTotal = employeeDeferral + employerContribution;
  const total = Math.min(uncappedTotal, overallCap);
  return {
    compensation,
    employeeDeferral,
    employerContribution,
    uncappedTotal,
    total,
    cap: overallCap,
    deferralLimit,
    cappedByAnnualLimit: uncappedTotal > overallCap,
  };
}

export const AGE_BRACKETS = [
  { value: "under50", label: "Under 50" },
  { value: "50to59_64plus", label: "50-59, or 64+" },
  { value: "60to63", label: "60-63" },
];

export const BUSINESS_TYPES = [
  { value: "self_employed", label: "Sole proprietor / single-member LLC / partnership" },
  { value: "corp", label: "S-corp or C-corp (I pay myself W-2 wages)" },
];
