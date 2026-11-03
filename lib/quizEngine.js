// Tax Savings Quiz: deterministic, rule-based matching against the curated
// PrioritySave tax strategy library (lib/advisorKnowledge.js). No LLM calls,
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
// equal precision. A handful of very narrow entries (e.g. professional
// gambler reporting, QSBS stacking via trusts) are gated behind broader life
// event flags and will only surface for users who flag genuinely adjacent
// situations. That's fine: this is a discovery tool, not a chat interface.

import { TAX_STRATEGIES } from "@/lib/advisorKnowledge";
import { taxFacts, scorpSavings, qbiSavings } from "@/lib/quizNumbers";

// Action-style headings. The knowledge base keeps topic names; the quiz shows what to do.
const ACTION_TITLES = {
  "tax-advantaged-account-contribution-waterfall": "Fund your accounts in the right order",
  "401k-basics": "Raise your 401(k) contributions to get the full match",
  "traditional-ira": "Fund a Traditional or Roth IRA every year",
  "roth-vs-pretax-contribution-choice": "Choose Roth or pre-tax based on your tax bracket",
  "roth-conversions": "Convert pre-tax money to Roth in low-income years",
  "backdoor-roth-ira": "Use a backdoor Roth IRA to get money into Roth",
  "sep-and-solo-401k-cleanup": "Stop funding your SEP-IRA to free up Solo 401(k) room",
  "consolidate-old-retirement-accounts": "Roll old retirement accounts into one account",
  "mega-backdoor-roth-ira": "Use the mega backdoor Roth to add more to Roth",
  "solo-401k": "Open a Solo 401(k) and max it out",
  "solo-401k-contribution-deadlines": "Sign your Solo 401(k) election by December 31",
  "cash-balance-plan": "Add a cash balance plan to deduct much more",
  "trump-accounts": "Open a Trump Account for your child",
  "self-directed-ira-asymmetric-investments": "Use a self-directed IRA for high-upside investments",
  "hsa-overview": "Max out your HSA and invest it",
  "hsa-pay-and-reimburse-strategy": "Pay medical bills out of pocket and reimburse yourself from your HSA later",
  "529-plan-basics": "Start a 529 plan for education savings",
  "529-superfunding-and-state-shopping": "Superfund a 529 plan and pick the best state plan",
  "529-to-roth-ira-rollover": "Roll leftover 529 money into a Roth IRA",
  "other-education-savings-accounts": "Use a Coverdell ESA or ABLE account where it fits",
  "hire-your-spouse-for-retirement-doubling": "Hire your spouse to double your retirement contributions",
  "hire-your-kids-for-tax-savings": "Hire your kids for real business work",
  "custodial-roth-ira-for-working-minors": "Open a custodial Roth IRA for your working child",
  "spousal-roth-ira-for-nonworking-spouse": "Fund a spousal Roth IRA for your non-working spouse",
  "tax-loss-harvesting": "Harvest investment losses to cut your tax bill",
  "wash-sale-rule": "Avoid wash sales when you harvest losses",
  "direct-indexing": "Use direct indexing to harvest more losses",
  "qualified-opportunity-zones": "Defer capital gains in a Qualified Opportunity Zone",
  "money-market-fund-tax-equivalent-yield": "Move cash into a tax-advantaged money market fund",
  "charitable-giving-basics-agi-caps": "Time your gifts to stay within charitable deduction limits",
  "donating-appreciated-assets": "Donate appreciated stock instead of cash",
  "donor-advised-funds": "Bunch your giving into a donor-advised fund",
  "qualified-charitable-distributions": "Give from your IRA with a qualified charitable distribution",
  "charitable-law-changes-2026": "Adjust your giving for the 2026 charitable deduction changes",
  "private-foundations": "Set up a private foundation for large-scale giving",
  "charitable-remainder-lead-trusts": "Use a charitable trust to give and keep income",
  "home-office-deduction": "Claim the home office deduction",
  "business-travel-deductions": "Deduct your business travel",
  "conference-and-professional-development-expenses": "Deduct conferences and professional development",
  "equipment-technology-deductions": "Deduct equipment and software purchases",
  "professional-services-deductions": "Deduct accounting, legal and consulting fees",
  "marketing-advertising-deductions": "Deduct marketing and advertising costs",
  "self-employed-health-insurance-deduction": "Deduct your health insurance premiums",
  "estimated-taxes-safe-harbor": "Pay quarterly estimated taxes using the safe harbor",
  "vehicle-mileage-deduction": "Deduct your business mileage",
  "rental-real-estate-basics": "Track rental deductions and depreciation",
  "family-tax-credits": "Claim every family tax credit you qualify for",
  "obbba-tips-overtime-senior-deductions": "Claim the new tips, overtime and senior deductions",
  "crypto-and-capital-gains": "Track crypto gains and harvest losses",
  "section-83b-election": "File an 83(b) election within 30 days of getting stock",
  "w2-withholding-checkup": "Adjust your W-4 withholding",
  "fsa-and-commuter-benefits": "Pay with pre-tax dollars through FSA and commuter benefits",
  "rsu-espp-basics": "Plan the tax on your RSUs and ESPP shares",
  "student-loan-and-education-tax-benefits": "Claim your student loan and education tax benefits",
  "employer-retirement-plan-options": "Set up an employer retirement plan",
  "employer-health-insurance-credit": "Claim the small employer health insurance credit",
  "employer-child-care-and-leave-credits": "Claim the employer child care and paid leave credits",
  "employer-education-assistance-and-hiring-credits": "Offer education assistance and claim hiring credits",
  "accountable-plan-reimbursements": "Set up an accountable plan to reimburse expenses tax-free",
  "retiree-roth-conversion-window": "Convert to Roth in your low-income early retirement years",
  "required-minimum-distributions": "Plan your required minimum distributions",
  "social-security-taxation-planning": "Plan withdrawals to cut tax on Social Security",
  "medicare-irmaa-planning": "Manage your income to avoid Medicare IRMAA surcharges",
  "retiree-withdrawal-order-and-zero-percent-gains": "Use the 0% capital gains bracket in retirement",
  "retiree-medical-and-hsa-tax-tips": "Use your HSA for medical and long-term care costs",
  "state-taxes-on-retirement-income": "Check state taxes on your retirement income",
  "inherited-ira-and-legacy-planning": "Set up your accounts so heirs pay less tax",
  "augusta-rule": "Rent your home to your business for up to 14 days",
  "business-credit-card-points-strategy": "Put business spending on a card that earns points",
  "bonus-depreciation-cost-segregation": "Use bonus depreciation and a cost segregation study",
  "real-estate-depreciation-offset-active-income": "Use real estate depreciation to offset active income",
  "s-corp-election": "Elect S-corp status to cut self-employment tax",
  "reasonable-w2-salary-optimization": "Set your S-corp salary at the right level",
  "qbi-section-199a-deduction": "Claim the 20% QBI deduction",
  "ptet-election": "Elect pass-through entity tax to work around the SALT cap",
  "sticky-states-domicile-planning": "Plan your state residency to cut state tax",
  "foreign-earned-income-exclusion": "Claim the Foreign Earned Income Exclusion",
  "foreign-tax-credit": "Claim the Foreign Tax Credit",
  "fbar-fatca-international-reporting": "File FBAR and FATCA reports for foreign accounts",
  "expat-self-employment-tax-mitigation": "Reduce self-employment tax while working abroad",
  "startup-equity-valuation-basics": "Value your startup equity before you decide",
  "equity-vesting-and-ownership-percentage": "Check your vesting schedule and ownership percentage",
  "liquidation-preference": "Check the liquidation preference before you count on a payout",
  "post-termination-exercise-period": "Exercise options before the post-termination deadline",
  "qsbs-overview": "Use the QSBS exclusion to avoid tax on a stock sale",
  "qsbs-requirements": "Confirm your stock qualifies for QSBS",
  "qsbs-rollover-1045": "Roll QSBS gains into new stock under Section 1045",
  "qsbs-stacking-gifting": "Gift QSBS shares to multiply the exclusion",
  "qsbs-stacking-trusts": "Use trusts to multiply the QSBS exclusion",
  "obbba-tax-rates-and-corporate-rate-permanent": "Plan around the permanent lower tax rates",
  "obbba-qsbs-expansion": "Use the expanded QSBS exclusion",
  "obbba-bonus-depreciation-restored": "Use the restored 100% bonus depreciation",
  "obbba-software-rd-amortization-relief": "Deduct software and R&D costs immediately",
  "obbba-gift-estate-tax-exemption-increase": "Use the higher gift and estate tax exemption",
  "obbba-qbi-deduction-permanence": "Plan around the permanent QBI deduction",
  "obbba-trump-accounts-law-change": "Set up the new Trump Account for your child",
  "obbba-opportunity-zone-permanence": "Use the permanent Opportunity Zone program",
  "obbba-gambling-loss-deduction-change": "Plan around the reduced gambling loss deduction",
  "catch-up-contributions-50-plus": "Add your catch-up contributions if you are 50 or older",
  "savers-credit": "Claim the Saver's Credit on your retirement contributions",
  "niit-additional-medicare-planning": "Cut your investment income that the 3.8% Medicare surtax hits",
  "social-security-claiming-age": "Choose your Social Security claiming age on purpose",
  "early-retirement-penalty-free-access": "Know the penalty-free ways to tap retirement money before 59 and a half",
  "net-unrealized-appreciation": "Ask about net unrealized appreciation before rolling over company stock",
  "multiple-entity-structure-review": "Ask whether each of your businesses is set up the right way",
  "startup-costs-deduction": "Deduct your startup and organization costs in year one",
  "rd-tax-credit": "Claim the research and development credit",
  "small-employer-retirement-startup-credit": "Start a retirement plan for your employees and claim the startup credit",
  "ichra-qsehra-health-reimbursement": "Ask about reimbursing employees' health insurance tax-free",
  "business-sale-planning": "Plan the structure of your business sale now",
  "accounting-method-and-inventory": "Review your accounting method and inventory deductions",
  "obbba-salt-cap-increase-to-40k": "Itemize if your state and local taxes fit under the $40,000 cap"
};

export const QUIZ_QUESTIONS = [
  {
    id: "work",
    prompt: "Which of these describes your work? Select all that apply. If you have more than one business (even with different structures), or a job on top of your own work, select every option that fits.",
    type: "multi",
    options: [
      { value: "self_employed", label: "I work for myself (freelance, 1099, or a solo business), with or without an LLC" },
      { value: "business_owner", label: "I own a business with full-time employees or business partners" },
      { value: "w2", label: "I have a W-2 job" },
      { value: "retired", label: "I'm retired or semi-retired" },
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
      { value: "mfs", label: "Married filing separately" },
      { value: "qss", label: "Qualifying surviving spouse" },
    ],
  },
  {
    id: "bizType",
    prompt: "What kind of business do you run? Select all that apply if you have more than one.",
    type: "multi",
    showIf: (a) => a.work?.includes("business_owner"),
    options: [
      { value: "professional", label: "Professional or personal services (consulting, legal, accounting, medical, coaching, financial advice, performing arts)" },
      { value: "creative_online", label: "Creator, media or online business" },
      { value: "products", label: "Sells products (e-commerce, retail, manufacturing, food or restaurant)" },
      { value: "trades", label: "Construction, trades or contracting" },
      { value: "real_estate", label: "Real estate (rentals, flipping, brokerage, property management)" },
      { value: "tech", label: "Software, technology or research and development" },
      { value: "other", label: "Something else" },
    ],
  },
  {
    id: "ownership",
    prompt: "Who owns the business? If you have more than one, answer for the largest.",
    type: "single",
    showIf: (a) => a.work?.includes("business_owner"),
    options: [
      { value: "solo_owner", label: "Just me (with employees)" },
      { value: "with_spouse", label: "Me and my spouse" },
      { value: "with_partners", label: "Me and one or more business partners" },
      { value: "with_investors", label: "Me, partners and outside investors" },
    ],
  },
  {
    id: "bizProfit",
    prompt: "Roughly what does the business earn in profit each year, before you pay yourself? If you have more than one, add them together.",
    type: "single",
    showIf: (a) => a.work?.includes("business_owner"),
    options: [
      { value: "loss", label: "It loses money or breaks even" },
      { value: "under_100k", label: "Under $100,000" },
      { value: "100_250k", label: "$100,000 to $250,000" },
      { value: "250_500k", label: "$250,000 to $500,000" },
      { value: "500k_1m", label: "$500,000 to $1 million" },
      { value: "over_1m", label: "Over $1 million" },
    ],
  },
  {
    id: "bizStage",
    prompt: "Where is the business right now?",
    type: "single",
    showIf: (a) => a.work?.includes("business_owner"),
    options: [
      { value: "startup", label: "New: started in the last two years, or not open yet" },
      { value: "established", label: "Established and steady" },
      { value: "growing", label: "Growing: hiring, expanding or raising money" },
      { value: "exit", label: "Planning to sell it or hand it off within about five years" },
    ],
  },
  {
    id: "staffSize",
    prompt: "How many employees do you have, not counting yourself? If you have more than one business, count them all.",
    type: "single",
    showIf: (a) => a.work?.includes("business_owner"),
    options: [
      { value: "none", label: "None yet (only partners or contractors)" },
      { value: "1_4", label: "1 to 4" },
      { value: "5_19", label: "5 to 19" },
      { value: "20_49", label: "20 to 49" },
      { value: "50_plus", label: "50 or more" },
    ],
  },
  {
    id: "ownerPay",
    prompt: "How do you pay yourself from the business?",
    type: "single",
    showIf: (a) => a.work?.includes("business_owner"),
    options: [
      { value: "w2_salary", label: "A W-2 salary through payroll" },
      { value: "draws", label: "Owner draws or distributions only (no payroll for me)" },
      { value: "guaranteed", label: "Guaranteed payments as a partner" },
      { value: "mixed", label: "A mix of salary and distributions" },
      { value: "not_sure", label: "Not sure" },
    ],
  },
  {
    id: "purchases",
    prompt: "Which of these has the business bought or will buy in the next year or two? Select all that apply.",
    type: "multi",
    showIf: (a) => a.work?.includes("business_owner"),
    options: [
      { value: "heavy_vehicle", label: "A truck, van or SUV over 6,000 pounds" },
      { value: "equipment", label: "Equipment, machinery, computers or furniture" },
      { value: "building", label: "A building or land" },
      { value: "improvements", label: "Improvements to a building or leased space" },
      { value: "none", label: "None of these" },
    ],
  },
  {
    id: "bizSpecial",
    prompt: "Which of these describe the business? Select all that apply.",
    type: "multi",
    showIf: (a) => a.work?.includes("business_owner"),
    options: [
      { value: "rd", label: "We build or improve software, products or processes (research and development)" },
      { value: "inventory", label: "We hold inventory" },
      { value: "contractors", label: "We rely heavily on 1099 contractors" },
      { value: "multi_state", label: "We have employees or sales in more than one state" },
      { value: "debt", label: "We have business loans or a line of credit" },
      { value: "ip", label: "We own patents, trademarks or other valuable intellectual property" },
      { value: "none", label: "None of these" },
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
      { value: "education_debt_or_tuition", label: "I have student loans or I'm paying college tuition" },
      { value: "pays_childcare", label: "I pay for childcare or dependent care so I can work" },
      { value: "none", label: "None of these" },
    ],
  },
  {
    id: "retirement",
    prompt: "Which of these retirement accounts do you have? Select all that apply. Include accounts from past jobs.",
    type: "multi",
    showIf: (a) => !a.work?.every((w) => w === "retired"),
    options: [
      { value: "employer_401k", label: "401(k) or 403(b) through my current employer" },
      { value: "solo_401k", label: "Solo 401(k) (also called an individual 401(k))" },
      { value: "sep_ira", label: "SEP-IRA" },
      { value: "simple_ira", label: "SIMPLE IRA" },
      { value: "traditional_ira", label: "Traditional IRA" },
      { value: "roth_ira", label: "Roth IRA" },
      { value: "old_401k", label: "401(k) or 403(b) from a past employer" },
      { value: "pension_or_cash_balance", label: "A pension or cash balance plan" },
      { value: "unsure_more", label: "I may have other accounts I'm not sure about (for example from past jobs)" },
      { value: "none", label: "None of these, no retirement savings yet" },
    ],
  },
  {
    id: "hsaStatus",
    prompt: "Do you have a high-deductible health plan (HDHP) or an HSA? Your insurance card or plan summary often says \"HDHP\" or \"HSA-eligible.\"",
    type: "single",
    options: [
      { value: "has_hsa", label: "Yes, I have an HSA (health savings account)" },
      { value: "hdhp_no_hsa", label: "I have a high-deductible plan but no HSA yet" },
      { value: "not_sure", label: "I'm not sure what kind of plan I have" },
      { value: "no", label: "No" },
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
      { value: "owns_rental_property", label: "I own rental property (long-term or short-term)" },
      { value: "owns_crypto", label: "I own or trade crypto" },
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
      { value: "drives_for_business", label: "I drive my own vehicle for business" },
      { value: "has_employees_or_contractors", label: "I have employees or pay contractors" },
      { value: "none", label: "None of these" },
    ],
  },
  {
    id: "structure",
    prompt: "How is your business set up today?",
    type: "single",
    showIf: (a) => a.work?.includes("self_employed") || a.work?.includes("business_owner"),
    options: [
      { value: "sole_prop_or_single_member_llc", label: "Just me: sole proprietor, or a single-member LLC with no S-corp election" },
      { value: "s_corp_election", label: "S-corp election" },
      { value: "c_corp", label: "C-corp" },
      { value: "partnership_multi_member", label: "Partnership / multi-member LLC" },
      { value: "not_sure", label: "Not sure" },
    ],
  },
  {
    id: "entities",
    prompt: "Do you run more than one business or entity?",
    type: "single",
    showIf: (a) => a.work?.includes("self_employed") || a.work?.includes("business_owner"),
    options: [
      { value: "one", label: "No, just one business" },
      { value: "multiple", label: "Yes, more than one (separate businesses, LLCs or corporations)" },
      { value: "not_sure", label: "Not sure" },
    ],
  },
  {
    id: "retiredIncome",
    prompt: "Which of these apply to your retirement? Select all that apply.",
    type: "multi",
    showIf: (a) => a.work?.includes("retired"),
    options: [
      { value: "takes_social_security", label: "I take Social Security (or will soon)" },
      { value: "has_pension", label: "I get a pension" },
      { value: "withdraws_pretax", label: "I have a traditional IRA or 401(k) I draw from or will draw from" },
      { value: "has_roth", label: "I have Roth accounts" },
      { value: "rmd_age", label: "I'm 73 or older, or close to it (required distributions)" },
      { value: "on_medicare", label: "I'm on Medicare or about to be" },
      { value: "leaving_to_heirs", label: "I want to leave money to children or other heirs" },
      { value: "considering_move", label: "I'm thinking about moving to a different state" },
      { value: "none", label: "None of these" },
    ],
  },
  {
    id: "workBenefits",
    prompt: "Which of these apply to your job? Select all that apply.",
    type: "multi",
    showIf: (a) => a.work?.includes("w2"),
    options: [
      { value: "fsa_available", label: "My employer offers a health or dependent care FSA" },
      { value: "commuter", label: "I pay for transit or parking to get to work" },
      { value: "rsu_espp", label: "I get RSUs, an employee stock purchase plan, or stock options" },
      { value: "unsure_withholding", label: "I'm not sure my tax withholding is set right" },
      { value: "none", label: "None of these" },
    ],
  },
  {
    id: "employerSituation",
    prompt: "Which of these apply to your employees and payroll? Select all that apply.",
    type: "multi",
    showIf: (a) => a.work?.includes("business_owner"),
    options: [
      { value: "no_employee_retirement_plan", label: "I don't offer my employees a retirement plan" },
      { value: "offers_health_insurance", label: "I pay part of my employees' health insurance" },
      { value: "offers_family_benefits", label: "I offer child care help or paid family leave" },
      { value: "hires_or_offers_perks", label: "I hire often, or I'd like to offer perks like tuition help" },
      { value: "reimburses_expenses", label: "My employees or I pay business costs personally and get paid back" },
      { value: "none", label: "None of these" },
    ],
  },
  {
    id: "healthInsurance",
    prompt: "How do you get health insurance?",
    type: "single",
    showIf: (a) => a.work?.includes("self_employed") || a.work?.includes("business_owner"),
    options: [
      { value: "self_pays", label: "I buy my own plan (not through an employer or a spouse's job)" },
      { value: "employer_or_spouse", label: "Through an employer or my spouse's employer" },
      { value: "other_or_none", label: "Something else, or I don't have coverage" },
    ],
  },
  {
    id: "estimatedTaxes",
    prompt: "How do you pay tax on your self-employment income?",
    type: "single",
    showIf: (a) => a.work?.includes("self_employed") || a.work?.includes("business_owner"),
    options: [
      { value: "quarterly", label: "I make quarterly estimated tax payments" },
      { value: "annual_or_unsure", label: "I pay when I file, or I'm not sure" },
      { value: "withholding", label: "Mostly through withholding at a W-2 job" },
    ],
  },
  {
    id: "incomeYear",
    prompt: "Compared with a typical year for you, is your income this year higher or lower?",
    type: "single",
    showIf: (a) => a.work?.includes("self_employed") || a.work?.includes("business_owner"),
    options: [
      { value: "higher", label: "Higher than usual" },
      { value: "lower", label: "Lower than usual" },
      { value: "same", label: "About the same" },
      { value: "not_sure", label: "I'm not sure yet" },
    ],
  },
  {
    id: "equity",
    prompt: "Do you hold stock or options in a startup or other private company? Select all that apply.",
    type: "multi",
    showIf: (a) => !a.work?.every((w) => w === "retired"),
    options: [
      { value: "startup_equity_or_options", label: "I have stock options or equity as an employee of a startup or private company" },
      { value: "c_corp_founder_or_early_employee", label: "I own shares of a C-corporation, such as a startup I started, work for or invested in (running your own LLC or S-corp doesn't count)" },
      { value: "none", label: "Neither, or I'm not sure" },
    ],
  },
  {
    id: "life",
    prompt: "Do any of these apply to your situation right now? Select all that apply.",
    type: "multi",
    options: [
      { value: "recently_moved_states", label: "Recently moved states, or considering a move" },
      { value: "tips_or_overtime", label: "I earn tips or overtime pay" },
      { value: "expecting_high_income_year", label: "Expecting a much higher income year than usual (bonus, sale, exit)" },
      { value: "planning_to_sell_business_or_appreciated_asset", label: "Planning to sell a business, real estate, or a highly appreciated investment" },
      { value: "living_or_working_abroad", label: "Living or working outside the U.S." },
      { value: "foreign_bank_accounts", label: "Hold foreign bank or investment accounts" },
      { value: "building_estate_legacy_plan", label: "Doing estate or multi-generational legacy planning" },
      { value: "none", label: "None of these" },
    ],
  },
];

