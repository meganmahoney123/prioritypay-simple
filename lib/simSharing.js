// Carries a Money Simulator split into a real percent-rule flow --
// onboarding (new signups, see app/onboarding/page.js) or Split Rules
// (existing users, see app/(app)/splits/page.js) -- via a base64-encoded
// `?sim=` query param. Encoder and decoder both live here so the shape
// can never drift between the two sides.
//
// A simulator row that started from REAL data (see toSimRows in
// app/(app)/simulator/page.js) carries its original percent-rule object
// on `row.real` -- toPercentRules() spreads that back out first so
// accountId/group/retirementType/caps survive the round trip, and only
// pct/label (the two things the simulator actually lets you change) get
// overwritten. A row with no `.real` (one of the public simulator's
// generic categories, or a brand new goal-derived category) falls
// through to the id-based mapping below instead.
export function toPercentRules(rows) {
  return rows.map((r) => {
    if (r.real) return { ...r.real, pct: r.pct, label: r.label };
    if (r.id === "investments_1") {
      return { id: "investments_1", label: "Investments", group: "Investments", pct: r.pct, max: null, balanceCap: null, color: r.color, accountId: null };
    }
    if (r.id === "solo_401k") {
      return { id: "solo_401k", label: "Solo 401k", group: "Retirement", pct: r.pct, max: null, balanceCap: null, color: r.color, accountId: null, retirementType: "solo_401k" };
    }
    if (r.id === "emergency_fund") {
      return { id: "emergency_fund", label: "Emergency Fund", group: "Savings", pct: r.pct, max: null, balanceCap: null, color: r.color, accountId: null };
    }
    if (r.id === "savings") {
      return { id: "savings", label: "Savings", group: "Savings", pct: r.pct, max: null, balanceCap: null, color: r.color, accountId: null };
    }
    if (r.id === "tax_reserve") {
      return { id: "tax_reserve", label: "Tax Reserve", group: null, pct: r.pct, max: null, balanceCap: null, color: r.color, accountId: null };
    }
    return { id: `new_${Date.now()}_${Math.round(Math.random() * 1e6)}`, label: r.label, group: null, pct: r.pct, max: null, balanceCap: null, color: r.color, accountId: null };
  });
}

export function encodeSim(rows) {
  return btoa(encodeURIComponent(JSON.stringify(toPercentRules(rows))));
}

export function decodeSim(param) {
  if (!param) return null;
  try {
    const decoded = JSON.parse(decodeURIComponent(atob(param)));
    return Array.isArray(decoded) && decoded.length > 0 ? decoded : null;
  } catch {
    return null;
  }
}

// Shared default example goal -- both the public Money Simulator and the
// dashboard tab start with this pre-filled rather than an empty goal list
// (an empty list with just an "Add a goal" button explains nothing the
// first time someone sees this tool). People are free to rename/retarget
// it or delete it entirely.
export const DEMO_GOALS = [{ id: "demo_wedding", name: "Wedding", target: 50000, date: "2027-06" }];
