// Tax Savings Quiz: deterministic, rule-based matching against the curated
// PriorityPay tax strategy library (lib/advisorKnowledge.js). No LLM calls --
// this powers a public, unauthenticated page, so results must be free to
// compute and impossible to abuse into runaway API cost.
//
// Design: a short set of quiz questions collects self-reported situational
// flags. Each strategy in the knowledge base is paired here with an explicit
// trigger function over those flags. A strategy surfaces in results only if
// (a) its persona tag (appliesTo) matches the user's selected work situation
// (or is "universal"), AND (b) its trigger condition returns true.
//
// This intentionally does not try to cover literally all 79 strategies with
// equal precision -- a handful of very narrow entries (e.g. professional
// gambler reporting, QSBS stacking via trusts) are gated behind broader life
// event flags and will only surface for users who flag genuinely adjacent
// situations. That's fine: this is a discovery tool, not a chat interface.

import { TAX_STRATEGIES } from "@/lib/advisorKnowledge";

export const QUIZ_QUESTIONS = [
  {
    id: "work",
    prompt: "Which of these describes your work? Select all that apply.",
    type: "multi",
    options: [
      { value: "self_employed", label: "Self-employed / freelance / sole proprietor (no separate business entity)" },
      { value: "business_owner", label: "I own a business with an LLC, S-corp, or C-corp structure" },
      { value: "w2", label: "I have a W-2 job" },
    ],
  },
  {
    id: "income",
    prompt: "What's your approximate annual household income before taxes?",
    type: "single",
    options: [
      { value: "<75k", label: "Under $75,000" },
      { value: "75-150k", label: "$75,000 - $150,000" },
      { value: "150-250k", label: "$150,000 - $250,000" },
      { value: "250-500k", label: "$250,000 - $500,000" },
      { value: "500k+", label: "Over $500,000" },
    ],
  },
  {
    id: "filingStatus",
    prompt: "What's your filing status?",
    type: "single",
    options: [
      { value: "single", label: "Single" },
      { value: "mfj", label: "Married filing jointly" },
      { value: "hoh", label: "Head of household" },
    ],
  },
  {
    id: "age",
    prompt: "What's your age range?",
    type: "single",
    options: [
      { value: "under_40", label: "Under 40" },
      { value: "40_59", label: "40 - 59" },
      { value: "60_69", label: "60 - 69" },
      { value: "70_plus", label: "70 or older" },
    ],
  },
  {
    id: "household",
    prompt: "Which of these apply to your household? Select all that apply.",
    type: "multi",
    options: [
      { value: "own_home_with_mortgage", label: "I own a home with a mortgage" },
      { value: "high_state_local_taxes", label: "I pay more than $10,000/year combined in state income + property taxes" },
      { value: "kids_under_18", label: "I have dependent children under 18" },
      { value: "nonworking_or_lower_income_spouse", label: "I'm married to a spouse with little or no earned income" },
      { value: "planning_education_costs", label: "I'm saving or planning for K-12 or college costs" },
      { value: "none", label: "None of these" },
    ],
  },
  {
    id: "retirement",
    prompt: "How do you currently save for retirement?",
    type: "single",
    options: [
      { value: "employer_401k_only", label: "Through an employer 401(k)" },
      { value: "self_employed_no_plan_yet", label: "I'm self-employed and don't have a retirement plan set up yet" },
      { value: "self_employed_has_solo401k_or_sep", label: "I'm self-employed with a Solo 401(k) or SEP IRA already" },
      { value: "both_employer_and_self_employed", label: "Both an employer plan and self-employment income" },
      { value: "not_sure_none", label: "Not sure / no retirement savings yet" },
    ],
  },
  {
    id: "investingGiving",
    prompt: "Which of these apply to you? Select all that apply.",
    type: "multi",
    options: [
      { value: "taxable_brokerage_investing", label: "I invest through a taxable (non-retirement) brokerage account" },
      { value: "gives_to_charity_regularly", label: "I give meaningfully to charity most years" },
      { value: "donates_appreciated_stock", label: "I've donated appreciated stock or crypto, or would consider it" },
      { value: "hdhp_hsa_enrolled", label: "I'm enrolled in a high-deductible health plan / have an HSA" },
      { value: "none", label: "None of these" },
    ],
  },
  {
    id: "business",
    prompt: "Which of these apply to your business? Select all that apply.",
    type: "multi",
    showIf: (a) => a.work?.includes("self_employed") || a.work?.includes("business_owner"),
    options: [
      { value: "home_office", label: "I use a dedicated home office regularly for business" },
      { value: "business_travel", label: "I travel for client meetings or business development" },
      { value: "conferences_prof_dev", label: "I attend conferences or professional development events" },
      { value: "equipment_tech_purchases", label: "I buy equipment, software, or technology for the business" },
      { value: "professional_services", label: "I pay for accounting, legal, or consulting services" },
      { value: "marketing_advertising", label: "I spend on marketing or advertising" },
      { value: "business_credit_card", label: "I use a business credit card and pay it off in full monthly" },
      { value: "owns_business_real_estate", label: "The business owns or is buying real estate or major equipment" },
      { value: "employs_spouse_or_kids", label: "My spouse or kids do real work for the business (or could)" },
      { value: "none", label: "None of these" },
    ],
  },
  {
    id: "structure",
    prompt: "What's your business's legal structure today?",
    type: "single",
    showIf: (a) => a.work?.includes("business_owner"),
    options: [
      { value: "sole_prop_or_single_member_llc", label: "Sole proprietorship or single-member LLC (no election)" },
      { value: "s_corp_election", label: "S-corp election" },
      { value: "c_corp", label: "C-corp" },
      { value: "partnership_multi_member", label: "Partnership / multi-member LLC" },
      { value: "not_sure", label: "Not sure" },
    ],
  },
  {
    id: "equity",
    prompt: "Do either of these apply to you? Select all that apply.",
    type: "multi",
    options: [
      { value: "startup_equity_or_options", label: "I hold stock options or equity at a startup" },
      { value: "c_corp_founder_or_early_employee", label: "I'm a founder or early employee/investor holding C-corp stock" },
      { value: "none", label: "Neither" },
    ],
  },
  {
    id: "life",
    prompt: "Do any of these apply to your situation right now? Select all that apply.",
    type: "multi",
    options: [
      { value: "recently_moved_states", label: "Recently moved states, or considering a move" },
      { value: "expecting_high_income_year", label: "Expecting a much higher income year than usual (bonus, sale, exit)" },
      { value: "planning_to_sell_business_or_appreciated_asset", label: "Planning to sell a business, real estate, or a highly appreciated investment" },
      { value: "living_or_working_abroad", label: "Living or working outside the U.S." },
      { value: "foreign_bank_accounts", label: "Hold foreign bank or investment accounts" },
      { value: "building_estate_legacy_plan", label: "Doing estate or multi-generational legacy planning" },
      { value: "none", label: "None of these" },
    ],
  },
];