// Question wording that adapts to the answer to question 1. The base
// QUIZ_QUESTIONS stay the source of truth for valid values and matching; this
// only changes what a person SEES (prompt text, option labels, hidden options).
// Mixed answers use the self-employed or owner wording, where most savings are.
function persona(a) {
  const w = a.work || [];
  if (w.includes("business_owner")) return "owner";
  if (w.includes("self_employed")) return "self";
  if (w.includes("retired")) return "retired";
  if (w.includes("w2")) return "w2";
  return "other";
}

const VARIANTS = {
  income: {
    retired: { prompt: "About how much taxable income do you expect this year, including Social Security, pension, withdrawals and any other income?" },
    w2: { prompt: "What's your approximate annual household income before taxes, including your salary and any other income?" },
    self: { prompt: "What's your approximate annual household income before taxes, including your business profit?" },
    owner: { prompt: "What's your approximate annual household income before taxes, including your pay and business profit?" },
  },
  age: {
    retired: { hide: ["under_40"], labels: { "40_59": "Under 60" } },
  },
  household: {
    retired: { hide: ["pays_childcare"], labels: { planning_education_costs: "I'm saving or planning for a child's or grandchild's education", kids_under_18: "I support dependent children or grandchildren" } },
  },
  hsaStatus: {
    retired: { prompt: "Do you have an HSA or a high-deductible health plan? (New HSA contributions stop once you're on Medicare, but an HSA you already have can still pay medical costs tax-free.)" },
    w2: { prompt: "Is your employer's health plan a high-deductible plan (HDHP), or do you have an HSA? Open-enrollment materials or your insurance card often say \"HDHP\" or \"HSA-eligible.\"" },
    self: { prompt: "Is your own health plan a high-deductible plan (HDHP), or do you have an HSA? Your plan summary often says \"HDHP\" or \"HSA-eligible.\"" },
    owner: { prompt: "Is your health plan a high-deductible plan (HDHP), or do you have an HSA? Your plan summary often says \"HDHP\" or \"HSA-eligible.\"" },
  },
  investingGiving: {
    retired: { labels: { gives_to_charity_regularly: "I give meaningfully to charity most years", taxable_brokerage_investing: "I have a taxable (non-retirement) brokerage account" } },
  },
  business: {
    self: { labels: { has_employees_or_contractors: "I pay contractors or part-time helpers" } },
    owner: { labels: { has_employees_or_contractors: "I also pay independent contractors", employs_spouse_or_kids: "My spouse or kids work in the business (or could)" } },
  },
  structure: {
    self: { prompt: "How is your business set up today?" },
    owner: { prompt: "How is your business set up today?", labels: { sole_prop_or_single_member_llc: "Sole proprietor or single-member LLC (no S-corp election)" } },
  },
  healthInsurance: {
    owner: { prompt: "How do you get your own health insurance?" },
  },
  estimatedTaxes: {
    owner: { prompt: "How do you pay tax on your business income?" },
    self: { prompt: "How do you pay tax on your self-employment income?" },
  },
  life: {
    retired: { hide: ["tips_or_overtime"], labels: { expecting_high_income_year: "Expecting a much higher income year than usual (asset sale, inheritance, large withdrawal)" } },
    w2: { labels: { expecting_high_income_year: "Expecting a much higher income year than usual (bonus, stock sale, exit)" } },
  },
};

// What the person actually sees for a question, given their answers so far.
export function questionView(q, answers) {
  const v = VARIANTS[q.id]?.[persona(answers || {})];
  if (!v) return q;
  return {
    ...q,
    prompt: v.prompt || q.prompt,
    options: q.options
      .filter((o) => !v.hide?.includes(o.value))
      .map((o) => (v.labels?.[o.value] ? { ...o, label: v.labels[o.value] } : o)),
  };
}

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

