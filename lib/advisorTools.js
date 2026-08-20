// Server-only. The tax-strategy advisor's data layer: a small set of
// READ-ONLY tools Claude can call (via the Anthropic Messages API's tool
// use) to look at the logged-in user's own PriorityPay data before
// answering a question. Every function here takes an already-authenticated
// { admin, userId } context -- userId always comes from the session
// (see app/api/advisor/chat/route.js), never from anything the model
// passes in, so there is no way for a prompt to make this read someone
// else's data.
//
// Nothing in this file writes anything. That's deliberate: the advisor is
// a research/education surface, not an action surface. If a strategy is
// worth acting on, the answer should point the person at the real feature
// (Split Rules, the entity-scenario calculator, their CPA) rather than
// changing anything itself.
import { estimateSelfEmployedTax, estimateBusinessOwnerTax } from "@/lib/federalTaxCalculator";
import { calculateSepIra, calculateSolo401k } from "@/lib/retirementCalculator";
import { computeEntityScenarios } from "@/lib/entityScenarioCalculator";
import { TAX_STRATEGIES } from "@/lib/advisorKnowledge";

// simple_profiles.entity_type is free text set during onboarding (e.g.
// "Sole proprietor / freelancer", "LLC", "S-corp or C-corp (I pay myself
// W-2 wages)") -- not the same value set as retirementCalculator's
// BUSINESS_TYPES ("self_employed" | "corp"). This is the one heuristic
// bridging the two: anything mentioning corp is taxed via the W-2-wages
// path, everything else via the self-employment path.
function businessTypeFromEntityType(entityType) {
  return /corp/i.test(entityType || "") ? "corp" : "self_employed";
}

// Last `months` FINISHED calendar months (never the current, still-in-
// progress one), most recent first -- same convention Tax Summary uses.
function trailingPeriods(months) {
  const now = new Date();
  let y = now.getUTCFullYear();
  let m = now.getUTCMonth(); // 0-11, so this is already "last month" 1-indexed
  const periods = [];
  for (let i = 0; i < months; i++) {
    if (m === 0) {
      m = 12;
      y -= 1;
    }
    periods.push(`${y}-${String(m).padStart(2, "0")}`);
    m -= 1;
  }
  return periods;
}

function categoryOf(t) {
  return t.confirmed_category || t.suggested_category;
}

// Reads whatever Close-Out has ALREADY computed for the trailing window --
// never triggers a fresh Plaid sync. A chat turn is the wrong place to
// kick off new bank calls; if a month was never closed out, it's just
// missing from the total and the response says so, rather than silently
// pretending the number is complete.
async function trailingIncomeSummary(admin, userId, months) {
  const periods = trailingPeriods(months);
  const { data: closeouts } = await admin
    .from("simple_monthly_closeouts")
    .select("id, period, status, net_income")
    .eq("user_id", userId)
    .in("period", periods.map((p) => `${p}-01`));

  const closeoutIds = (closeouts || []).map((c) => c.id);
  let transactions = [];
  if (closeoutIds.length) {
    const { data } = await admin
      .from("simple_closeout_transactions")
      .select("closeout_id, amount, confirmed_category, suggested_category")
      .in("closeout_id", closeoutIds);
    transactions = data || [];
  }

  let income = 0;
  let w2Income = 0;
  let expense = 0;
  let business = 0;
  transactions.forEach((t) => {
    const cat = categoryOf(t);
    const amt = Number(t.amount) || 0;
    if (cat === "income") income += amt;
    else if (cat === "w2_income") w2Income += amt;
    else if (cat === "expense") expense += amt;
    else if (cat === "business") business += amt;
  });

  return {
    monthsRequested: months,
    monthsAvailable: (closeouts || []).length,
    periods,
    income,
    w2Income,
    expense,
    business,
    net: income + w2Income - expense,
  };
}

