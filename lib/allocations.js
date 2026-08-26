// Shared allocation engine -- imported both server-side (the Dwolla
// run-split route, so what actually moves is provably the same math the
// user previewed) and client-side (Dashboard, Split Rules preview). Ported
// directly from the prototype; do not fork this logic between client and
// server copies.

export const CATEGORY_COLORS = [
  "#065f46",
  "#059669",
  "#0ea5e9",
  "#8b5cf6",
  "#6366f1",
  "#ec4899",
  "#f59e0b",
  "#a3a3a3",
  "#14b8a6",
  "#ef4444",
  "#7c3aed",
];

export const DEFAULT_SPLIT_RULES = {
  // PriorityPay Simple has no fixed-minimums layer at all -- every deposit
  // is split purely by percentage, always. `fixed` stays a permanently
  // empty array (never populated, no UI to add to it) purely so components
  // ported from the original app that still read `splitRules.fixed` keep
  // working unmodified -- computeAllocations' fixed pass below is a no-op
  // against an empty array. You're responsible for covering fixed costs
  // (rent, food, etc.) out of whatever isn't claimed by a percentage below.
  fixed: [],
  // Seven starting rows, matching PriorityPay's own Tax Reserve /
  // Investments / Solo 401k / SEP IRA / Emergency Fund / OPEX / Savings --
  // pre-filled with a reasonable starting split (75% total) so onboarding
  // isn't a blank page, but every number here is just a suggestion the
  // person is expected to actually set for themselves. The unclaimed 25%
  // stays in whichever account a deposit landed in, available for rent,
  // food, and everything else that isn't a percentage category here.
  //
  // Investments and Retirement are both "one bucket, many sub-accounts"
  // groups (see GROUPED_BUCKETS/percentSections below) -- each pre-seeded
  // with its default sub-account row(s), which a person can rename, add
  // to, or delete, same as any other row. Solo 401k and SEP IRA are the
  // Retirement group's two default sub-accounts.
  percent: [
    { id: "tax_reserve", label: "Tax Reserve", group: null, pct: 20, max: null, balanceCap: null, color: "#a3a3a3", accountId: null },
    { id: "investments_1", label: "Investments", group: "Investments", pct: 10, max: null, balanceCap: null, color: "#14b8a6", accountId: null },
    { id: "solo_401k", label: "Solo 401k", group: "Retirement", pct: 10, max: null, balanceCap: null, color: "#8b5cf6", accountId: null, retirementType: "solo_401k" },
    { id: "sep_ira", label: "SEP IRA", group: "Retirement", pct: 5, max: null, balanceCap: null, color: "#ec4899", accountId: null, retirementType: "sep_ira" },
    { id: "emergency_fund", label: "Emergency Fund", group: "Savings", pct: 10, max: null, balanceCap: null, color: "#f59e0b", accountId: null },
    { id: "opex", label: "Business Expenses (OPEX)", group: null, pct: 10, max: null, balanceCap: null, color: "#7c3aed", accountId: null },
    { id: "savings", label: "Savings", group: "Savings", pct: 10, max: null, balanceCap: null, color: "#ef4444", accountId: null },
  ],
};

// Categories that render as a group of sub-accounts (each with its own
// percentage and its own connected/creatable account) with an auto-summed
// group total, rather than a single flat row. Investments and Retirement
// are both "one bucket, multiple accounts" concepts -- e.g. Investments
// split across a brokerage and a crypto exchange, or Retirement split
// across a Solo 401k and a SEP IRA -- so both share the same group+subtotal
// UI (see percentSections below). Everything else (Tax Reserve, Emergency
// Fund, OPEX, Savings, and anything a person adds themselves) stays a
// single flat row, same as before.
export const GROUPED_BUCKETS = ["Investments", "Retirement"];

// Splits a flat `percent` array into an ordered list of render sections:
// `{ type: "group", group, rows }` for each GROUPED_BUCKETS value present
// (rows collected in original order, first-seen position kept), and
// `{ type: "row", row }` for everything else. Row order elsewhere is
// preserved -- this only changes how they're grouped for display.
export function percentSections(percent) {
  const sections = [];
  const groupSectionIndex = {};
  for (const row of percent) {
    const group = GROUPED_BUCKETS.includes(row.group) ? row.group : null;
    if (group) {
      if (!(group in groupSectionIndex)) {
        groupSectionIndex[group] = sections.length;
        sections.push({ type: "group", group, rows: [] });
      }
      sections[groupSectionIndex[group]].rows.push(row);
    } else {
      sections.push({ type: "row", row });
    }
  }
  return sections;
}