// Each strategy gets a match test plus three short, structured pieces used
// to build an "If X, you could do Y, and the benefit would be Z" card.
// Megan's explicit framework for making results feel actionable instead of
// reading like a generic knowledge-base dump. condition/action/benefit are
// deliberately written as situational statements and hypothetical options
// ("you could...") rather than instructions ("you should..."), so this
// stays informational rather than prescriptive. notFinancialAdviceNote
// (already on each TAX_STRATEGIES entry) is rendered alongside every card
// as the explicit "not advice" caveat.
const RULES = {
  "tax-advantaged-account-contribution-waterfall": {
    test: (a) => a.retirement !== "not_sure_none",
    condition: () => "You're already saving for retirement in more than one type of account, or trying to decide where to send savings next.",
    action: () => "Fund accounts in a deliberate order: capture any employer 401(k) match first, then an HSA, then a Roth IRA (or backdoor Roth), then a taxable brokerage account.",
    benefit: () => "This sequencing captures free employer money and tax-advantaged growth before any dollar lands in a plain taxable account.",
    scenario: () => "Someone with a $10,000/year employer 401(k) match limit, access to an HSA, and room in a Roth IRA might route dollars in this order: capture the full $10,000 match first (free money), then fund the HSA, then max the Roth IRA, before anything goes to a plain brokerage account.",
  },
  "401k-basics": {
    test: (a) => a.retirement === "employer_401k_only" || a.retirement === "both_employer_and_self_employed",
    condition: () => "You save through an employer 401(k).",
    action: () => "Review whether your contributions are going to the traditional (pre-tax) or Roth (after-tax) side of the plan, and adjust the split.",
    benefit: () => "Traditional contributions lower this year's taxable income; Roth contributions grow completely tax-free for retirement, with no income limit on who can use the Roth 401(k) option.",
    scenario: () => "Contributing $10,000 to a traditional 401(k) in the 24% bracket saves about $2,400 on this year's tax bill. Contributing that same $10,000 to a Roth 401(k) instead costs $2,400 more now but grows completely tax-free for retirement.",
  },
  "traditional-ira": {
    title: (a) => !a.retAccounts?.includes("roth_ira") ? "Open a Roth IRA and fund it every year" : null,
    test: (a) => incomeAtLeast(a, "150-250k") || (!a.retired && !a.retAccounts?.includes("roth_ira")),
    condition: (a) => !a.retAccounts?.includes("roth_ira")
      ? "You did not list a Roth IRA among your accounts."
      : "Your income may put you above the range where you can contribute to a Roth IRA directly.",
    action: (a) => !a.retAccounts?.includes("roth_ira")
      ? "Open a Roth IRA and contribute up to the annual limit every year. The money grows tax-free and you can pull your contributions back out at any time. If your income is above the direct-contribution limit, use the backdoor Roth instead."
      : "Open a Traditional IRA and contribute up to the annual limit, or use the backdoor Roth process if you'd rather end up in a Roth.",
    benefit: (a) => !a.retAccounts?.includes("roth_ira")
      ? "Growth and withdrawals in a Roth IRA are tax-free, so every year you wait is tax-free growth you do not get."
      : "A Traditional IRA still lets you shelter income now even when a direct Roth contribution isn't available to you.",
    scenario: (a) => !a.retAccounts?.includes("roth_ira")
      ? "Someone who puts $7,500 a year into a Roth IRA for 25 years at a 7% return ends up with about $470,000 that they can withdraw tax-free, instead of paying tax on the growth in a taxable account."
      : "Someone earning $180,000 (over the Roth IRA income limit) contributes $7,000 to a Traditional IRA instead, sheltering that income now even though a direct Roth contribution isn't available to them.",
  },
  "roth-vs-pretax-contribution-choice": {
    test: (a) => a.retirement !== "not_sure_none",
    condition: () => "You're actively contributing to retirement accounts and haven't deliberately chosen a Roth vs. pre-tax split.",
    action: () => "Split new contributions between Roth and pre-tax accounts instead of defaulting to one or the other.",
    benefit: () => "A meaningful Roth balance gives you tax-free income later and more flexibility, since Roth accounts carry no required withdrawals and no tax on growth.",
    scenario: () => "Splitting a $20,000 annual retirement contribution as $12,000 pre-tax and $8,000 Roth gives a mix of today's tax break and tomorrow's tax-free withdrawals, rather than betting entirely on one side.",
  },
  "roth-conversions": {
    test: (a) => incomeAtLeast(a, "150-250k") || a.age === "60_69",
    condition: () => "You're in a period, or an age range, where your income could be unusually low.",
    action: () => "Convert some pre-tax retirement savings into a Roth account during a lower-income year.",
    benefit: () => "Paying tax on the conversion now, while income is low, can mean paying a lower rate than you would in a typical year.",
    scenario: () => "In a year net business income drops to $40,000 instead of the usual $150,000, converting $30,000 from a Traditional IRA to a Roth IRA might cost around 12 to 15% in tax, versus 24% or more in a typical year.",
  },
  "backdoor-roth-ira": {
    test: (a) => incomeAtLeast(a, "150-250k"),
    title: (a) => !a.retAccounts?.includes("roth_ira") ? "Open a Roth IRA through the backdoor method" : null,
    condition: (a) => (!a.retAccounts?.includes("roth_ira") ? "You did not list a Roth IRA, and your" : "Your") + " income is likely above the limit for contributing to a Roth IRA directly.",
    action: (a) => "Use the backdoor Roth process: contribute to a Traditional IRA, then convert that balance to a Roth IRA." + (a.retAccounts?.includes("sep_ira") ? " Your SEP-IRA balance makes the conversion mostly taxable until you roll that balance into your Solo 401(k)." : ""),
    benefit: () => "This gets money into a Roth IRA tax-free even when your income is too high to contribute directly, as long as you don't hold other pre-tax IRA balances.",
    scenario: () => "Someone earning $220,000 contributes $7,000 (non-deductible) to a Traditional IRA, then converts it to a Roth IRA days later, ending up with $7,000 in a Roth account despite being over the direct-contribution income limit.",
  },
  "sep-and-solo-401k-cleanup": {
    priority: true,
    title: (a) => a.work?.includes("business_owner") ? null : "Stop funding your SEP-IRA: it is blocking your mega backdoor Roth",
    test: () => false, // replaced by the blocker "blocker-sep-blocks-mega-backdoor"
    condition: (a) => a.work?.includes("business_owner")
      ? "You have both a SEP-IRA and a Solo 401(k), and they compete for the same contribution room."
      : "You have both a SEP-IRA and a Solo 401(k), and you have no employees, so the SEP-IRA isn't doing anything your Solo 401(k) can't do better.",
    action: (a) => a.work?.includes("business_owner")
      ? "Stop SEP-IRA contributions and ask your Solo 401(k) provider whether it accepts a rollover of the SEP balance."
      : "Close out the SEP-IRA: stop funding it, then ask your Solo 401(k) provider whether it accepts a rollover of the SEP balance, so your full $72,000 limit is free for a mega backdoor Roth.",
    benefit: () => "SEP contributions from the same business use up room under the $72,000 overall 2026 limit that your Solo 401(k) employer and after-tax (mega backdoor Roth) contributions need, and a SEP balance can make a regular backdoor Roth mostly taxable.",
    scenario: () => "If your business puts $30,000 into a SEP-IRA, that $30,000 counts against the same $72,000 limit, leaving $42,000 of room for the Solo 401(k) instead of $72,000, which can shrink or end the after-tax space a mega backdoor Roth uses.",
  },
  "consolidate-old-retirement-accounts": {
    priority: true,
    test: (a) => a.retAccounts?.some((v) => ["old_401k", "traditional_ira", "sep_ira", "unsure_more"].includes(v)),
    condition: (a) => a.retAccounts.includes("unsure_more")
      ? "You may have retirement accounts from past jobs that you have lost track of."
      : "You have retirement money in old employer plans or pre-tax IRAs.",
    action: (a) => a.retAccounts.includes("unsure_more")
      ? "Look up old accounts (check past employers' plan administrators and the Department of Labor's Retirement Savings Lost and Found database), then decide whether to roll them into one account."
      : "Roll old 401(k)s and pre-tax IRAs into your current 401(k) or a Solo 401(k) if the plan accepts them, using a direct rollover.",
    benefit: () => "One consolidated account is easier to manage and invest, and moving pre-tax IRA money out of IRAs can clear the way for a backdoor Roth without the pro-rata tax.",
    scenario: () => "Someone with a $50,000 old pre-tax IRA who tries to do a $7,500 backdoor Roth would have most of that conversion taxed under the pro-rata rule; rolling the $50,000 into a 401(k) first leaves the conversion nearly tax-free.",
  },
  "mega-backdoor-roth-ira": {
    priority: true,
    title: (a) => a.retAccounts?.includes("solo_401k") ? "Use the mega backdoor Roth in your Solo 401(k)" : null,
    test: (a) =>
      (["employer_401k_only", "both_employer_and_self_employed", "self_employed_has_solo401k_or_sep"].includes(a.retirement) && incomeAtLeast(a, "150-250k")) ||
      (a.retAccounts?.includes("solo_401k") && !a.work?.includes("business_owner") && incomeAtLeast(a, "75-150k")),
    condition: (a) => a.retAccounts?.includes("solo_401k")
      ? "You told us you have a Solo 401(k)."
      : "You told us you contribute to a 401(k) and may have room to save more than the standard employee limit.",
    action: (a) => a.retAccounts?.includes("solo_401k")
      ? (a.retAccounts?.includes("sep_ira") ? "Your SEP-IRA is blocking this: SEP contributions from the same business share the $72,000 limit, so stop funding it and roll its balance into your Solo 401(k) first. " : "") + "Use the mega backdoor Roth. How it works: after you max the employee and employer amounts, add after-tax (non-Roth) contributions up to the $72,000 overall 2026 limit, then convert them to Roth so the growth is tax-free. How to check your plan: ask your provider two questions, (1) does the plan accept after-tax, non-Roth employee contributions, and (2) does it allow in-plan Roth conversions or in-service rollovers to a Roth IRA. You need yes to both. If not, switch to a Solo 401(k) provider that supports both."
      : "Ask your plan provider whether it allows after-tax contributions with an in-plan Roth conversion (the mega backdoor Roth), and how much room is left under the $72,000 overall limit for 2026.",
    benefit: () => "It can move tens of thousands of extra dollars a year into Roth space, where growth and withdrawals are tax-free, well beyond what the standard employee limit allows. It does not lower this year's tax; the payoff is tax-free growth.",
    scenario: () => "Someone who contributes the $24,500 employee limit and gets a $6,000 employer match could, if the plan allows it, add up to roughly $41,500 of after-tax money (about $72,000 minus $30,500) and convert it to Roth.",
  },
  "solo-401k": {
    priority: true,
    title: (a) => a.retirement === "self_employed_has_solo401k_or_sep" && a.retAccounts?.includes("solo_401k") ? "Max out your Solo 401(k)" : null,
    test: (a) => (a.retirement === "self_employed_no_plan_yet" || a.retirement === "self_employed_has_solo401k_or_sep") && (!a.work?.includes("business_owner") || a.work?.includes("self_employed")),
    condition: (a) => a.retirement === "self_employed_has_solo401k_or_sep"
      ? "You told us you already have a Solo 401(k)" + (a.sepOnly ? " or SEP-IRA." : ".")
      : "You told us you have self-employment or 1099 income and no retirement plan set up yet.",
    action: (a) => a.retirement === "self_employed_has_solo401k_or_sep"
      ? (a.sepOnly ? "Switch to a Solo 401(k): it adds the $24,500 employee deferral on top of an employer share of up to about 20% of net profit (within $72,000 overall), plus Roth and backdoor Roth options. " : "") + "Max it out for 2026: contribute $24,500 as the employee, then add the employer share of about 20% of your net profit after half of self-employment tax, up to $72,000 overall (more with catch-up if you are 50 or older). Any gap between what you have put in and that ceiling is tax you can still defer."
      : "Open a Solo 401(k) and contribute as both the employee and the 'employer' of your own business.",
    benefit: (a) => a.retirement === "self_employed_has_solo401k_or_sep"
      ? "Every dollar of unused room is a dollar taxed this year instead of deferred. At a 24% bracket, each extra $10,000 contributed defers about $2,400 of federal tax."
      : "The combined room can shelter significantly more of this year's income than a Traditional or Roth IRA alone.",
    scenario: (a) => a.retirement === "self_employed_has_solo401k_or_sep"
      ? "Someone with $150,000 of net profit who contributes only $10,000 leaves about $14,500 of employee room unused (2026 limit $24,500), roughly $3,500 of federal tax at 24%, before counting the employer share."
      : "A self-employed consultant with $120,000 net profit could contribute roughly $24,500 as 'employee' plus another $18,000 to $22,000 as 'employer,' sheltering $40,000 or more from this year's taxable income.",
  },
  "solo-401k-contribution-deadlines": {
    test: (a) => (a.retirement === "self_employed_no_plan_yet" || a.retirement === "self_employed_has_solo401k_or_sep") && (!a.work?.includes("business_owner") || a.work?.includes("self_employed")),
    condition: () => "You're setting up or funding a Solo 401(k) as a self-employed person this year.",
    action: () => "Sign and date a written contribution election by December 31, which buys you until your extended tax filing deadline the following year to actually come up with the money.",
    benefit: () => "Without that written election, some contribution types are due at your unextended filing deadline instead, months earlier than most people assume, and you can't fund what you never elected.",
    scenario: () => "A self-employed consultant who signs a Solo 401(k) election on December 20 doesn't need the cash in hand until the following October, when their extended return is due, buying nearly 10 more months to come up with the contribution.",
  },
  "cash-balance-plan": {
    test: (a) => (incomeAtLeast(a, "250-500k") || ["250_500k", "500k_1m", "over_1m"].includes(a.bizProfit)) && (a.age === "40_59" || a.age === "60_69" || a.age === "70_plus"),
    condition: () => "You're a higher-earning self-employed person or business owner, age 40 or older.",
    action: () => "Look into a cash balance plan on top of your Solo 401(k).",
    benefit: () => "Cash balance plans can add a substantially larger annual deduction than a Solo 401(k) alone, especially the closer you get to retirement age.",
    scenario: () => "A 55-year-old business owner already maxing a Solo 401(k) could add a cash balance plan contribution of $100,000 or more in a single year, well beyond what any 401(k)-type account alone allows at that age.",
  },
  "trump-accounts": {
    test: (a) => a.kidsUnder18,
    condition: () => "You have or are expecting a child.",
    action: () => "Open this newer child savings account type for them.",
    benefit: () => "It doesn't require the child to have earned income the way a custodial Roth IRA does, and can convert to a Roth IRA once they turn 18.",
    scenario: () => "A child born in 2026 could receive a $1,000 government-funded seed deposit, and if parents added $5,000/year until age 18, the account could grow to roughly $150,000 to $230,000 depending on investment returns, before ever touching a Roth IRA conversion.",
  },
  "self-directed-ira-asymmetric-investments": {
    test: (a) => a.equity?.includes("startup_equity_or_options") || a.equity?.includes("c_corp_founder_or_early_employee"),
    condition: () => "You have access to early-stage private investment opportunities.",
    action: () => "Hold those investments inside a self-directed IRA instead of a normal brokerage account.",
    benefit: () => "Any growth happens inside the tax-advantaged account instead of being taxed as a normal capital gain.",
    scenario: () => "An early employee offered the chance to buy $10,000 of pre-IPO shares through a self-directed IRA could see any eventual gain grow inside the account tax-deferred, or tax-free in a Roth version, instead of being taxed as a normal capital gain.",
  },
  "hsa-overview": {
    test: (a) => a.hsa || a.hsaNotSure,
    condition: (a) => (a.hsaNotSure ? "You aren't sure whether your health plan is a high-deductible plan that qualifies for an HSA." : "You're enrolled in a high-deductible health plan."),
    action: () => "Open and fund an HSA up to the annual limit.",
    benefit: () => "It's the only account that's tax-free going in, tax-free growing, and tax-free coming out for medical expenses.",
    scenario: () => "A family maxing out an $8,550 HSA contribution in the 24% bracket saves roughly $2,050 in federal tax the year they contribute, on top of tax-free growth and tax-free withdrawals for medical costs.",
  },
  "hsa-pay-and-reimburse-strategy": {
    test: (a) => a.hsa,
    condition: () => "You already have an HSA and usually pay medical costs straight from it.",
    action: () => "Pay medical costs out of pocket instead, keep the receipts, and reimburse yourself from the HSA years later.",
    benefit: () => "The account keeps growing tax-free the whole time, since there's no deadline on reimbursing yourself for a past qualified expense.",
    scenario: () => "Paying $3,000 in medical bills out of pocket today and saving the receipts, then reimbursing yourself from the HSA in 15 years, lets that $3,000 keep compounding tax-free the whole time instead of being pulled out immediately.",
  },
  "529-plan-basics": {
    test: (a) => a.kidsUnder18 || a.planningEducation,
    condition: () => "You have kids, or you're saving for education costs.",
    action: () => "Open a 529 plan for the beneficiary.",
    benefit: () => "Contributions grow completely tax-free as long as the money is used for qualifying education expenses, and unused funds can be redirected to another family member.",
    scenario: () => "Contributing $10,000/year to a 529 starting at a child's birth could grow to roughly $180,000 to $200,000 by age 18 assuming a 6 to 7% average return, all available tax-free for qualifying education costs.",
  },
  "529-superfunding-and-state-shopping": {
    test: (a) => a.planningEducation && incomeAtLeast(a, "250-500k"),
    condition: () => "You have a lump sum available to invest for education and your income is on the higher side.",
    action: () => "Front-load up to five years of 529 contributions in a single year, and compare plans across states rather than defaulting to your home state's.",
    benefit: () => "Superfunding gets more money compounding tax-free sooner, and an out-of-state plan can offer a stronger investment menu if your home state doesn't offer a deduction anyway.",
    scenario: () => "A grandparent with a $90,000 windfall could contribute it all to a 529 in one year under the 5-year superfunding election, instead of spreading $19,000/year contributions out and losing years of compounding.",
  },
  "529-to-roth-ira-rollover": {
    test: (a) => a.planningEducation || a.kidsUnder18,
    condition: () => "A 529 you've set up could end up with money left over after education is paid for.",
    action: () => "Roll a portion of any leftover balance directly into the beneficiary's Roth IRA.",
    benefit: () => "Unused education savings become a retirement head start instead of triggering an early-withdrawal penalty.",
    scenario: () => "A 529 with $15,000 left over after college could roll up to $35,000 over time (the lifetime cap) directly into the beneficiary's Roth IRA, as long as the account has been open 15+ years and the beneficiary has matching earned income.",
  },
  "other-education-savings-accounts": {
    test: (a) => a.planningEducation,
    condition: () => "A 529 plan's deduction isn't the main draw for you, or a dependent has a qualifying disability.",
    action: () => "Look into a Coverdell ESA or an ABLE account as an alternative.",
    benefit: () => "Both offer their own tax-free growth and withdrawal treatment for qualifying expenses.",
    scenario: () => "A family contributing $2,000/year to a Coverdell ESA for K-12 private school costs gets the same tax-free growth as a 529, just capped at a smaller annual amount.",
  },
  "hire-your-spouse-for-retirement-doubling": {
    test: (a) => (a.work?.includes("self_employed") || a.work?.includes("business_owner")) && a.nonworkingSpouse,
    condition: () => "You run your own business and your spouse has little or no earned income.",
    action: () => "Put your spouse on payroll for real, legitimate work in the business.",
    benefit: () => "Each spouse gets their own Solo 401(k) contribution room, which can roughly double the household's total retirement savings capacity.",
    scenario: () => "A business owner already maxing their own $70,000 Solo 401(k) puts their spouse on payroll for real work and funds a second $70,000 Solo 401(k) in the spouse's name, roughly doubling the household's sheltered retirement savings for the year.",
  },
  "hire-your-kids-for-tax-savings": {
    test: (a) => (a.work?.includes("self_employed") || a.work?.includes("business_owner")) && (a.kidsUnder18 || a.biz?.includes("employs_spouse_or_kids")),
    condition: () => "Your kids do, or could do, real work for the business.",
    action: () => "Hire them and pay a legitimate, documented wage for that work.",
    benefit: () => "Wages under their standard deduction can be taxed at $0 for the child, while the business still gets the full deduction for paying them.",
    scenario: () => "Paying a 16-year-old $14,000/year for real social media or admin work, under the standard deduction, means the child owes $0 in tax on those wages, while the business deducts the full $14,000 against its own income.",
  },
  "custodial-roth-ira-for-working-minors": {
    test: (a) => a.kidsUnder18,
    condition: () => "Your child has earned income from any legitimate source, including your own business.",
    action: () => "Open a custodial Roth IRA and contribute up to the child's earned income.",
    benefit: () => "Starting decades earlier than most people gives that money far more time to compound tax-free.",
    scenario: () => "A 14-year-old earning $3,000 from real work gets a $3,000 custodial Roth IRA contribution that, left alone until age 65, could grow to well over $100,000 from that single year's contribution alone, assuming historical average market returns.",
  },
  "spousal-roth-ira-for-nonworking-spouse": {
    test: (a) => a.nonworkingSpouse,
    condition: () => "You're married and one spouse has little or no earned income.",
    action: () => "Open a Roth IRA for the non-working spouse, funded from the household's joint income.",
    benefit: () => "This roughly doubles the household's total Roth IRA contribution room instead of limiting it to the working spouse's own income.",
    scenario: () => "A household with one working spouse can fund two Roth IRAs, up to $14,000 combined for 2025, instead of being limited to the $7,000 the working spouse alone could contribute.",
  },
  "tax-loss-harvesting": {
    test: (a) => a.brokerage,
    condition: () => "You invest through a taxable brokerage account.",
    action: () => "Sell positions currently worth less than you paid, before year-end, to realize the loss.",
    benefit: () => "Losses offset gains elsewhere in your portfolio, and up to $3,000 of any leftover loss can offset ordinary income each year.",
    scenario: () => "Selling a position down $5,000 to offset $5,000 of realized gains elsewhere eliminates the tax on those gains entirely. If there are no gains to offset, up to $3,000 of the loss can still offset ordinary income this year, with the rest carried forward.",
  },
  "wash-sale-rule": {
    test: (a) => a.brokerage,
    condition: () => "You're harvesting a loss in a taxable brokerage account.",
    action: () => "Replace the sold position with a similar, but not identical, security instead of buying back the same one right away.",
    benefit: () => "This keeps your market exposure while avoiding the wash sale rule, which would otherwise disallow the loss if you rebuy the same security within 30 days.",
    scenario: () => "Selling an S&P 500 index fund at a $5,000 loss and immediately buying an S&P 500 fund from a different provider preserves market exposure while avoiding the wash sale rule, which would apply if the identical fund were repurchased within 30 days.",
  },
  "direct-indexing": {
    test: (a) => a.brokerage && incomeAtLeast(a, "250-500k"),
    condition: () => "You're investing six figures or more in a broad market index through a taxable account.",
    action: () => "Switch to a direct indexing strategy instead of a regular index fund.",
    benefit: () => "Owning the individual stocks in the index lets you harvest far more usable tax losses than a single fund can, especially in a down market.",
    scenario: () => "A $1,000,000 direct-indexing account might generate roughly $300,000 to $400,000 in harvestable losses in its first year, more in a volatile market, losses a single index fund holding the same money wouldn't be able to produce at all.",
  },
  "qualified-opportunity-zones": {
    test: (a) => a.life?.includes("planning_to_sell_business_or_appreciated_asset"),
    condition: () => "You have a large recent or upcoming capital gain.",
    action: () => "Reinvest that gain into a Qualified Opportunity Fund within the required window.",
    benefit: () => "You defer tax on the original gain, and owe nothing on the opportunity zone investment's own growth if you hold it long enough.",
    scenario: () => "Reinvesting a $200,000 capital gain from a business sale into a Qualified Opportunity Fund defers the tax on that $200,000, and if held 10+ years, any growth on the QOF investment itself is never taxed.",
  },
  "money-market-fund-tax-equivalent-yield": {
    awareness: true,
    test: (a) => incomeAtLeast(a, "150-250k"),
    condition: () => "You're holding significant cash in a savings account or plain money market fund.",
    action: () => "Compare Treasury or municipal money market funds against your current savings option using their tax-equivalent yield, not just the headline rate.",
    benefit: () => "For someone in a high tax bracket, a tax-exempt fund can pay more after tax than a taxable savings account with a higher advertised rate.",
    scenario: () => "For someone in a combined 35% federal and state bracket, a municipal money market fund yielding 3.5% can be worth more after tax than a savings account advertising 4.5%, once compared on a tax-equivalent basis.",
  },
  "charitable-giving-basics-agi-caps": {
    test: (a) => a.charity,
    condition: () => "You give to charity regularly.",
    action: () => "Confirm you're itemizing deductions in years you give, since charitable gifts only reduce taxes if you do.",
    benefit: () => "Getting the itemizing decision right is what actually determines whether your giving lowers your tax bill at all.",
    scenario: () => "On $200,000 of AGI, cash gifts to public charities are deductible up to $120,000 (60% of AGI) in a single year, with anything above that carried forward for up to 5 years.",
  },
  "donating-appreciated-assets": {
    test: (a) => a.appreciatedStock || (a.brokerage && a.charity),
    condition: () => "You hold stock, crypto, or other assets that have gone up in value for more than a year.",
    action: () => "Donate the appreciated asset directly to charity instead of selling it and donating the cash.",
    benefit: () => "You skip capital gains tax on the appreciation entirely, while still deducting the asset's full current value.",
    scenario: () => "Donating $20,000 of stock originally purchased for $5,000 avoids tax on the $15,000 of gain entirely, while still generating a $20,000 charitable deduction, versus selling first and donating the after-tax proceeds.",
  },
  "donor-advised-funds": {
    test: (a) => a.charity && (a.highSalt || incomeAtLeast(a, "250-500k")),
    condition: () => "You're facing a large tax bill and want a deduction now without deciding which charities get the money yet.",
    action: () => "Contribute to a donor-advised fund this year and grant it out to specific charities later, on your own timeline.",
    benefit: () => "You lock in the deduction immediately, and can also bunch several years of intended giving into one year to clear the itemizing threshold.",
    scenario: () => "Contributing $50,000 to a donor-advised fund this year locks in the full $50,000 deduction now, even if the actual grants to specific charities are spread out over the next 5 to 10 years.",
  },
  "qualified-charitable-distributions": {
    test: (a) => a.age === "70_plus",
    condition: () => "You're 70 or older and hold a Traditional IRA.",
    action: () => "Send a gift directly from your IRA to a qualifying charity instead of withdrawing the money yourself first.",
    benefit: () => "The distribution doesn't count as taxable income at all, and it still satisfies any required minimum distribution for the year.",
    scenario: () => "A 72-year-old sends $20,000 directly from their Traditional IRA to a qualifying charity, satisfying that year's required minimum distribution without adding a dollar of taxable income.",
  },
  "charitable-law-changes-2026": {
    test: (a) => a.charity && incomeAtLeast(a, "250-500k"),
    condition: () => "You give at a meaningful level and your income is on the higher side.",
    action: () => "Time a large gift around the 2025 to 2026 boundary rather than defaulting to your usual giving schedule.",
    benefit: () => "A new floor and rate cap taking effect in 2026 can shrink the tax value of a large gift for high earners, so timing it earlier can be worth more.",
    scenario: () => "A $100,000 gift on $1,000,000 of AGI saves roughly $37,000 in tax if given in 2025, but only about $33,250 if given in 2026 after new limits take effect, a difference of about $3,750 from timing alone.",
  },
  "private-foundations": {
    test: (a) => incomeAtLeast(a, "500k+") && a.life?.includes("building_estate_legacy_plan"),
    condition: () => "You're at a high income and net worth level and thinking about a lasting giving structure.",
    action: () => "Look into setting up a private foundation instead of giving through a donor-advised fund.",
    benefit: () => "A foundation gives you ongoing control over grants and operations, at the cost of a minimum 5% annual distribution requirement and real administrative overhead.",
    scenario: () => "A family funding a $2,000,000 private foundation must distribute at least $100,000/year (5%) in grants, in exchange for full ongoing control over where that money goes.",
  },
  "charitable-remainder-lead-trusts": {
    test: (a) => a.life?.includes("building_estate_legacy_plan") && (incomeAtLeast(a, "500k+") || a.life?.includes("planning_to_sell_business_or_appreciated_asset")),
    condition: () => "You have significant wealth or an upcoming large liquidity event, and estate planning is already on your radar.",
    action: () => "Explore a charitable remainder or lead trust alongside your estate planning counsel.",
    benefit: () => "These structures combine an income stream, for you or your heirs, with an eventual charitable gift, in a way a simple donation can't.",
    scenario: () => "Funding a charitable remainder trust with $1,000,000 of appreciated stock can provide the donor an income stream for a set number of years, with the remainder going to charity, while spreading out the capital gains tax on the stock rather than triggering it all at once.",
  },
  "home-office-deduction": {
    test: (a) => a.biz?.includes("home_office"),
    condition: () => "You use a dedicated space in your home regularly and exclusively for the business.",
    action: () => "Claim the home office deduction, using either the simplified $5-per-square-foot method (up to 300 square feet) or the regular actual-expense method.",
    benefit: () => "This deducts a portion of housing costs that a W-2 employee has no way to claim at all.",
    scenario: () => "A 200-square-foot home office under the simplified method deducts $1,000 (200 x $5), no receipts required. The same space under the regular method might deduct more or less depending on actual rent, utilities, and repair costs for that percentage of the home.",
  },
  "business-travel-deductions": {
    test: (a) => a.biz?.includes("business_travel"),
    condition: () => "You travel for client meetings or business development.",
    action: () => "Track and deduct transportation, lodging, and travel meals tied to that business purpose.",
    benefit: () => "Transportation and lodging are fully deductible, and business meals while traveling are 50% deductible, as long as the business purpose is documented.",
    scenario: () => "A $1,200 flight, $600 in hotel stays, and $200 in meals for a business trip generates roughly $1,900 in deductions: the flight and hotel in full, plus $100 of the $200 in meals at the 50% rate.",
  },
  "conference-and-professional-development-expenses": {
    test: (a) => a.biz?.includes("conferences_prof_dev"),
    condition: () => "You attend conferences, workshops, or professional development events.",
    action: () => "Deduct registration fees, materials, and related costs, on top of any separate travel deduction.",
    benefit: () => "These are standard deductible business expenses that stack with, but are separate from, your travel deduction for getting there.",
    scenario: () => "A $1,500 conference registration fee plus $300 in materials is a straightforward $1,800 deduction, on top of whatever travel and lodging it took to get there.",
  },
  "equipment-technology-deductions": {
    test: (a) => a.biz?.includes("equipment_tech_purchases") || a.purchases?.includes("equipment") || a.purchases?.includes("heavy_vehicle"),
    condition: () => "You buy equipment, software, or technology for the business.",
    action: () => "Deduct the business-use portion of these purchases, whether that's expensed immediately or depreciated over time.",
    benefit: () => "This lowers taxable business income for money you were already planning to spend.",
    scenario: () => "A $3,000 laptop used 80% for business generates a $2,400 deduction (80% of the cost), either expensed immediately or depreciated depending on the asset and accounting method.",
  },
  "professional-services-deductions": {
    test: (a) => a.biz?.includes("professional_services"),
    condition: () => "You pay for accounting, legal, or consulting services for the business.",
    action: () => "Deduct those fees as ordinary business expenses.",
    benefit: () => "These reduce taxable business income the same way any other necessary business cost does.",
    scenario: () => "$5,000 paid to a bookkeeper and $2,000 to a business attorney over the year is a full $7,000 deduction against business income.",
  },
  "marketing-advertising-deductions": {
    test: (a) => a.biz?.includes("marketing_advertising"),
    condition: () => "You spend on marketing or advertising for the business.",
    action: () => "Deduct that spending, and consider routing it through a business credit card with elevated rewards in advertising categories.",
    benefit: () => "The spend is already deductible, and pairing it with the right card can add value on top without changing your actual budget.",
    scenario: () => "$10,000 spent on digital ads and a new website is fully deductible, and routing that spend through a card offering 3x points on advertising could also add a few hundred dollars of rewards on top.",
  },
  "self-employed-health-insurance-deduction": {
    test: (a) => (a.work?.includes("self_employed") || a.work?.includes("business_owner")) && a.healthInsurance === "self_pays",
    condition: () => "You are self-employed and buy your own health insurance.",
    action: () => "Deduct the premiums you pay for yourself, your spouse and your dependents as an adjustment to income, up to your net business profit.",
    benefit: () => "It lowers your taxable income even if you don't itemize, and it's often one of the biggest deductions available to a self-employed person.",
    scenario: () => "$9,000 a year in premiums for a self-employed person in the 24% bracket could cut the income tax bill by roughly $2,000.",
  },
  "estimated-taxes-safe-harbor": {
    awareness: true,
    test: (a) => (a.work?.includes("self_employed") || a.work?.includes("business_owner")) && a.estimatedTaxes !== "quarterly",
    condition: () => "You have self-employment income and don't make quarterly estimated tax payments.",
    action: () => "Set up quarterly estimated payments sized to the IRS safe harbor, and set money aside from every payment you receive.",
    benefit: () => "Paying on time avoids underpayment penalties and avoids one large surprise bill in April.",
    scenario: () => "Someone who owed $12,000 last year could pay $3,000 each quarter, or 100% of last year's tax, and generally avoid an underpayment penalty even if this year's income is higher.",
  },
  "roth-vs-traditional-income-year": {
    priority: true,
    title: (a) => a.incomeYear === "lower" ? "Contribute to Roth this year because your income is lower" : a.incomeYear === "higher" ? "Contribute pre-tax this year because your income is higher" : "Estimate your income before choosing Roth or pre-tax",
    test: (a) => (a.work?.includes("self_employed") || a.work?.includes("business_owner")) && a.incomeYear && a.incomeYear !== "same",
    condition: (a) => a.incomeYear === "lower"
      ? "You mentioned your income is lower than normal this year, so your tax bracket may be lower than usual."
      : a.incomeYear === "higher"
        ? "You mentioned your income is higher than normal this year, so your tax bracket may be higher than usual."
        : "You said you're not sure yet whether this year's income is high or low, which is what decides between Roth and pre-tax.",
    action: (a) => a.incomeYear === "lower"
      ? "Contribute to Roth this year, or do a Roth conversion, because you would pay tax at a lower rate than usual."
      : a.incomeYear === "higher"
        ? "Contribute pre-tax this year, because each deducted dollar is worth more in a higher bracket. Check whether your plan allows more."
        : "Estimate this year's income before choosing between pre-tax and Roth contributions, and revisit the choice before year end.",
    benefit: () => "Choosing the contribution type that matches this year's bracket can lower lifetime tax on the same dollars.",
    scenario: (a) => a.incomeYear === "lower"
      ? "If a down year puts your top bracket at 12% instead of your usual 24%, paying tax now on $10,000 through Roth costs about $1,200 instead of about $2,400 later, roughly $1,200 less tax on that money."
      : "If a strong year pushes your top bracket to 32% instead of the usual 24%, each $10,000 deducted through pre-tax contributions saves about $3,200 instead of $2,400, roughly $800 more than the same deduction in a normal year.",
  },
  "year-end-expense-timing": {
    priority: true,
    title: (a) => a.incomeYear === "lower" ? "Push business expenses into January" : "Pay business expenses before December 31",
    test: (a) => (a.work?.includes("self_employed") || a.work?.includes("business_owner")) && (a.incomeYear === "higher" || a.incomeYear === "lower"),
    condition: (a) => a.incomeYear === "lower"
      ? "You mentioned your income is lower than normal this year, so deductions may be worth more next year."
      : "You mentioned your income is higher than normal this year, so deductions are worth more now.",
    action: (a) => a.incomeYear === "lower"
      ? "Push bills and equipment purchases into January so the deductions land in a year when your rate may be higher, if you control the timing."
      : "Pay bills and buy needed equipment before December 31 so the deductions land in this higher-rate year, if you control the timing.",
    benefit: () => "The same expense can save more tax in the year with the higher bracket.",
    scenario: (a) => a.incomeYear === "lower"
      ? "If a down year puts you in the 12% bracket and next year looks like 24%, holding a $10,000 equipment purchase and $5,000 of bills until January moves $15,000 of deductions to the higher-rate year, worth about $1,800 more than taking them now."
      : "In a high-income year, paying a $10,000 equipment purchase and $5,000 of bills in December instead of January moves $15,000 of deductions into this year, worth about $4,800 at a 32% bracket.",
  },
  "year-end-income-timing": {
    priority: true,
    title: (a) => a.incomeYear === "lower" ? "Collect income in December to use your lower bracket" : "Defer income into January",
    test: (a) => (a.work?.includes("self_employed") || a.work?.includes("business_owner")) && (a.incomeYear === "higher" || a.incomeYear === "lower"),
    condition: (a) => a.incomeYear === "lower"
      ? "You mentioned your income is lower than normal this year, so pulling income into this year can fill lower brackets."
      : "You mentioned your income is higher than normal this year, so deferring income can lower this year's tax.",
    action: (a) => a.incomeYear === "lower"
      ? "Invoice and collect in December to fill lower brackets this year, if you control the timing. It also makes a Roth conversion cheaper."
      : "Send invoices late in December or collect in January so income counts next year, if you control the timing and do not expect next year's rate to be higher.",
    benefit: () => "Moving income into the lower-rate year, or deferring it by a year, can lower the tax owed on the same income.",
    scenario: (a) => a.incomeYear === "lower"
      ? "A cash-basis consultant in a down year who collects a $20,000 payment on December 28 instead of January 2 taxes it at about 12% instead of 24%, saving roughly $2,400."
      : "A cash-basis consultant in a high year who gets a $20,000 payment on January 2 instead of December 28 moves that income to next year, deferring roughly $6,400 of tax at a 32% bracket for a year.",
  },
  "vehicle-mileage-deduction": {
    test: (a) => (a.work?.includes("self_employed") || a.work?.includes("business_owner")) && a.biz?.includes("drives_for_business"),
    condition: () => "You drive your own vehicle for business.",
    action: () => "Track business miles and deduct them at the IRS standard mileage rate, or compare that with deducting actual vehicle costs.",
    benefit: () => "Business driving adds up quickly into a real deduction, and a simple mileage log is usually all the proof you need.",
    scenario: () => "8,000 business miles at roughly 70 cents a mile is about a $5,600 deduction.",
  },
  "rental-real-estate-basics": {
    test: (a) => a.rental,
    condition: () => "You own rental property.",
    action: () => "Review depreciation, how passive loss rules apply to you, whether short-term rental rules help, and whether a 1031 exchange fits if you plan to sell.",
    benefit: () => "Depreciation can shelter rental income, and the right classification or an exchange can keep a large gain from being taxed right away.",
    scenario: () => "A $300,000 rental building (excluding land) depreciates by about $10,900 a year over 27.5 years, even while it gains value.",
  },
  "family-tax-credits": {
    test: (a) => a.kidsUnder18 || a.childcare,
    condition: () => "You have children or pay for childcare or dependent care.",
    action: () => "Confirm you're claiming the child tax credit, the child and dependent care credit, and a dependent care FSA if your employer offers one.",
    benefit: () => "Credits reduce your tax bill dollar for dollar, which is worth more than a deduction of the same size.",
    scenario: () => "Two children under 17 can mean a $4,400 child tax credit on a return where income is below the phase-out.",
  },
  "obbba-tips-overtime-senior-deductions": {
    test: (a) => a.life?.includes("tips_or_overtime") || a.age === "60_69" || a.age === "70_plus",
    condition: () => "You earn tips or overtime, or you are 65 or older.",
    action: () => "Check the new 2025 to 2028 deductions for qualified tips, overtime pay, and the senior deduction for age 65 and up.",
    benefit: () => "These are deductions many people don't know to claim, and some apply even if you take the standard deduction.",
    scenario: () => "A taxpayer 65 or older under the income limit may deduct up to $6,000 in addition to the regular standard deduction.",
  },
  "crypto-and-capital-gains": {
    test: (a) => a.crypto,
    condition: () => "You own or trade crypto.",
    action: () => "Track your cost basis and holding periods, favor long-term holdings where it makes sense, and review gifting or donating appreciated coins.",
    benefit: () => "Long-term gains are taxed at lower rates than short-term gains, and donating appreciated crypto can avoid the gain entirely.",
    scenario: () => "A $10,000 gain held over a year may be taxed at 15% instead of 24% or more if sold sooner.",
  },
  "section-83b-election": {
    test: (a) => a.equity?.includes("startup_equity_or_options") || a.equity?.includes("c_corp_founder_or_early_employee"),
    condition: () => "You hold stock or options in a startup or private company.",
    action: () => "Ask whether any of your shares are subject to vesting and, if so, whether an 83(b) election is still available within its 30-day window.",
    benefit: () => "Paying tax on the low value at the start, instead of on growth as shares vest, can turn what would be ordinary income into long-term capital gain.",
    scenario: () => "Founder shares bought for $100 with an 83(b) election filed in time are taxed on about $100 up front, instead of on millions of dollars of vesting value later.",
  },
  "w2-withholding-checkup": {
    test: (a) => a.work?.includes("w2") && (a.wb.includes("unsure_withholding") || a.wb.includes("rsu_espp")),
    condition: () => "You have a W-2 job and aren't sure your withholding matches your real tax, or you get stock compensation.",
    action: () => "Run the IRS Tax Withholding Estimator and update your Form W-4.",
    benefit: () => "It avoids a surprise bill or penalty, and avoids lending the government money all year through a big refund.",
    scenario: () => "Someone with $40,000 of RSUs vesting withheld at a flat 22% may owe several thousand dollars more if their real bracket is higher.",
  },
  "fsa-and-commuter-benefits": {
    test: (a) => a.work?.includes("w2") && (a.wb.includes("fsa_available") || a.wb.includes("commuter") || a.childcare),
    condition: () => "You have a W-2 job with FSA or commuter benefits available, or you pay for dependent care.",
    action: () => "Use a health FSA, dependent care FSA and pre-tax commuter benefits for costs you already have.",
    benefit: () => "You pay those costs with pre-tax dollars, which lowers your taxable pay.",
    scenario: () => "$7,500 into a dependent care FSA for someone in the 24% bracket saves roughly $1,800 in federal tax.",
  },
  "rsu-espp-basics": {
    test: (a) => a.work?.includes("w2") && a.wb.includes("rsu_espp"),
    condition: () => "You get RSUs, an ESPP, or stock options from your employer.",
    action: () => "Plan for when each type of equity is taxed, and set aside extra for vesting and sales.",
    benefit: () => "It avoids under-withholding surprises and can move part of a gain to lower long-term rates.",
    scenario: () => "RSUs worth $50,000 at vest are ordinary income that day, and holding the shares over a year gets long-term rates on later gains only.",
  },
  "student-loan-and-education-tax-benefits": {
    test: (a) => a.studentDebt || a.planningEducation,
    condition: () => "You have student loans or pay for college.",
    action: () => "Claim the student loan interest deduction or an education credit, and ask your employer about education assistance.",
    benefit: () => "Credits and deductions lower tax directly, and employer payments toward school or loans can be tax-free.",
    scenario: () => "Paying $3,000 of student loan interest can mean a $2,500 deduction, and a student in college can mean up to a $2,500 American Opportunity Credit.",
  },
  "employer-retirement-plan-options": {
    test: (a) => a.work?.includes("business_owner") && a.eb.includes("no_employee_retirement_plan"),
    condition: () => "You own a business with employees and don't offer a retirement plan.",
    action: () => "Set up a safe harbor 401(k) or SIMPLE IRA and claim the SECURE 2.0 startup credit.",
    benefit: () => "You and your employees can save more, and the credit can cover much of the cost of starting the plan.",
    scenario: () => "A business with 10 non-highly-compensated employees might claim up to $2,500 a year ($250 each) for three years toward startup costs, plus up to $1,000 per employee for contributions.",
  },
  "employer-health-insurance-credit": {
    test: (a) => a.work?.includes("business_owner") && a.eb.includes("offers_health_insurance"),
    condition: () => "You pay part of your employees' health insurance.",
    action: () => "Check whether you qualify for the small employer health insurance credit.",
    benefit: () => "The credit can cover up to 50% of premiums you pay, in addition to deducting them.",
    scenario: () => "A 10-employee business paying $40,000 in qualifying premiums could see a credit of up to $20,000.",
  },
  "employer-child-care-and-leave-credits": {
    test: (a) => a.work?.includes("business_owner") && a.eb.includes("offers_family_benefits"),
    condition: () => "You offer child care help or paid family leave.",
    action: () => "Claim the employer child care credit and the paid family and medical leave credit.",
    benefit: () => "The credits can offset a large share of the cost, and both were expanded or made permanent recently.",
    scenario: () => "A small business spending $100,000 on qualifying child care could claim a credit of up to 50% starting in 2026.",
  },
  "employer-education-assistance-and-hiring-credits": {
    test: (a) => a.work?.includes("business_owner") && a.eb.includes("hires_or_offers_perks"),
    condition: () => "You hire often or want to offer perks like tuition help.",
    action: () => "Offer employees up to $5,250 a year of tax-free education assistance, and check whether any hiring credit is active.",
    benefit: () => "It's a perk employees value that doesn't add to their taxable pay.",
    scenario: () => "Paying $5,250 toward an employee's tuition or student loans is deductible to the business and tax-free to the employee.",
  },
  "accountable-plan-reimbursements": {
    test: (a) => (a.work?.includes("business_owner") && a.eb.includes("reimburses_expenses")) || a.structure === "s_corp_election",
    condition: () => "You or your employees pay business costs personally and get paid back, or you run an S-corp.",
    action: () => "Adopt a written accountable plan so reimbursements aren't taxed as wages.",
    benefit: () => "Reimbursements become tax-free to the employee and still deductible to the business.",
    scenario: () => "Reimbursing an S-corp owner $3,000 a year for home office and phone costs through an accountable plan avoids payroll tax on that $3,000.",
  },
  "retiree-roth-conversion-window": {
    test: (a) => a.retired && (a.ri.includes("withdraws_pretax") || a.ri.length === 0),
    condition: () => "You're retired with pre-tax retirement balances and your income may be low before required distributions start.",
    action: () => "Convert some pre-tax money to Roth each year, filling a lower tax bracket.",
    benefit: () => "You pay tax at lower rates now and shrink future required distributions, with tax-free Roth growth for you and heirs.",
    scenario: () => "Converting $40,000 a year for five years at a 12% to 22% rate can avoid being forced into higher brackets after required distributions begin.",
  },
  "required-minimum-distributions": {
    test: (a) => a.retired && (a.ri.includes("rmd_age") || a.ri.includes("withdraws_pretax")),
    condition: () => "You have traditional retirement accounts that require yearly distributions starting at 73 or 75.",
    action: () => "Plan each year's distribution, consider qualified charitable distributions, and avoid the 25% missed-distribution penalty.",
    benefit: () => "Good timing keeps taxable income and Medicare premiums lower, and avoids penalties.",
    scenario: () => "Someone born in 1955 must begin at 73, and missing a $20,000 distribution could cost a $5,000 penalty.",
  },
  "social-security-taxation-planning": {
    test: (a) => a.retired && a.ri.includes("takes_social_security"),
    condition: () => "You get Social Security and have other income.",
    action: () => "Plan withdrawals so less of your benefit becomes taxable, using Roth money or timing pre-tax withdrawals.",
    benefit: () => "Up to 85% of benefits can be taxed, so staying below thresholds can keep thousands of dollars of benefits out of tax.",
    scenario: () => "Replacing a $10,000 pre-tax withdrawal with a Roth withdrawal can keep that $10,000 from raising provisional income.",
  },
  "medicare-irmaa-planning": {
    test: (a) => a.retired && (a.ri.includes("on_medicare") || a.ri.includes("rmd_age")),
    condition: () => "You're on Medicare or close to it and your income may cross a surcharge threshold.",
    action: () => "Manage income two years ahead and ask Social Security to use a recent year if your income dropped.",
    benefit: () => "Staying under a threshold avoids a monthly Part B and Part D surcharge for the full year.",
    scenario: () => "A married couple one dollar over the $218,000 threshold pays higher premiums for that whole year.",
  },
  "retiree-withdrawal-order-and-zero-percent-gains": {
    test: (a) => a.retired && a.brokerage,
    condition: () => "You're retired and hold a taxable brokerage account.",
    action: () => "Take withdrawals in a deliberate order, and realize gains up to the 0% capital gains line.",
    benefit: () => "It lowers lifetime taxes and resets your cost basis at no federal tax.",
    scenario: () => "A married couple with $60,000 of other taxable income could realize about $38,000 of long-term gains at 0% federal tax in 2026.",
  },
  "retiree-medical-and-hsa-tax-tips": {
    test: (a) => a.retired && (a.hsa || a.ri.includes("on_medicare")),
    condition: () => "You're retired with significant medical costs or an HSA.",
    action: () => "Bunch medical expenses to clear the 7.5% threshold and use HSA money for qualified costs.",
    benefit: () => "Medical withdrawals from an HSA are tax-free, and bunching can unlock an itemized deduction.",
    scenario: () => "A retiree with $12,000 of medical costs and $60,000 of income can deduct the amount above $4,500 if they itemize.",
  },
  "state-taxes-on-retirement-income": {
    test: (a) => a.retired && a.ri.includes("considering_move"),
    condition: () => "You're thinking about moving to a different state in retirement.",
    action: () => "Compare how each state taxes Social Security, pensions and withdrawals, and plan your residency change carefully.",
    benefit: () => "Moving to a lower-tax state can save thousands each year, if the residency change is done properly.",
    scenario: () => "A retiree with $80,000 of pension and withdrawals in a state with 5% income tax pays about $4,000 a year that a no-income-tax state wouldn't charge.",
  },
  "inherited-ira-and-legacy-planning": {
    test: (a) => a.retired && a.ri.includes("leaving_to_heirs"),
    condition: () => "You want to leave money to children or other heirs.",
    action: () => "Review beneficiaries and consider Roth conversions, since heirs generally must empty inherited IRAs within 10 years.",
    benefit: () => "Roth accounts pass to heirs tax-free, and it avoids forcing them into high brackets.",
    scenario: () => "A $500,000 pre-tax IRA left to a child must generally be emptied in 10 years, which can add about $50,000 of income a year for them.",
  },
  "augusta-rule": {
    test: (a) => (a.work?.includes("business_owner") || a.work?.includes("self_employed")) && (a.biz?.includes("conferences_prof_dev") || a.biz?.includes("marketing_advertising") || a.homeowner),
    condition: () => "You run a business and have a home that could reasonably host a meeting, offsite, or planning session.",
    action: () => "Rent your home to your own business for up to 14 days a year, at a documented fair market rate.",
    benefit: () => "The business deducts the rent as a normal expense, while you personally owe no tax on that rental income at all.",
    scenario: () => "Renting your home to your business for 3 planning meetings a year at a documented $1,000/day fair market rate generates a $3,000 deductible expense for the business, and that $3,000 is completely tax-free income to you personally.",
  },
  "business-credit-card-points-strategy": {
    test: (a) => a.biz?.includes("business_credit_card"),
    condition: () => "You have meaningful recurring business expenses and pay your card balance in full every month.",
    action: () => "Route that spending through a business rewards card and time any known large purchases around a sign-up bonus's minimum spend.",
    benefit: () => "Points earned on business spending aren't taxable income, and a well-timed sign-up bonus can be worth well beyond the card's normal earn rate.",
    scenario: () => "Timing a known $10,000 equipment purchase to hit a card's $10,000 minimum spend requirement could unlock a sign-up bonus worth $1,000 to $2,000 in travel value, on spending you were making anyway.",
  },
  "bonus-depreciation-cost-segregation": {
    test: (a) => a.biz?.includes("owns_business_real_estate") || a.purchases?.includes("building") || a.bizType?.includes("real_estate"),
    condition: () => "The business owns or is buying real estate or major equipment.",
    action: () => "Get a cost segregation study done to identify components that qualify for 100% first-year bonus depreciation.",
    benefit: () => "This can turn a large share of the purchase price into a deduction in year one instead of spreading it over decades.",
    scenario: () => "A cost segregation study on a $1,000,000 building purchase might identify $200,000 to $300,000 in components eligible for 100% first-year bonus depreciation, turning that portion into an immediate deduction instead of a 39-year write-off.",
  },
  "real-estate-depreciation-offset-active-income": {
    test: (a) => a.biz?.includes("owns_business_real_estate") || a.nonworkingSpouse || a.bizType?.includes("real_estate"),
    condition: () => "You own or are considering investment real estate, or the business owns its own building.",
    action: () => "Look into real estate professional status, the short-term rental loophole, or having the business depreciate its own property.",
    benefit: () => "Any of these paths can let real estate depreciation losses offset active income, not just passive income, under the right conditions.",
    scenario: () => "A household where one spouse earns $300,000 in W-2 income and the other qualifies as a real estate professional (750+ hours/year) could use rental property depreciation losses to offset that $300,000 of active income directly.",
  },
  "s-corp-election": {
    test: (a) => (a.work?.includes("self_employed") || a.structure === "sole_prop_or_single_member_llc") && incomeAtLeast(a, "75-150k"),
    condition: () => "You're self-employed with net business income around $100,000 or more.",
    action: () => "Elect S-corp taxation for your business and pay yourself a reasonable W-2 salary.",
    benefit: () => "Only your W-2 salary is subject to self-employment tax after that, instead of your entire net income the way a sole proprietorship is taxed.",
    scenario: () => "A sole proprietor with $150,000 net income pays roughly 15.3% self-employment tax on the full amount, about $22,950. As an S-corp paying a $90,000 reasonable salary and taking $60,000 as distributions, only the $90,000 salary is subject to that tax, saving roughly $9,000 a year before added payroll and compliance costs.",
  },
  "reasonable-w2-salary-optimization": {
    test: (a) => a.structure === "s_corp_election",
    condition: () => "You've already elected S-corp status.",
    action: () => "Revisit how your W-2 salary is set, rather than leaving it at whatever number you started with.",
    benefit: () => "Your salary directly affects your retirement plan contribution room and your QBI deduction, on top of payroll tax, so getting it right is worth real money either direction.",
    scenario: () => "Lowering an S-corp salary from $100,000 to $70,000 might reduce payroll tax by around $4,500, but it also shrinks Solo 401(k) contribution room and could invite scrutiny if the number no longer looks defensible for the actual work performed.",
  },
  "qbi-section-199a-deduction": {
    test: (a) => (a.work?.includes("self_employed") || a.work?.includes("business_owner")) && incomeAtLeast(a, "150-250k"),
    condition: () => "You own a pass-through business and your taxable income is near or above roughly $190,000 single or $380,000 married, the 2025 QBI phase-out range.",
    action: () => "Work with a tax professional on ways to keep taxable income below the threshold in a given year, such as retirement plan contributions, since staying under it can preserve some or all of the 20% deduction, especially if you're in a specialty service field where it disappears entirely above the upper threshold.",
    benefit: () => "On $150,000 of qualified business income, the full 20% deduction shelters $30,000 from tax. In a specialty service field, crossing the upper threshold can erase that deduction completely, so the income level itself becomes something worth managing.",
    scenario: () => "A sole proprietor with $150,000 of qualified business income and taxable income under the threshold deducts $30,000 (20%) from taxable income. The same business as a specialty service field with income above the upper threshold would lose the deduction entirely.",
  },
  "ptet-election": {
    test: (a) => (a.structure === "s_corp_election" || a.structure === "partnership_multi_member") && a.highSalt,
    condition: () => "You own an S-corp or partnership and pay significant state income tax.",
    action: () => "Look into your state's Pass-Through Entity Tax election.",
    benefit: () => "The business deducts the state tax as a business expense instead of you being limited by the personal SALT cap, sidestepping that cap entirely.",
    scenario: () => "An S-corp owner in a 10% state tax bracket with $500,000 of pass-through income routes that state tax through the business instead of personally, making the full $50,000 federally deductible instead of being limited by the personal SALT cap.",
  },
  "sticky-states-domicile-planning": {
    test: (a) => a.life?.includes("recently_moved_states") || a.life?.includes("living_or_working_abroad"),
    condition: () => "You're relocating between states, or planning a move abroad from a high-tax state.",
    action: () => "Take concrete steps to document the move: change your license, register to vote, close local accounts, and sell or rent out your old home.",
    benefit: () => "Some states are aggressive about still treating you as a resident after you've left, and a well-documented departure is your main defense.",
    scenario: () => "Someone leaving California for Texas who updates their license, voter registration, and bank accounts, and sells their California home, has a much stronger case in a residency audit than someone who keeps a California address just in case.",
  },
  "foreign-earned-income-exclusion": {
    test: (a) => a.life?.includes("living_or_working_abroad"),
    condition: () => "You're living or working outside the U.S.",
    action: () => "Claim the foreign earned income exclusion on qualifying wages or self-employment income.",
    benefit: () => "It excludes a meaningful chunk of foreign-earned income from U.S. tax, though it doesn't apply to investment income and doesn't reduce self-employment tax.",
    scenario: () => "A remote worker earning $110,000 abroad and meeting the physical presence test could exclude the entire amount from U.S. income tax under the roughly $130,000 2025 exclusion limit, owing $0 in federal income tax on those wages.",
  },
  "foreign-tax-credit": {
    test: (a) => a.life?.includes("living_or_working_abroad"),
    condition: () => "You're living in a high-tax foreign country or have significant foreign investment income.",
    action: () => "Claim the foreign tax credit instead of, or alongside, the foreign earned income exclusion.",
    benefit: () => "It has no income cap and can apply to investment income, where the exclusion can't, and unused credits carry forward up to 10 years.",
    scenario: () => "Paying $15,000 in foreign income tax on $60,000 of investment income earned abroad could offset roughly $15,000 of U.S. tax liability dollar for dollar through the foreign tax credit.",
  },
  "fbar-fatca-international-reporting": {
    test: (a) => a.life?.includes("foreign_bank_accounts") || a.life?.includes("living_or_working_abroad"),
    condition: () => "You hold foreign bank or investment accounts, or own part of a company incorporated outside the U.S.",
    action: () => "Total up your foreign account balances against the $10,000 FBAR threshold and the $200,000 / $400,000 FATCA thresholds, then file by April 15 (FBAR gets an automatic extension to October 15) if you're over them, or look into the IRS streamlined filing procedures if you've already missed past years.",
    benefit: () => "These penalties are separate from your regular tax bill and can be severe even with no tax owed: FBAR penalties can run up to $250,000 for willful violations, and FATCA and Form 5471 penalties start at $10,000 per form, per year.",
    scenario: () => "Someone with $15,000 spread across two foreign bank accounts is required to file an FBAR, since the combined total exceeds the $10,000 threshold, even though no tax is owed on the accounts themselves and neither account alone crosses that line.",
  },
  "expat-self-employment-tax-mitigation": {
    test: (a) => a.work?.includes("self_employed") && a.life?.includes("living_or_working_abroad"),
    condition: () => "You're self-employed and living or working abroad.",
    action: () => "Look into an S-corp election or Solo 401(k) contributions to offset self-employment tax.",
    benefit: () => "The foreign earned income exclusion doesn't exempt you from the 15.3% self-employment tax, so these are separate ways to reduce that specific bill.",
    scenario: () => "A self-employed consultant abroad who excludes $100,000 via the FEIE still owes roughly $14,000 in self-employment tax on that income, since the exclusion only applies to income tax, not the 15.3% self-employment tax.",
  },
  "startup-equity-valuation-basics": {
    test: (a) => a.equity?.includes("startup_equity_or_options"),
    condition: () => "You hold stock options or equity at a startup.",
    action: () => "Work out what your equity is actually worth using the company's share count and both its internal and external share prices.",
    benefit: () => "Knowing the real numbers, not just the headline valuation, is the foundation for every other decision about your equity.",
    scenario: () => "10,000 options with a $1 strike price at a company now valued at $10/share represent roughly $90,000 of value (a $9 spread times 10,000 shares), before considering taxes owed on exercise or sale.",
  },
  "equity-vesting-and-ownership-percentage": {
    // Megan: this entry is purely informational (know your ownership %) with no
    // tax angle and no real decision attached, so it doesn't belong in a
    // "tax savings" quiz result. Excluded from the quiz via test: () => false,
    // same pattern as obbba-gambling-loss-deduction-change below. Still exists
    // in advisorKnowledge.js and is still usable by the in-app Tax Strategy Assistant.
    test: () => false,
    condition: () => "",
    action: () => "",
    benefit: () => "",
    scenario: () => "",
  },
  "liquidation-preference": {
    test: (a) => a.equity?.includes("startup_equity_or_options"),
    condition: () => "You're evaluating equity at a company that's raised significant venture funding.",
    action: () => "Find out the company's total liquidation preference before assuming your shares are worth the headline valuation.",
    benefit: () => "The company generally has to sell for more than that preference before common shareholders, employees included, see any proceeds at all.",
    scenario: () => "A company that raised $50,000,000 and sells for $60,000,000 might leave common shareholders splitting only $10,000,000, since investors with liquidation preference get their $50,000,000 back first.",
  },
  "post-termination-exercise-period": {
    test: (a) => a.equity?.includes("startup_equity_or_options"),
    condition: () => "You're thinking about leaving a startup with vested, unexercised stock options.",
    action: () => "Calculate the full cost to exercise (strike price times vested shares) and look up your plan's exact post-termination exercise window while you're still employed, not after you've given notice.",
    benefit: () => "A short window, historically often just 90 days, can force a rushed, expensive decision. Knowing the real dollar cost and the real deadline while you still have leverage gives you room to negotiate a longer window or plan the cash instead of scrambling.",
    scenario: () => "Someone with 20,000 vested options at a $2 strike price faces a $40,000 bill to exercise. Learning the window is a standard 90 days versus a multi-year PTEP, while still employed, is the difference between a rushed decision and a planned one.",
  },
  "qsbs-overview": {
    test: (a) => a.equity?.includes("c_corp_founder_or_early_employee"),
    condition: () => "You're a founder, early employee, or investor holding C-corp stock.",
    action: () => "Confirm your shares qualify for QSBS treatment and track your holding period toward 5 years.",
    benefit: () => "Qualifying shares can exclude federal tax on a large share of eventual gain, up to $15 million or 10 times what you paid, whichever is greater.",
    scenario: () => "An early employee who invested $50,000 for shares now worth $8,000,000 at exit could exclude up to $15,000,000 from federal tax entirely (the greater of $15,000,000 or 10 times their $50,000 basis), if QSBS requirements are met.",
  },
  "qsbs-requirements": {
    test: (a) => a.equity?.includes("c_corp_founder_or_early_employee"),
    condition: () => "You own shares in a C-corporation, and the company is planning a stock buyback, a large financing round, or a big move of company cash into non-operating investments.",
    action: () => "Get legal review of that transaction before it happens, since QSBS status can be broken by one company-level decision and the damage applies to every shareholder, not just the person involved in the transaction.",
    benefit: () => "Losing QSBS status can turn a stock sale that could have been federal-tax-free up to $10 million or more per shareholder into a fully taxable one, for everyone on the cap table, not just the shareholder who triggered it.",
    scenario: () => "A company buying back $10,000,000 of stock from a departing cofounder without legal review, or letting non-operating investments creep past 10% of assets, can push total assets over the $75,000,000 ceiling and jeopardize QSBS status for every other shareholder still holding stock.",
  },
  "qsbs-rollover-1045": {
    test: (a) => a.equity?.includes("c_corp_founder_or_early_employee") && a.life?.includes("planning_to_sell_business_or_appreciated_asset"),
    condition: () => "You're selling or have sold QSBS-eligible shares before the 5-year mark.",
    action: () => "Reinvest the proceeds into new QSBS-eligible stock within 60 days under a Section 1045 rollover.",
    benefit: () => "Your holding period clock carries over instead of resetting, and newer partial-exclusion rules can already apply even without a full 5-year hold.",
    scenario: () => "Selling QSBS-eligible shares after 3 years instead of the full 5 and reinvesting the proceeds into a new qualifying company within 60 days preserves the holding period, needing only 2 more years on the new investment instead of restarting the clock.",
  },
  "qsbs-stacking-gifting": {
    test: (a) => a.equity?.includes("c_corp_founder_or_early_employee") && a.life?.includes("building_estate_legacy_plan"),
    condition: () => "You own shares in a C-corporation and expect significant appreciation before an exit.",
    action: () => "Gift some QSBS shares to family members like parents, siblings, or children before the exit.",
    benefit: () => "Each recipient gets their own separate exclusion, and the 5-year holding clock carries over from your original purchase date rather than resetting.",
    scenario: () => "A founder expecting a $30,000,000 exit gifts $5,000,000 of shares each to two parents and two siblings before the sale, potentially creating four additional exclusions on top of their own, since the 5-year holding period carries over from the original purchase date.",
  },
  "qsbs-stacking-trusts": {
    test: (a) => a.equity?.includes("c_corp_founder_or_early_employee") && a.life?.includes("building_estate_legacy_plan") && incomeAtLeast(a, "500k+"),
    condition: () => "You hold substantial anticipated QSBS gains and are already working with estate planning counsel.",
    action: () => "Combine trusts with QSBS gifting as part of your estate plan.",
    benefit: () => "This can multiply your total tax-free exclusion across multiple trusts while also addressing estate tax exposure.",
    scenario: () => "Combining gifting with several trusts for children and a spouse could multiply a single $15,000,000 QSBS exclusion into $60,000,000 or more of combined tax-free gain across the family, alongside separate estate tax benefits.",
  },
  "obbba-tax-rates-and-corporate-rate-permanent": {
    test: (a) => a.life?.includes("expecting_high_income_year"),
    condition: () => "You're expecting a much higher income year than usual.",
    action: () => "Plan around the current tax brackets with confidence instead of assuming they'll revert to older, higher rates.",
    benefit: () => "Recent legislation made the lower bracket structure permanent, removing a scheduled expiration that used to complicate multi-year planning.",
    scenario: () => "Someone earning $80,000 more than usual this year can plan around the current 10 to 37% bracket structure holding steady long-term, rather than needing to rush income into this year on the assumption that older, higher brackets would return.",
  },
  "obbba-qsbs-expansion": {
    test: (a) => a.equity?.includes("c_corp_founder_or_early_employee"),
    condition: () => "You hold or are considering C-corp stock.",
    action: () => "Factor in the expanded QSBS exclusion and new partial-exclusion tiers when timing a sale.",
    benefit: () => "The per-shareholder exclusion increased, the asset test ceiling rose, and holding just 3 or 4 years now qualifies for a partial exclusion instead of nothing.",
    scenario: () => "A shareholder who held C-corp stock for 3 years now qualifies for a 50% QSBS exclusion on sale, worth potentially millions, where under the old rules they'd have owed full tax on the gain until reaching the 5-year mark.",
  },
  "obbba-bonus-depreciation-restored": {
    test: (a) => a.biz?.includes("owns_business_real_estate") || a.biz?.includes("equipment_tech_purchases") || a.purchases?.some((v) => ["heavy_vehicle", "equipment", "building", "improvements"].includes(v)),
    condition: () => "The business is buying real estate, equipment, or other depreciable physical assets.",
    action: () => "Time major purchases to take advantage of 100% first-year bonus depreciation.",
    benefit: () => "This lets you write off qualifying assets immediately instead of over many years, restored by recent legislation after being scheduled to phase down.",
    scenario: () => "A $500,000 equipment purchase for the business now qualifies for a full $500,000 first-year deduction under restored 100% bonus depreciation, instead of that deduction being spread out over several years.",
  },
  "obbba-software-rd-amortization-relief": {
    test: (a) => a.work?.includes("business_owner") && (a.bizSpecial?.includes("rd") || a.bizType?.includes("tech")),
    condition: () => "You employ software developers or R&D staff in the business.",
    action: () => "Deduct their salary costs in full in the year incurred instead of spreading the deduction out.",
    benefit: () => "Recent legislation reversed a rule that only allowed a small fraction of these costs to be deducted immediately, which had been distorting the true cost of engineering headcount.",
    scenario: () => "A business paying $1,000,000/year in U.S. engineer salaries can now deduct the full $1,000,000 in year one, instead of only about $200,000 immediately with the rest spread over 5 years under the prior rule.",
  },
  "obbba-gift-estate-tax-exemption-increase": {
    test: (a) => a.life?.includes("building_estate_legacy_plan") && incomeAtLeast(a, "500k+"),
    condition: () => "Your net worth is approaching the estate and gift tax exemption thresholds.",
    action: () => "Revisit your gifting and estate plan against the new, higher exemption amount.",
    benefit: () => "The exemption increased significantly, giving households more room to gift or transfer wealth without triggering estate tax.",
    scenario: () => "A married couple can now gift or leave up to $30,000,000 combined without triggering federal estate or gift tax, up from roughly $28,000,000 under the prior law's 2024 level.",
  },
  "obbba-qbi-deduction-permanence": {
    test: (a) => a.work?.includes("self_employed") || a.work?.includes("business_owner"),
    condition: () => "You own a pass-through business.",
    action: () => "Plan multiple years out around the QBI deduction with more confidence.",
    benefit: () => "It's now permanent instead of being scheduled to expire in 2026, though the same income and wage-based limitations still apply.",
    scenario: () => "A pass-through business owner planning a 10-year growth trajectory can now count on the 20% QBI deduction remaining available the entire time, rather than planning around a 2026 expiration that no longer applies.",
  },
  "obbba-trump-accounts-law-change": {
    test: (a) => a.kidsUnder18,
    condition: () => "You have children under 18, or are expecting one.",
    action: () => "Open this new account type for them.",
    benefit: () => "It doesn't require the child to have earned income, and withdrawals for qualified expenses are taxed as capital gains rather than ordinary income.",
    scenario: () => "A child born in 2027 gets a $1,000 seed deposit automatically, and if parents contribute the full $5,000/year, simplified projections suggest a balance in the hundreds of thousands by age 18, all invested in a broad market index.",
  },
  "obbba-opportunity-zone-permanence": {
    test: (a) => a.life?.includes("planning_to_sell_business_or_appreciated_asset"),
    condition: () => "You're considering an opportunity zone investment for a capital gain.",
    action: () => "Plan around the program with more certainty now that it's permanent instead of set to expire.",
    benefit: () => "New rules taking effect for 2027 investments (a 5-year deferral, a basis step-up, and tax-free growth after 10 years) now have a program that isn't going away.",
    scenario: () => "Someone planning a $500,000 capital gain from a 2028 asset sale can now count on the opportunity zone program still existing under the new post-2027 rules, instead of racing to invest before an expiration date.",
  },
  "obbba-gambling-loss-deduction-change": {
    test: () => false,
    condition: () => "",
    action: () => "",
    benefit: () => "",
    scenario: () => "",
  },
  "catch-up-contributions-50-plus": {
    priority: true,
    test: (a) => (a.age === "40_59" || a.age === "60_69") && !a.retired && a.retAccounts?.some((v) => ["employer_401k", "solo_401k", "simple_ira"].includes(v)),
    condition: (a) => a.age === "60_69" ? "You told us you are 60 to 69 and contribute to a 401(k)." : "You told us you contribute to a 401(k), and you are in the 40 to 59 age range.",
    action: (a) => a.age === "60_69"
      ? "Add the catch-up on top of the $24,500 limit: $8,000 if you are 50 or older (total $32,500), or $11,250 if you turn 60, 61, 62 or 63 this year (total $35,750)."
      : "If you are 50 or older, add the $8,000 catch-up on top of the $24,500 limit, a total of $32,500 for 2026.",
    benefit: () => "A catch-up lets you defer more tax-advantaged money in the years you can save the most.",
    scenario: () => "Someone 52 in the 24% bracket who adds the $8,000 catch-up defers about $1,920 of federal tax this year. (If your W-2 wages from your employer were over $150,000 last year, the catch-up has to go in as Roth, so there is no deduction.)",
  },
  "savers-credit": {
    test: (a) => !a.retired && a.income === "<75k" && (a.work?.includes("w2") || a.work?.includes("self_employed")),
    condition: () => "Your income is in the range where the Saver's Credit can apply.",
    action: () => "Contribute to an IRA or 401(k) and claim the Saver's Credit: it is worth 10%, 20% or 50% of the first $2,000 you contribute ($4,000 if married filing jointly), up to $1,000 ($2,000 joint). For 2026 your adjusted gross income must be under $40,250 (single), $60,375 (head of household) or $80,500 (joint).",
    benefit: () => "It is a credit, so it cuts your tax dollar for dollar on top of any deduction or tax-free growth.",
    scenario: () => "A single filer with $24,000 of adjusted gross income who puts $2,000 into a Roth IRA can claim a credit of up to $1,000 (50% of $2,000), roughly half of what they contributed back as lower tax.",
  },
  "niit-additional-medicare-planning": {
    test: (a) => (isJoint(a) ? incomeAtLeast(a, "250-500k") : incomeAtLeast(a, "150-250k")) && (a.brokerage || a.rental || a.crypto || a.equity?.length > 0 || a.life?.includes("planning_to_sell_business_or_appreciated_asset")),
    condition: () => "You have investment income and your income may be over the $200,000 ($250,000 joint) level where a 3.8% surtax applies.",
    action: () => "Cut the investment income the 3.8% net investment income tax hits: harvest losses, hold investments for more than a year, favor municipal bonds, use retirement accounts and an HSA, and ask whether your rental can count as active business income.",
    benefit: () => "The tax is 3.8% of the smaller of your investment income or the amount your income is over $200,000 ($250,000 joint), so lowering either one lowers the tax.",
    scenario: () => "Someone with $300,000 of income and $50,000 of investment income pays 3.8% on $50,000, about $1,900. Harvesting $20,000 of losses cuts that by about $760.",
  },
  "social-security-claiming-age": {
    test: (a) => (a.retired && a.ri?.includes("takes_social_security")) || (!a.retired && a.age === "60_69"),
    condition: () => "You are at or near the age to claim Social Security.",
    action: () => "Pick your claiming age on purpose: compare your benefit at 62, full retirement age and 70 on your ssa.gov statement, and line it up with your Roth conversion years. If your full retirement age is 67, waiting until 70 pays about 77% more per month than claiming at 62.",
    benefit: () => "The claiming age changes your monthly benefit for life, and delaying can create low-income years that are good for Roth conversions.",
    scenario: () => "If your full retirement age is 67 and your benefit there is $2,000 a month, claiming at 62 pays about $1,400 and claiming at 70 pays about $2,480, a $1,080 monthly difference.",
  },
  "early-retirement-penalty-free-access": {
    awareness: true,
    test: (a) => a.age === "40_59" && !a.retired && a.retAccounts?.some((v) => v !== "none"),
    condition: () => "You are in the age range where retiring before 59 and a half is a real option.",
    action: () => "Know the two ways to take retirement money early without the 10% penalty: the Rule of 55 (leave your employer in or after the year you turn 55 and withdraw from that employer's 401(k)) and 72(t) payments (a fixed schedule of equal withdrawals that must run five years or until 59 and a half, whichever is longer).",
    benefit: () => "Either avoids the 10% early withdrawal penalty on money you need before 59 and a half.",
    scenario: () => "Someone who leaves their job at 56 and takes $40,000 from that employer's 401(k) under the Rule of 55 avoids a $4,000 penalty.",
  },
  "net-unrealized-appreciation": {
    awareness: true,
    test: (a) => a.work?.includes("w2") && a.retAccounts?.includes("employer_401k") && a.wb?.includes("rsu_espp"),
    condition: () => "You get company stock through work, and it may also sit in your 401(k).",
    action: () => "If your 401(k) holds company stock, ask about net unrealized appreciation before you roll it into an IRA: you pay ordinary tax only on what the shares cost, and the growth is taxed at long-term capital gains rates when you sell. It requires taking the whole 401(k) balance out in one year after a qualifying event.",
    benefit: () => "The growth is taxed at long-term capital gains rates instead of ordinary income rates.",
    scenario: () => "Shares that cost $20,000 and are now worth $120,000: the $100,000 of growth is taxed at about 15% instead of 32%, roughly $17,000 less tax than rolling them into an IRA and withdrawing.",
  },
  "multiple-entity-structure-review": {
    awareness: true,
    test: (a) => a.entities === "multiple" && (selfWork(a) || owner(a)),
    condition: () => "You told us you run more than one business or entity.",
    action: () => "Ask whether each business is set up the right way: consider an S-corp election for the one that is profitable, combining businesses that really operate as one, and charging fair prices when one of your businesses does work for another.",
    benefit: () => "Each business is taxed on its own profit, so the setup of each one can change your self-employment tax and your deductions.",
    scenario: () => "A profitable $120,000 consulting business next to a $5,000 side business may save self-employment tax by electing S-corp status for the first one only.",
  },
  "startup-costs-deduction": {
    test: (a) => a.bizStage === "startup" && (a.work?.includes("business_owner") || a.work?.includes("self_employed")),
    condition: () => "You told us the business is new.",
    action: () => "Deduct your startup costs in year one: up to $5,000 of startup costs and $5,000 of organizational costs, with the rest spread over 15 years. Gather what you spent before opening, such as research, advertising, training and legal fees to form the entity.",
    benefit: () => "Each $5,000 deducted in year one saves tax right away instead of over 15 years.",
    scenario: () => "$10,000 of qualifying costs deducted in year one saves about $2,400 at a 24% rate, instead of about $160 a year over 15 years.",
  },
  "rd-tax-credit": {
    test: (a) => a.work?.includes("business_owner") && (a.bizSpecial?.includes("rd") || a.bizType?.includes("tech")),
    condition: () => "You build or improve software, products or processes.",
    action: () => "Claim the research and development credit and deduct research costs right away. Track developer and engineer time by project. If your business is under $5 million of receipts and five years old or less, you can apply up to $500,000 of the credit against payroll taxes.",
    benefit: () => "It is a dollar-for-dollar credit, and for young companies it can offset payroll tax even with no income tax owed.",
    scenario: () => "A startup with $300,000 of qualifying developer wages could see a credit in the tens of thousands of dollars applied against its payroll taxes.",
  },
  "small-employer-retirement-startup-credit": {
    test: (a) => a.work?.includes("business_owner") && ["none", "1_4", "5_19", "20_49"].includes(a.staffSize) && a.eb?.includes("no_employee_retirement_plan"),
    condition: () => "You have a small team and no retirement plan for it.",
    action: () => "Start an employer retirement plan and claim the startup credit: for three years it covers 100% of setup and administration costs, up to $250 per non-highly-compensated employee (minimum $500, maximum $5,000 a year), with extra credit for automatic enrollment and for contributions you make for employees earning $100,000 or less.",
    benefit: () => "The credit can pay for most of the plan's first three years of costs, and you get a bigger retirement account too.",
    scenario: () => "A 10-person business with $4,000 of yearly plan costs could have those costs credited back for three years, about $12,000.",
  },
  "ichra-qsehra-health-reimbursement": {
    awareness: true,
    test: (a) => a.work?.includes("business_owner") && ["1_4", "5_19", "20_49"].includes(a.staffSize),
    condition: () => "You have employees and pay for or could offer health coverage.",
    action: () => "Ask about an ICHRA or QSEHRA, which reimburse employees' own health insurance premiums tax-free instead of buying a group plan, and check whether you qualify for the small business health care tax credit.",
    benefit: () => "You deduct the reimbursements and employees receive them tax-free, often at a predictable cost.",
    scenario: () => "Reimbursing $400 a month for each of 8 employees is about $38,400 a year that you deduct and they receive tax-free.",
  },
  "business-sale-planning": {
    test: (a) => (a.bizStage === "exit" || a.life?.includes("planning_to_sell_business_or_appreciated_asset")) && (a.work?.includes("business_owner") || a.work?.includes("self_employed")),
    condition: () => "You are planning to sell or hand off the business.",
    action: () => "Plan the sale at least two years ahead: compare an asset sale and a stock sale, ask whether an installment sale or an ESOP fits, check whether the qualified small business stock exclusion applies if you are a C corporation, and time retirement contributions and charitable gifts for the sale year.",
    benefit: () => "The structure of the sale can change how much of the gain is taxed at capital gains rates and when.",
    scenario: () => "On a $2 million sale, moving even $200,000 of the price from ordinary-rate assets to capital-gain assets can save tens of thousands of dollars.",
  },
  "accounting-method-and-inventory": {
    awareness: true,
    test: (a) => (a.work?.includes("business_owner") || a.work?.includes("self_employed")) && (a.bizSpecial?.includes("inventory") || a.bizType?.includes("products")),
    condition: () => "You sell products or hold inventory.",
    action: () => "Ask whether you can use the cash method even with inventory, deduct small purchases of $2,500 or less immediately under the de minimis safe harbor, and write down inventory that is obsolete or damaged.",
    benefit: () => "These choices can move deductions into the current year and defer income.",
    scenario: () => "Switching to the cash method can defer tax on a year-end receivable balance of $100,000, worth about $24,000 of tax deferred at 24%.",
  },
  "obbba-salt-cap-increase-to-40k": {
    test: (a) => a.highSalt && !incomeAtLeast(a, "500k+"),
    condition: () => "You pay significant state and local taxes and your income is under the phase-out range.",
    action: () => "Itemize and claim the increased SALT deduction instead of assuming you're still capped at the old $10,000 limit.",
    benefit: () => "The cap quadrupled to $40,000 starting in 2025, directly increasing how much of your state and local tax bill is deductible.",
    scenario: () => "A household paying $28,000/year in combined state income and property tax could deduct the full amount starting in 2025, where before 2025 only $10,000 of that same $28,000 was deductible, an $18,000 increase in deductible expenses.",
  },
};