// Loose merchant-name normalizer so "AMAZON.COM*A1B2C3" and
// "AMAZON.COM*D4E5F6" roll up into one "AMAZON.COM" line instead of forty
// near-duplicate one-off rows -- strips trailing order/reference codes and
// collapses whitespace. Good enough for a spend-pattern summary; not meant
// to be a real merchant taxonomy.
function normalizeMerchantName(name) {
  return (name || "Transaction")
    .replace(/[*#][A-Z0-9-]{4,}$/i, "")
    .replace(/\s+\d{4,}$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

// Real personal-account expense transactions, grouped by merchant and
// summed, for deduction-opportunity spotting. Only ever reads what
// Close-Out has already pulled and categorized (no fresh Plaid calls) --
// same reasoning as trailingIncomeSummary. This is the tool that makes the
// advisor genuinely useful for a sole proprietor (see the WARNING in
// get_expense_breakdown's description for why it's much thinner value for
// anyone with a real separate business).
async function trailingExpenseBreakdown(admin, userId, months) {
  const periods = trailingPeriods(months);
  const { data: closeouts } = await admin
    .from("simple_monthly_closeouts")
    .select("id, period")
    .eq("user_id", userId)
    .in("period", periods.map((p) => `${p}-01`));

  const closeoutIds = (closeouts || []).map((c) => c.id);
  let transactions = [];
  if (closeoutIds.length) {
    const { data } = await admin
      .from("simple_closeout_transactions")
      .select("closeout_id, name, amount, txn_date, confirmed_category, suggested_category")
      .in("closeout_id", closeoutIds);
    transactions = data || [];
  }

  const byMerchant = {};
  transactions.forEach((t) => {
    if (categoryOf(t) !== "expense") return;
    const key = normalizeMerchantName(t.name);
    if (!byMerchant[key]) byMerchant[key] = { merchant: key, totalAmount: 0, occurrences: 0, lastDate: t.txn_date };
    byMerchant[key].totalAmount += Number(t.amount) || 0;
    byMerchant[key].occurrences += 1;
    if (t.txn_date > byMerchant[key].lastDate) byMerchant[key].lastDate = t.txn_date;
  });

  const merchants = Object.values(byMerchant)
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 60)
    .map((m) => ({ ...m, totalAmount: Math.round(m.totalAmount * 100) / 100 }));

  return {
    monthsRequested: months,
    monthsAvailable: (closeouts || []).length,
    totalExpense: Math.round(transactions.filter((t) => categoryOf(t) === "expense").reduce((s, t) => s + (Number(t.amount) || 0), 0) * 100) / 100,
    merchantCount: Object.keys(byMerchant).length,
    topMerchants: merchants,
  };
}

// Real Schedule-C-style figures the user entered at /business-financials,
// for the given (or current) tax year -- see app/api/business-financials
// and supabase/schema.sql's simple_business_financials table. Returns null
// if they haven't filled anything in yet, which is the normal state for
// most users and NOT an error.
const BUSINESS_FINANCIALS_EXPENSE_COLS = [
  "advertising",
  "car_and_truck",
  "contract_labor",
  "depreciation",
  "insurance",
  "legal_and_professional",
  "office_expense",
  "rent",
  "repairs_and_maintenance",
  "supplies",
  "taxes_and_licenses",
  "travel",
  "meals",
  "utilities",
  "wages",
  "other_expenses",
];

async function fetchRealBusinessFinancials(admin, userId, taxYear) {
  const year = taxYear || new Date().getUTCFullYear();
  const { data } = await admin
    .from("simple_business_financials")
    .select("*")
    .eq("user_id", userId)
    .eq("tax_year", year)
    .maybeSingle();
  if (!data) return null;

  const totalExpenses = BUSINESS_FINANCIALS_EXPENSE_COLS.reduce((s, col) => s + (Number(data[col]) || 0), 0);
  const grossReceipts = Number(data.gross_receipts) || 0;
  const cogs = Number(data.cost_of_goods_sold) || 0;
  const netProfit = grossReceipts - cogs - totalExpenses;

  return {
    taxYear: year,
    grossReceipts,
    costOfGoodsSold: cogs,
    totalExpenses,
    netProfit,
    expensesByCategory: Object.fromEntries(BUSINESS_FINANCIALS_EXPENSE_COLS.map((col) => [col, Number(data[col]) || 0])),
  };
}

export const TOOL_SCHEMAS = [
  {
    name: "get_profile",
    description:
      "The user's PriorityPay profile: how they're taxed (entity type), whether they also have a W2 job, age bracket, and (for Business Owner With Employees) their self-reported annual employee payroll. Call this first in most conversations to know who you're talking to.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_income_summary",
    description:
      "The user's real income, W2 income, expenses, and net, aggregated from their linked personal accounts over the trailing N months they've closed out in PriorityPay. This is actual bank-derived data, not a self-report. Note: for a Business Owner (With Employees) persona, this reflects PERSONAL accounts only -- PriorityPay does not yet sync a separate business account's transactions, so it will not capture real business-level expenses or revenue for that persona. Say so if it's relevant to the question.",
    input_schema: {
      type: "object",
      properties: {
        months: { type: "integer", description: "How many trailing finished months to sum, default 12, max 24." },
      },
    },
  },
  {
    name: "get_expense_breakdown",
    description:
      "Real personal-account expense transactions over the trailing N months, grouped by merchant and summed by total spend (e.g. 'ADOBE: $588/yr, 14 charges'). This is the tool for spotting deduction opportunities -- recurring software, professional services, travel, equipment, home-office-adjacent purchases, etc. -- grounded in what the user actually spent, not a generic checklist. WARNING: this only ever reflects PERSONAL account activity. For a sole proprietor with no separate entity, that's the whole picture and this tool should be used generously. For anyone with a real separate business (see get_profile), this only shows what passed through their personal accounts -- real business spend on a separate business account is invisible here, so present any findings as partial (\"here's what shows up on your personal side\") rather than a complete deduction review.",
    input_schema: {
      type: "object",
      properties: {
        months: { type: "integer", description: "How many trailing finished months to sum, default 6, max 12." },
      },
    },
  },
  {
    name: "get_business_financials",
    description:
      "Real Schedule-C-style business financials the user manually entered (gross receipts, cost of goods sold, and expense totals by category), for a given tax year (defaults to current). This is the AUTHORITATIVE profit figure for anyone running a real separate business -- call this FIRST for any user whose profile suggests a separate entity, before falling back to asking them or using personal-account data. Returns available: false if they haven't filled it in yet -- in that case, mention that adding it at /business-financials would give much more accurate answers going forward, and ask for a rough profit figure for just this conversation instead.",
    input_schema: {
      type: "object",
      properties: {
        taxYear: { type: "integer", description: "Defaults to the current calendar year." },
      },
    },
  },
  {
    name: "get_tax_strategies",
    description:
      "Looks up tax strategies and concepts from PriorityPay's curated tax strategy knowledge base, filtered to what's actually relevant to THIS user's work structure (self-employed vs. business owner -- determined server-side from their real profile, not something you specify). This is the ONLY source of tax strategy knowledge you're allowed to use -- never state a strategy, account type, deduction, or planning technique from your own general knowledge. If a topic the user asks about isn't returned here, say plainly that it's outside what you have grounded information on rather than answering from general knowledge. Call this whenever a conversation touches a category below, then use the clarifyingQuestions it returns to figure out which specific strategies actually apply before asserting relevance.",
    input_schema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["Tax Fundamentals", "Retirement Accounts", "Health & Education Accounts", "Family & Dependents", "Investment Tax", "Charitable Giving", "Business Deductions", "Business Structure & Elections", "State & Residency", "Equity & Startups", "Recent Law Changes"],
          description: "Which category of strategies to look up.",
        },
      },
      required: ["category"],
    },
  },
  {
    name: "get_split_rules",
    description:
      "The user's current percentage split rules -- what share of every deposit goes to Tax Reserve, Solo 401k/SEP IRA, Investments, Savings, Emergency Fund, OPEX, or any custom category, plus any monthly or balance caps. Useful for checking whether their Tax Reserve percentage looks under- or over-funded relative to their real tax picture.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_retirement_contribution_room",
    description:
      "How much more the user can contribute this year to a SEP IRA and to a Solo 401k, computed from real trailing income (or a supplied override), entity type, and age bracket, compared against what they've actually sent through PriorityPay so far this year. Flags if they're already over the limit for either plan. WARNING: if netIncomeOverride is omitted, this defaults to trailing PERSONAL account net income, which is only accurate for a sole proprietor with no separate entity -- for anyone with a real separate business, ask them for their actual profit first and pass it as netIncomeOverride.",
    input_schema: {
      type: "object",
      properties: {
        netIncomeOverride: {
          type: "number",
          description: "Use this annual net income instead of the trailing-12-month figure from their real data, e.g. if the user gives a specific number to plan around.",
        },
      },
    },
  },
  {
    name: "compare_entity_tax_scenarios",
    description:
      "Runs the same sole-proprietor vs. LLC vs. S-corp comparison as PriorityPay's public entity-scenario calculator. Shows the actual dollar difference an S-corp election would make for THIS person, including the true cost of payroll/extra tax prep and the QBI deduction tradeoff -- not a generic rule of thumb. WARNING: if profit is omitted, this defaults to trailing PERSONAL account net income, which is only accurate for a sole proprietor with no separate entity -- for anyone with a real separate business, ask them for their actual profit first and pass it as profit.",
    input_schema: {
      type: "object",
      properties: {
        profit: { type: "number", description: "Annual profit to model. Defaults to the user's trailing-12-month net income if omitted." },
        salary: { type: "number", description: "S-corp reasonable-salary figure to test. Defaults to 58% of profit if omitted -- a starting point only, never a recommendation." },
        filingStatus: { type: "string", enum: ["single", "mfj"], description: "Ask the user if unknown. Defaults to single." },
        stateCost: { type: "number", description: "Annual state LLC/S-corp fee, if known. Defaults to 0." },
        adminCost: { type: "number", description: "Extra yearly cost of payroll + a second tax return for the S-corp column, if known. Defaults to 2000." },
        sstb: { type: "boolean", description: "Whether the work is a specified service trade or business (consulting, health, law, financial services, etc.) -- affects the QBI deduction at higher incomes." },
      },
    },
  },
  {
    name: "get_tax_reserve_status",
    description:
      "Compares what the user is actually setting aside for taxes (their Tax Reserve split-rule percentage applied to trailing income) against a rough estimate of what they'll likely owe, to flag if they look under- or over-reserved. A sanity check, not a filing-accurate number. WARNING: the income figure this uses comes from trailing PERSONAL account data, which is only accurate for a sole proprietor with no separate entity -- for anyone with a real separate business, confirm their actual profit with them before trusting this.",
    input_schema: {
      type: "object",
      properties: {
        filingStatus: { type: "string", enum: ["single", "mfj"], description: "Ask the user if unknown. Defaults to single." },
        netIncomeOverride: {
          type: "number",
          description: "Use this annual net income instead of the trailing-12-month personal-account figure -- required for anyone with a real separate business entity (see WARNING above).",
        },
      },
    },
  },
];

