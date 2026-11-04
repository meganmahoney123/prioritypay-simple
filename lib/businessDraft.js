// The setup someone builds in the free "organize my businesses" walkthrough
// (app/(app)/business/setup) is kept in this browser until they upgrade, then
// applied on the Business page right after checkout. If it's missing (another
// browser, cleared storage) the Business page falls back to their onboarding
// answers.
const KEY = "ps_business_draft_v1";

export function loadBusinessDraft() {
  try {
    const d = JSON.parse(window.localStorage.getItem(KEY) || "null");
    if (d && Array.isArray(d.businesses) && d.businesses.length) return d;
  } catch {}
  return null;
}

export function saveBusinessDraft(draft) {
  try { window.localStorage.setItem(KEY, JSON.stringify(draft)); } catch {}
}

export function clearBusinessDraft() {
  try { window.localStorage.removeItem(KEY); } catch {}
}