// The retirement question lists account types; the rules below were written
// against a few summary categories, so derive those from the list.
function deriveRetirement(raw) {
  const r = Array.isArray(raw.retirement) ? raw.retirement : raw.retirement ? [raw.retirement] : [];
  if (r.some((v) => ["employer_401k_only", "self_employed_no_plan_yet", "self_employed_has_solo401k_or_sep", "both_employer_and_self_employed", "not_sure_none"].includes(v))) return r[0];
  const employer = r.includes("employer_401k");
  const selfPlan = r.includes("solo_401k") || r.includes("sep_ira") || r.includes("simple_ira");
  if (employer && selfPlan) return "both_employer_and_self_employed";
  if (selfPlan) return "self_employed_has_solo401k_or_sep";
  if (employer) return "employer_401k_only";
  const selfWork = (raw.work || []).includes("self_employed") || (raw.work || []).includes("business_owner");
  const anyOther = r.some((v) => v !== "none" && v !== "unsure_more");
  if (selfWork) return "self_employed_no_plan_yet";
  return anyOther ? "not_sure_none" : "not_sure_none";
}

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
    retirement: deriveRetirement(raw),
    retAccounts: Array.isArray(raw.retirement) ? raw.retirement : [],
    sepOnly: Array.isArray(raw.retirement) && raw.retirement.includes("sep_ira") && !raw.retirement.includes("solo_401k"),
    healthInsurance: raw.healthInsurance || null,
    retired: (raw.work || []).includes("retired"),
    ri: raw.retiredIncome || [],
    wb: raw.workBenefits || [],
    eb: raw.employerSituation || [],
    studentDebt: household.includes("education_debt_or_tuition"),
    estimatedTaxes: raw.estimatedTaxes || null,
    incomeYear: raw.incomeYear || null,
    timing: raw.timing || [],
    childcare: household.includes("pays_childcare"),
    rental: investingGiving.includes("owns_rental_property"),
    crypto: investingGiving.includes("owns_crypto"),
    brokerage: investingGiving.includes("taxable_brokerage_investing"),
    charity: investingGiving.includes("gives_to_charity_regularly"),
    appreciatedStock: investingGiving.includes("donates_appreciated_stock"),
    hsa: raw.hsaStatus === "has_hsa" || raw.hsaStatus === "hdhp_no_hsa",
    hsaNotSure: raw.hsaStatus === "not_sure",
    hsaStatus: raw.hsaStatus || null,
    biz: raw.business || [],
    structure: raw.structure || null,
    entities: raw.entities || null,
    bizType: raw.bizType || [],
    ownership: raw.ownership || null,
    bizProfit: raw.bizProfit || null,
    bizStage: raw.bizStage || null,
    staffSize: raw.staffSize || null,
    ownerPay: raw.ownerPay || null,
    purchases: raw.purchases || [],
    bizSpecial: raw.bizSpecial || [],
    equity: raw.equity || [],
    life: raw.life || [],
  };
}