const INCOME_ORDER = ["<75k", "75-150k", "150-250k", "250-500k", "500k+"];
function incomeAtLeast(a, floor) {
  const i = INCOME_ORDER.indexOf(a.income);
  const f = INCOME_ORDER.indexOf(floor);
  if (i === -1 || f === -1) return false;
  return i >= f;
}

function personaMatches(appliesTo, work) {
  if (!appliesTo || appliesTo.includes("universal")) return true;
  const w = work || [];
  return appliesTo.some((tag) => w.includes(tag));
}

// One trigger function per strategy id. Returns true/false over the
// normalized answers object built by normalizeAnswers().
const TRIGGERS = {
  "three-lenses-tax-minimization": () => true,
  "standard-vs-itemized-deductions": (a) =>
    a.homeowner || a.highSalt || a.charity,
  "bunching-deductions-strategy": (a) => a.homeowner || a.highSalt || a.charity,
  "marginal-vs-effective-tax-rate": (a) => incomeAtLeast(a, "150-250k"),
  "deductions-vs-credits": (a) => a.kidsUnder18,
  "salt-deduction-cap": (a) => a.highSalt || incomeAtLeast(a, "500k+"),
  "tax-advantaged-account-contribution-waterfall": (a) =>
    a.retirement !== "not_sure_none",
  "401k-basics": (a) =>
    a.retirement === "employer_401k_only" || a.retirement === "both_employer_and_self_employed",
  "traditional-ira": (a) => incomeAtLeast(a, "150-250k"),
  "roth-vs-pretax-contribution-choice": (a) => a.retirement !== "not_sure_none",
  "roth-conversions": (a) => incomeAtLeast(a, "150-250k") || a.age === "60_69",
  "backdoor-roth-ira": (a) => incomeAtLeast(a, "150-250k"),
  "mega-backdoor-roth-ira": (a) =>
    (a.work?.includes("self_employed") || a.retirement === "employer_401k_only") &&
    incomeAtLeast(a, "250-500k"),
  "solo-401k": (a) =>
    a.retirement === "self_employed_no_plan_yet" || a.retirement === "self_employed_has_solo401k_or_sep",
  "solo-401k-vs-sep-ira": (a) => a.retirement === "self_employed_has_solo401k_or_sep",
  "solo-401k-contribution-deadlines": (a) =>
    a.retirement === "self_employed_no_plan_yet" || a.retirement === "self_employed_has_solo401k_or_sep",
  "cash-balance-plan": (a) =>
    incomeAtLeast(a, "250-500k") && (a.age === "40_59" || a.age === "60_69" || a.age === "70_plus"),
  "trump-accounts": (a) => a.kidsUnder18,
  "self-directed-ira-asymmetric-investments": (a) =>
    a.equity?.includes("startup_equity_or_options") || a.equity?.includes("c_corp_founder_or_early_employee"),
  "hsa-overview": (a) => a.hsa,
  "hsa-pay-and-reimburse-strategy": (a) => a.hsa,
  "529-plan-basics": (a) => a.kidsUnder18 || a.planningEducation,
  "529-superfunding-and-state-shopping": (a) =>
    a.planningEducation && incomeAtLeast(a, "250-500k"),
  "529-to-roth-ira-rollover": (a) => a.planningEducation || a.kidsUnder18,
  "other-education-savings-accounts": (a) => a.planningEducation,
  "hire-your-spouse-for-retirement-doubling": (a) =>
    (a.work?.includes("self_employed") || a.work?.includes("business_owner")) && a.nonworkingSpouse,
  "hire-your-kids-for-tax-savings": (a) =>
    (a.work?.includes("self_employed") || a.work?.includes("business_owner")) &&
    (a.kidsUnder18 || a.biz?.includes("employs_spouse_or_kids")),
  "custodial-roth-ira-for-working-minors": (a) => a.kidsUnder18,
  "spousal-roth-ira-for-nonworking-spouse": (a) => a.nonworkingSpouse,
  "tax-loss-harvesting": (a) => a.brokerage,
  "wash-sale-rule": (a) => a.brokerage,
  "direct-indexing": (a) => a.brokerage && incomeAtLeast(a, "250-500k"),
  "qualified-opportunity-zones": (a) =>
    a.life?.includes("planning_to_sell_business_or_appreciated_asset"),
  "money-market-fund-tax-equivalent-yield": (a) => incomeAtLeast(a, "150-250k"),
  "charitable-giving-basics-agi-caps": (a) => a.charity,
  "donating-appreciated-assets": (a) => a.appreciatedStock || (a.brokerage && a.charity),
  "donor-advised-funds": (a) => a.charity && (a.highSalt || incomeAtLeast(a, "250-500k")),
  "qualified-charitable-distributions": (a) => a.age === "70_plus",
  "charitable-law-changes-2026": (a) => a.charity && incomeAtLeast(a, "250-500k"),
  "private-foundations": (a) =>
    incomeAtLeast(a, "500k+") && a.life?.includes("building_estate_legacy_plan"),
  "charitable-remainder-lead-trusts": (a) =>
    a.life?.includes("building_estate_legacy_plan") &&
    (incomeAtLeast(a, "500k+") || a.life?.includes("planning_to_sell_business_or_appreciated_asset")),
  "home-office-deduction": (a) => a.biz?.includes("home_office"),
  "business-travel-deductions": (a) => a.biz?.includes("business_travel"),
  "conference-and-professional-development-expenses": (a) => a.biz?.includes("conferences_prof_dev"),
  "equipment-technology-deductions": (a) => a.biz?.includes("equipment_tech_purchases"),
  "professional-services-deductions": (a) => a.biz?.includes("professional_services"),
  "marketing-advertising-deductions": (a) => a.biz?.includes("marketing_advertising"),
  "augusta-rule": (a) =>
    (a.work?.includes("business_owner") || a.work?.includes("self_employed")) &&
    (a.biz?.includes("conferences_prof_dev") || a.biz?.includes("marketing_advertising") || a.homeowner),
  "business-credit-card-points-strategy": (a) => a.biz?.includes("business_credit_card"),
  "bonus-depreciation-cost-segregation": (a) => a.biz?.includes("owns_business_real_estate"),
  "real-estate-depreciation-offset-active-income": (a) =>
    a.biz?.includes("owns_business_real_estate") || a.nonworkingSpouse,
  "s-corp-election": (a) =>
    (a.work?.includes("self_employed") || a.structure === "sole_prop_or_single_member_llc") &&
    incomeAtLeast(a, "75-150k"),
  "reasonable-w2-salary-optimization": (a) => a.structure === "s_corp_election",
  "qbi-section-199a-deduction": (a) =>
    (a.work?.includes("self_employed") || a.work?.includes("business_owner")) &&
    incomeAtLeast(a, "150-250k"),
  "ptet-election": (a) =>
    (a.structure === "s_corp_election" || a.structure === "partnership_multi_member") && a.highSalt,
  "sticky-states-domicile-planning": (a) =>
    a.life?.includes("recently_moved_states") || a.life?.includes("living_or_working_abroad"),
  "foreign-earned-income-exclusion": (a) => a.life?.includes("living_or_working_abroad"),
  "foreign-tax-credit": (a) => a.life?.includes("living_or_working_abroad"),
  "fbar-fatca-international-reporting": (a) =>
    a.life?.includes("foreign_bank_accounts") || a.life?.includes("living_or_working_abroad"),
  "expat-self-employment-tax-mitigation": (a) =>
    a.work?.includes("self_employed") && a.life?.includes("living_or_working_abroad"),
  "startup-equity-valuation-basics": (a) => a.equity?.includes("startup_equity_or_options"),
  "equity-vesting-and-ownership-percentage": (a) => a.equity?.includes("startup_equity_or_options"),
  "liquidation-preference": (a) => a.equity?.includes("startup_equity_or_options"),
  "post-termination-exercise-period": (a) => a.equity?.includes("startup_equity_or_options"),
  "qsbs-overview": (a) => a.equity?.includes("c_corp_founder_or_early_employee"),
  "qsbs-requirements": (a) => a.equity?.includes("c_corp_founder_or_early_employee"),
  "qsbs-rollover-1045": (a) =>
    a.equity?.includes("c_corp_founder_or_early_employee") &&
    a.life?.includes("planning_to_sell_business_or_appreciated_asset"),
  "qsbs-stacking-gifting": (a) =>
    a.equity?.includes("c_corp_founder_or_early_employee") && a.life?.includes("building_estate_legacy_plan"),
  "qsbs-stacking-trusts": (a) =>
    a.equity?.includes("c_corp_founder_or_early_employee") &&
    a.life?.includes("building_estate_legacy_plan") &&
    incomeAtLeast(a, "500k+"),
  "obbba-tax-rates-and-corporate-rate-permanent": (a) => a.life?.includes("expecting_high_income_year"),
  "obbba-qsbs-expansion": (a) => a.equity?.includes("c_corp_founder_or_early_employee"),
  "obbba-bonus-depreciation-restored": (a) =>
    a.biz?.includes("owns_business_real_estate") || a.biz?.includes("equipment_tech_purchases"),
  "obbba-software-rd-amortization-relief": (a) => a.work?.includes("business_owner"),
  "obbba-gift-estate-tax-exemption-increase": (a) =>
    a.life?.includes("building_estate_legacy_plan") && incomeAtLeast(a, "500k+"),
  "obbba-qbi-deduction-permanence": (a) =>
    a.work?.includes("self_employed") || a.work?.includes("business_owner"),
  "obbba-trump-accounts-law-change": (a) => a.kidsUnder18,
  "obbba-opportunity-zone-permanence": (a) =>
    a.life?.includes("planning_to_sell_business_or_appreciated_asset"),
  "obbba-gambling-loss-deduction-change": () => false,
  "obbba-salt-cap-increase-to-40k": (a) => a.highSalt && !incomeAtLeast(a, "500k+"),
};