// A group's displayed total is always the sum of its sub-accounts' own
// percentages -- never independently editable -- so it can never drift
// from what the sub-accounts actually add up to.
export function groupPctTotal(rows) {
  return rows.reduce((sum, r) => sum + (Number(r.pct) || 0), 0);
}

// The seven rows every account starts with (see DEFAULT_SPLIT_RULES).
// Their labels are locked and they can never be deleted -- only rows a
// person added themselves (a custom flat category, or an extra Investment/
// Retirement sub-account added via "Add investment account"/"Add
// retirement account") can be renamed or removed.
//
// Matched by label (+ retirementType for the two retirement rows), not by
// `id` -- PUT /api/split-rules deletes and reinserts every row on every
// save, so the database hands back a fresh UUID as `id` each time. A
// literal-string id like "tax_reserve" only ever matches on someone's very
// first, never-yet-saved onboarding session; label is the one thing about
// a core row that's both stable across saves and, since it's locked,
// unable to drift once set.
const CORE_LABELS = new Set([
  "Tax Reserve",
  "Investments",
  "Solo 401k",
  "SEP IRA",
  "Emergency Fund",
  "Business Expenses (OPEX)",
  "Savings",
]);
export function isCoreRow(rule) {
  if (!rule || !CORE_LABELS.has(rule.label)) return false;
  if (rule.label === "Solo 401k") return rule.retirementType === "solo_401k";
  if (rule.label === "SEP IRA") return rule.retirementType === "sep_ira";
  return true;
}

let subAccountCounter = 0;
// Builds a new sub-account row for a GROUPED_BUCKETS group -- used by the
// "+ Add sub-account" control in both onboarding and Split Rules. Starts at
// 0% (same convention as "Add your own category"/suggestions) so adding one
// never silently changes anyone's total.
export function newSubAccountRow(group, colorIndex = 0) {
  subAccountCounter += 1;
  return {
    id: `${group.toLowerCase()}_${Date.now()}_${subAccountCounter}`,
    label: group === "Retirement" ? "New retirement account" : "New investment",
    group,
    pct: 0,
    max: null,
    balanceCap: null,
    color: CATEGORY_COLORS[colorIndex % CATEGORY_COLORS.length],
    accountId: null,
  };
}

// Not defaults -- one-click "add this category" suggestions shown alongside
// the "add your own" option on Split Rules / onboarding, for common goals
// PriorityPay Simple doesn't presume everyone wants (a wedding fund isn't
// universal the way Tax Reserve is). Adding one just appends it to `percent`
// with pct: 0, ready to be dialed in.
export const SUGGESTED_EXTRA_CATEGORIES = [
  { label: "Wedding", color: "#ec4899" },
  { label: "College Fund", color: "#065f46" },
  { label: "Vacation Fund", color: "#0ea5e9" },
  { label: "House Downpayment", color: "#6366f1" },
  { label: "Hobbies", color: "#f59e0b" },
  { label: "Dining", color: "#059669" },
  { label: "Fun Spending", color: "#7c3aed" },
  { label: "Profit", color: "#14b8a6" },
];

// Percent-category rows whose label matches one of these also have a
// Fixed Minimums counterpart of the same name (Emergency Fund, Savings) or
// flavor (Investments -> Additional Investments) -- shown a note in the
// onboarding "Additional Savings Goals" step clarifying that this
// percentage only kicks in once that fixed dollar minimum has already been
// met, since otherwise it reads like a second, separate contribution.
export const PERCENT_MINIMUM_NOTE_LABELS = ["Investments", "Savings", "Emergency Fund", "Tax Reserve"];

export function allRules(splitRules) {
  return [...splitRules.fixed, ...splitRules.percent];
}

// A fixed-cost rule is "savings/investments" flavored (vs. a true fixed
// minimum like Rent) if its group is Savings or Investments -- used to
// split the onboarding wizard's fixed-cost step into two screens without
// introducing a second concept of grouping.
export function isSavingsOrInvestment(rule) {
  return rule.group === "Savings" || rule.group === "Investments";
}