// "Tax Fundamentals" deliberately excluded. Megan wants quiz results to
// stay purely actionable (concrete strategies with a real If/Then/Benefit),
// not general concepts like "standard vs. itemized deductions." Those
// entries still exist in lib/advisorKnowledge.js and are still used by the
// in-app Tax Strategy Assistant, which is a better fit for open-ended
// conceptual questions; they're just not surfaced by this quiz.
const CATEGORY_ORDER = [
  "Retirement Accounts",
  "Health & Education Accounts",
  "Family & Dependents",
  "Business Deductions",
  "Business Structure & Elections",
  "Employer Benefits & Payroll",
  "Workplace Benefits",
  "Retirement Income",
  "Planning & Cash Flow",
  "Investment Tax",
  "Charitable Giving",
  "Equity & Startups",
  "State & Residency",
  "Recent Law Changes",
];

// Per-category cap, not a flat overall cap. A flat cap taken in category
// order would silently starve every category after the first few (e.g. a
// business owner's Business Deductions matches would never be seen because
// Retirement Accounts matches alone could fill the whole quota). Capping per
// category keeps every relevant area represented.
const MAX_PER_CATEGORY = 7;


// ---------------------------------------------------------------------------
// Blockers: things in the person's way, found by combining their answers.
// Each one names the problem, the fix, and what ignoring it costs. They are
// listed first in the results. Add a rule here when a combination of answers
// quietly breaks a strategy or a limit.
// ---------------------------------------------------------------------------
const hasAcct = (a, ...ids) => ids.some((i) => a.retAccounts?.includes(i));
// Joint-return thresholds apply to married filing jointly and qualifying surviving spouse.
const isJoint = (a) => a.filingStatus === "mfj" || a.filingStatus === "qss";
// Married filing separately: the direct Roth IRA income limit is $0 to $10,000, so nearly everyone above the lowest band is over it.
const aboveRothLimit = (a) =>
  a.filingStatus === "mfs" ? incomeAtLeast(a, "75-150k") : isJoint(a) ? incomeAtLeast(a, "250-500k") : incomeAtLeast(a, "150-250k");
