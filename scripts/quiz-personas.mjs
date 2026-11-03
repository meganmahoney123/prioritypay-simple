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

let fail = 0;
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