// A fixed-cost rule counts as a real brokerage/investment account -- and
// therefore gets the scoped "connect your real investment account" Plaid
// flow instead of a generic account picker -- purely based on which group
// it's in, exactly like retirement rows are identified by retirementType.
// No manual per-row toggle: any non-retirement row already living in the
// "Investments" group (out of the box, that's only the pre-seeded
// "Additional Investments" row -- Solo 401k/SEP IRA are excluded since they
// carry their own retirementType) is automatically scoped. A row a user
// renames or adds themselves can't get into the "Investments" group through
// the UI (group is fixed at creation), so this mirrors the retirement
// pattern: pre-seeded only, no way to opt a custom row in.
export function isInvestmentAccount(rule) {
  return rule.group === "Investments" && !rule.retirementType;
}

// Shared across every place a retirement row gets a "connect your real
// account" control or a "how do I open one" link (Split Rules, the Savings
// & Investments onboarding screen) so the copy/URLs live in exactly one
// place instead of drifting between components.
export const RETIREMENT_LABELS = { sep_ira: "SEP IRA", solo_401k: "Solo 401k" };
export const RETIREMENT_SETUP_LINKS = {
  sep_ira: "https://www.irs.gov/retirement-plans/retirement-plans-for-self-employed-people",
  solo_401k: "https://www.irs.gov/retirement-plans/one-participant-401k-plans",
};

// Same idea as RETIREMENT_LABELS/RETIREMENT_SETUP_LINKS, for a fixed row
// that's someone's real brokerage/investment account (e.g. Vanguard,
// Fidelity, Robinhood) rather than a plain savings bucket. Only one type for
// now -- unlike SEP IRA/Solo 401k there's no IRS contribution cap or % of
// deposit logic here, it's still funded as a normal flat-dollar fixed cost
// (see isSavingsOrInvestment/balanceCap above). What this flag *does* change
// is: (1) the Plaid Link used to connect it is scoped to real brokerage
// accounts only (see create-investment-link-token), same reasoning as the
// retirement scoping, and (2) it shows up in the Dashboard's monthly
// "remember to actually invest this" reminder, since PriorityPay can move
// money into the account but can't place trades for the user.
export const INVESTMENT_LABELS = { brokerage: "Brokerage / Investment Account" };
export const INVESTMENT_SETUP_LINKS = {
  brokerage: "https://www.investor.gov/introduction-investing/getting-started",
};