const selfWork = (a) => a.work?.includes("self_employed");
const owner = (a) => a.work?.includes("business_owner");

const BLOCKERS = [
  {
    id: "qbi-professional-services-limit",
    test: (a) => a.work?.includes("business_owner") && a.bizType?.includes("professional") && incomeAtLeast(a, "250-500k"),
    title: () => "Plan for losing the 20% QBI deduction on your professional services income",
    problem: () => "Your business is a professional or personal service business and your income is high enough that the 20% QBI deduction may phase out. For 2026 it starts to shrink at taxable income of $201,750 (single) or $403,500 (joint) and is gone at $276,750 or $553,500.",
    fix: () => "Lower your taxable income with the largest retirement plan you can set up, such as a cash balance plan or a 401(k) with profit sharing, and ask a CPA to model your taxable income against the range before year end.",
    cost: () => "At a 24% rate, losing a $40,000 QBI deduction means about $9,600 more tax.",
  },
  {
    id: "business-loss-limits",
    test: (a) => a.bizProfit === "loss" && (a.work?.includes("business_owner") || a.work?.includes("self_employed")),
    title: () => "Check whether your business loss can reduce your other income this year",
    problem: () => "You told us the business loses money or breaks even. A loss does not always offset your other income right away: owners of S-corps and partnerships are limited by their basis, and passive, at-risk and excess business loss rules can defer it.",
    fix: () => "Track your basis in the business each year, document that you operate to make a profit, and ask a CPA how a net operating loss will carry forward, since it can offset only 80% of taxable income in later years.",
    cost: () => "A deferred loss means the tax benefit arrives in a later year instead of this one.",
  },
  {
    id: "blocker-scorp-no-salary",
    test: (a) => a.work?.includes("business_owner") && a.structure === "s_corp_election" && a.ownerPay === "draws",
    title: () => "Put yourself on payroll: the IRS requires a salary from your S-corp",
    problem: () => "You told us you take only distributions from your S-corp. The IRS requires S-corp owners who work in the business to pay themselves a reasonable W-2 salary before taking distributions.",
    fix: () => "Set a salary based on what you would pay someone else to do your work, run it through payroll, and take distributions after that. Retirement plan room and the 401(k) employer share are also based on that salary.",
    cost: () => "Skipping a salary can lead to back payroll taxes, penalties and the loss of S-corp status if the IRS reclassifies your distributions as wages.",
  },
  {
    id: "blocker-multiple-entities-expenses",
    test: (a) => a.entities === "multiple" && (selfWork(a) || owner(a)),
    title: () => "Keep each business's expenses with that business only",
    problem: () => "You run more than one business or entity. A business can only deduct expenses that belong to that business, so one business's costs cannot be used against another business's income.",
    fix: () => "Give each business its own bank account, card and books. Charge each expense to the business that incurred it. For shared costs such as a home office, phone, software or a vehicle, split them by a reasonable, written method (square footage, hours or usage) and keep the record.",
    cost: () => "Expenses booked to the wrong business can be disallowed in an audit, and mixed accounts can put liability protection at risk.",
  },
  {
    id: "blocker-multiple-entities-401k",
    test: (a) => a.entities === "multiple" && selfWork(a) && !owner(a) && (hasAcct(a, "solo_401k") || !hasAcct(a, "employer_401k")),
    title: () => "Check whether your businesses share one retirement limit before you open a second Solo 401(k)",
    problem: () => "Your $24,500 employee deferral limit is one limit for you across every plan. If your businesses are under common control (generally you own more than 80 percent of each), they can count as one employer and share a single $72,000 total limit.",
    fix: () => "Put your employee deferral in one plan, and ask a CPA whether your businesses are a controlled group before adding a second plan. If they are separate employers, each business can have its own employer contribution and its own $72,000 total, but the $24,500 deferral stays shared. If any business has employees, the plan rules change.",
    cost: () => "Going over a limit can mean a failed plan, excess contributions that are taxed and a penalty to fix.",
  },
  {
    id: "blocker-roth-catch-up",
    test: (a) => a.work?.includes("w2") && (a.age === "40_59" || a.age === "60_69") && hasAcct(a, "employer_401k") && incomeAtLeast(a, "150-250k"),
    title: () => "Check that your 401(k) offers Roth before you add catch-up contributions",
    problem: () => "If you are 50 or older and your W-2 wages from your employer were over $150,000 last year, your catch-up contributions have to be made as Roth starting in 2026.",
    fix: () => "Ask your plan whether it offers a Roth option. If it does not, higher earners cannot make catch-up contributions at all. Plan for the tax: an $8,000 Roth catch-up has no deduction, so it adds about $1,920 of tax this year at 24%.",
    cost: () => "A plan with no Roth option means no catch-up contributions, and a Roth catch-up gives up the up-front deduction.",
  },
  {
    id: "blocker-sep-blocks-mega-backdoor",
    test: (a) => hasAcct(a, "sep_ira") && hasAcct(a, "solo_401k") && !owner(a),
    title: () => "Stop funding your SEP-IRA: it is blocking your mega backdoor Roth",
    problem: () => "You have both a SEP-IRA and a Solo 401(k). SEP contributions from the same business count against the same $72,000 limit, and a SEP balance makes a regular backdoor Roth mostly taxable.",
    fix: () => "Stop funding the SEP-IRA, then ask your Solo 401(k) provider whether it accepts a rollover of the SEP balance. With no SEP contributions, your full $72,000 limit is free for after-tax mega backdoor Roth contributions.",
    cost: () => "If your business puts $30,000 into the SEP-IRA, that leaves $42,000 of room under the $72,000 limit, which can shrink or end the after-tax space a mega backdoor Roth uses.",
  },
  {
    id: "blocker-prorata-ira-balance",
    test: (a) => !a.retired && aboveRothLimit(a) && hasAcct(a, "traditional_ira", "sep_ira", "simple_ira") && !(hasAcct(a, "sep_ira") && hasAcct(a, "solo_401k") && !hasAcct(a, "traditional_ira", "simple_ira")),
    title: () => "Roll your pre-tax IRA money into a 401(k) before a backdoor Roth",
    problem: () => "You listed a Traditional IRA, SEP-IRA or SIMPLE IRA. Its pre-tax balance is counted when you convert, so a backdoor Roth would be mostly taxable.",
    fix: (a) => "Move that balance into a 401(k) that accepts roll-ins, such as your employer 401(k)" + (selfWork(a) ? " or a Solo 401(k)" : "") + ", then do the backdoor Roth. SIMPLE IRA money can only move after you have been in the plan for two years.",
    cost: () => "With a $93,000 pre-tax IRA balance, a $7,000 backdoor Roth conversion is about 93% taxable, roughly $1,560 of tax at 24% instead of nearly zero.",
  },
  {
    id: "blocker-employer-401k-plus-solo",
    test: (a) => a.work?.includes("w2") && selfWork(a) && hasAcct(a, "employer_401k") && hasAcct(a, "solo_401k"),
    title: () => "Split your 401(k) deferrals between your job and your Solo 401(k)",
    problem: () => "The $24,500 employee deferral limit is one limit across all your plans, not one per plan, so maxing your job's 401(k) leaves no employee room in the Solo 401(k).",
    fix: () => "Take your employer match first, decide which plan gets the rest of the $24,500, then fill the Solo 401(k) employer share (about 20% of net profit), which is not limited by what you deferred at your job.",
    cost: () => "Deferring $24,500 in both plans is an excess deferral that has to be pulled out or it gets taxed twice.",
  },
  {
    id: "blocker-simple-ira-with-solo",
    test: (a) => hasAcct(a, "simple_ira") && hasAcct(a, "solo_401k"),
    title: () => "Pick the Solo 401(k) or the SIMPLE IRA: you cannot run both",
    problem: () => "A business that has a SIMPLE IRA cannot also contribute to another retirement plan for the same year.",
    fix: () => "Choose the Solo 401(k), which allows far more, and stop the SIMPLE IRA. You can roll the SIMPLE IRA into the Solo 401(k) once you have been in it two years.",
    cost: () => "Contributions to the second plan in the same year can be disallowed.",
  },
  {
    id: "blocker-scorp-salary-limits-401k",
    test: (a) => a.structure === "s_corp_election" && hasAcct(a, "solo_401k") && !owner(a),
    title: () => "Set your S-corp salary high enough to fund your Solo 401(k)",
    problem: () => "Your employer Solo 401(k) contribution is a percentage of your W-2 salary, not your profit, so a low salary shrinks it.",
    fix: () => "Pick a salary that is reasonable for your work and large enough for the contributions you want. The employer share is up to 25% of your W-2 salary.",
    cost: () => "Each $10,000 of salary adds up to $2,500 of employer contribution room. Profit taken as distributions adds none.",
  },
  {
    id: "blocker-scorp-health-insurance",
    test: (a) => a.structure === "s_corp_election" && a.healthInsurance === "self_pays",
    title: () => "Run your health insurance through your S-corp payroll",
    problem: () => "As an S-corp owner, premiums you pay yourself are only deductible if they are reported as wages on your W-2.",
    fix: () => "Have the S-corp pay or reimburse the premiums and include them in your W-2 wages, then take the self-employed health insurance deduction on your personal return.",
    cost: () => "At a 24% bracket, $12,000 of premiums that lose the deduction costs about $2,880 in tax.",
  },
  {
    id: "blocker-solo-401k-with-employees",
    test: (a) => owner(a) && hasAcct(a, "solo_401k"),
    title: () => "Convert your Solo 401(k) to a regular 401(k) for your team",
    problem: () => "A Solo 401(k) is only for owners with no employees other than a spouse. Employees have to be covered by your plan.",
    fix: () => "Move to a safe harbor 401(k) so you can still defer the full $24,500 and the plan passes testing, and compare it with a SIMPLE IRA.",
    cost: () => "Without a plan that covers employees, nondiscrimination testing can cap what you put away.",
  },
  {
    id: "blocker-sep-with-employees",
    test: (a) => owner(a) && hasAcct(a, "sep_ira"),
    title: () => "Compare your SEP-IRA with a safe harbor 401(k) now that you have employees",
    problem: () => "A SEP must give every eligible employee the same percentage of pay that you put in for yourself.",
    fix: () => "Price a safe harbor 401(k) and a SIMPLE IRA against the SEP using your payroll, and keep whichever lets you save the most per dollar spent on employees.",
    cost: () => "If you contribute 20% of your pay to a SEP, you owe 20% of each eligible employee's pay too.",
  },
  {
    id: "blocker-side-income-withholding",
    test: (a) => selfWork(a) && a.work?.includes("w2") && a.estimatedTaxes === "withholding",
    title: () => "Cover the tax on your side income before April",
    problem: () => "Your W-2 withholding does not cover self-employment tax or the income tax on your side income.",
    fix: () => "Raise your W-4 withholding or make quarterly estimated payments. Paying at least 100% of last year's tax (110% if your income was over $150,000) avoids the penalty.",
    cost: () => "You can owe a large bill in April plus an underpayment penalty.",
  },
  {
    id: "blocker-hdhp-no-hsa",
    test: (a) => a.hsaStatus === "hdhp_no_hsa",
    title: () => "Open an HSA: you have the health plan for it but no account",
    problem: () => "You have a high-deductible plan but no HSA, so you are not using a deduction you qualify for.",
    fix: () => "Open an HSA and contribute up to $4,400 (self-only) or $8,750 (family) for 2026. Contributions are deductible and growth is tax-free for medical costs.",
    cost: () => "Each year without an HSA forfeits a deduction of up to $4,400 (self-only) or $8,750 (family).",
    dollars: (a, n, f) => (f ? 4400 * (f.rate / 100) : null),
  },
  {
    id: "blocker-rsu-withholding",
    test: (a) => a.work?.includes("w2") && a.wb?.includes("rsu_espp") && incomeAtLeast(a, "150-250k"),
    title: () => "Raise your withholding to cover your RSU income",
    problem: () => "Employers withhold a flat 22% federal tax when RSUs vest (up to $1 million), which is below your likely bracket.",
    fix: () => "Raise your W-4 withholding or make an estimated payment so you do not owe a bill and penalty in April.",
    cost: () => "On a $100,000 vest, the gap is about $2,000 owed in April at a 24% bracket and about $10,000 at 32%.",
  },
  {
    id: "blocker-rmd-deadline",
    test: (a) => a.retired && a.ri?.includes("rmd_age") && a.ri?.includes("withdraws_pretax"),
    title: () => "Take your required minimum distribution before December 31",
    problem: () => "Required distributions are mandatory once you reach 73, and missing one triggers a penalty.",
    fix: (a) => "Calculate the amount from each account's year-end balance and take it by December 31 (your first one can wait until April 1 of the next year)." + (a.charity ? " Send it straight to charity as a qualified charitable distribution so it is not taxable income." : ""),
    cost: () => "The penalty is 25% of the amount you should have taken, or 10% if you correct it within two years.",
  },
];