// Turns raw answers keyed by question id into a flat, easy-to-query shape.
export function normalizeAnswers(raw) {
  const household = raw.household || [];
  const investingGiving = raw.investingGiving || [];
  return {
    work: raw.work || [],
    income: raw.income || null,
    filingStatus: raw.filingStatus || null,
    age: raw.age || null,
    homeowner: household.includes("own_home_with_mortgage"),
    highSalt: household.includes("high_state_local_taxes"),
    kidsUnder18: household.includes("kids_under_18"),
    nonworkingSpouse: household.includes("nonworking_or_lower_income_spouse"),
    planningEducation: household.includes("planning_education_costs"),
    retirement: raw.retirement || "not_sure_none",
    brokerage: investingGiving.includes("taxable_brokerage_investing"),
    charity: investingGiving.includes("gives_to_charity_regularly"),
    appreciatedStock: investingGiving.includes("donates_appreciated_stock"),
    hsa: investingGiving.includes("hdhp_hsa_enrolled"),
    biz: raw.business || [],
    structure: raw.structure || null,
    equity: raw.equity || [],
    life: raw.life || [],
  };
}

const CATEGORY_ORDER = [
  "Tax Fundamentals",
  "Retirement Accounts",
  "Health & Education Accounts",
  "Family & Dependents",
  "Business Deductions",
  "Business Structure & Elections",
  "Investment Tax",
  "Charitable Giving",
  "Equity & Startups",
  "State & Residency",
  "Recent Law Changes",
];

