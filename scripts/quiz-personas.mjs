// Persona checks for the Tax Savings Quiz engine.
// Run: node scripts/quiz-personas.mjs
// Each persona lists what the results must include and must never include.
// Add a persona whenever you add or change a rule.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "quiz-"));
for (const f of ["quizEngine", "advisorKnowledge", "quizNumbers"]) {
  const src = fs.readFileSync(path.join(root, "lib", f + ".js"), "utf8").replace(/"@\/lib\/([A-Za-z]+)"/g, '"./$1.mjs"');
  fs.writeFileSync(path.join(tmp, f + ".mjs"), src);
}
const { matchStrategies } = await import(pathToFileURL(path.join(tmp, "quizEngine.mjs")).href);

const P = [
  {
    name: "Owner: professional services firm, $400k profit, S-corp on distributions only",
    a: { work: ["business_owner"], income: "250-500k", filingStatus: "single", age: "40_59", retirement: ["none"], bizType: ["professional"], ownership: "solo_owner", bizProfit: "250_500k", bizStage: "established", staffSize: "5_19", ownerPay: "draws", structure: "s_corp_election", purchases: ["none"], bizSpecial: ["none"], employerSituation: ["no_employee_retirement_plan"] },
    n: {},
    has: [/losing the 20% QBI deduction/i, /Put yourself on payroll/i, /Start a retirement plan for your employees and claim the startup credit/i, /cash balance/i],
    never: [/Max out your Solo 401\(k\)/],
  },
  {
    name: "Owner: new software startup with a building purchase and R&D",
    a: { work: ["business_owner"], income: "75-150k", filingStatus: "mfj", age: "under_40", retirement: ["none"], bizType: ["tech"], ownership: "with_investors", bizProfit: "loss", bizStage: "startup", staffSize: "1_4", ownerPay: "w2_salary", structure: "c_corp", purchases: ["equipment", "building"], bizSpecial: ["rd"] },
    n: {},
    has: [/startup and organization costs/i, /research and development credit/i, /loss can reduce your other income/i],
  },
  {
    name: "Owner: product business planning to sell, with inventory",
    a: { work: ["business_owner"], income: "500k+", filingStatus: "mfj", age: "60_69", retirement: ["employer_401k"], bizType: ["products"], ownership: "with_spouse", bizProfit: "500k_1m", bizStage: "exit", staffSize: "20_49", ownerPay: "mixed", structure: "partnership_multi_member", purchases: ["heavy_vehicle"], bizSpecial: ["inventory", "debt"] },
    n: {},
    has: [/business sale now/i],
    awareness: [/accounting method and inventory/i],
  },
  {
    name: "Owner with two kinds of business (services and real estate): both are recognized",
    a: { work: ["business_owner"], income: "250-500k", filingStatus: "single", age: "40_59", retirement: ["none"], bizType: ["professional", "real_estate"], ownership: "solo_owner", bizProfit: "250_500k", bizStage: "established", staffSize: "1_4", ownerPay: "mixed", structure: "s_corp_election", purchases: ["none"], bizSpecial: ["none"], entities: "multiple" },
    n: {},
    has: [/professional services/i, /real estate/i],
  },
  {
    name: "Self-employed with two businesses",
    a: { work: ["self_employed"], income: "150-250k", filingStatus: "single", age: "40_59", retirement: ["solo_401k"], structure: "sole_prop_or_single_member_llc", entities: "multiple" },
    n: { netProfit: 150000 },
    has: [/expenses with that business only/i, /second Solo 401\(k\)/i],
    awareness: [/each of your businesses/i],
  },
  {
    name: "Self-employed, married filing separately at $75k to $150k: backdoor Roth applies",
    a: { work: ["self_employed"], income: "75-150k", filingStatus: "mfs", age: "40_59", retirement: ["none"], structure: "sole_prop_or_single_member_llc", entities: "one" },
    n: {},
    has: [/backdoor/i],
  },
  {
    name: "Self-employed, single at $75k to $150k: no backdoor Roth",
    a: { work: ["self_employed"], income: "75-150k", filingStatus: "single", age: "40_59", retirement: ["none"], structure: "sole_prop_or_single_member_llc", entities: "one" },
    n: {},
    never: [/backdoor/i],
  },
  {
    name: "Self-employed, one business: no multiple-entity items",
    a: { work: ["self_employed"], income: "75-150k", filingStatus: "single", age: "under_40", retirement: ["none"], entities: "one" },
    n: {},
    never: [/expenses with that business only/i, /second Solo 401/i],
  },
  {
    name: "W-2 age 50s earning 150-250k with a 401(k): Roth catch-up blocker",
    a: { work: ["w2"], income: "150-250k", filingStatus: "single", age: "40_59", retirement: ["employer_401k"] },
    n: {},
    has: [/Roth before you add catch-up/i],
    firstBlocker: /Roth before you add catch-up/i,
  },
  {
    name: "W-2 under 75k saving nothing: Saver's Credit",
    a: { work: ["w2"], income: "<75k", filingStatus: "single", age: "under_40", retirement: ["none"] },
    n: {},
    has: [/Saver's Credit/i],
  },
  {
    name: "W-2 50s with RSUs and a 401(k): awareness tier",
    a: { work: ["w2"], income: "250-500k", filingStatus: "mfj", age: "40_59", retirement: ["employer_401k"], workBenefits: ["rsu_espp"] },
    n: {},
    awareness: [/net unrealized appreciation/i, /before 59 and a half/i],
  },
  {
    name: "Self-employed with SEP + Solo 401(k), $120k profit",
    a: { work: ["self_employed"], income: "150-250k", filingStatus: "single", age: "40_59", retirement: ["solo_401k", "sep_ira"] },
    n: { netProfit: 120000, contributed: 10000 },
    has: [/Max out your Solo 401\(k\)/, /Stop funding your SEP-IRA/, /mega backdoor Roth/i, /Roth IRA/],
    never: [/safe harbor 401/i],
    firstBlocker: /Stop funding your SEP-IRA/,
    dollars: { "solo-401k": [8000, 9500] },
    first: /Max out your Solo 401\(k\)/,
  },
  {
    name: "Self-employed, no plan yet, 75-150k",
    a: { work: ["self_employed"], income: "75-150k", filingStatus: "single", age: "under_40", retirement: ["none"] },
    n: { netProfit: 90000 },
    has: [/Open a Solo 401\(k\)/, /Open a Roth IRA/],
    never: [/SEP-IRA/, /backdoor/i],
  },
  {
    name: "S-corp owner with 8 employees",
    a: { work: ["business_owner"], income: "250-500k", filingStatus: "mfj", age: "40_59", retirement: ["none"], structure: "s_corp_election", employerSituation: ["no_employee_retirement_plan"] },
    n: { netProfit: 300000, employees: 8, payroll: 400000, ownerPay: 120000 },
    has: [/employer retirement plan/i],
    never: [/Max out your Solo 401\(k\)/, /Open a Solo 401\(k\)/],
  },
  {
    name: "Owner with employees and a SEP-IRA",
    a: { work: ["business_owner"], income: "250-500k", filingStatus: "mfj", age: "40_59", retirement: ["sep_ira"] },
    n: {},
    has: [/Compare your SEP-IRA with a safe harbor/],
  },
  {
    name: "Owner with employees who set up a Solo 401(k)",
    a: { work: ["business_owner"], income: "150-250k", filingStatus: "single", age: "40_59", retirement: ["solo_401k"] },
    n: {},
    has: [/Convert your Solo 401\(k\)/],
  },
  {
    name: "W-2 plus side business, job 401(k) and Solo 401(k), taxed by withholding",
    a: { work: ["w2", "self_employed"], income: "150-250k", filingStatus: "single", age: "40_59", retirement: ["employer_401k", "solo_401k"], estimatedTaxes: "withholding" },
    n: {},
    has: [/Split your 401\(k\) deferrals/, /Cover the tax on your side income/],
  },
  {
    name: "W-2 with RSUs and an old IRA, MFJ $250-500k",
    a: { work: ["w2"], income: "250-500k", filingStatus: "mfj", age: "40_59", retirement: ["employer_401k", "traditional_ira"], workBenefits: ["rsu_espp"] },
    n: { wages: 300000 },
    has: [/Raise your withholding to cover your RSU/, /Roll your pre-tax IRA money/],
  },
  {
    name: "W-2 with a high-deductible plan and no HSA",
    a: { work: ["w2"], income: "75-150k", filingStatus: "single", age: "under_40", retirement: ["employer_401k"], hsaStatus: "hdhp_no_hsa" },
    n: { wages: 100000 },
    has: [/Open an HSA/],
    dollars: { "blocker-hdhp-no-hsa": [900, 1100] },
  },
  {
    name: "Retired, 73+, pre-tax accounts, gives to charity",
    a: { work: ["retired"], income: "75-150k", filingStatus: "single", age: "70_plus", retiredIncome: ["rmd_age", "withdraws_pretax", "takes_social_security"], investingGiving: ["gives_to_charity_regularly"] },
    n: {},
    has: [/required minimum distribution/i],
    never: [/Solo 401\(k\)/, /SEP/],
  },
  {
    name: "S-corp owner, no employees, Solo 401(k), buys own insurance",
    a: { work: ["self_employed"], income: "150-250k", filingStatus: "single", age: "40_59", retirement: ["solo_401k"], structure: "s_corp_election", healthInsurance: "self_pays" },
    n: {},
    has: [/Set your S-corp salary/, /health insurance through your S-corp payroll/],
  },
  {
    name: "SIMPLE IRA and Solo 401(k) together",
    a: { work: ["self_employed"], income: "75-150k", filingStatus: "single", age: "40_59", retirement: ["simple_ira", "solo_401k"] },
    n: {},
    has: [/cannot run both/],
  },
  {
    name: "Self-employed, lower income this year",
    a: { work: ["self_employed"], income: "75-150k", filingStatus: "single", age: "40_59", retirement: ["solo_401k"], incomeYear: "lower" },
    n: {},
    has: [/Contribute to Roth this year/, /Push business expenses into January/],
  },
  {
    name: "Sole proprietor with $200k profit (S-corp savings should rank by dollars)",
    a: { work: ["self_employed"], income: "150-250k", filingStatus: "single", age: "40_59", retirement: ["solo_401k"], structure: "sole_prop_or_single_member_llc" },
    n: { netProfit: 200000 },
    has: [/Elect S-corp status/],
    dollars: { "s-corp-election": [3000, 15000] },
  },
  {
    name: "W-2 only, under $75k, nothing saved",
    a: { work: ["w2"], income: "<75k", filingStatus: "single", age: "under_40", retirement: ["none"] },
    n: {},
    has: [/Roth IRA/],
    never: [/Solo 401\(k\)/, /SEP/, /S-corp/],
  },
  {
    name: "W-2 parent saving for college",
    a: { work: ["w2"], income: "150-250k", filingStatus: "mfj", age: "40_59", retirement: ["employer_401k", "roth_ira"], household: ["kids_under_18", "planning_education_costs"] },
    n: {},
    has: [/529/],
    never: [/Solo 401\(k\)/],
  },
];

// Multi-business owners: each extra business is matched on its own answers.
const MB = {
  work: ["business_owner"], income: "500k+", filingStatus: "mfj", age: "40_59", retirement: ["none"], bizType: ["professional"],
  ownership: "solo_owner", bizProfit: "500k_1m", bizStage: "established", staffSize: "5_19", ownerPay: "draws", structure: "s_corp_election",
  purchases: ["none"], bizSpecial: ["none"], employerSituation: ["no_employee_retirement_plan"], entities: "multiple", bizCount: "3",
  b2_type: ["real_estate"], b2_structure: "partnership_multi_member", b2_ownership: "with_partners", b2_profit: "250_500k", b2_staff: "none", b2_pay: "guaranteed",
  b3_type: ["products"], b3_structure: "c_corp", b3_ownership: "with_investors", b3_profit: "over_1m", b3_staff: "20_49", b3_pay: "w2_salary",
};
const mb = matchStrategies(MB, {});
const mbErr = [];
if (mb.businesses.length !== 2) mbErr.push(`expected 2 extra businesses, got ${mb.businesses.length}`);
const t2 = (mb.businesses[0]?.ranked || []).map((x) => x.id);
const t3 = (mb.businesses[1]?.ranked || []).map((x) => x.id);
if (!t2.includes("real-estate-depreciation-offset-active-income")) mbErr.push("business 2 missing real estate depreciation");
if (t3.includes("qbi-section-199a-deduction")) mbErr.push("C-corp business 3 should not get QBI");
for (const id of ["roth-ira", "backdoor-roth-ira", "charitable-giving-strategies"]) if (t2.includes(id) || t3.includes(id)) mbErr.push(`personal idea ${id} repeated in a business section`);
const single = matchStrategies({ ...MB, entities: "one", bizCount: undefined }, {});
if ((single.businesses || []).length) mbErr.push("single-entity answers should have no extra businesses");
console.log(`${mbErr.length ? "FAIL" : "ok  "}  Owner of three businesses gets per-business sections`);
for (const e of mbErr) console.log(`        - ${e}`);
let fail = mbErr.length ? 1 : 0;
for (const p of P) {
  const r = matchStrategies(p.a, p.n);
  const titles = r.ranked.map((x) => x.title);
  const text = r.ranked.map((x) => [x.title, x.condition, x.action].join(" | ")).join("\n");
  const errs = [];
  for (const re of p.has || []) if (!re.test(text)) errs.push(`missing ${re}`);
  for (const re of p.never || []) if (re.test(titles.join("\n"))) errs.push(`should not appear ${re}`);
  for (const [id, [lo, hi]] of Object.entries(p.dollars || {})) {
    const x = r.ranked.find((y) => y.id === id);
    if (!x || !(x.dollars >= lo && x.dollars <= hi)) errs.push(`${id} dollars ${x?.dollars} not in ${lo}-${hi}`);
  }
  const awText = (r.awareness || []).map((x) => x.title + " " + x.action).join("\n");
  for (const re of p.awareness || []) if (!re.test(awText)) errs.push(`awareness missing ${re}`);
  if (p.awareness && r.ranked.some((x) => (r.awareness || []).some((y) => y.id === x.id))) errs.push("awareness idea also in ranked");
  if (p.firstBlocker && !p.firstBlocker.test(titles[0] || "")) errs.push(`first idea is not ${p.firstBlocker}`);
  if (p.first && !p.first.test(titles.find((t, i) => r.ranked[i].dollars) || "")) errs.push(`first dollar-ranked idea is not ${p.first}`);
  console.log(`${errs.length ? "FAIL" : "ok  "}  ${p.name}`);
  for (const e of errs) console.log(`        - ${e}`);
  if (errs.length) {
    fail++;
    console.log("        ranked: " + titles.slice(0, 8).join(" | "));
  }
}
console.log(`\n${P.length - fail} of ${P.length} personas pass`);
process.exit(fail ? 1 : 0);