// Estimated yearly tax saved for ideas that can be computed from the numbers
// someone entered. Ideas without an entry here keep their normal order.
const IMPACTS = {
  "catch-up-contributions-50-plus": (a, n, f) => (a.age === "60_69" && f && !(a.work?.includes("w2") && incomeAtLeast(a, "150-250k")) ? 8000 * (f.rate / 100) : null),
  "solo-401k": (a, n, f) => (f?.solo ? (a.retAccounts?.includes("solo_401k") ? f.solo.remaining : f.solo.room) * (f.rate / 100) : null),
  "s-corp-election": (a, n, f) => (a.structure === "s_corp_election" ? null : scorpSavings(f, n) || null),
  "qbi-section-199a-deduction": (a, n, f) => qbiSavings(f) || null,
};

export function matchStrategies(rawAnswers, rawNumbers = {}) {
  const a = normalizeAnswers(rawAnswers);
  const nums = rawNumbers || {};
  const facts = taxFacts(a, nums);
  const matched = TAX_STRATEGIES.filter((s) => {
    if (s.category === "Tax Fundamentals") return false;
    if (!personaMatches(s.appliesTo, a.work)) return false;
    const rule = RULES[s.id];
    if (!rule) return false;
    try {
      return !!rule.test(a);
    } catch {
      return false;
    }
  });

  const awarenessMatched = matched.filter((s) => RULES[s.id]?.awareness);
  const mainMatched = matched.filter((s) => !RULES[s.id]?.awareness);
  const grouped = [];
  let shown = 0;
  for (const category of CATEGORY_ORDER) {
    // Persona-specific matches (appliesTo tagged self_employed/business_owner,
    // not just "universal") are more targeted to this user than a generic
    // universal strategy that happens to sit earlier in the source array.
    // Rank those first so the per-category cap doesn't crowd out something
    // like Solo 401(k) in favor of a generic IRA explainer for a
    // self-employed user with no retirement plan yet.
    const inCategory = mainMatched
      .filter((s) => s.category === category)
      .sort((x, y) => {
        const xp = RULES[x.id]?.priority ? -1 : 0;
        const yp = RULES[y.id]?.priority ? -1 : 0;
        if (xp !== yp) return xp - yp;
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
        const rule = RULES[s.id];
        let condition = "", action = "", benefit = "", scenario = "";
        try {
          condition = rule.condition(a) || "";
          action = rule.action(a) || "";
          benefit = rule.benefit(a) || "";
          scenario = rule.scenario(a) || "";
        } catch {
          // leave blank; card just won't render that line
        }
        return {
          id: s.id,
          title: (typeof rule.title === "function" ? rule.title(a) : null) || ACTION_TITLES[s.id] || s.title,
          condition,
          action,
          benefit,
          // Fixed illustrative example, not computed from the user's real
          // numbers -- the quiz has no income figures, only bucketed
          // ranges, so this is deliberately a generic "here's what this
          // could look like" example rather than anything personalized.
          // The UI labels it clearly and keeps it collapsed by default.
          scenario,
          dollars: (() => {
            try {
              const d = IMPACTS[s.id]?.(a, nums, facts);
              return d && d > 0 ? Math.round(d) : null;
            } catch {
              return null;
            }
          })(),
          notFinancialAdviceNote: s.notFinancialAdviceNote,
        };
      }),
    });
  }

  const blockerList = BLOCKERS.filter((b) => {
    try {
      return !!b.test(a);
    } catch {
      return false;
    }
  }).map((b) => {
    let dollars = null;
    try {
      const d = b.dollars?.(a, nums, facts);
      dollars = d && d > 0 ? Math.round(d) : null;
    } catch {}
    return {
      id: b.id,
      blocker: true,
      title: b.title(a),
      condition: b.problem(a),
      action: b.fix(a),
      benefit: b.cost(a),
      scenario: "",
      dollars,
    };
  });
  // Drop ideas that a blocker or a sharper idea already covers, so the list
  // does not repeat itself.
  const blockerIds = new Set(blockerList.map((b) => b.id));
  const matchedIds = new Set(matched.map((s) => s.id));
  const dropIds = new Set();
  if (blockerIds.has("blocker-scorp-no-salary")) dropIds.add("reasonable-w2-salary-optimization");
  if (blockerIds.has("blocker-scorp-health-insurance")) dropIds.add("self-employed-health-insurance-deduction");
  if (matchedIds.has("small-employer-retirement-startup-credit")) dropIds.add("employer-retirement-plan-options");
  if (aboveRothLimit(a)) dropIds.add("traditional-ira");
  // One QBI idea at a time: the professional-services limit covers the plain deduction and its permanence.
  if (matchedIds.has("qbi-professional-services-limit") || blockerIds.has("qbi-professional-services-limit")) {
    dropIds.add("qbi-section-199a-deduction");
    dropIds.add("obbba-qbi-deduction-permanence");
  } else if (matchedIds.has("qbi-section-199a-deduction")) dropIds.add("obbba-qbi-deduction-permanence");
  if (dropIds.size) {
    for (const g of grouped) g.strategies = g.strategies.filter((x) => !dropIds.has(x.id));
    for (let i = grouped.length - 1; i >= 0; i--) if (!grouped[i].strategies.length) grouped.splice(i, 1);
  }
  if (blockerList.length) grouped.unshift({ category: "What's in your way", strategies: blockerList });

  // Flat ranking: blockers first, then ideas with a dollar estimate (largest
  // first), then priority ideas, then everything else in category order.
  const rest = grouped.flatMap((g) => g.strategies).filter((x) => !x.blocker);
  const ranked = [
    ...blockerList,
    ...rest.filter((x) => x.dollars).sort((x, y) => y.dollars - x.dollars),
    ...rest.filter((x) => !x.dollars && RULES[x.id]?.priority),
    ...rest.filter((x) => !x.dollars && !RULES[x.id]?.priority),
  ];

  return {
    persona: a.work,
    totalMatched: matched.length + blockerList.length,
    shown: shown + blockerList.length,
    results: grouped,
    ranked,
    awareness: awarenessMatched.map((s) => {
      const rule = RULES[s.id];
      let action = "";
      try {
        action = rule.action(a) || "";
      } catch {}
      return { id: s.id, title: ACTION_TITLES[s.id] || s.title, action };
    }),
  };
}