// Shared precedence for every tool that needs a profit/net-income figure:
// an explicit override (the model passed a number, usually from asking the
// user directly) wins, then real business financials on file for the
// current year (see get_business_financials), then trailing personal-
// account net income as the last resort -- which is only actually correct
// for a sole proprietor (see the CRITICAL section in lib/advisorPrompt.js).
async function resolveNetIncome({ admin, userId }, override) {
  if (typeof override === "number") {
    return { netIncome: override, incomeSource: "override" };
  }
  const real = await fetchRealBusinessFinancials(admin, userId, new Date().getUTCFullYear());
  if (real) {
    return { netIncome: real.netProfit, incomeSource: `real business financials on file for ${real.taxYear}` };
  }
  const summary = await trailingIncomeSummary(admin, userId, 12);
  return { netIncome: summary.net, incomeSource: `trailing ${summary.monthsAvailable}-month personal-account net income` };
}

async function toolGetProfile({ admin, userId }) {
  const { data, error } = await admin
    .from("simple_profiles")
    .select("persona, business_name, entity_type, income_handling, has_w2_plan, w2_elective_deferral_ytd, age_bracket, estimated_employee_payroll")
    .eq("id", userId)
    .single();
  if (error) return { error: error.message };
  return {
    persona: data.persona,
    businessName: data.business_name,
    entityType: data.entity_type,
    incomeHandling: data.income_handling,
    hasW2Job: !!data.has_w2_plan,
    w2ElectiveDeferralYTD: Number(data.w2_elective_deferral_ytd || 0),
    ageBracket: data.age_bracket,
    estimatedAnnualEmployeePayroll: data.estimated_employee_payroll === null ? null : Number(data.estimated_employee_payroll),
  };
}

