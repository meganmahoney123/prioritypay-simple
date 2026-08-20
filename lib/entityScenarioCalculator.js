// Sole Proprietor vs. LLC vs. S-Corp comparison math for the "Self Employed"
// resource article at /self-employed/sole-proprietor-vs-llc-vs-s-corp.
// Ported directly from Megan's standalone HTML export (entity-scenario-
// modeler_2.html) -- same constants, same formulas, same edge-case
// handling -- just as plain functions instead of DOM-bound script, so the
// React page can drive it with real state. 2026 federal tax year figures;
// kept independent from lib/federalTaxCalculator.js (that module powers
// the separate Tax Estimator calculator) rather than reconciled with it,
// since this article's numbers are what Megan specifically vetted for it.
const C = {
  stdDed: { single: 16100, mfj: 32200 },
  brackets: {
    single: [[12400, 0.1], [50400, 0.12], [105700, 0.22], [201775, 0.24], [256225, 0.32], [640600, 0.35], [Infinity, 0.37]],
    mfj: [[24800, 0.1], [100800, 0.12], [211400, 0.22], [403550, 0.24], [512450, 0.32], [768700, 0.35], [Infinity, 0.37]],
  },
  ssWageBase: 184500,
  addlMedThreshold: { single: 200000, mfj: 250000 },
  qbiThreshold: { single: 201750, mfj: 403500 },
  qbiPhaseIn: { single: 75000, mfj: 150000 },
  seFactor: 0.9235,
  futaWageBase: 7000,
  futaRate: 0.006,
};

function bracketTax(t, st) {
  let x = 0;
  let prev = 0;
  for (const [cap, rate] of C.brackets[st]) {
    if (t <= prev) break;
    x += (Math.min(t, cap) - prev) * rate;
    prev = cap;
  }
  return x;
}

function qbiDeduction(qbi, w2, tb, st, sstb) {
  const tent = 0.2 * Math.max(0, qbi);
  const cap = 0.2 * Math.max(0, tb);
  const thr = C.qbiThreshold[st];
  const range = C.qbiPhaseIn[st];
  if (tb <= thr) return { ded: Math.min(tent, cap), limited: false };
  const ratio = Math.min(1, (tb - thr) / range);
  let d;
  if (sstb) {
    if (ratio >= 1) {
      d = 0;
    } else {
      const aQ = qbi * (1 - ratio);
      const aW = w2 * (1 - ratio);
      const t2 = 0.2 * Math.max(0, aQ);
      d = w2 > 0 ? Math.min(t2, 0.5 * aW) : t2;
    }
  } else {
    const wl = 0.5 * w2;
    d = ratio >= 1 ? Math.min(tent, wl) : tent - (tent - Math.min(tent, wl)) * ratio;
  }
  return { ded: Math.min(Math.max(0, d), cap), limited: true };
}

function scheduleC(P, st, sstb) {
  const nse = P * C.seFactor;
  const ss = 0.124 * Math.min(nse, C.ssWageBase);
  const med = 0.029 * nse;
  const addl = 0.009 * Math.max(0, nse - C.addlMedThreshold[st]);
  const seTax = ss + med + addl;
  const halfSE = (ss + med) / 2;
  const tb = Math.max(0, P - halfSE - C.stdDed[st]);
  const q = qbiDeduction(P - halfSE, 0, tb, st, sstb);
  const taxable = Math.max(0, tb - q.ded);
  return { profit: P, wages: 0, dist: 0, workTax: seTax, qbiDed: q.ded, qbiLimited: q.limited, taxable, incomeTax: bracketTax(taxable, st) };
}

function sCorp(P, S, st, sstb) {
  S = Math.max(0, Math.min(S, P));
  const er = 0.062 * Math.min(S, C.ssWageBase) + 0.0145 * S + C.futaRate * Math.min(S, C.futaWageBase);
  const ee = 0.062 * Math.min(S, C.ssWageBase) + 0.0145 * S + 0.009 * Math.max(0, S - C.addlMedThreshold[st]);
  const dist = Math.max(0, P - S - er);
  const tb = Math.max(0, S + dist - C.stdDed[st]);
  const q = qbiDeduction(dist, S, tb, st, sstb);
  const taxable = Math.max(0, tb - q.ded);
  return { profit: P, wages: S, dist, workTax: er + ee, qbiDed: q.ded, qbiLimited: q.limited, taxable, incomeTax: bracketTax(taxable, st) };
}

// Paycheck-size guidance shown next to the salary input, tuned by who
// actually does the work -- doesn't change any tax math, just which
// quick-pick percentages get suggested.
export const WHO_OPTIONS = [
  { value: "solo", label: "Just me", pcts: [50, 60, 70] },
  { value: "help", label: "I have contractors or employees who do some of it", pcts: [35, 45, 55] },
  { value: "product", label: "A lot of my income comes from products, not my hours", pcts: [30, 40, 50] },
];

export function computeEntityScenarios({ profit, status, salary, stateCost, adminCost, sstb }) {
  const sc = scheduleC(profit, status, sstb);
  const s = sCorp(profit, salary, status, sstb);
  const cols = [
    { ...sc, label: "Sole proprietor", stateFee: 0, adminFee: 0 },
    { ...sc, label: "LLC", stateFee: stateCost, adminFee: 0 },
    { ...s, label: "S-corp", stateFee: stateCost, adminFee: adminCost },
  ];
  cols.forEach((c) => {
    c.tax = c.workTax + c.incomeTax;
    c.fees = c.stateFee + c.adminFee;
    c.left = c.profit - c.tax - c.fees;
  });
  return {
    cols,
    warnSalary: profit > 0 && salary >= profit,
    warnQbi: cols.some((c) => c.qbiLimited),
  };
}
