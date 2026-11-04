// How a business is set up decides how its owner actually gets paid, which
// changes what "split every deposit" means. A sole proprietor with no LLC
// may keep everything that lands in one account. Every other structure,
// including a single-member LLC (its own legal entity with its own account),
// pays its owner through draws, distributions or payroll, so the split
// belongs on what the owner takes out.

export const SOLE_PROP = "Sole proprietor / freelancer";
export const SINGLE_LLC = "Single-member LLC";

export const ENTITY_OPTIONS = [
  { value: SOLE_PROP, label: "Sole proprietor / freelancer" },
  { value: SINGLE_LLC, label: "Single-member LLC" },
  { value: "LLC (multiple members) / partnership", label: "Multi-member LLC or partnership" },
  { value: "S-corp", label: "S-corp" },
  { value: "C-corp", label: "C-corp" },
  { value: "Not sure", label: "Not sure" },
];

// Someone can run several businesses set up in different ways, so the saved
// value is one or more of the options joined with "; ". A single old value
// (like "Sole proprietor / freelancer") still reads the same way.
const DRAW_TYPES = [SINGLE_LLC, "LLC (multiple members) / partnership", "S-corp", "C-corp"];

export function parseEntities(entityType) {
  return String(entityType || "").split(";").map((x) => x.trim()).filter(Boolean);
}

export function joinEntities(list) {
  return (list || []).join("; ");
}

// Toggle one option in a list: "Not sure" stands alone, and at least one
// option always stays selected.
export function toggleEntity(list, value) {
  const has = list.includes(value);
  if (value === "Not sure") return has ? list : ["Not sure"];
  const rest = list.filter((x) => x !== "Not sure");
  const next = has ? rest.filter((x) => x !== value) : [...rest, value];
  return next.length ? next : [SOLE_PROP];
}

export function paysByDraw(entityType) {
  return parseEntities(entityType).some((x) => DRAW_TYPES.includes(x));
}

function hasSoleProp(entityType) {
  return parseEntities(entityType).includes(SOLE_PROP);
}

// Owners who are only ever paid by draw, distribution or salary: their business
// has already paid its own expenses before the money reaches them, so a
// "Business Expenses (OPEX)" row would count those expenses twice.
export function dropsOpex(entityType) {
  return paysByDraw(entityType) && !hasSoleProp(entityType) && !isUnsure(entityType);
}

export function isUnsure(entityType) {
  return parseEntities(entityType).includes("Not sure");
}

// The word used in headings and sentences: "deposit" for sole proprietors,
// "owner's draw" when every business pays the owner that way, both when the
// businesses are mixed or it isn't known.
export function splitUnit(entityType) {
  if (paysByDraw(entityType)) return hasSoleProp(entityType) ? "deposit or owner's draw" : "owner's draw";
  if (isUnsure(entityType)) return "deposit or owner's draw";
  return "deposit";
}

export function drawNote(entityType) {
  if (paysByDraw(entityType)) {
    const list = parseEntities(entityType);
    if (list.length > 1) {
      const sole = hasSoleProp(entityType);
      return `You told us you have more than one business. For any business set up as an LLC with partners, an S-corp or a C-corp, the business pays you through draws, distributions, a salary or dividends, not through every deposit. Connect the account that pays you and PrioritySave will split each payment that lands there, and keep what each business needs for expenses, payroll and its own taxes inside that business's account.${sole ? " For income from a sole proprietorship, you can split deposits as they come in." : ""} Taxes are usually owed on each business's profit, not just on what you take out, so ask your CPA how much tax reserve to set aside.`;
    }
    const one = list[0];
    const how = one === "S-corp" ? "a salary and distributions" : one === "C-corp" ? "a salary or dividends" : "owner's draws or distributions";
    const unit = one === "S-corp" || one === "C-corp" ? "payment" : "draw";
    return `Your business pays you through ${how}, not through every deposit. Connect the account that pays you, and keep what the business needs for expenses, payroll and its own taxes inside the business account. PrioritySave will split each ${unit} that lands in the account you connect. Taxes are usually owed on the business's profit, not just on what you take out, so ask your CPA how much tax reserve to set aside.`;
  }
  if (isUnsure(entityType)) {
    return "If your business pays you through draws, distributions or payroll, connect the account that pays you and split those payments, not every deposit into the business. Your CPA or your tax return will tell you how your business is set up.";
  }
  return null;
}

// One short sentence for onboarding, where the screen should stay simple. The
// full explanation lives in Settings and on the Split Rules page.
export function shortDrawNote(entityType) {
  if (paysByDraw(entityType)) {
    const list = parseEntities(entityType);
    const drawCount = list.filter((x) => DRAW_TYPES.includes(x)).length;
    if (hasSoleProp(entityType)) {
      return "Your LLC or corporation pays you through draws, so PrioritySave will split each draw you receive from it. Income from your sole proprietorship is split as it comes in.";
    }
    if (drawCount > 1 || list.length > 1) {
      return "These businesses pay you through draws or distributions, so PrioritySave will split each one you receive, not every deposit into the business.";
    }
    return "Your business pays you through draws, so PrioritySave will split each draw you receive, not every deposit.";
  }
  if (isUnsure(entityType)) return "No problem. You can change this anytime in Settings.";
  return null;
}

// Shown on the connect-accounts step, where connecting the wrong account is
// the risk: the business operating account would have every customer payment
// split.
export function mixedOrDrawConnectNote(entityType) {
  const mixed = parseEntities(entityType).length > 1;
  return mixed
    ? "Connect the accounts where your pay lands, such as your personal account for draws, distributions or salary, and where any sole proprietor income arrives. Skip your LLC or corporation's business operating account, so business and personal money stay separate."
    : "Connect the account your business pays you into, usually your personal account. Skip the business operating account, so business and personal money stay separate.";
}

// Short names for showing a structure on a card.
export const ENTITY_SHORT = {
  [SOLE_PROP]: "Sole proprietorship",
  [SINGLE_LLC]: "Single-member LLC",
  "LLC (multiple members) / partnership": "Multi-member LLC / partnership",
  "S-corp": "S-corp",
  "C-corp": "C-corp",
};

// The separate businesses someone told us about in onboarding, one per
// structure they ticked ("Not sure" doesn't name a business). When they gave
// a business name and it clearly lists one name per structure ("Ignite My
// Site, PriorityPay"), each card gets its own name; a single structure gets
// the whole name; otherwise cards are numbered rather than guessed at.
export function businessesFromOnboarding(entityType, businessName) {
  const types = parseEntities(entityType).filter((t) => t !== "Not sure");
  const names = String(businessName || "")
    .split(/\s*(?:,|;|&|\+|\band\b)\s*/i)
    .map((n) => n.trim())
    .filter(Boolean);
  return types.map((t, i) => {
    let name;
    if (types.length === 1 && String(businessName || "").trim()) name = String(businessName).trim();
    else if (names.length === types.length) name = names[i];
    else name = types.length === 1 ? "Your business" : `Business ${i + 1}`;
    return { name, entityType: t, typeLabel: ENTITY_SHORT[t] || t };
  });
}

// Who gets the Business plan pitch: anyone running a separate legal entity
// (anything other than a plain sole proprietorship), or more than one business.
export function showsBusinessPitch(entityType) {
  const types = parseEntities(entityType).filter((t) => t !== "Not sure");
  return types.some((t) => t !== SOLE_PROP) || types.length >= 2;
}