async function toolGetIncomeSummary({ admin, userId }, input) {
  const months = Math.min(24, Math.max(1, Number(input?.months) || 12));
  return trailingIncomeSummary(admin, userId, months);
}

async function toolGetExpenseBreakdown({ admin, userId }, input) {
  const months = Math.min(12, Math.max(1, Number(input?.months) || 6));
  return trailingExpenseBreakdown(admin, userId, months);
}

async function toolGetBusinessFinancials({ admin, userId }, input) {
  const taxYear = Number(input?.taxYear) || new Date().getUTCFullYear();
  const financials = await fetchRealBusinessFinancials(admin, userId, taxYear);
  if (!financials) {
    return { available: false, taxYear, message: "No business financials on file for this year yet." };
  }
  return { available: true, ...financials };
}

async function toolGetSplitRules({ admin, userId }) {
  const { data, error } = await admin
    .from("simple_split_rules_percent")
    .select("label, group_name, pct, cap, balance_cap, retirement_type, investment_type")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) return { error: error.message };
  return {
    rules: (data || []).map((r) => ({
      label: r.label,
      group: r.group_name,
      pct: Number(r.pct),
      monthlyCap: r.cap === null ? null : Number(r.cap),
      balanceCap: r.balance_cap === null ? null : Number(r.balance_cap),
      retirementType: r.retirement_type,
      investmentType: r.investment_type,
    })),
  };
}

