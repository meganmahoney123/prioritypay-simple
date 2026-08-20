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

// Each strategy gets both a match test AND a "why this is on your list"
// reason function -- the reason is written to reference what the user
// actually told us (not just restate the strategy), since a bare list of
// strategy names reads like generic content and Megan specifically wants
// each result to feel earned by the user's own answers. Reasons stay
// factual/situational ("you said X, which means Y is relevant") rather
// than prescriptive ("you should do X") to stay on the right side of the
// advice line -- see notFinancialAdviceNote per strategy for the
// professional-review caveat shown alongside each reason in the UI.
function list(bits) {
  if (bits.length === 0) return "";
  if (bits.length === 1) return bits[0];
  if (bits.length === 2) return `${bits[0]} and ${bits[1]}`;
  return `${bits.slice(0, -1).join(", ")}, and ${bits[bits.length - 1]}`;
}

const RULES = {
  "three-lenses-tax-minimization": {
    test: () => true,
    reason: () => "This framework applies no matter what you answered -- it's worth keeping in mind as you look at everything else on this list.",
  },
  "standard-vs-itemized-deductions": {
    test: (a) => a.homeowner || a.highSalt || a.charity,
    reason: (a) => {
      if (a.highSalt) return "You said you pay more than $10,000/year in state and local taxes -- one of the biggest factors in whether itemizing beats the standard deduction.";
      if (a.homeowner) return "You own a home with a mortgage -- mortgage interest is one of the main reasons itemizing can beat the standard deduction.";
      return "You give to charity regularly, which is one of the deductions that can push you past the standard deduction threshold.";
    },
  },
  "bunching-deductions-strategy": {
    test: (a) => a.homeowner || a.highSalt || a.charity,
    reason: () => "Since your itemizable expenses (mortgage, state taxes, and/or giving) may hover near the standard deduction line, timing them into alternating years could help you clear it in the years that count.",
  },
  "marginal-vs-effective-tax-rate": {
    test: (a) => incomeAtLeast(a, "150-250k"),
    reason: () => "At your income level, understanding the difference between your marginal and effective rate matters more -- especially for decisions like Roth vs. pre-tax contributions.",
  },
  "deductions-vs-credits": {
    test: (a) => a.kidsUnder18,
    reason: () => "You have dependent children under 18, which opens up child-related tax credits worth understanding alongside any deductions.",
  },
  "salt-deduction-cap": {
    test: (a) => a.highSalt || incomeAtLeast(a, "500k+"),
    reason: (a) => a.highSalt
      ? "You said you pay more than $10,000/year in state and local taxes -- the SALT cap directly limits how much of that you can actually deduct."
      : "At your income level, the SALT cap's phase-out rules are worth understanding, even if your state tax bill isn't the main issue yet.",
  },
  "tax-advantaged-account-contribution-waterfall": {
    test: (a) => a.retirement !== "not_sure_none",
    reason: () => "You're already saving for retirement in some form, so the order you fund different accounts in is worth getting right.",
  },
  "401k-basics": {
    test: (a) => a.retirement === "employer_401k_only" || a.retirement === "both_employer_and_self_employed",
    reason: () => "You said you save through an employer 401(k) -- worth understanding the mechanics, including how Roth vs. pre-tax contributions work inside it.",
  },
  "traditional-ira": {
    test: (a) => incomeAtLeast(a, "150-250k"),
    reason: () => "At your income level you may be phased out of direct Roth IRA contributions, which makes understanding Traditional vs. Roth IRA rules more relevant.",
  },
  "roth-vs-pretax-contribution-choice": {
    test: (a) => a.retirement !== "not_sure_none",
    reason: () => "Since you're actively saving for retirement, how much goes to Roth vs. pre-tax accounts is a real choice worth making deliberately, not by default.",
  },
  "roth-conversions": {
    test: (a) => incomeAtLeast(a, "150-250k") || a.age === "60_69",
    reason: (a) => a.age === "60_69"
      ? "You're in the 60-69 age range, a common window for lower-income years before required withdrawals start -- often a good time to consider Roth conversions."
      : "At your income level, Roth conversions are worth understanding for managing your lifetime tax rate, especially in any future lower-income year.",
  },
  "backdoor-roth-ira": {
    test: (a) => incomeAtLeast(a, "150-250k"),
    reason: () => "At your income level you may be phased out of contributing to a Roth IRA directly -- the backdoor Roth is the standard workaround.",
  },
  "mega-backdoor-roth-ira": {
    test: (a) => (a.work?.includes("self_employed") || a.retirement === "employer_401k_only") && incomeAtLeast(a, "250-500k"),
    reason: () => "Between your income level and your retirement setup, you may be maxing out standard retirement accounts already -- the mega backdoor Roth is the next lever, if your plan supports it.",
  },
  "solo-401k": {
    test: (a) => a.retirement === "self_employed_no_plan_yet" || a.retirement === "self_employed_has_solo401k_or_sep",
    reason: (a) => a.retirement === "self_employed_no_plan_yet"
      ? "You're self-employed and don't have a retirement plan set up yet -- a Solo 401(k) is usually the strongest option to start with."
      : "You mentioned already having a Solo 401(k) or SEP IRA -- worth confirming a Solo 401(k) specifically is still the better fit.",
  },
  "solo-401k-vs-sep-ira": {
    test: (a) => a.retirement === "self_employed_has_solo401k_or_sep",
    reason: () => "You said you already have a Solo 401(k) or SEP IRA -- worth knowing how the two actually compare, since a lot of self-employed people default into a SEP IRA without weighing the difference.",
  },
  "solo-401k-contribution-deadlines": {
    test: (a) => a.retirement === "self_employed_no_plan_yet" || a.retirement === "self_employed_has_solo401k_or_sep",
    reason: () => "Since you're self-employed and managing your own retirement plan, the setup and contribution deadlines are easy to miss and different from a W-2 401(k)'s.",
  },
  "cash-balance-plan": {
    test: (a) => incomeAtLeast(a, "250-500k") && (a.age === "40_59" || a.age === "60_69" || a.age === "70_plus"),
    reason: () => "At your income and age, a Solo 401(k) alone may not shelter as much as you could -- a cash balance plan is worth knowing about as a next step up.",
  },
  "trump-accounts": {
    test: (a) => a.kidsUnder18,
    reason: () => "You have children under 18, which makes this newer child savings account type relevant to your household.",
  },
  "self-directed-ira-asymmetric-investments": {
    test: (a) => a.equity?.includes("startup_equity_or_options") || a.equity?.includes("c_corp_founder_or_early_employee"),
    reason: () => "You hold startup equity, which often means access to early-stage investment opportunities that a self-directed IRA is built to hold.",
  },
  "hsa-overview": {
    test: (a) => a.hsa,
    reason: () => "You said you're enrolled in an HDHP with an HSA -- worth understanding the full triple-tax-advantage this account offers beyond just paying medical bills.",
  },
  "hsa-pay-and-reimburse-strategy": {
    test: (a) => a.hsa,
    reason: () => "Since you have an HSA, there's a lesser-known way to grow it faster: paying medical costs out of pocket now and reimbursing yourself later, instead of spending straight from the account.",
  },
  "529-plan-basics": {
    test: (a) => a.kidsUnder18 || a.planningEducation,
    reason: () => "You mentioned kids and/or saving for education costs -- a 529 plan is the primary tax-advantaged way to do that.",
  },
  "529-superfunding-and-state-shopping": {
    test: (a) => a.planningEducation && incomeAtLeast(a, "250-500k"),
    reason: () => "At your income level, front-loading several years of 529 contributions at once -- and shopping across state plans -- could be worth more to you than it is to a typical contributor.",
  },
  "529-to-roth-ira-rollover": {
    test: (a) => a.planningEducation || a.kidsUnder18,
    reason: () => "If a 529 you set up ends up with leftover money after education is paid for, this newer rule lets you convert some of it into the beneficiary's retirement savings instead.",
  },
  "other-education-savings-accounts": {
    test: (a) => a.planningEducation,
    reason: () => "Since you're planning for education costs, it's worth knowing about smaller-scale alternatives to a 529 too.",
  },
  "hire-your-spouse-for-retirement-doubling": {
    test: (a) => (a.work?.includes("self_employed") || a.work?.includes("business_owner")) && a.nonworkingSpouse,
    reason: () => "You're running your own business and mentioned a spouse with little or no earned income -- putting them on payroll for real work can effectively double your household's retirement contribution room.",
  },
  "hire-your-kids-for-tax-savings": {
    test: (a) => (a.work?.includes("self_employed") || a.work?.includes("business_owner")) && (a.kidsUnder18 || a.biz?.includes("employs_spouse_or_kids")),
    reason: () => "You mentioned your kids do (or could do) real work for the business -- hiring them can shift income from your tax bracket to their much lower one.",
  },
  "custodial-roth-ira-for-working-minors": {
    test: (a) => a.kidsUnder18,
    reason: () => "If your kids have any earned income -- including from your own business -- a custodial Roth IRA gives them decades of extra compounding time.",
  },
  "spousal-roth-ira-for-nonworking-spouse": {
    test: (a) => a.nonworkingSpouse,
    reason: () => "You mentioned a spouse with little or no earned income -- they can still have their own Roth IRA, funded from your joint household income.",
  },
  "tax-loss-harvesting": {
    test: (a) => a.brokerage,
    reason: () => "You invest through a taxable brokerage account -- tax-loss harvesting is one of the higher-value, lower-effort strategies available there.",
  },
  "wash-sale-rule": {
    test: (a) => a.brokerage,
    reason: () => "If you ever harvest losses in your taxable brokerage account, this rule is what determines whether that loss actually counts.",
  },
  "direct-indexing": {
    test: (a) => a.brokerage && incomeAtLeast(a, "250-500k"),
    reason: () => "At your income level, with a taxable brokerage account, direct indexing can extract more tax-loss-harvesting value than a regular index fund does.",
  },
  "qualified-opportunity-zones": {
    test: (a) => a.life?.includes("planning_to_sell_business_or_appreciated_asset"),
    reason: () => "You mentioned planning to sell a business, real estate, or a highly appreciated investment -- opportunity zones are one way to defer, and potentially reduce, the resulting gain.",
  },
  "money-market-fund-tax-equivalent-yield": {
    test: (a) => incomeAtLeast(a, "150-250k"),
    reason: () => "At your income level, comparing money market funds on a tax-equivalent basis -- not just the headline yield -- can meaningfully change which one actually pays you more.",
  },
  "charitable-giving-basics-agi-caps": {
    test: (a) => a.charity,
    reason: () => "You said you give to charity regularly -- worth knowing the AGI limits and the itemizing requirement that determine whether that giving actually reduces your taxes.",
  },
  "donating-appreciated-assets": {
    test: (a) => a.appreciatedStock || (a.brokerage && a.charity),
    reason: () => "Between your brokerage account and charitable giving, donating appreciated stock directly -- instead of selling and donating cash -- could save you real money on capital gains.",
  },
  "donor-advised-funds": {
    test: (a) => a.charity && (a.highSalt || incomeAtLeast(a, "250-500k")),
    reason: () => "Given your giving and your tax situation, a donor-advised fund could let you lock in a deduction now while deciding which charities get the money later.",
  },
  "qualified-charitable-distributions": {
    test: (a) => a.age === "70_plus",
    reason: () => "You're 70 or older -- if you hold a Traditional IRA, a qualified charitable distribution lets you give to charity directly from it without it counting as taxable income.",
  },
  "charitable-law-changes-2026": {
    test: (a) => a.charity && incomeAtLeast(a, "250-500k"),
    reason: () => "Given your income and your giving, a law change taking effect in 2026 could affect how much a large gift near that boundary is worth to you.",
  },
  "private-foundations": {
    test: (a) => incomeAtLeast(a, "500k+") && a.life?.includes("building_estate_legacy_plan"),
    reason: () => "Between your income level and your interest in estate/legacy planning, a private foundation is a structure worth being aware of, even if it's not the right fit yet.",
  },
  "charitable-remainder-lead-trusts": {
    test: (a) => a.life?.includes("building_estate_legacy_plan") && (incomeAtLeast(a, "500k+") || a.life?.includes("planning_to_sell_business_or_appreciated_asset")),
    reason: () => "Given your estate planning interest and situation, charitable remainder/lead trusts combine an income stream or an eventual gift with a charitable legacy.",
  },
  "home-office-deduction": {
    test: (a) => a.biz?.includes("home_office"),
    reason: () => "You said you use a dedicated home office regularly for the business -- this is one of the most direct deductions available to you that W-2 employees don't get.",
  },
  "business-travel-deductions": {
    test: (a) => a.biz?.includes("business_travel"),
    reason: () => "You mentioned traveling for client meetings or business development -- those trips have real deductibility rules worth knowing precisely.",
  },
  "conference-and-professional-development-expenses": {
    test: (a) => a.biz?.includes("conferences_prof_dev"),
    reason: () => "You attend conferences or professional development events -- these are generally deductible business expenses.",
  },
  "equipment-technology-deductions": {
    test: (a) => a.biz?.includes("equipment_tech_purchases"),
    reason: () => "You buy equipment, software, or technology for the business -- how you deduct these (immediately vs. depreciated over time) affects your timing.",
  },
  "professional-services-deductions": {
    test: (a) => a.biz?.includes("professional_services"),
    reason: () => "You pay for accounting, legal, or consulting services -- these are deductible business expenses worth tracking properly.",
  },
  "marketing-advertising-deductions": {
    test: (a) => a.biz?.includes("marketing_advertising"),
    reason: () => "You spend on marketing or advertising -- this is a straightforward deductible business expense.",
  },
  "augusta-rule": {
    test: (a) => (a.work?.includes("business_owner") || a.work?.includes("self_employed")) && (a.biz?.includes("conferences_prof_dev") || a.biz?.includes("marketing_advertising") || a.homeowner),
    reason: () => "Between running a business and having a home that could host a meeting or planning session, the Augusta Rule lets you rent your home to your own business for up to 14 days a year, completely tax-free to you.",
  },
  "business-credit-card-points-strategy": {
    test: (a) => a.biz?.includes("business_credit_card"),
    reason: () => "You use a business credit card and pay it off in full monthly -- worth knowing how points and rewards actually interact with your deductions.",
  },
  "bonus-depreciation-cost-segregation": {
    test: (a) => a.biz?.includes("owns_business_real_estate"),
    reason: () => "You mentioned the business owns or is buying real estate or major equipment -- bonus depreciation lets you write off a large share of that cost immediately instead of over years.",
  },
  "real-estate-depreciation-offset-active-income": {
    test: (a) => a.biz?.includes("owns_business_real_estate") || a.nonworkingSpouse,
    reason: (a) => a.biz?.includes("owns_business_real_estate")
      ? "Since the business owns or is buying real estate, depreciation from it can potentially offset other income under the right conditions."
      : "You mentioned a spouse with little or no earned income -- if that fits, real estate professional status is one way depreciation losses could offset your active income.",
  },
  "s-corp-election": {
    test: (a) => (a.work?.includes("self_employed") || a.structure === "sole_prop_or_single_member_llc") && incomeAtLeast(a, "75-150k"),
    reason: () => "You're self-employed with income in the range where S-corp election commonly starts to make sense -- it can meaningfully cut your self-employment tax.",
  },
  "reasonable-w2-salary-optimization": {
    test: (a) => a.structure === "s_corp_election",
    reason: () => "You said you've already elected S-corp status -- how you set your W-2 salary vs. distributions directly affects your taxes and your retirement contribution room.",
  },
  "qbi-section-199a-deduction": {
    test: (a) => (a.work?.includes("self_employed") || a.work?.includes("business_owner")) && incomeAtLeast(a, "150-250k"),
    reason: () => "At your income and business setup, the QBI deduction -- up to 20% of business income -- is worth understanding, including where the phase-out actually starts.",
  },
  "ptet-election": {
    test: (a) => (a.structure === "s_corp_election" || a.structure === "partnership_multi_member") && a.highSalt,
    reason: () => "You run an S-corp or partnership and pay significant state taxes -- the PTET election is a SALT-cap workaround only available to entity owners like you.",
  },
  "sticky-states-domicile-planning": {
    test: (a) => a.life?.includes("recently_moved_states") || a.life?.includes("living_or_working_abroad"),
    reason: () => "You mentioned a move (or considering one) -- some states are aggressive about still treating you as a resident even after you've left.",
  },
  "foreign-earned-income-exclusion": {
    test: (a) => a.life?.includes("living_or_working_abroad"),
    reason: () => "You're living or working outside the U.S. -- the foreign earned income exclusion can shield a meaningful chunk of that income from U.S. tax.",
  },
  "foreign-tax-credit": {
    test: (a) => a.life?.includes("living_or_working_abroad"),
    reason: () => "Since you're living or working abroad, any foreign tax you pay may be offsettable against your U.S. bill through the foreign tax credit.",
  },
  "fbar-fatca-international-reporting": {
    test: (a) => a.life?.includes("foreign_bank_accounts") || a.life?.includes("living_or_working_abroad"),
    reason: () => "You mentioned foreign accounts or living abroad -- these come with reporting requirements that carry serious penalties if missed, separate from any tax actually owed.",
  },
  "expat-self-employment-tax-mitigation": {
    test: (a) => a.work?.includes("self_employed") && a.life?.includes("living_or_working_abroad"),
    reason: () => "You're self-employed and living abroad -- a common surprise is that the foreign earned income exclusion doesn't exempt you from self-employment tax the way it does income tax.",
  },
  "startup-equity-valuation-basics": {
    test: (a) => a.equity?.includes("startup_equity_or_options"),
    reason: () => "You hold startup equity -- understanding how it's actually valued matters for every decision that follows from it.",
  },
  "equity-vesting-and-ownership-percentage": {
    test: (a) => a.equity?.includes("startup_equity_or_options"),
    reason: () => "Since you hold startup equity, knowing your real vesting schedule and ownership percentage is the foundation for evaluating what it's actually worth.",
  },
  "liquidation-preference": {
    test: (a) => a.equity?.includes("startup_equity_or_options"),
    reason: () => "You hold startup equity -- liquidation preferences can mean your shares are worth far less in an exit than the headline valuation suggests.",
  },
  "post-termination-exercise-period": {
    test: (a) => a.equity?.includes("startup_equity_or_options"),
    reason: () => "If you ever leave the company, the post-termination exercise window determines whether you get to keep your vested options at all.",
  },
  "qsbs-overview": {
    test: (a) => a.equity?.includes("c_corp_founder_or_early_employee"),
    reason: () => "You're a founder, early employee, or investor holding C-corp stock -- QSBS can make a large share of an eventual gain completely tax-free.",
  },
  "qsbs-requirements": {
    test: (a) => a.equity?.includes("c_corp_founder_or_early_employee"),
    reason: () => "Since you hold C-corp stock, it's worth confirming your company actually still qualifies for QSBS treatment before you count on it.",
  },
  "qsbs-rollover-1045": {
    test: (a) => a.equity?.includes("c_corp_founder_or_early_employee") && a.life?.includes("planning_to_sell_business_or_appreciated_asset"),
    reason: () => "You mentioned planning to sell, and you hold C-corp stock -- if it's before your 5-year QSBS mark, a Section 1045 rollover can preserve the exclusion.",
  },
  "qsbs-stacking-gifting": {
    test: (a) => a.equity?.includes("c_corp_founder_or_early_employee") && a.life?.includes("building_estate_legacy_plan"),
    reason: () => "Between your equity and your interest in estate planning, gifting QSBS shares to family members can multiply your tax-free exclusion.",
  },
  "qsbs-stacking-trusts": {
    test: (a) => a.equity?.includes("c_corp_founder_or_early_employee") && a.life?.includes("building_estate_legacy_plan") && incomeAtLeast(a, "500k+"),
    reason: () => "Given your equity, income, and estate planning interest, trusts can be combined with QSBS to multiply the exclusion even further.",
  },
  "obbba-tax-rates-and-corporate-rate-permanent": {
    test: (a) => a.life?.includes("expecting_high_income_year"),
    reason: () => "You're expecting a much higher income year than usual -- knowing that current tax brackets are now permanent, not set to expire, matters for how you plan around it.",
  },
  "obbba-qsbs-expansion": {
    test: (a) => a.equity?.includes("c_corp_founder_or_early_employee"),
    reason: () => "Since you hold C-corp stock, a recent law change expanded QSBS eligibility and benefits in ways worth knowing about.",
  },
  "obbba-bonus-depreciation-restored": {
    test: (a) => a.biz?.includes("owns_business_real_estate") || a.biz?.includes("equipment_tech_purchases"),
    reason: () => "Given your business's equipment or real estate purchases, 100% bonus depreciation was restored -- timing purchases around this matters.",
  },
  "obbba-software-rd-amortization-relief": {
    test: (a) => a.work?.includes("business_owner"),
    reason: () => "As a business owner, if you employ software developers or R&D staff, a recent law change reversed a costly amortization requirement that was hitting businesses like yours.",
  },
  "obbba-gift-estate-tax-exemption-increase": {
    test: (a) => a.life?.includes("building_estate_legacy_plan") && incomeAtLeast(a, "500k+"),
    reason: () => "Given your income range and interest in estate planning, the gift/estate tax exemption increased significantly under recent legislation.",
  },
  "obbba-qbi-deduction-permanence": {
    test: (a) => a.work?.includes("self_employed") || a.work?.includes("business_owner"),
    reason: () => "As a pass-through business owner, it's worth knowing the QBI deduction is now permanent rather than set to expire, which changes how far out you can plan around it.",
  },
  "obbba-trump-accounts-law-change": {
    test: (a) => a.kidsUnder18,
    reason: () => "You have kids under 18 -- recent legislation created an entirely new savings account type for them worth knowing about.",
  },
  "obbba-opportunity-zone-permanence": {
    test: (a) => a.life?.includes("planning_to_sell_business_or_appreciated_asset"),
    reason: () => "Since you're considering an opportunity zone investment for a gain, recent legislation made the program permanent going forward instead of sunsetting it.",
  },
  "obbba-gambling-loss-deduction-change": {
    test: () => false,
    reason: () => "",
  },
  "obbba-salt-cap-increase-to-40k": {
    test: (a) => a.highSalt && !incomeAtLeast(a, "500k+"),
    reason: () => "You pay significant state and local taxes and your income is under the phase-out range -- the SALT cap increase to $40,000 is likely to directly help you.",
  },
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
    const rule = RULES[s.id];
    if (!rule) return false;
    try {
      return !!rule.test(a);
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
      strategies: inCategory.map((s) => {
        let reason = "";
        try {
          reason = RULES[s.id].reason(a) || "";
        } catch {
          reason = "";
        }
        return {
          id: s.id,
          title: s.title,
          reason,
          summary: s.summary,
          // First clarifying question doubles as the "how to look into
          // this" next step -- phrased as something to go figure out
          // rather than an instruction to act, so this stays informational
          // rather than prescriptive.
          nextStep: s.clarifyingQuestions?.[0] || null,
          notFinancialAdviceNote: s.notFinancialAdviceNote,
        };
      }),
    });
  }

  return {
    persona: a.work,
    totalMatched: matched.length,
    shown,
    results: grouped,
  };
}