// Per-category cap, not a flat overall cap -- a flat cap taken in category
// order would silently starve every category after the first few (e.g. a
// business owner's Business Deductions matches would never be seen because
// Retirement Accounts matches alone could fill the whole quota). Capping per
// category keeps every relevant area represented.
const MAX_PER_CATEGORY = 5;

export function matchStrategies(rawAnswers) {
  const a = normalizeAnswers(rawAnswers);
  const matched = TAX_STRATEGIES.filter((s) => {
    if (!personaMatches(s.appliesTo, a.work)) return false;
    const trigger = TRIGGERS[s.id];
    if (!trigger) return false;
    try {
      return !!trigger(a);
    } catch {
      return false;
    }
  });

  const grouped = [];
  let shown = 0;
  for (const category of CATEGORY_ORDER) {
    // Persona-specific matches (appliesTo tagged self_employed/business_owner,
    // not just "universal") are more targeted to this user than a generic
    // universal strategy that happens to sit earlier in the source array --
    // rank those first so the per-category cap doesn't crowd out something
    // like Solo 401(k) in favor of a generic IRA explainer for a
    // self-employed user with no retirement plan yet.
    const inCategory = matched
      .filter((s) => s.category === category)
      .sort((x, y) => {
        const xSpecific = !x.appliesTo.includes("universal") ? 0 : 1;
        const ySpecific = !y.appliesTo.includes("universal") ? 0 : 1;
        return xSpecific - ySpecific;
      })
      .slice(0, MAX_PER_CATEGORY);
    if (inCategory.length === 0) continue;
    shown += inCategory.length;
    grouped.push({
      category,
      strategies: inCategory.map((s) => ({
        id: s.id,
        title: s.title,
        summary: s.summary,
        notFinancialAdviceNote: s.notFinancialAdviceNote,
      })),
    });
  }

  return {
    persona: a.work,
    totalMatched: matched.length,
    shown,
    results: grouped,
  };
}