async function toolGetRetirementRoom({ admin, userId }, input) {
  const profile = await toolGetProfile({ admin, userId });
  if (profile.error) return profile;
  const businessType = businessTypeFromEntityType(profile.entityType);

  const { netIncome, incomeSource } = await resolveNetIncome({ admin, userId }, input?.netIncomeOverride);

  const sep = calculateSepIra({ netIncome, businessType });
  const solo401k = calculateSolo401k({
    netIncome,
    businessType,
    ageBracket: profile.ageBracket || "under50",
    otherPlanDeferralYTD: profile.hasW2Job ? profile.w2ElectiveDeferralYTD : 0,
  });

  const yearStartIso = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1)).toISOString();
  const { data: ytdRows } = await admin
    .from("simple_transfer_allocations")
    .select("amount, retirement_type, simple_transfers!inner(user_id, created_at)")
    .eq("simple_transfers.user_id", userId)
    .gte("simple_transfers.created_at", yearStartIso)
    .neq("status", "failed")
    .not("retirement_type", "is", null);
  const ytdByType = {};
  (ytdRows || []).forEach((r) => {
    ytdByType[r.retirement_type] = (ytdByType[r.retirement_type] || 0) + (Number(r.amount) || 0);
  });

  const { data: realAccounts } = await admin.from("simple_retirement_accounts").select("retirement_type").eq("user_id", userId);
  const connectedTypes = (realAccounts || []).map((r) => r.retirement_type);

  const build = (type, calc, cap) => {
    const ytd = ytdByType[type] || 0;
    return {
      annualLimit: cap,
      roomBasedOnIncome: calc.contribution ?? calc.total,
      alreadySentThroughPriorityPayThisYear: ytd,
      roomLeftThisYear: Math.max(0, cap - ytd),
      overContributed: ytd > cap,
      hasRealAccountConnected: connectedTypes.includes(type),
    };
  };

  return {
    netIncomeUsed: netIncome,
    netIncomeSource: incomeSource,
    businessType,
    sepIra: build("sep_ira", sep, sep.cap),
    solo401k: build("solo_401k", solo401k, solo401k.cap),
  };
}

async function toolCompareEntityScenarios({ admin, userId }, input) {
  const { netIncome: profit, incomeSource: profitSource } = await resolveNetIncome({ admin, userId }, input?.profit);
  const filingStatus = input?.filingStatus === "mfj" ? "mfj" : "single";
  const salary = typeof input?.salary === "number" ? input.salary : Math.round(profit * 0.58);
  const stateCost = Number(input?.stateCost) || 0;
  const adminCost = typeof input?.adminCost === "number" ? input.adminCost : 2000;
  const sstb = !!input?.sstb;

  const result = computeEntityScenarios({ profit, status: filingStatus, salary, stateCost, adminCost, sstb });
  return {
    profitUsed: profit,
    profitSource,
    salaryUsed: salary,
    filingStatus,
    warnSalaryTooHigh: result.warnSalary,
    warnQbiLimited: result.warnQbi,
    scenarios: result.cols.map((c) => ({
      label: c.label,
      profit: c.profit,
      salary: c.wages,
      distribution: c.dist,
      selfEmploymentOrPayrollTax: c.workTax,
      qbiDeduction: c.qbiDed,
      incomeTax: c.incomeTax,
      stateAndAdminFees: c.fees,
      totalTax: c.tax,
      takeHome: c.left,
    })),
  };
}