// Every non-retirement row in the "Investments" group used to be forced to
// investment_type = 'brokerage', no matter what -- fine when there could
// only ever be one such row ("Additional Investments"), but it broke the
// moment someone added a second real investment account (say, a crypto
// exchange alongside a brokerage): both shared the same investment_type, so
// their monthly funding totals and "go invest it" reminders got merged
// into one bucket instead of tracked separately. Since these rows don't
// have a stable id (regenerates every save) but the user's own label is
// already the de-facto unique name for the account (same anchor pattern
// used for percent rows elsewhere in this file), investment_type is now
// derived from a slug of that label instead of a hardcoded constant --
// every distinctly-labeled investment account gets its own tracking
// bucket automatically, no extra UI needed. Used identically client-side
// (to request the right Plaid Link scope) and server-side (PUT
// /api/split-rules, POST /api/onboarding/complete) so a freshly-linked
// account's investment_type always matches the row it's meant to attach to.
export function investmentTypeFromLabel(label) {
  const slug = (label || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug || "brokerage";
}

// Best-effort mapping from an already-connected account's Plaid
// institution_name to that institution's real sign-in page, so the monthly
// "go invest this" reminder (RetirementSection/InvestmentSection) can send
// someone straight to where they'd actually place the trade, instead of
// just telling them to go do it with nowhere to click. Matched by
// case-insensitive substring since institution_name varies in
// punctuation/suffix ("Charles Schwab" vs "Charles Schwab Bank"). Falls
// back to a plain web search for the institution's sign-in page if it isn't
// in this list -- still one click closer than nothing. Not verified against
// the live URLs -- login pages move; check before relying on these, same
// caveat as CreateSubAccountFlow's BANK_HELP.
const INSTITUTION_LOGIN_URLS = {
  fidelity: "https://www.fidelity.com/customer-service/login",
  vanguard: "https://logon.vanguard.com/logon",
  schwab: "https://client.schwab.com/Login/SignOn/CustomerCenterLogin.aspx",
  "e*trade": "https://us.etrade.com/etx/hp/login",
  etrade: "https://us.etrade.com/etx/hp/login",
  robinhood: "https://robinhood.com/login",
  ameritrade: "https://invest.ameritrade.com/grid/p/login",
  merrill: "https://www.merrilledge.com/login",
  wealthfront: "https://www.wealthfront.com/login",
  betterment: "https://www.betterment.com/login",
  "interactive brokers": "https://www.interactivebrokers.com/sso/Login",
};

export function institutionLoginUrl(institutionName) {
  if (!institutionName) return null;
  const key = institutionName.toLowerCase();
  const match = Object.keys(INSTITUTION_LOGIN_URLS).find((k) => key.includes(k));
  if (match) return INSTITUTION_LOGIN_URLS[match];
  return `https://www.google.com/search?q=${encodeURIComponent(institutionName + " sign in")}`;
}

// Total percentage across every row (flat + group sub-accounts, `percent`
// is one flat array) can never exceed 100% -- there's nothing left to give
// past that. Used by both onboarding and Split Rules' updatePercent/
// addSubAccount so a person can never type or drag past the room actually
// left, instead of silently overshooting and needing a separate validation
// error. Clamps to whatever room the OTHER rows haven't already claimed,
// never below 0.
export function clampPctToRemaining(percent, id, requestedPct) {
  const roomLeft = maxAllowedPct(percent, id);
  const requested = Math.max(0, Number(requestedPct) || 0);
  return Math.min(requested, roomLeft);
}

// The most a single row could be set to right now without pushing the
// total over 100% -- i.e. 100% minus every OTHER row's current share.
// Shared by clampPctToRemaining (which silently clamps the stored value)
// and the onboarding/Split Rules "over 100%" warning (which needs the same
// number to tell someone what they COULD still enter).
export function maxAllowedPct(percent, id) {
  const others = percent.reduce((sum, r) => (r.id === id ? sum : sum + (Number(r.pct) || 0)), 0);
  return roundPct(Math.max(0, 100 - others));
}

// A cap field (CapField in PercentSplitEditor.js) can sit in a transient
// "" state while someone has chosen "Set a limit" but hasn't typed a
// number yet -- deliberately empty so the old placeholder "1" isn't left
// in the box for someone to backspace through (see CapField's comment).
// Nothing downstream (PUT /api/split-rules, POST /api/onboarding/complete)
// should ever be handed that "" though -- the stored invariant is still
// "either exactly null (no cap) or a real positive number," same as
// before. This is the one place that gets called right before anything
// serializes `percent` for save, coercing any still-empty "set" cap back
// to the $1 floor exactly like blurring the field would have.
export function settleCaps(percent) {
  const settle = (v) => (v === "" || v === undefined ? 1 : v);
  return percent.map((r) => ({ ...r, max: settle(r.max), balanceCap: settle(r.balanceCap) }));
}

// Percent-split rows are restricted to connecting a real *savings* account
// (Plaid account_filters: depository/savings only -- no checking, no real
// brokerage/retirement account types) everywhere except OPEX/Business
// Expenses: this money is meant to sit and grow untouched until it's
// actually needed, and routing it to a checking account defeats that ("if
// it's just sent to another checking account, that won't work" -- Megan).
// OPEX is the one deliberate exception, since business operating expenses
// are meant to be spent/paid out of that account regularly, not saved --
// flagging this as a judgment call rather than something explicitly
// confirmed, in case OPEX should be restricted too.
export function connectSavingsOnly(rule) {
  return rule.id !== "opex";
}

// Static explainer shown once under the Retirement group header in both
// onboarding and Split Rules -- Solo 401k/SEP IRA aren't self-explanatory
// to everyone using this, and this is the one place to say so without
// repeating it per-row.
export const RETIREMENT_GROUP_SUBTEXT =
  "Solo 401ks and SEP IRAs are retirement accounts for self-employed (and those who make side income, even if you have a W2). You can set up these accounts after you finish onboarding.";

// Rounds to 2 decimal places, not 0 -- percent rules can legitimately be
// fractional (e.g. "2.1%" appears in the wild here), so this only needs
// to kill binary floating-point noise (things like summing several
// percentages and getting "22.900000000000006" back), not real
// precision. Used for every user-facing percent total/remainder so the
// allocated/remaining copy on Split Rules and onboarding never shows
// that noise.
export function roundPct(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function pctTotal(percentRules) {
  return roundPct(percentRules.reduce((s, r) => s + (Number(r.pct) || 0), 0));
}

export function moveInArray(arr, index, direction) {
  const target = index + direction;
  if (target < 0 || target >= arr.length) return arr;
  const copy = [...arr];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}

export function reorderToPosition(arr, id, targetPosition) {
  const fromIndex = arr.findIndex((r) => r.id === id);
  if (fromIndex === -1) return arr;
  const clampedIndex = Math.max(1, Math.min(arr.length, Math.round(targetPosition) || 1)) - 1;
  if (clampedIndex === fromIndex) return arr;
  const copy = [...arr];
  const [item] = copy.splice(fromIndex, 1);
  copy.splice(clampedIndex, 0, item);
  return copy;
}

// Non-retirement savings/investment rows (Emergency Fund, Savings,
// Additional Investments, or any user-added row in those two groups) can
// optionally carry a `balanceCap`: once the destination account's live
// Plaid balance reaches that amount, this fixed minimum stops being funded
// and the money waterfalls to the next priority item instead -- exactly
// like the retirement monthly cap, but keyed off account balance rather
// than a monthly contribution total. This is a binary gate, not a partial
// top-up: fully fund the minimum while under the cap, fund $0 once at or
// over it. If there's no live balance yet (account not connected, or not
// synced), funding is never blocked -- absence of a signal isn't a reason
// to withhold money. Used identically client-side (previews) and
// server-side (lib/runSplit.js) so what's shown is what actually happens.
export function applyBalanceCaps(fixedRows, accountsById) {
  return fixedRows.map((r) => {
    if (r.balanceCap === null || r.balanceCap === undefined || r.balanceCap === "" || !r.accountId) return r;
    const balance = accountsById?.[r.accountId]?.current_balance;
    if (balance === null || balance === undefined || !Number.isFinite(Number(balance))) return r;
    if (Number(balance) >= Number(r.balanceCap)) return { ...r, amount: 0 };
    return r;
  });
}

// Pass 1: fund fixed costs, in priority order, each up to its own amount.
// Whether a category's money actually moves is decided by the caller (the
// Dwolla route): if the account chosen for it is the same account the
// deposit landed in, there's nothing to move -- it's already there.
// Pass 2: split whatever's left by percentage, honoring each cap and
// redistributing overflow proportionally among the categories still under
// their cap, iterating until nothing more gets capped.
//
// A percent category can carry up to two independent, optional caps --
// whichever leaves LESS room wins for that category on this deposit:
//
//  - `max` is a MONTHLY TOTAL cap, not a per-deposit one -- every deposit
//    that lands this month keeps chipping away at the same cap (e.g. three
//    $500 paychecks against a $1,000 cap fund the category in full on the
//    second deposit, and $0 on the third). Resets automatically at the
//    start of each calendar month. `percentAllocatedThisMonth` is an
//    optional map of { [percentRowId]: amountAlreadyGivenThisMonth-
//    before-this-deposit }, supplied by the caller (lib/runSplit.js, which
//    knows what's already been sent this month via transfer_allocations)
//    -- client-side previews don't have that history so they pass nothing
//    and only ever see a single deposit's worth of room under the cap.
//  - `balanceCap` is keyed off the connected account's live balance
//    instead of a monthly running total -- once that account's balance
//    (from `accountsById`, supplied by the caller) reaches this many
//    dollars, the category stops receiving new money until the balance
//    drops back below the cap (e.g. a real withdrawal). Never resets on
//    its own the way the monthly cap does. Rows with no connected account,
//    or whose account has no known balance yet, are treated as uncapped by
//    this specific check (absence of a signal isn't a reason to withhold
//    money) -- same principle as the legacy `applyBalanceCaps` above, just
//    integrated into the proportional-redistribution loop below instead of
//    being a binary zero-or-full gate, since percent categories partially
//    fund up to whatever room is left rather than all-or-nothing.
export function computeAllocations(splitRules, amount, percentAllocatedThisMonth = {}, accountsById = {}) {
  const total = Math.max(0, Number(amount) || 0);
  const fixed = splitRules.fixed || [];
  const percent = splitRules.percent || [];
  const allocated = {};
  fixed.forEach((r) => (allocated[r.id] = 0));
  percent.forEach((r) => (allocated[r.id] = 0));

  let remaining = total;
  fixed.forEach((r) => {
    // Retirement rows (pct set) are always a percentage of *this deposit*,
    // never a flat dollar minimum -- income varies paycheck to paycheck,
    // and a flat number could over-contribute past a year's IRS limit. The
    // server-side caller (lib/runSplit.js) further clamps this to whatever
    // room is left under that month's contribution cap before calling in
    // here; this function only computes the raw percentage-of-deposit.
    const amt = r.pct !== null && r.pct !== undefined ? total * (Number(r.pct) / 100) : Number(r.amount) || 0;
    const take = Math.min(amt, remaining);
    allocated[r.id] += take;
    remaining -= take;
  });

  let open = percent.filter((r) => Number(r.pct) > 0);

  // Percent rows only ever claim their OWN share of the deposit. Without
  // this, the redistribution loop below always fully consumes whatever's
  // left in `remaining` -- so if percentages only add up to (say) 75%,
  // it would silently stretch them to proportionally fill the other 25%
  // instead of leaving it in the account the deposit landed in, directly
  // contradicting what onboarding/Split Rules tell people ("75%
  // allocated, 25% remains where it was deposited"). Capping `remaining`
  // here to the committed percentage's share of the ORIGINAL deposit --
  // before any capping/redistribution runs -- is what makes that promise
  // true, while still preserving the *other* intentional redistribution
  // behavior below: if a capped category can't take its full share, the
  // room it leaves behind still flows to the other percent categories
  // (never back into this uncommitted portion, which was never part of
  // `remaining` to begin with).
  const committedPct = open.reduce((s, r) => s + Number(r.pct), 0);
  remaining = Math.min(remaining, total * (committedPct / 100));

  let guard = 0;
  while (remaining > 0.005 && open.length > 0 && guard < percent.length + 1) {
    guard += 1;
    const sumPct = open.reduce((s, r) => s + Number(r.pct), 0);
    if (sumPct <= 0) break;
    let anyCapped = false;
    let givenThisRound = 0;
    const stillOpen = [];
    open.forEach((r) => {
      const share = remaining * (Number(r.pct) / sumPct);

      const max = r.max === null || r.max === undefined || r.max === "" ? Infinity : Number(r.max);
      const givenEarlierThisMonth = Number(percentAllocatedThisMonth[r.id]) || 0;
      const monthlyRoom = Math.max(0, max - givenEarlierThisMonth - allocated[r.id]);

      const balance = r.accountId ? accountsById?.[r.accountId]?.current_balance : null;
      const balanceCap = r.balanceCap === null || r.balanceCap === undefined || r.balanceCap === "" ? Infinity : Number(r.balanceCap);
      const balanceRoom =
        balanceCap === Infinity || balance === null || balance === undefined || !Number.isFinite(Number(balance))
          ? Infinity
          : Math.max(0, balanceCap - Number(balance) - allocated[r.id]);

      const room = Math.min(monthlyRoom, balanceRoom);
      if (share >= room) {
        allocated[r.id] += room;
        givenThisRound += room;
        anyCapped = true;
      } else {
        stillOpen.push(r);
      }
    });
    if (anyCapped) {
      remaining -= givenThisRound;
      open = stillOpen;
    } else {
      open.forEach((r) => {
        allocated[r.id] += remaining * (Number(r.pct) / sumPct);
      });
      remaining = 0;
      open = [];
    }
  }

  return { allocated, unallocated: Math.max(0, remaining) };
}

// 2026 IRS limits relevant to Solo 401k / SEP IRA contribution room -- see
// prioritypay_app.jsx for the full explanation. Estimate only, not tax
// advice.
export const RETIREMENT_LIMITS_2026 = {
  electiveDeferral: 24500,
  catchUp: { under50: 0, "50to59_64plus": 8000, "60to63": 11250 },
  overallDC: { under50: 72000, "50to59_64plus": 80000, "60to63": 83250 },
};

export function electiveDeferralLimit(ageBracket) {
  return RETIREMENT_LIMITS_2026.electiveDeferral + (RETIREMENT_LIMITS_2026.catchUp[ageBracket] || 0);
}

export function overallDCLimit(ageBracket) {
  return RETIREMENT_LIMITS_2026.overallDC[ageBracket] || RETIREMENT_LIMITS_2026.overallDC.under50;
}

// Auto-suggested monthly contribution ceiling for a retirement fixed-cost
// rule, used to clamp how much a single month's splits are allowed to route
// there (see lib/runSplit.js). This is a rough estimate, not tax advice:
// SEP IRA contributions are capped at 25% of compensation (backstopped by
// the annual dollar max); Solo 401k employee deferrals can be up to 100% of
// compensation, backstopped by the annual elective-deferral dollar max.
// Crucially this only looks at *this month's* income logged in PriorityPay
// and does not track contributions made in prior months (through
// PriorityPay or elsewhere) -- see the disclaimer shown alongside it in the
// UI. A user-entered override always wins over this estimate.
export function suggestedMonthlyCap(retirementType, monthlyIncome, ageBracket) {
  const income = Math.max(0, Number(monthlyIncome) || 0);
  if (retirementType === "sep_ira") {
    return Math.min(income * 0.25, overallDCLimit(ageBracket));
  }
  if (retirementType === "solo_401k") {
    return Math.min(income, electiveDeferralLimit(ageBracket));
  }
  return Infinity;
}

export function retirementWarning(rule, retirementProfile) {
  if (!retirementProfile) return null;
  const annualized = (Number(rule.amount) || 0) * 12;
  if (rule.id === "solo_401k" && retirementProfile.hasW2Plan) {
    const room = Math.max(
      0,
      electiveDeferralLimit(retirementProfile.ageBracket) - (Number(retirementProfile.w2ElectiveDeferralYTD) || 0)
    );
    if (annualized > room) {
      return `Your employer plan leaves ~$${room.toLocaleString()}/yr of shared 401k deferral room — this pace would exceed it.`;
    }
  }
  if (rule.id === "sep_ira") {
    const cap = overallDCLimit(retirementProfile.ageBracket);
    if (annualized > cap) {
      return `Approaching the $${cap.toLocaleString()}/yr SEP IRA ceiling (25% of net self-employment income, capped here).`;
    }
  }
  return null;
}

export const currency = (n) =>
  Number(n || 0).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

// ---------- PHASE B: monthly close-out recommendations ----------
// suggestedMonthlyCap above answers "how much could this month's income
// support" but was being asked that question with the wrong monthly
// window -- allocatedThisMonthByType (the old caller, lib/runSplit.js)
// reset every calendar month, so the same near-annual dollar ceiling could
// be re-triggered every single month with no memory of the year. This
// function is the fix: room is bounded by BOTH this month's income-based
// formula AND whatever's genuinely left under the annual IRS dollar limit
// after every confirmed contribution so far *this calendar year*
// (ytdContributions, summed from real transfer_allocations regardless of
// how they were triggered). Under-contributing early in the year widens
// room later (real catch-up); a string of high-income months can't blow
// past the annual limit (real prevention), because the YTD term is the
// binding constraint once it's smaller than the monthly one.
export function estimateRetirementRoom({ retirementType, netIncomeThisMonth, ytdContributions, ageBracket, override }) {
  if (override !== null && override !== undefined && override !== "") {
    return Math.max(0, Number(override) - (Number(ytdContributions) || 0));
  }
  const monthlyEstimate = suggestedMonthlyCap(retirementType, netIncomeThisMonth, ageBracket);
  const annualLimit = retirementType === "sep_ira" ? overallDCLimit(ageBracket) : electiveDeferralLimit(ageBracket);
  const roomUnderAnnualLimit = Math.max(0, annualLimit - (Number(ytdContributions) || 0));
  return Math.max(0, Math.min(monthlyEstimate, roomUnderAnnualLimit));
}

// Rough, clearly-labeled-as-estimate set-aside for taxes on a month's
// confirmed net income -- NOT tax advice, just a commonly-cited rule of
// thumb (freelancers/self-employed are often told to set aside ~25-30% of
// net income for federal + state + self-employment tax). Real effective
// rate varies hugely by state, filing status, deductions, etc., so the
// rate is a plain parameter the close-out UI lets someone override with
// whatever number their own accountant/prior year return suggests, not a
// fixed constant.
export const DEFAULT_TAX_RESERVE_RATE_PCT = 25;

export function estimateTaxReserve(netIncomeThisMonth, ratePct = DEFAULT_TAX_RESERVE_RATE_PCT) {
  const income = Math.max(0, Number(netIncomeThisMonth) || 0);
  const rate = Math.max(0, Number(ratePct) || 0) / 100;
  return income * rate;
}