async function toolGetTaxReserveStatus({ admin, userId }, input) {
  const filingStatus = input?.filingStatus === "mfj" ? "mfj" : "single";
  const [summary, profile, splitRules] = await Promise.all([
    trailingIncomeSummary(admin, userId, 12),
    toolGetProfile({ admin, userId }),
    toolGetSplitRules({ admin, userId }),
  ]);
  if (profile.error) return profile;

  const businessType = businessTypeFromEntityType(profile.entityType);
  const { netIncome, incomeSource: netIncomeSource } = await resolveNetIncome({ admin, userId }, input?.netIncomeOverride);
  let estimate;
  if (businessType === "corp") {
    const wagesToSelf = Math.round(netIncome * 0.58);
    estimate = estimateBusinessOwnerTax({ businessProfit: netIncome, wagesToSelf, filingStatus });
  } else {
    estimate = estimateSelfEmployedTax({ netIncome, filingStatus });
  }

  const taxReservePct = (splitRules.rules || [])
    .filter((r) => r.label === "Tax Reserve")
    .reduce((sum, r) => sum + (r.pct || 0), 0);
  const annualizedReserveAtCurrentRate = (netIncome * taxReservePct) / 100;

  return {
    netIncomeUsed: netIncome,
    netIncomeSource,
    monthsOfDataAvailable: summary.monthsAvailable,
    estimatedAnnualTaxOwed: estimate.totalTax,
    effectiveRate: estimate.effectiveRate,
    currentTaxReservePct: taxReservePct,
    reserveOnTrackAtCurrentPace: annualizedReserveAtCurrentRate,
    gapVsEstimate: estimate.totalTax - annualizedReserveAtCurrentRate,
    likelyUnderReserved: annualizedReserveAtCurrentRate < estimate.totalTax * 0.9,
    likelyOverReserved: annualizedReserveAtCurrentRate > estimate.totalTax * 1.25,
  };
}

// Server-side persona resolution -- the model never gets to just claim which
// persona applies. "corp"-ish entity types (S-corp/C-corp) get treated as
// business_owner; everything else (sole prop, default-taxed LLC) as
// self_employed. A strategy tagged "universal" always passes regardless.
function personaFromEntityType(entityType) {
  return /corp/i.test(entityType || "") ? "business_owner" : "self_employed";
}

async function toolGetTaxStrategies({ admin, userId }, input) {
  const category = input?.category;
  if (!category) return { error: "category is required." };

  const profile = await toolGetProfile({ admin, userId });
  const persona = profile.error ? null : personaFromEntityType(profile.entityType);

  const matches = TAX_STRATEGIES.filter((s) => {
    if (s.category !== category) return false;
    if (!persona) return true; // profile lookup failed -- don't over-filter, just don't personalize
    return s.appliesTo.includes("universal") || s.appliesTo.includes(persona);
  });

  return {
    category,
    resolvedPersona: persona,
    strategies: matches.map((s) => ({
      id: s.id,
      title: s.title,
      appliesTo: s.appliesTo,
      summary: s.summary,
      keyFacts: s.keyFacts,
      eligibilitySignals: s.eligibilitySignals,
      clarifyingQuestions: s.clarifyingQuestions,
      notFinancialAdviceNote: s.notFinancialAdviceNote,
    })),
  };
}

const HANDLERS = {
  get_profile: toolGetProfile,
  get_income_summary: toolGetIncomeSummary,
  get_expense_breakdown: toolGetExpenseBreakdown,
  get_business_financials: toolGetBusinessFinancials,
  get_split_rules: toolGetSplitRules,
  get_retirement_contribution_room: toolGetRetirementRoom,
  compare_entity_tax_scenarios: toolCompareEntityScenarios,
  get_tax_reserve_status: toolGetTaxReserveStatus,
  get_tax_strategies: toolGetTaxStrategies,
};

export async function runAdvisorTool(name, input, ctx) {
  const handler = HANDLERS[name];
  if (!handler) return { error: `Unknown tool: ${name}` };
  try {
    return await handler(ctx, input || {});
  } catch (err) {
    return { error: err.message || "Tool failed." };
  }
}
