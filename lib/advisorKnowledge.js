// Auto-generated tax strategy knowledge base. See generation notes in the PR/commit.
export const TAX_STRATEGIES = [
  {
    id: "three-lenses-tax-minimization",
    title: "The Three Lenses of Tax Minimization",
    category: "Tax Fundamentals",
    appliesTo: ["universal"],
    summary: "Good tax planning isn't just about paying less this April — it's about weighing three separate questions together: what percentage of this year's income actually went to taxes, whether paying more now could mean paying far less over your lifetime, and whether a given strategy is worth the time it takes to execute. Strategies that score well on only one of these lenses can still be bad ideas overall.",
    keyFacts: [
      "Effective rate = total taxes paid (federal, state, local, payroll) divided by gross income, not your top bracket",
      "Lifetime-rate thinking treats today's tax bill as an investment: paying $10,000 extra now to save $50,000 later is roughly a 17.5% annualized return over 10 years",
      "High-effort-low-payoff moves (obsessively tracking small receipts, aggressive audit-bait positions) are generally not worth pursuing",
      "A commonly cited rule of thumb: a small number of strategies (401k use, entity election, backdoor Roth, QSBS planning) drive most of the total savings"
    ],
    eligibilitySignals: ["anyone making active tax decisions", "user asking whether a strategy is 'worth it'"],
    clarifyingQuestions: [
      "Are you optimizing for this year's tax bill or for the next 10-20 years?",
      "How much time/complexity are you willing to take on for the savings involved?"
    ],
    notFinancialAdviceNote: "A CPA should help translate this framework into an actual multi-year tax projection before you commit to any single strategy."
  },
  {
    id: "standard-vs-itemized-deductions",
    title: "Standard vs. Itemized Deductions",
    category: "Tax Fundamentals",
    appliesTo: ["universal"],
    summary: "Every filer has to pick one path: take a flat, no-questions-asked deduction, or add up specific deductible expenses and use that total instead if it's bigger. Roughly 9 in 10 filers come out ahead with the flat amount, but people with a mortgage, large state tax bills, or heavy charitable giving frequently do better itemizing.",
    keyFacts: [
      "2025 standard deduction: $15,750 single/MFS, $23,625 head of household, $31,500 married filing jointly",
      "Extra standard deduction for age 65+: +$2,000 single/HOH, +$1,600 per spouse if married; plus a temporary OBBBA senior bonus of up to $6,000 (2025-2028) if income is under $75,000 single / $150,000 married",
      "Common itemized categories: state and local taxes (capped, see SALT entry), mortgage interest on up to $750,000 of debt, charitable gifts, and medical costs above 7.5% of AGI",
      "You can only use one method per return — whichever produces the larger deduction"
    ],
    eligibilitySignals: ["homeowner with a mortgage", "large annual state/local tax bill", "significant charitable giving or medical expenses"],
    clarifyingQuestions: [
      "Do you own a home with a mortgage, and roughly how much do you pay in state and local taxes?",
      "How much did you give to charity or pay in unreimbursed medical costs last year?"
    ],
    notFinancialAdviceNote: "Tax software or a preparer should run both calculations on your actual numbers since the better option can flip year to year."
  },
  {
    id: "bunching-deductions-strategy",
    title: "Bunching Itemized Deductions Into Alternating Years",
    category: "Tax Fundamentals",
    appliesTo: ["universal"],
    summary: "If your itemizable expenses hover just below the standard deduction every year, you're leaving value on the table because you never clear the threshold. Deliberately concentrating two years of deductible expenses into a single calendar year lets you itemize meaningfully that year, then take the standard deduction the next — often beating either approach done consistently.",
    keyFacts: [
      "Typical bunching levers: paying both installments of property tax in one calendar year, doubling up charitable gifts, prepaying a mortgage payment, and scheduling elective medical procedures in the 'itemize' year",
      "A donor-advised fund is a common tool for bunching charitable gifts specifically, since you can front-load several years of giving into one deductible contribution",
      "The strategy works best when your normal annual itemizable total sits just under the standard deduction line"
    ],
    eligibilitySignals: ["itemizable expenses close to but usually below the standard deduction", "flexibility on timing property tax, charitable gifts, or medical procedures"],
    clarifyingQuestions: [
      "Roughly how close is your itemized total to the standard deduction in a typical year?",
      "Could you shift the timing of any property tax payments, donations, or elective procedures into a single tax year?"
    ],
    notFinancialAdviceNote: "A tax preparer should confirm the exact deduction cutover point for your filing status before you commit to prepaying anything."
  },
  {
    id: "marginal-vs-effective-tax-rate",
    title: "Marginal vs. Effective Tax Rate",
    category: "Tax Fundamentals",
    appliesTo: ["universal"],
    summary: "These two numbers get conflated constantly, and the confusion leads to bad decisions like turning down a raise. Your marginal rate only taxes the next dollar you earn; your effective rate is the blended average across every bracket your income passed through. Deductions are valued at your marginal rate, but your overall tax burden is better measured by your effective rate.",
    keyFacts: [
      "2025 MFJ brackets: 10% to $23,850, 12% to $96,950, 22% to $206,700, 24% to $394,600, 32% to $501,050, 35% to $751,600, 37% above that",
      "Example: a $250,000 MFJ household lands in the 24% marginal bracket but pays roughly $45,694 in federal tax — an 18.3% effective rate",
      "A raise never reduces your take-home pay under normal progressive taxation; only income above each threshold is taxed at the higher rate for that bracket",
      "Marginal rate drives decisions like Roth vs. traditional contributions and bonus timing; effective rate is better for year-over-year comparisons"
    ],
    eligibilitySignals: ["anyone confused about why a raise or bonus 'feels' taxed so heavily", "deciding between pre-tax and Roth contributions"],
    clarifyingQuestions: [
      "What tax bracket range does your income currently fall into?",
      "Are you trying to evaluate a specific deduction, or trying to understand your overall tax burden?"
    ],
    notFinancialAdviceNote: "For a precise effective rate, have a preparer calculate it off your actual return rather than estimating from bracket tables alone."
  },
  {
    id: "deductions-vs-credits",
    title: "Tax Deductions vs. Tax Credits",
    category: "Tax Fundamentals",
    appliesTo: ["universal"],
    summary: "These terms get used interchangeably in casual conversation, but they work very differently. A deduction only shrinks the income you're taxed on, so its value scales with your bracket. A credit wipes out your tax bill dollar for dollar, so it's worth the same to everyone regardless of income — which is why credits are almost always the better prize.",
    keyFacts: [
      "Deduction value = deduction amount x marginal rate: a $10,000 deduction is worth $1,200 in the 12% bracket but $3,700 in the 37% bracket",
      "Credit value = the full credit amount for everyone, regardless of bracket",
      "Nonrefundable credits can only reduce your tax bill to zero; refundable credits can generate a refund beyond what you paid in; partially refundable credits are a hybrid",
      "2025 examples: Child Tax Credit up to $2,200/child, Earned Income Tax Credit up to $8,046 with three kids, Child and Dependent Care Credit up to $3,000/$6,000 of expenses at a 20-35% rate, American Opportunity Credit up to $2,500 (40% refundable), Lifetime Learning Credit up to $2,000 (nonrefundable)"
    ],
    eligibilitySignals: ["parent or caregiver evaluating available credits", "anyone comparing the value of a proposed deduction vs. a credit"],
    clarifyingQuestions: [
      "Do you have dependents that might qualify for child-related credits?",
      "Are you weighing an education or childcare expense that might qualify for a credit instead of a deduction?"
    ],
    notFinancialAdviceNote: "Credit eligibility phases out at different income levels, so a preparer should verify you actually qualify before counting on the full amount."
  },
  {
    id: "salt-deduction-cap",
    title: "State and Local Tax (SALT) Deduction Cap",
    category: "Tax Fundamentals",
    appliesTo: ["universal"],
    summary: "Before 2017 you could deduct your entire state and local tax bill on your federal return if you itemized. Tax reform capped that hard at $10,000 regardless of filing status, which hit high-tax-state homeowners and married couples especially hard. Recent legislation loosened the cap, but only for taxpayers under a specific income ceiling.",
    keyFacts: [
      "SALT deduction covers property taxes plus state income or sales taxes, only available if you itemize",
      "Cap raised to $40,000 for 2025, with roughly 1% annual growth planned through 2029, then reverting to $10,000 in 2030",
      "The full $40,000 cap only applies below $500,000 of income; above that, the cap shrinks by 30% of the excess income, phasing all the way back down to the original $10,000 once income hits about $600,000",
      "The cap is identical for single and married filers, which effectively penalizes dual-income married couples in high-tax states"
    ],
    eligibilitySignals: ["homeowner or resident of a high-tax state", "income near or above $500,000", "business owner who could route state taxes through PTET instead"],
    clarifyingQuestions: [
      "What state do you live in, and roughly how much do you pay annually in state income and property taxes combined?",
      "Is your income above or below roughly $500,000?"
    ],
    notFinancialAdviceNote: "A CPA should model your specific phase-out amount, since the reduction formula is sensitive to exact income and filing status."
  },
  {
    id: "tax-advantaged-account-contribution-waterfall",
    title: "Contribution Ordering Across Tax-Advantaged Accounts",
    category: "Retirement Accounts",
    appliesTo: ["universal"],
    summary: "With limited dollars to save each year, the order you fund different accounts in matters as much as how much you save overall. A general-purpose priority sequence exists for squeezing the most value out of employer matches, tax-free growth, and flexibility before money spills over into a plain taxable account.",
    keyFacts: [
      "General suggested order: 401(k) up to any employer match, then HSA, then Roth IRA (or backdoor Roth if income-phased-out), then a taxable brokerage account, then additional 401(k) contributions or a 529",
      "An employer 401(k) match is effectively free money and should almost always be captured first",
      "High earners with self-employment income may prefer prioritizing a Solo 401(k) and mega backdoor Roth ahead of a plain taxable account",
      "This is a general default, not a fixed rule — personal cash-flow needs and goals can justify reordering it"
    ],
    eligibilitySignals: ["anyone trying to decide where to send savings dollars next", "has access to more than one tax-advantaged account"],
    clarifyingQuestions: [
      "Does your employer offer a 401(k) match, and are you currently capturing the full amount?",
      "Do you have access to an HSA, and have you maxed out a Roth IRA or backdoor Roth this year?"
    ],
    notFinancialAdviceNote: "A financial planner should tailor this ordering to your actual cash-flow needs, debt situation, and time horizon."
  },
  {
    id: "401k-basics",
    title: "401(k) Retirement Plans",
    category: "Retirement Accounts",
    appliesTo: ["business_owner", "universal"],
    summary: "A 401(k) is an employer-sponsored retirement plan that lets employees set aside part of their paycheck to invest, with tax treatment depending on whether contributions are made pre-tax or Roth. It's only available if your employer offers one, and investment choices are usually limited to a short list of funds picked by the plan provider.",
    keyFacts: [
      "2025 contribution limit: $23,500, rising to $31,000 for those 50 and older via catch-up contributions",
      "Traditional 401(k) contributions reduce taxable income now; withdrawals in retirement are taxed as ordinary income",
      "Roth 401(k) contributions are after-tax; qualified withdrawals in retirement are tax-free, and unlike a Roth IRA there's no income limit on who can contribute",
      "Qualified withdrawals start at age 59.5 (10% penalty plus tax before that); required minimum distributions begin at 73; Roth 401(k) withdrawals also require the account to be at least 5 years old",
      "Investment menus are typically limited to roughly 8-12 mutual funds chosen by the plan provider"
    ],
    eligibilitySignals: ["W-2 employee at a company offering a 401(k)", "deciding between pre-tax and Roth contributions"],
    clarifyingQuestions: [
      "Does your employer's plan offer a Roth 401(k) option in addition to traditional?",
      "Are you currently contributing enough to capture the full employer match, if one exists?"
    ],
    notFinancialAdviceNote: "Confirm your specific plan's investment lineup and fees with your plan administrator before deciding contribution levels."
  },
  {
    id: "traditional-ira",
    title: "Traditional and Roth IRAs",
    category: "Retirement Accounts",
    appliesTo: ["universal"],
    summary: "An Individual Retirement Account is open to essentially anyone with earned income and isn't tied to an employer. You choose between a traditional version (tax break now, taxed withdrawals later) and a Roth version (no tax break now, tax-free withdrawals later), and unlike a 401(k) you can typically invest in nearly any stock, ETF, or bond — or even alternative assets through a self-directed IRA.",
    keyFacts: [
      "2025 contribution limit: $7,000, or $8,000 if you're 50 or older; the limit is shared across all your IRAs combined",
      "Roth IRA contributions phase out at income between $150,000-$165,000 (single/HOH) and $236,000-$246,000 (married filing jointly) for 2025",
      "Traditional IRA withdrawals before 59.5 face a 10% penalty plus ordinary income tax; traditional IRAs also carry required minimum distributions starting at 73",
      "Roth IRA contributions (not earnings) can be withdrawn at any age with no penalty; earnings require you to be 59.5 and have held the account 5+ years; Roth IRAs have no RMDs at all"
    ],
    eligibilitySignals: ["has earned income", "income too high for direct Roth contributions", "wants investment flexibility beyond a workplace 401(k) menu"],
    clarifyingQuestions: [
      "What's your approximate household income and filing status, to check Roth IRA eligibility?",
      "Do you already have money in any traditional or rollover IRAs?"
    ],
    notFinancialAdviceNote: "A tax professional should confirm your eligibility and contribution limits given your specific income and any existing IRA balances."
  },
  {
    id: "roth-vs-pretax-contribution-choice",
    title: "Choosing Between Roth and Pre-Tax Contributions",
    category: "Retirement Accounts",
    appliesTo: ["universal"],
    summary: "The common shortcut — go pre-tax in high-earning years, go Roth in low-earning years — is a reasonable starting point, but there's a real case for keeping a meaningful Roth allocation even at the top of your earning power. Roth dollars function partly as insurance against future tax-rate uncertainty and give you more flexibility than a strictly pre-tax approach.",
    keyFacts: [
      "Today's top marginal federal rate (37%) is historically low compared to rates that have exceeded 90% in past decades, so Roth dollars hedge against rates rising later",
      "Roth IRA contributions can be withdrawn at any time penalty-free, unlike most retirement accounts that lock funds up until retirement age",
      "Roth accounts have no required minimum distributions, giving you full control over withdrawal timing",
      "Because there's no tax due on gains inside a Roth account, it can be an attractive place to hold higher-risk, higher-upside investments"
    ],
    eligibilitySignals: ["deciding how to split contributions between traditional and Roth accounts", "uncertain about future tax rates or retirement bracket"],
    clarifyingQuestions: [
      "What's your best guess about whether your tax rate will be higher or lower in retirement than it is today?",
      "How much value do you place on being able to access contributions early if needed?"
    ],
    notFinancialAdviceNote: "A financial planner can model specific split percentages based on your actual retirement income projections."
  },
  {
    id: "roth-conversions",
    title: "Roth Conversions",
    category: "Retirement Accounts",
    appliesTo: ["universal"],
    summary: "A Roth conversion is a voluntary move of money from a pre-tax retirement account into a Roth account, paying ordinary income tax on the converted amount now in exchange for tax-free growth and withdrawals later. It's especially powerful in years when your income is unusually low — a sabbatical, a layoff, or a slow year in self-employment — since the conversion can be taxed at a much lower rate than usual.",
    keyFacts: [
      "The full converted amount is taxed as ordinary income in the year of conversion",
      "Converted funds require a 5-year holding period before they can be withdrawn penalty-free, separate from your age",
      "You can convert any amount you choose in a given year and can spread conversions across multiple years to manage which bracket they land in",
      "Best executed in years with unusually low other income to minimize the tax hit on the conversion itself"
    ],
    eligibilitySignals: ["has a low-income year (sabbatical, layoff, business slowdown, gap year)", "holds pre-tax retirement balances", "wants to manage lifetime tax rate rather than just this year's bill"],
    clarifyingQuestions: [
      "Do you expect this year's income to be unusually low compared to a typical year?",
      "How much do you currently hold in pre-tax retirement accounts that could be converted?"
    ],
    notFinancialAdviceNote: "A tax professional should model the exact bracket impact of any conversion amount before you execute it, since it's generally irreversible."
  },
  {
    id: "backdoor-roth-ira",
    title: "Backdoor Roth IRA",
    category: "Retirement Accounts",
    appliesTo: ["universal"],
    summary: "High earners who are phased out of direct Roth IRA contributions can still get money into a Roth IRA through a well-established three-step workaround. Done correctly it's tax-free; done sloppily — usually by having other pre-tax IRA money sitting around — it can trigger an unexpected tax bill through the pro-rata rule.",
    keyFacts: [
      "Step 1: make sure you hold zero dollars in any pre-tax IRA (traditional, rollover, or SEP) anywhere, typically by rolling those balances into a 401(k) or Solo 401(k)",
      "Step 2: contribute the annual limit ($7,000 for 2025) to a traditional IRA as a non-deductible contribution, reported on Form 8606",
      "Step 3: convert that traditional IRA balance to a Roth IRA; the custodian issues a Form 1099-R to report at tax time",
      "The pre-tax IRA balance needs to stay at zero through December 31 of the conversion year, not just at the moment of contribution"
    ],
    eligibilitySignals: ["income above the direct Roth IRA contribution limits", "no existing pre-tax IRA balances, or willing to roll them into a 401(k)/Solo 401(k) first"],
    clarifyingQuestions: [
      "Do you currently hold any money in a traditional, rollover, or SEP IRA?",
      "Do you have access to a workplace 401(k) or Solo 401(k) that could absorb those pre-tax balances?"
    ],
    notFinancialAdviceNote: "A CPA should confirm your pro-rata exposure and file Form 8606 correctly, since mistakes here are common and can create unintended taxable income."
  },
  {
    id: "mega-backdoor-roth-ira",
    title: "Mega Backdoor Roth IRA",
    category: "Retirement Accounts",
    appliesTo: ["self_employed", "business_owner", "universal"],
    summary: "This is a much larger-scale version of the backdoor Roth that can move tens of thousands of extra dollars into Roth space every year. It works by making after-tax (not pre-tax, not Roth) contributions to a 401(k) plan and then converting them to Roth before they have a chance to grow — available either through certain large-employer 401(k) plans or through a Solo 401(k) funded by side income.",
    keyFacts: [
      "Total 401(k) contribution room across all contribution types tops out at $70,000 for 2025",
      "Requires either an employer 401(k) that explicitly supports after-tax contributions plus in-plan Roth conversion, or self-employment/side-hustle income routed through a Solo 401(k) that supports the feature",
      "Convert the after-tax contribution to Roth as soon as possible after making it — any growth before conversion becomes taxable",
      "Especially effective for someone with a full-time W-2 job plus separate self-employment income, since the Solo 401(k) route only requires the side income"
    ],
    eligibilitySignals: ["has self-employment or 1099 side income", "employer 401(k) explicitly allows after-tax contributions and in-plan conversions", "already maxing out standard 401(k) and IRA contributions"],
    clarifyingQuestions: [
      "Do you have any self-employment or 1099 income outside a W-2 job?",
      "Does your employer's 401(k) plan document specifically allow after-tax (non-Roth) contributions?"
    ],
    notFinancialAdviceNote: "Confirm with your plan provider whether after-tax contributions and in-plan Roth conversions are actually supported before assuming this is available to you."
  },
  {
    id: "solo-401k",
    title: "Solo 401(k) for the Self-Employed",
    category: "Retirement Accounts",
    appliesTo: ["self_employed", "business_owner"],
    summary: "For anyone with self-employment income and no full-time employees, a Solo 401(k) stands out as one of the strongest retirement vehicles on offer — it stacks a large contribution ceiling, wide-open investment choices, the option to mix Roth and pre-tax dollars, and a built-in loan feature that few comparable accounts provide.",
    keyFacts: [
      "Eligible with any net self-employment income, even a small side hustle — you don't need a formal registered business, but you can't have full-time (non-owner, non-spouse) W-2 employees",
      "2025 overall contribution ceiling: $70,000 per person (net self-employment income capped), plus $7,500 catch-up at 50+, plus an added $11,250 for ages 60-63",
      "Sole proprietors/single-member LLCs can contribute an employer share of roughly 20% of net self-employment income (after half of self-employment tax); S-corp/C-corp owners can contribute up to 25% of W-2 wages",
      "Participants can borrow up to 50% of the account balance, capped at $50,000, for any reason",
      "Setting one up with plan documents supporting automatic contribution arrangements can qualify you for the EACA tax credit — $500/year for 3 years ($1,500 total)"
    ],
    eligibilitySignals: ["1099/self-employment income of any size", "no full-time non-owner employees", "wants to shelter more than the standard IRA limit"],
    clarifyingQuestions: [
      "Do you have any self-employment or 1099 income, even alongside a regular job?",
      "Does your business have any full-time employees other than you or your spouse?"
    ],
    notFinancialAdviceNote: "A tax professional should confirm your exact contribution ceiling, since it depends on your entity type, W-2 salary (if any), and other retirement plan contributions."
  },
  {
    id: "solo-401k-vs-sep-ira",
    title: "Solo 401(k) vs. SEP IRA",
    category: "Retirement Accounts",
    appliesTo: ["self_employed", "business_owner"],
    summary: "SEP IRAs were the default recommendation for years mostly because fewer providers supported Solo 401(k)s. Now that more providers do, a Solo 401(k) beats a SEP IRA in almost every self-employed scenario — it typically allows larger contributions at the same income level, supports Roth and mega-backdoor-Roth contributions, and allows plan loans, none of which a SEP IRA offers.",
    keyFacts: [
      "At the same net self-employment income, a Solo 401(k) can allow roughly double the contribution room of a SEP IRA because it stacks employee and employer contributions",
      "SEP IRAs don't support Roth contributions in practice — the IRS hasn't issued clear guidance, so no providers currently offer it",
      "Solo 401(k)s allow participant loans up to $50,000; SEP IRAs do not",
      "A SEP IRA can still make sense if you have multiple employees and want to make matching contributions for all of them, since a Solo 401(k) isn't available once you have full-time non-owner staff",
      "Solo 401(k)s with balances over $250,000 require an annual Form 5500-EZ filing"
    ],
    eligibilitySignals: ["currently has a SEP IRA and self-employment income", "comparing retirement plan options as a solo business owner"],
    clarifyingQuestions: [
      "Do you currently have a SEP IRA, and would you be open to transitioning to a Solo 401(k)?",
      "Do you have any employees you'd need to make matching contributions for?"
    ],
    notFinancialAdviceNote: "Have a provider or tax professional confirm your existing SEP IRA balance won't complicate a backdoor Roth strategy before switching plan types."
  },
  {
    id: "solo-401k-contribution-deadlines",
    title: "Solo 401(k) Setup and Contribution Deadlines",
    category: "Retirement Accounts",
    appliesTo: ["self_employed", "business_owner"],
    summary: "Solo 401(k) deadlines are more forgiving than most people assume, but the rules differ by contribution type, business structure, and how long the plan has existed — so it's easy to accidentally miss an earlier deadline than you expected.",
    keyFacts: [
      "Simplest safe approach: establish the plan and document a written contribution 'election' by December 31, then you generally have until your tax filing deadline (with extensions) to actually fund it",
      "There's no penalty for contributing less than what you elected, but you generally shouldn't contribute more than the election specified",
      "First-year plans for sole proprietors/LLCs have a stricter no-election-required deadline right at the unextended tax filing due date for certain contribution types",
      "S-corp and C-corp deadlines for some contribution types are tied to December 31 or your payroll company's W-2 correction deadlines, which can be earlier than you'd expect"
    ],
    eligibilitySignals: ["setting up or funding a Solo 401(k) for the first time", "unsure whether they've missed a contribution deadline"],
    clarifyingQuestions: [
      "Have you already set up a Solo 401(k) plan document, or would this be your first year?",
      "What's your business structure — sole proprietor/single-member LLC, S-corp, or C-corp?"
    ],
    notFinancialAdviceNote: "A tax professional should confirm your exact deadline given your business type and how long the plan has existed, since the rules genuinely vary."
  },
  {
    id: "cash-balance-plan",
    title: "Cash Balance Plans",
    category: "Retirement Accounts",
    appliesTo: ["self_employed", "business_owner"],
    summary: "A cash balance plan is a defined-benefit retirement plan — the opposite structure from a 401(k) — that works backward from a target retirement payout to determine how much can be contributed each year. For high-earning self-employed people and business owners, especially those over 40-50, it can allow a tax deduction many times larger than a 401(k) alone, at the cost of real setup expense and administrative complexity.",
    keyFacts: [
      "Employer 'credits' the account annually with a pay credit (roughly 5-8% of salary) and an interest credit (roughly 4-5%), building toward a maximum retirement benefit around $280,000/year, translating to a lump sum near $3.5 million at age 62",
      "Contribution limits scale up significantly with age — modeled examples for a solo business owner earning $500,000/year show roughly $72,000 at age 30 growing to over $350,000 at age 62 when combined with a Solo 401(k)",
      "Setup fees typically run $2,500-$5,000 with an annual administration cost around $2,500",
      "Works alongside, not instead of, a 401(k) or Solo 401(k) — the two stack together for an even larger combined deduction",
      "Best suited to solo owners or high-W-2 professionals (physicians, lawyers, consultants) age 40+, planning to sustain the contribution for at least 3 years"
    ],
    eligibilitySignals: ["self-employed or business owner earning roughly $300,000+", "age 40 or older", "wants a larger annual tax deduction than a Solo 401(k) alone provides", "can commit to funding the plan for several years"],
    clarifyingQuestions: [
      "Roughly how much net income does your business generate, and how old are you?",
      "Could you commit to maintaining this level of income and contributions for at least the next 3 years?"
    ],
    notFinancialAdviceNote: "An actuary and tax professional need to run the specific contribution calculation for your age and income — this isn't a self-service estimate."
  },
  {
    id: "trump-accounts",
    title: "Trump Accounts (New Retirement Accounts for Kids)",
    category: "Retirement Accounts",
    appliesTo: ["universal"],
    summary: "This is a newly created retirement account for children under 18 that doesn't require the child to have earned income — a major departure from custodial Roth IRAs. Beyond the headline government seed deposit, the real value is that parents (and their employers) can load in tens of thousands of dollars over 18 years, then convert the whole balance to a Roth IRA once the child turns 18.",
    keyFacts: [
      "All children under 18 are eligible to open an account; the guide describes a government-funded $1,000 seed deposit for children born within a multi-year window around 2025-2029",
      "Parents can contribute up to $5,000/year after-tax per child; employers of the parent can contribute up to an additional $2,500/year pre-tax as a benefit, for roughly $90,000+ in potential contributions over 18 years",
      "At 18, the account can be converted to a Roth IRA; the after-tax contribution portion converts tax-free, while any earnings and pre-tax employer contributions are taxed as the child's income at conversion",
      "A simplified model assuming maximum contributions and a flat 10% return projects roughly $233,000 by age 18 and about $12 million tax-free by traditional retirement age, assuming no further contributions",
      "Funds are restricted before age 18 for any reason, and before 59.5 outside a short list of penalty-free exceptions (education expenses, up to $10,000 toward a first home)"
    ],
    eligibilitySignals: ["has or is expecting a child born in the eligible window", "wants to start retirement savings for a child without needing the child to have earned income"],
    clarifyingQuestions: [
      "Do you have children under 18, or are you expecting a child soon?",
      "As a business owner, could you route part of this contribution through your business as an employee benefit?"
    ],
    notFinancialAdviceNote: "These accounts are new; a tax professional should confirm final program rules and conversion tax treatment closer to when your child turns 18."
  },
  {
    id: "self-directed-ira-asymmetric-investments",
    title: "Using a Self-Directed IRA for High-Upside Investments",
    category: "Retirement Accounts",
    appliesTo: ["universal"],
    summary: "Because a Roth IRA never taxes gains again once money is in, it's an especially attractive place to hold high-risk, high-upside bets — early startup stock, distressed private assets, or similar — rather than only plain-vanilla index funds. Several well-documented ultra-large Roth and SEP IRA balances were built this way, and while most people won't replicate those extremes, the underlying mechanic (self-directed account, unconventional asset, huge multiple) is available to anyone.",
    keyFacts: [
      "A self-directed IRA/Roth IRA can hold alternative assets like private company shares, real estate, or crypto, not just public stocks and mutual funds",
      "The IRS strictly prohibits 'self-dealing' — a transaction inside your own IRA cannot personally benefit you outside the account (e.g., buying a house you then live in), and violating this can invalidate the entire account",
      "Buying shares in a company you personally founded or control from inside your own IRA is considered especially high-risk from a self-dealing standpoint",
      "A simplified model starting Roth contributions at 19 and mega-backdoor 401(k) contributions at 23, invested in an S&P 500-like return, still projects a Roth balance around $25 million by age 60 without any exotic investments"
    ],
    eligibilitySignals: ["has access to early-stage private investment opportunities (as an employee, advisor, angel investor)", "has a self-directed IRA or is considering opening one"],
    clarifyingQuestions: [
      "Do you have access to invest in private companies, whether as an employee, advisor, or investor?",
      "Do you currently have a self-directed IRA, or would you need to open one to hold non-traditional assets?"
    ],
    notFinancialAdviceNote: "An ERISA attorney or tax professional should review any prohibited-transaction risk before you put non-traditional assets inside a retirement account."
  },
  {
    id: "hsa-overview",
    title: "Health Savings Account (HSA) Basics",
    category: "Health & Education Accounts",
    appliesTo: ["universal"],
    summary: "An HSA is the only account in the tax code that gives you a deduction going in, tax-free growth while invested, and tax-free withdrawals coming out, as long as the money is used for qualified medical expenses. It's only open to people enrolled in a high-deductible health plan, but for those who qualify it functions as one of the best long-term savings vehicles available.",
    keyFacts: [
      "2025 contribution limits: $4,300 individual coverage, $8,550 family coverage, plus $1,000 catch-up if you're 55+",
      "To qualify you need an HDHP with a 2025 minimum deductible of $1,650 individual/$3,300 family, and an out-of-pocket max no higher than $8,300 individual/$16,600 family",
      "Contribution deadline is the federal tax filing deadline, not December 31; over-contributing triggers a 6% excise tax on the excess",
      "Non-medical withdrawals before 65 face a 20% penalty plus ordinary income tax; after 65, non-medical withdrawals are only taxed as ordinary income with no penalty, similar to a traditional IRA",
      "Funds can be invested in stocks, bonds, mutual funds, and ETFs rather than sitting in cash, and any investment gains inside the account are never taxed if used for medical expenses"
    ],
    eligibilitySignals: ["enrolled in a high-deductible health plan", "not enrolled in Medicare", "not claimed as a dependent"],
    clarifyingQuestions: [
      "Are you currently enrolled in a high-deductible health insurance plan?",
      "Is your HSA balance sitting in cash, or is it invested for long-term growth?"
    ],
    notFinancialAdviceNote: "Confirm your specific health plan actually qualifies as an HDHP under current IRS thresholds before contributing."
  },
  {
    id: "hsa-pay-and-reimburse-strategy",
    title: "HSA Pay-Out-of-Pocket-and-Reimburse-Later Strategy",
    category: "Health & Education Accounts",
    appliesTo: ["universal"],
    summary: "Instead of pulling money from your HSA every time you have a medical bill, you can pay the expense with outside cash (or a rewards credit card), keep the receipt indefinitely, and reimburse yourself from the HSA years or decades later. This keeps the HSA balance invested and compounding the whole time, while the stored receipt effectively becomes tax-free cash you can access whenever you actually need liquidity.",
    keyFacts: [
      "There's no deadline on when you must reimburse yourself for a past qualified medical expense — the receipt remains valid indefinitely as long as the HSA was open at the time of the expense",
      "Paying the expense with a rewards credit card (paid off in full) lets you stack card rewards on top of the tax benefit",
      "The reimbursement itself is not taxed since it's simply returning your own already-tax-advantaged money to you",
      "This approach maximizes the amount of time the HSA balance stays invested and compounding tax-free"
    ],
    eligibilitySignals: ["has an HSA and pays medical expenses out of pocket by choice", "wants to maximize long-term HSA growth rather than using it as a pass-through spending account"],
    clarifyingQuestions: [
      "Do you currently pay medical expenses directly from your HSA, or do you have the cash flow to pay out of pocket instead?",
      "Are you keeping organized records/receipts of medical expenses you could reimburse yourself for later?"
    ],
    notFinancialAdviceNote: "Keep receipts in a durable, dated format — you'll need to substantiate the original expense if the IRS ever questions a reimbursement made years later."
  },
  {
    id: "529-plan-basics",
    title: "529 Education Savings Plans",
    category: "Health & Education Accounts",
    appliesTo: ["universal"],
    summary: "A 529 plan lets you invest after-tax dollars for education costs, with no federal deduction going in but completely tax-free growth and withdrawals as long as the money is used for qualifying education expenses. Many states also offer their own state income tax deduction or credit for contributions, and the definition of 'qualifying expense' has expanded well beyond just college tuition.",
    keyFacts: [
      "No federal deduction on contributions; withdrawals for qualified expenses are federal tax-free, and gains grow tax-free the entire time",
      "K-12 private school tuition is covered up to $10,000/year (rising to $20,000/year starting 2026); qualifying expenses also include tutoring, curriculum materials, certain vocational/apprenticeship programs, and up to $10,000 lifetime toward student loan repayment",
      "Anyone can open an account for any beneficiary — yourself, a child, a relative, even a friend — with no income restriction on contributors or beneficiaries",
      "State lifetime aggregate contribution caps range roughly from $235,000 up to over $621,000 depending on the state",
      "Beneficiaries can be changed at any time to another eligible family member without triggering taxes, so unused funds aren't permanently trapped"
    ],
    eligibilitySignals: ["has or plans to have children", "wants to save for K-12 private school, college, or vocational education", "lives in a state offering a 529 tax deduction"],
    clarifyingQuestions: [
      "Does your state offer a state tax deduction or credit for contributions to its own 529 plan?",
      "What education expenses are you anticipating — K-12 private school, college, grad school, or something else?"
    ],
    notFinancialAdviceNote: "Confirm which specific expenses qualify under your particular state's 529 rules, since not every state recognizes every category the same way."
  },
  {
    id: "529-superfunding-and-state-shopping",
    title: "529 Superfunding and Multi-State Plan Shopping",
    category: "Health & Education Accounts",
    appliesTo: ["universal"],
    summary: "You aren't limited to your home state's 529 plan, and you don't have to contribute gradually — the gift tax rules allow you to front-load up to five years of contributions in a single year, which can meaningfully increase the amount of time your money spends compounding tax-free.",
    keyFacts: [
      "Standard annual gift tax exclusion for 529 contributions is $19,000 per donor per beneficiary in 2025 ($38,000 for a married couple)",
      "Five-year superfunding lets an individual contribute up to $95,000 in a single year ($190,000 for a married couple) treated as spread over five years for gift tax purposes",
      "You can choose any state's plan regardless of where you live; some states (e.g., Utah, Nevada) are popular for high contribution limits and strong investment menus",
      "It's often worth using an out-of-state plan if your home state offers no deduction (e.g., California), though a handful of states allow a deduction even for contributions to another state's plan",
      "Opening a 529 with yourself as beneficiary before having kids — then changing the beneficiary later — can extend the compounding window by years"
    ],
    eligibilitySignals: ["has a lump sum available to invest for education (inheritance, bonus, liquidity event)", "lives in a state with no 529 deduction", "wants to compare plans across states"],
    clarifyingQuestions: [
      "Do you have a lump sum you're considering putting toward education savings, or would this be a recurring contribution?",
      "Does your home state offer a tax deduction for 529 contributions, and if so, only for its own plan?"
    ],
    notFinancialAdviceNote: "A tax professional should confirm the gift tax reporting requirements if you use the five-year superfunding election."
  },
  {
    id: "529-to-roth-ira-rollover",
    title: "529-to-Roth IRA Rollover",
    category: "Health & Education Accounts",
    appliesTo: ["universal"],
    summary: "If a 529 plan ends up with leftover money after education is paid for, a relatively new rule lets you move a portion of that balance directly into the beneficiary's own Roth IRA without the usual early-withdrawal penalty or extra taxable income — turning unused education savings into a retirement head start instead.",
    keyFacts: [
      "Lifetime rollover cap of $35,000 per beneficiary",
      "The 529 account must have existed for at least 15 years before the rollover is allowed",
      "Rollover amounts count against the beneficiary's normal annual Roth IRA contribution limit ($7,000 for 2025) rather than being an extra allowance on top",
      "The beneficiary must have earned income at least equal to the amount being rolled over that year",
      "Contributions made to the 529 within the last 5 years are not eligible to be rolled over"
    ],
    eligibilitySignals: ["has a 529 account open for 15+ years with a balance left over after education expenses", "beneficiary has earned income"],
    clarifyingQuestions: [
      "How long has this specific 529 account been open, and does it exceed 15 years?",
      "Does the beneficiary have earned income this year to support the rollover?"
    ],
    notFinancialAdviceNote: "A tax professional should verify the account's contribution history, since money added in the last 5 years is disqualified from the rollover."
  },
  {
    id: "other-education-savings-accounts",
    title: "Coverdell ESAs and ABLE Accounts",
    category: "Health & Education Accounts",
    appliesTo: ["universal"],
    summary: "529 plans are the most flexible education savings vehicle, but two other accounts serve narrower purposes: Coverdell ESAs offer similar tax treatment on a much smaller scale, and ABLE accounts provide tax-advantaged savings specifically for people with disabilities, including for education-related costs.",
    keyFacts: [
      "Coverdell ESA: similar tax-free growth/withdrawal treatment to a 529, but capped at $2,000/year in contributions and subject to income restrictions on contributors",
      "Coverdell funds can be used for both K-12 and college expenses",
      "ABLE accounts offer tax-free growth for disability-related expenses, including education costs",
      "529 plan balances can now be rolled into an ABLE account without the expiration limitations that previously applied"
    ],
    eligibilitySignals: ["income too low to matter for a 529 deduction but wants a smaller dedicated education account", "has a dependent with a qualifying disability"],
    clarifyingQuestions: [
      "Would a smaller, more restricted account like a Coverdell ESA fit your savings goal better than a 529?",
      "Do you or a dependent have a qualifying disability that could benefit from an ABLE account?"
    ],
    notFinancialAdviceNote: "A tax professional should confirm current income limits for Coverdell contributions, since eligibility phases out at moderate income levels."
  },
  {
    id: "hire-your-spouse-for-retirement-doubling",
    title: "Hiring Your Spouse to Double Retirement Contributions",
    category: "Family & Dependents",
    appliesTo: ["self_employed", "business_owner"],
    summary: "If you run a profitable business with no other full-time employees, putting your spouse on payroll as a genuine business partner effectively doubles your household's access to Solo 401(k) contribution limits, since each spouse gets their own separate contribution ceiling.",
    keyFacts: [
      "Each spouse can separately contribute up to the individual Solo 401(k) limit ($70,000 in 2025), for up to $140,000 combined for the household",
      "With 50+ catch-up contributions for both spouses, the combined household total can exceed $150,000",
      "Your spouse must be paid a reasonable, legitimate salary for actual work performed in the business",
      "The household needs enough cash flow to actually defer this much income into retirement accounts for the strategy to be practical"
    ],
    eligibilitySignals: ["married business owner with no other full-time employees", "spouse could take on a genuine role in the business", "household can afford to defer a large amount of income"],
    clarifyingQuestions: [
      "Does your spouse currently do any work for your business, or could they take on a legitimate role?",
      "Would your household cash flow support deferring a six-figure combined amount into retirement accounts?"
    ],
    notFinancialAdviceNote: "Document your spouse's actual job duties and pay them a defensible market salary — a tax professional should confirm reasonableness given IRS scrutiny of family payroll."
  },
  {
    id: "hire-your-kids-for-tax-savings",
    title: "Hiring Your Kids for Legitimate Business Work",
    category: "Family & Dependents",
    appliesTo: ["self_employed", "business_owner"],
    summary: "Putting your children on your business's payroll for real work — social media, content creation, customer support, and similar tasks — shifts income from your (higher) tax rate to theirs, which can mean the income is taxed at 0% if it stays under their standard deduction, while your business still gets to deduct the wages paid.",
    keyFacts: [
      "Wages paid to your child under the standard deduction amount can result in $0 tax owed by the child and no tax return requirement",
      "The business still gets a full deduction for the wages paid, reducing your taxable income",
      "The same approach works with other family members too, such as retired parents, as long as pay stays under their standard deduction",
      "The work must be legitimate and appropriately documented — this only works for real work at a defensible pay rate, not disguised gifts"
    ],
    eligibilitySignals: ["business owner with children capable of doing real work for the business", "wants to shift income to a lower household tax bracket"],
    clarifyingQuestions: [
      "What kind of work could your child realistically and legitimately do for your business?",
      "Are you keeping (or willing to keep) documentation of hours worked and tasks completed?"
    ],
    notFinancialAdviceNote: "Keep contemporaneous records of work performed and pay a defensible market rate — a tax professional should confirm this holds up if ever questioned in an audit."
  },
  {
    id: "custodial-roth-ira-for-working-minors",
    title: "Custodial Roth IRA for Working Children",
    category: "Family & Dependents",
    appliesTo: ["universal"],
    summary: "Once your child has earned income — whether from your business or elsewhere — you can open a custodial Roth IRA in their name and contribute their earnings, giving them a multi-decade head start on tax-free retirement compounding well before most people even start saving.",
    keyFacts: [
      "2025 contribution limit is the standard Roth IRA limit, $7,000, and requires the child to have earned income at least equal to the contribution",
      "Starting contributions at a young age (e.g., 13) versus waiting until early adulthood (e.g., 21) can result in a dramatically larger balance by traditional retirement age due to the extra compounding years",
      "Contributions (not earnings) can be withdrawn by the child at any time without penalty if they need liquidity later in life",
      "Doubles as a hands-on introduction to personal finance and investing for the child"
    ],
    eligibilitySignals: ["child has earned income from any legitimate source", "parent wants to jump-start long-term compounding for a child"],
    clarifyingQuestions: [
      "Does your child currently have any earned income, whether from your business or another source?",
      "Would you be contributing on their behalf, or would they be contributing their own earnings?"
    ],
    notFinancialAdviceNote: "A financial professional should confirm the custodial account setup and contribution documentation align with your child's actual earned income."
  },
  {
    id: "spousal-roth-ira-for-nonworking-spouse",
    title: "Spousal Roth IRA for a Non-Working Spouse",
    category: "Family & Dependents",
    appliesTo: ["universal"],
    summary: "Roth IRA contributions normally require earned income, but the tax code carves out an exception allowing a working spouse to fund a Roth IRA on behalf of a non-working spouse, doubling the household's total direct Roth contribution capacity.",
    keyFacts: [
      "Allows a household to contribute up to roughly $14,000/year combined across both spouses' Roth IRAs (2025 limits), rather than being limited to just the working spouse's $7,000",
      "The couple must file a joint return, and the working spouse's earned income must be sufficient to cover both contributions",
      "This is separate from — and much smaller than — the household-level boost available by formally hiring a non-working spouse into the business for Solo 401(k) purposes"
    ],
    eligibilitySignals: ["married with one spouse having little or no earned income", "filing jointly"],
    clarifyingQuestions: [
      "Does one spouse currently have little or no earned income?",
      "Are you filing your taxes as married filing jointly?"
    ],
    notFinancialAdviceNote: "Confirm the working spouse's earned income is sufficient to cover both contributions before funding a spousal IRA."
  },
  {
    id: "tax-loss-harvesting",
    title: "Tax-Loss Harvesting",
    category: "Investment Tax",
    appliesTo: ["universal"],
    summary: "Because you're only taxed on your net capital gains for the year, deliberately selling losing investments before year-end can offset gains elsewhere in your portfolio — and if your losses exceed your gains, a portion can even offset ordinary income. Done consistently, this is one of the higher-value, lower-effort strategies available to any investor with a taxable brokerage account.",
    keyFacts: [
      "Short-term losses offset short-term gains first, long-term losses offset long-term gains first, and any leftover losses offset the other type",
      "Up to $3,000 of net capital losses can offset ordinary income (like salary) in a given year",
      "Excess losses beyond that carry forward indefinitely to future tax years with no expiration",
      "Selling a highly appreciated tax lot isn't part of harvesting — this specifically targets positions currently below their purchase price",
      "Has zero effect inside already tax-advantaged accounts like IRAs or 401(k)s, since gains/losses there aren't taxed annually anyway"
    ],
    eligibilitySignals: ["has a taxable (non-retirement) brokerage account", "holds positions currently below their cost basis", "has realized capital gains elsewhere this year"],
    clarifyingQuestions: [
      "Do you currently hold any investments in a taxable brokerage account that are worth less than what you paid for them?",
      "Have you realized any capital gains so far this year that you'd want to offset?"
    ],
    notFinancialAdviceNote: "A tax professional or brokerage tool should confirm your specific tax lots and net gain/loss position before you execute trades."
  },
  {
    id: "wash-sale-rule",
    title: "Avoiding Wash Sales When Harvesting Losses",
    category: "Investment Tax",
    appliesTo: ["universal"],
    summary: "The wash sale rule exists to stop you from claiming a tax loss while your actual market exposure never really changes. If you buy back a 'substantially identical' security within 30 days of selling it at a loss — in any account, including a spouse's — the loss is disallowed and simply gets folded into the cost basis of the replacement shares.",
    keyFacts: [
      "The 30-day window applies both before and after the sale, and spans different accounts and even a spouse's accounts",
      "Buying back the exact same ticker clearly triggers it; two ETFs tracking the identical index (e.g., two different S&P 500 funds) are also very likely to be treated as substantially identical",
      "Two related-but-distinct securities (an S&P 500 ETF vs. an S&P 100 ETF, or two competing companies in the same industry) are generally safe replacements that avoid the rule while keeping similar market exposure",
      "As of now, cryptocurrency isn't subject to wash sale rules, so crypto losses can be harvested and the identical asset immediately repurchased",
      "Waiting the full 30 days lets you repurchase the identical security, at the risk that its price has moved in the meantime"
    ],
    eligibilitySignals: ["tax-loss harvesting and wants to stay invested in a similar position", "holds crypto with unrealized losses"],
    clarifyingQuestions: [
      "Are you planning to sell and immediately replace a losing position, or wait out the 30-day window?",
      "Is the position in question a stock, ETF, or cryptocurrency?"
    ],
    notFinancialAdviceNote: "A tax professional should review any replacement security you're considering to confirm it isn't 'substantially identical' under current guidance."
  },
  {
    id: "direct-indexing",
    title: "Direct Indexing for Tax Efficiency",
    category: "Investment Tax",
    appliesTo: ["universal"],
    summary: "Instead of buying a single index fund, direct indexing buys every individual company in the index separately. The performance tracks the index almost identically, but because you hold every name directly, you can harvest tax losses on the individual stocks that happen to be down even when the overall index is up — something a single pooled index fund can never let you do.",
    keyFacts: [
      "Aims to replicate index performance while generating meaningfully more usable tax losses along the way",
      "Can generate a usable tax loss estimated around 40% of the initial investment amount in favorable conditions — for example, roughly $400,000 of harvestable losses on a $1 million allocation",
      "Tends to make the most sense starting around six figures invested and works best with ongoing recurring investment, since losses become harder to find over time as most positions eventually appreciate",
      "Requires a provider/platform capable of managing the individual-stock complexity — most legacy brokerages don't offer a strong direct indexing product"
    ],
    eligibilitySignals: ["investing six figures or more in a broad market index", "makes regular recurring investments", "values tax efficiency over simplicity"],
    clarifyingQuestions: [
      "Roughly how much do you have allocated to broad index investing right now?",
      "Are you making ongoing recurring contributions, or is this mostly a one-time allocation?"
    ],
    notFinancialAdviceNote: "Compare platform fees and tracking accuracy with a financial advisor, since direct indexing isn't free and the tax benefit needs to outweigh added cost and complexity."
  },
  {
    id: "qualified-opportunity-zones",
    title: "Qualified Opportunity Zones (QOZ)",
    category: "Investment Tax",
    appliesTo: ["universal"],
    summary: "Opportunity Zones are designated economically distressed areas where the government offers substantial capital gains tax benefits to encourage investment. If you have a capital gain and reinvest it into a Qualified Opportunity Fund within the required window, you can defer the original gain and, if you hold on long enough, eliminate tax on the new appreciation entirely.",
    keyFacts: [
      "Only capital gains — not ordinary income — are eligible to be invested into a Qualified Opportunity Fund (QOF)",
      "You generally have roughly 180 days from realizing a gain to invest it in a QOF to qualify for deferral",
      "Under the newer rules taking effect for investments made from January 1, 2027 onward: gains can be deferred for 5 years, you get a 10% step-up in basis after a 5-year hold, and you owe zero tax on the opportunity zone investment's own growth if held 10+ years",
      "A QOF must self-certify annually via Form 8996 and keep at least 90% of its assets invested in designated opportunity zones",
      "This is a higher-risk, less liquid, concentrated real estate/business investment — most individual investors access it through funds run by real estate development firms rather than creating their own"
    ],
    eligibilitySignals: ["has a large recent or upcoming capital gain (business sale, stock sale, real estate sale)", "comfortable with illiquid, concentrated real estate risk", "not planning to need the reinvested capital for 5-10+ years"],
    clarifyingQuestions: [
      "Have you recently realized, or are you about to realize, a significant capital gain?",
      "How comfortable are you with a higher-risk, illiquid, long-hold real estate investment?"
    ],
    notFinancialAdviceNote: "An accountant and investment professional experienced with QOFs should evaluate the specific fund and timing before you commit capital."
  },
  {
    id: "money-market-fund-tax-equivalent-yield",
    title: "Tax-Advantaged Money Market Funds",
    category: "Investment Tax",
    appliesTo: ["universal"],
    summary: "For cash you don't need immediately, certain money market funds can out-earn a typical high-yield savings account once you account for taxes — some are exempt from federal tax, some from state and local tax, and some (for residents of high-tax states) from both. Comparing them properly requires converting each fund's yield into a 'tax-equivalent yield' so you're comparing apples to apples against a taxable savings account.",
    keyFacts: [
      "Treasury money market funds invest only in U.S. Treasuries and are exempt from state and local tax",
      "Municipal money market funds invest in local municipal bonds and are exempt from federal tax; if the munis are from your home state, they can also be exempt from state tax",
      "Tax-equivalent yield is the yield a taxable account would need to match the after-tax return of the tax-advantaged fund, factoring in your marginal federal and state rates",
      "Money market funds are not FDIC-insured like a bank savings account, and 'breaking the buck' (losing principal) is extremely rare but not theoretically impossible",
      "Worth revisiting quarterly, or after any material change to your income or state of residence, since yields shift regularly"
    ],
    eligibilitySignals: ["holds significant cash in a savings account or plain money market fund", "high marginal tax bracket, especially in a high-tax state"],
    clarifyingQuestions: [
      "Roughly how much cash are you holding in savings or a money market fund right now?",
      "What state do you live in, and what's your approximate marginal tax bracket?"
    ],
    notFinancialAdviceNote: "Recalculate the tax-equivalent yield periodically using current rates — a stale comparison can lead you to the wrong fund."
  },
  {
    id: "charitable-giving-basics-agi-caps",
    title: "Charitable Giving Fundamentals and AGI Caps",
    category: "Charitable Giving",
    appliesTo: ["universal"],
    summary: "Cash and non-cash charitable gifts to qualifying organizations reduce your taxable income dollar-for-dollar, but only if you itemize, and only up to a percentage of your adjusted gross income depending on what you donate. Qualifying organizations are broader than most people assume — religious, educational, scientific, and public-safety groups all count, not just what people typically think of as 'charities.'",
    keyFacts: [
      "Cash donations to public charities are deductible up to 60% of AGI; donations of appreciated assets are capped lower, at 30% of AGI",
      "Donations to private foundations face lower caps still — 30% for cash, 20% for appreciated assets",
      "Amounts above the applicable cap can be carried forward for up to 5 years",
      "You must itemize deductions to claim most charitable contributions — they don't reduce taxable income if you take the standard deduction (with a narrow exception described in the 2026 changes)"
    ],
    eligibilitySignals: ["itemizes deductions", "gives meaningfully to charity each year", "has a large one-time tax bill they want to offset with giving"],
    clarifyingQuestions: [
      "Roughly what percentage of your income do you typically give to charity in a given year?",
      "Are you planning to itemize deductions this year?"
    ],
    notFinancialAdviceNote: "Confirm the organization's 501(c)(3) status and keep receipts, since deductibility depends on the recipient being a qualifying organization."
  },
  {
    id: "donating-appreciated-assets",
    title: "Donating Appreciated Assets Instead of Cash",
    category: "Charitable Giving",
    appliesTo: ["universal"],
    summary: "Giving appreciated stock, crypto, or other long-held assets directly to charity — instead of selling first and donating the cash — lets you skip capital gains tax on the appreciation entirely while still deducting the asset's full current market value. It's a strict upgrade over donating cash whenever you have appreciated positions available.",
    keyFacts: [
      "You must have held the asset for more than one year (long-term) to deduct its full fair market value; short-term holdings are only deductible at your cost basis",
      "Deduction is capped at 30% of AGI for appreciated-asset gifts, with a 5-year carryforward for any excess",
      "Because you avoid capital gains tax and get a full fair-market-value deduction, the charity and the donor both benefit relative to selling and donating cash",
      "After donating, you can immediately repurchase the identical security at the current price, which resets your cost basis higher and reduces future taxable gains — unlike tax-loss harvesting, there's no 30-day waiting period for this",
      "Private company stock and art can also be donated for a deduction, but generally require a qualified third-party appraisal and are only practical for large gifts due to the complexity involved"
    ],
    eligibilitySignals: ["holds appreciated securities or crypto for more than a year", "planning a meaningful charitable gift", "would otherwise sell an appreciated position"],
    clarifyingQuestions: [
      "Do you hold any stock, crypto, or other assets that have appreciated significantly and that you've owned for more than a year?",
      "Were you planning to sell any appreciated positions this year, for any reason?"
    ],
    notFinancialAdviceNote: "A tax professional should confirm holding periods and cost basis on the specific asset before you donate it."
  },
  {
    id: "donor-advised-funds",
    title: "Donor-Advised Funds (DAFs)",
    category: "Charitable Giving",
    appliesTo: ["universal"],
    summary: "A donor-advised fund lets you make a large deductible contribution now — cash or appreciated assets — and decide which specific charities actually receive the money later, on your own timeline, sometimes years afterward. It's particularly useful for people facing a big tax bill who want a deduction immediately but haven't decided where the money should ultimately go.",
    keyFacts: [
      "You get the full charitable deduction in the year you contribute to the DAF, even though grants to actual charities can happen much later",
      "Assets inside the DAF are typically invested and can keep growing tax-free until granted out",
      "A DAF is a common tool for 'bunching' — contributing several years' worth of intended giving in one year to clear the itemizing threshold, then taking the standard deduction in subsequent years",
      "Unlike the new small above-the-line charitable deduction starting in 2026, contributions to a DAF do not qualify for that particular provision"
    ],
    eligibilitySignals: ["facing a large tax bill and wants an immediate deduction without deciding on specific charities yet", "wants to bunch multiple years of giving into one tax year"],
    clarifyingQuestions: [
      "Are you trying to capture a deduction this year even if you haven't decided which charities to support yet?",
      "Would you rather front-load several years of giving into a single tax year?"
    ],
    notFinancialAdviceNote: "Review the DAF sponsor's fees and investment options with a financial advisor before contributing, since these vary meaningfully between providers."
  },
  {
    id: "qualified-charitable-distributions",
    title: "Qualified Charitable Distributions (QCDs)",
    category: "Charitable Giving",
    appliesTo: ["universal"],
    summary: "For people over 70.5 with a Traditional IRA, a QCD lets you send money directly from the IRA to a qualifying charity and have it count as a charitable deduction without needing to itemize — while also satisfying your required minimum distribution and avoiding several of the less favorable charitable-deduction changes coming in 2026.",
    keyFacts: [
      "Available starting at age 70.5; 2025 cap is $108,000 sent directly from a Traditional IRA to a qualifying public charity",
      "Reduces AGI directly (an 'above-the-line' benefit), which can help with other income-based thresholds like Medicare premiums and Social Security taxation, and works even if you take the standard deduction",
      "Counts toward satisfying your required minimum distribution without generating any taxable income from that distribution",
      "Bypasses the 2026 charitable law changes entirely, including the new 0.5% AGI floor and the deduction cap tied to the 35% bracket"
    ],
    eligibilitySignals: ["age 70.5 or older", "holds a Traditional IRA", "subject to required minimum distributions", "gives to charity regularly"],
    clarifyingQuestions: [
      "Are you 70.5 or older, and do you hold a Traditional IRA?",
      "Are you currently subject to required minimum distributions?"
    ],
    notFinancialAdviceNote: "Coordinate the QCD directly through your IRA custodian and confirm it's sent straight to the charity — money that passes through your hands first won't qualify."
  },
  {
    id: "charitable-law-changes-2026",
    title: "2026 Charitable Deduction Law Changes",
    category: "Recent Law Changes",
    appliesTo: ["universal"],
    summary: "Starting in 2026, charitable giving becomes somewhat more valuable for non-itemizers but less valuable for the highest earners. Anyone planning a large charitable gift should understand these three changes now, since giving the same amount in 2025 versus 2026 can produce a meaningfully different tax outcome.",
    keyFacts: [
      "New small above-the-line deduction (available even to non-itemizers) of up to $1,000 single / $2,000 married for gifts to public charities — donor-advised funds and private foundations don't qualify for this specific provision",
      "A new 0.5% of AGI floor applies to itemized charitable deductions starting in 2026 — the first 0.5% of your AGI in giving becomes non-deductible",
      "Charitable deduction tax benefit gets capped at a 35% rate even for taxpayers in the 37% top bracket, shrinking the effective value of large gifts for the highest earners",
      "Example from the guide: a $100,000 gift on $1M AGI saves $37,000 in 2025 but only about $33,250 in 2026 after the floor and cap — roughly $3,750 less",
      "Qualified Charitable Distributions bypass both the new floor and the new cap entirely"
    ],
    eligibilitySignals: ["planning a large charitable gift near the 2025/2026 boundary", "high-income itemizer in or near the top tax bracket"],
    clarifyingQuestions: [
      "Are you considering a large charitable gift that could be made either this year or next year?",
      "Are you in or near the top federal tax bracket?"
    ],
    notFinancialAdviceNote: "A tax professional should model your specific AGI and bracket under both years before deciding whether to accelerate a gift into 2025."
  },
  {
    id: "private-foundations",
    title: "Private Foundations",
    category: "Charitable Giving",
    appliesTo: ["universal"],
    summary: "For very high-net-worth households, a private foundation offers far more control than a donor-advised fund — including the ability to hire and pay family members, fund scholarships, and control every grant decision — but it comes with meaningfully more ongoing administrative burden and lower deduction caps than simpler giving vehicles.",
    keyFacts: [
      "Requires distributing at least 5% of assets every year, regardless of investment performance",
      "Deduction caps are lower than public charity/DAF giving — 30% of AGI for cash, 20% for appreciated assets",
      "Offers full control over grants, operations, and even paying family members a salary to help run it",
      "Best suited to super-high-net-worth households where the administrative overhead is justified by the scale of giving"
    ],
    eligibilitySignals: ["very high net worth", "wants ongoing control over grantmaking and possibly family involvement", "giving at a scale that justifies dedicated administrative overhead"],
    clarifyingQuestions: [
      "Are you giving at a scale where dedicated administrative staff or family involvement would make sense?",
      "How much ongoing control do you want over exactly where and how funds are distributed?"
    ],
    notFinancialAdviceNote: "Foundation setup and compliance requires specialized legal and tax counsel — this is not a self-service structure."
  },
  {
    id: "charitable-remainder-lead-trusts",
    title: "Charitable Remainder and Lead Trusts (CRT/CLT)",
    category: "Charitable Giving",
    appliesTo: ["universal"],
    summary: "These are irrevocable trusts that split an income stream between you and charity over time, just in opposite directions. A Charitable Remainder Trust pays you (or another beneficiary) income for a set period, with the remainder eventually going to charity; a Charitable Lead Trust flips that, paying charity first and leaving the remainder to you or your heirs.",
    keyFacts: [
      "CRTs pay an income stream to the donor or another named beneficiary for a specified term, with the remaining assets ultimately passing to charity",
      "CLTs pay an income stream to charity for a specified term, with the remaining assets ultimately passing back to the donor or heirs",
      "Both are complex, irrevocable structures typically used alongside significant wealth or a major liquidity event",
      "A CRUT (a type of CRT) can also play a role in advanced strategies like multiplying QSBS exclusions when structured for someone other than the original owner"
    ],
    eligibilitySignals: ["significant wealth or an upcoming large liquidity event", "wants both an income stream and a charitable legacy", "already working with estate planning counsel"],
    clarifyingQuestions: [
      "Are you looking for an income stream now with the remainder going to charity, or the reverse?",
      "Do you already have an estate planning attorney involved in structuring your giving?"
    ],
    notFinancialAdviceNote: "These are irrevocable, complex trust structures — an estate planning attorney must draft and administer them, not a DIY approach."
  },
  {
    id: "home-office-deduction",
    title: "Home Office Deduction",
    category: "Business Deductions",
    appliesTo: ["self_employed", "business_owner"],
    summary: "If you're self-employed and use part of your home regularly and exclusively for business, you can deduct a portion of your housing costs — this benefit isn't available to regular W-2 employees. You get to choose between a flat simplified calculation and a more detailed actual-expense method each year, whichever produces the better result for your situation.",
    keyFacts: [
      "Space must be your principal place of business, used regularly and exclusively for work — not a shared kitchen table",
      "Simplified method: $5 per square foot, capped at 300 square feet ($1,500 max), minimal recordkeeping, no depreciation to track",
      "Regular method: deduct the actual business-use percentage of all home costs (rent/mortgage interest, utilities, repairs), with no dollar cap, but it requires more detailed records and depreciation if you own the home",
      "You can switch methods from year to year, but not partway through the same tax year"
    ],
    eligibilitySignals: ["self-employed or business owner working from a dedicated home space", "uses a specific area of the home regularly and exclusively for business"],
    clarifyingQuestions: [
      "Do you have a dedicated space in your home used regularly and exclusively for business, and roughly how many square feet is it?",
      "Do you rent or own your home?"
    ],
    notFinancialAdviceNote: "A tax professional should confirm your space meets the 'regular and exclusive use' test, since this is a commonly scrutinized deduction."
  },
  {
    id: "business-travel-deductions",
    title: "Business Travel Deductions",
    category: "Business Deductions",
    appliesTo: ["self_employed", "business_owner"],
    summary: "Transportation, lodging, and a portion of meals are deductible whenever a trip's primary purpose is business — including extending a work trip for a few personal vacation days, as long as you only deduct the business-related portion.",
    keyFacts: [
      "Transportation (flights, trains, rideshares, mileage) is fully deductible; the 2025 standard business mileage rate is 67 cents per mile",
      "Lodging (hotels, Airbnb for business stays) is fully deductible; meals while traveling are 50% deductible, while meals provided to employees are 100% deductible",
      "You need documentation: business purpose, dates and locations, and receipts for every expense",
      "If you extend a business trip for personal time, only the days and costs tied to actual business activity are deductible"
    ],
    eligibilitySignals: ["self-employed or business owner who travels for client meetings, conferences, or business development"],
    clarifyingQuestions: [
      "How often do you travel specifically for business purposes?",
      "Do you keep documentation of the business purpose and dates for your trips?"
    ],
    notFinancialAdviceNote: "Keep a clear record separating business days from personal days on any mixed-purpose trip — this is a frequent audit focus area."
  },
  {
    id: "conference-and-professional-development-expenses",
    title: "Conference and Professional Development Expenses",
    category: "Business Deductions",
    appliesTo: ["self_employed", "business_owner"],
    summary: "Costs directly tied to attending conferences, workshops, and professional development events for your business are fully deductible, separate from the travel costs of getting there.",
    keyFacts: [
      "Registration fees, workshop/seminar fees, materials and supplies, and networking event tickets are all deductible",
      "These stack on top of, but are distinct from, the travel and lodging deductions for getting to and staying at the event",
      "Keep the event agenda or meeting notes alongside receipts to substantiate business purpose"
    ],
    eligibilitySignals: ["attends industry conferences, workshops, or professional development events"],
    clarifyingQuestions: [
      "Do you attend any recurring industry conferences or professional development events?",
      "Are you keeping registration receipts and event agendas for these?"
    ],
    notFinancialAdviceNote: "Keep the event's agenda and your notes on file — the IRS wants to see the business connection, not just the receipt."
  },
  {
    id: "equipment-technology-deductions",
    title: "Equipment and Technology Deductions",
    category: "Business Deductions",
    appliesTo: ["self_employed", "business_owner"],
    summary: "Computers, phones, software subscriptions, furniture, and specialized equipment purchased for business use are deductible business expenses, whether expensed immediately or depreciated depending on the asset and your accounting method.",
    keyFacts: [
      "Common examples: computers, phones, tablets, software subscriptions, office furniture, and specialized equipment like photography or video gear",
      "Business-use percentage matters if the same device is also used personally",
      "Larger equipment purchases may interact with depreciation rules (including bonus depreciation) rather than being expensed all at once"
    ],
    eligibilitySignals: ["self-employed or business owner who purchases equipment, software, or technology for work"],
    clarifyingQuestions: [
      "What equipment, software, or technology purchases have you made for the business this year?",
      "Is any of this equipment also used for personal purposes, and if so, roughly what percentage is business use?"
    ],
    notFinancialAdviceNote: "A bookkeeper or CPA should classify larger purchases correctly between immediate expensing and depreciation."
  },
  {
    id: "professional-services-deductions",
    title: "Professional Services Deductions",
    category: "Business Deductions",
    appliesTo: ["self_employed", "business_owner"],
    summary: "Fees paid to accountants, attorneys, consultants, contractors, and professional organizations in support of your business are deductible expenses — and often the same professionals help you find deductions that more than offset their fees.",
    keyFacts: [
      "Covers accounting and legal fees, consulting fees, payments to contractors, and professional membership dues",
      "These fees reduce your business's taxable income like any other ordinary and necessary business expense"
    ],
    eligibilitySignals: ["pays for accounting, legal, consulting, or contractor services for the business"],
    clarifyingQuestions: [
      "What professional services (accounting, legal, consulting) do you currently pay for related to your business?"
    ],
    notFinancialAdviceNote: "Keep invoices that clearly describe the business purpose of each professional service engagement."
  },
  {
    id: "marketing-advertising-deductions",
    title: "Marketing and Advertising Deductions",
    category: "Business Deductions",
    appliesTo: ["self_employed", "business_owner"],
    summary: "Money spent building awareness and generating leads for your business — digital ads, print materials, website costs — is fully deductible as an ordinary business expense, and can also be a good candidate for strategic credit card point earning.",
    keyFacts: [
      "Covers digital advertising (Google, Facebook, LinkedIn), print advertising, business cards and brochures, and website development/hosting",
      "High advertising spend can be paired with a business credit card that offers elevated rewards specifically in advertising categories"
    ],
    eligibilitySignals: ["spends on digital or print advertising for the business", "runs an active marketing budget"],
    clarifyingQuestions: [
      "Roughly how much does your business spend monthly on advertising and marketing?"
    ],
    notFinancialAdviceNote: "Keep records tying each marketing expense to the business, especially for recurring subscription-based tools."
  },
  {
    id: "augusta-rule",
    title: "The Augusta Rule (14-Day Home Rental to Your Business)",
    category: "Business Deductions",
    appliesTo: ["business_owner", "self_employed"],
    summary: "A quirky but legitimate provision lets you rent your personal home to your own business for up to 14 days a year — for board meetings, planning sessions, offsites, or photo shoots — with the business deducting the rent as a normal expense while you receive that rental income completely tax-free.",
    keyFacts: [
      "Capped at 14 days per year; beyond that, normal rental income rules kick in",
      "You must charge a fair market rate, documented by comparable local rental listings",
      "The business gets a deductible rent expense; you personally owe no tax on the rental income received",
      "Documentation needed: a rental agreement, proof of fair market rate, meeting minutes or an agenda, and a clear business purpose for the gathering"
    ],
    eligibilitySignals: ["business owner who could reasonably hold meetings, offsites, or events at their personal residence"],
    clarifyingQuestions: [
      "Could you host a legitimate business meeting, planning session, or event at your home this year?",
      "Do you have a way to document a fair market rental rate for your home in your area?"
    ],
    notFinancialAdviceNote: "Keep a signed rental agreement, comparable rate documentation, and meeting minutes on file — this is a commonly audited deduction if underdocumented."
  },
  {
    id: "business-credit-card-points-strategy",
    title: "Strategic Business Credit Card Use for Points",
    category: "Business Deductions",
    appliesTo: ["business_owner", "self_employed"],
    summary: "Routing every legitimate business expense through the right rewards credit card can generate a substantial pool of points annually that are yours to keep personally and tax-free, as long as you never carry a balance and keep business spending cleanly separated from personal spending.",
    keyFacts: [
      "Points earned from business spending are not considered taxable income",
      "Carrying a balance defeats the purpose entirely, since interest charges outweigh almost any rewards earned",
      "New card sign-up bonuses (often 50,000-150,000 points) can be captured by timing a known large expense to hit the minimum spend requirement",
      "Points redeemed for cash back or gift cards are typically worth around 1 cent each; transferring to airline/hotel partners for premium cabin travel can be worth 2-10+ cents per point",
      "Avoid using cards where processing fees (typically 2-3%+) exceed the value of the rewards earned, or where a vendor offers a larger cash discount"
    ],
    eligibilitySignals: ["business owner with meaningful recurring business expenses", "pays credit card balances in full every month"],
    clarifyingQuestions: [
      "Do you currently pay your business credit card balance in full every month?",
      "Roughly how much does your business spend monthly across categories like advertising, software, and supplies?"
    ],
    notFinancialAdviceNote: "Confirm with your accountant how points redemptions should be reflected in your expense records to stay accurate with IRS guidance."
  },
  {
    id: "bonus-depreciation-cost-segregation",
    title: "Bonus Depreciation and Cost Segregation Studies",
    category: "Business Deductions",
    appliesTo: ["business_owner", "self_employed"],
    summary: "Normally, a building's cost is written off gradually over decades. A cost segregation study breaks a property down into its individual components, and bonus depreciation lets you write off the components with shorter useful lives entirely in year one — turning a chunk of your purchase price into an immediate, large tax deduction rather than a slow trickle over decades.",
    keyFacts: [
      "Residential real estate normally depreciates over 27.5 years, commercial real estate over 39 years, absent bonus depreciation",
      "A cost segregation study identifies components with shorter useful lives (currently described as under 20 years) that qualify for 100% bonus depreciation in the first year",
      "This can translate into a first-year deduction equal to roughly 20-30% of the purchase price — for example, $200,000-$300,000 on a $1 million building",
      "Applies broadly to brick-and-mortar business assets, not just real estate",
      "Selling the property later can trigger depreciation recapture, which claws back some of the earlier tax benefit"
    ],
    eligibilitySignals: ["owns or is purchasing commercial or investment real estate", "purchased significant depreciable business equipment"],
    clarifyingQuestions: [
      "Have you purchased or are you planning to purchase real estate or major equipment for your business?",
      "Have you had a cost segregation study done on any property you own?"
    ],
    notFinancialAdviceNote: "A cost segregation specialist and CPA should run the actual study — this isn't a number you can estimate yourself."
  },
  {
    id: "real-estate-depreciation-offset-active-income",
    title: "Offsetting Active Income with Real Estate Depreciation Losses",
    category: "Business Deductions",
    appliesTo: ["business_owner", "self_employed", "universal"],
    summary: "Real estate is normally treated as a passive activity, meaning its depreciation losses can't offset your W-2 or business income by default. There are three well-known workarounds — qualifying as a real estate professional, using short-term rentals, or owning the property your own business operates from — that can unlock those losses against active income.",
    keyFacts: [
      "Real estate professional status requires working in real estate at least 750 hours per year, difficult for anyone with a full-time job",
      "Spouse workaround: if one spouse is a high W-2 earner and the other spouse qualifies as a real estate professional, the household's real estate losses can offset the working spouse's W-2 income",
      "Short-term rental loophole: properties with an average stay of 7 days or less generate active (not passive) income, and only require material participation of roughly 100 hours (and more than any other individual), a much lower bar than the 750-hour REP threshold",
      "Business owner loophole: if your business owns the building or property it operates from, depreciation losses can offset the business's own income directly"
    ],
    eligibilitySignals: ["owns or is considering investment real estate", "has a non-working or lower-income spouse who could take on real estate professional status", "owns short-term rental property", "business owns its own physical location"],
    clarifyingQuestions: [
      "Do you or your spouse currently spend significant time managing real estate, or could either of you?",
      "Do you own any short-term rental property, or does your business own the space it operates from?"
    ],
    notFinancialAdviceNote: "A CPA needs to verify material participation hours meet the specific threshold you're relying on — these are frequently scrutinized in audits."
  },
  {
    id: "s-corp-election",
    title: "S-Corp Election to Reduce Self-Employment Tax",
    category: "Business Structure & Elections",
    appliesTo: ["self_employed", "business_owner"],
    summary: "Once a self-employed business is generating meaningful profit, electing to be taxed as an S-corp can save real money by splitting income into a W-2 salary (subject to payroll tax) and a separate profit distribution (not subject to payroll tax) — unlike a sole proprietorship, where the entire net income is subject to self-employment tax.",
    keyFacts: [
      "Often makes sense once net business income reaches roughly $100,000/year, though the exact break-even point depends on added compliance costs",
      "Self-employment/payroll tax runs up to 15.3% and applies to your entire net income as a sole proprietor, but only to the W-2 salary portion once you're an S-corp",
      "You must pay yourself a 'reasonable' W-2 salary — what it would cost to hire someone else to do your job — not an artificially low amount",
      "An S-corp does not reduce federal or state income tax, only self-employment/payroll tax",
      "Adds real complexity: running payroll, filing a separate business tax return, and added restrictions (e.g., no foreign shareholders)",
      "Some localities effectively neutralize the benefit — for example, an added local business tax on S-corp income in New York City, or Tennessee's entity-level tax treating S-corps like C-corps"
    ],
    eligibilitySignals: ["self-employed with net business income around $100,000+", "sole proprietor or single-member LLC willing to take on payroll complexity"],
    clarifyingQuestions: [
      "Roughly how much net income does your business generate each year?",
      "What city and state is your business based in, since local rules can significantly change the math?"
    ],
    notFinancialAdviceNote: "A tax professional must run the actual numbers for your situation and location before electing S-corp status, since local taxes can eliminate the benefit entirely."
  },
  {
    id: "reasonable-w2-salary-optimization",
    title: "Optimizing Your S-Corp W-2 Salary",
    category: "Business Structure & Elections",
    appliesTo: ["business_owner"],
    summary: "Once you're an S-corp, the temptation is to set your own salary as low as possible to minimize payroll tax — but going too low can backfire by shrinking your QBI deduction and your retirement plan contribution room, both of which are tied to your W-2 wage. Finding the right number is a genuine optimization problem, not a simple 'lower is better' decision.",
    keyFacts: [
      "Retirement plan contributions (Solo 401(k), SEP IRA) for S-corp owners are limited by the W-2 salary paid, not total business profit",
      "The QBI deduction for high earners is capped based on W-2 wages paid by the business, so an artificially low salary can shrink that deduction",
      "The salary must also be 'reasonable' for the role — defensible as what you'd pay someone else to do the same job",
      "Getting this single number right can be worth thousands of dollars a year in either direction"
    ],
    eligibilitySignals: ["already elected S-corp status", "high enough income for QBI limitations to be relevant", "contributing to a Solo 401(k) or SEP IRA through the S-corp"],
    clarifyingQuestions: [
      "What W-2 salary are you currently paying yourself through the S-corp?",
      "Are you trying to maximize retirement contributions, your QBI deduction, or minimize payroll tax — since these can pull in different directions?"
    ],
    notFinancialAdviceNote: "This calculation genuinely requires a tax professional to run since it depends on interacting limits across QBI and retirement contributions."
  },
  {
    id: "qbi-section-199a-deduction",
    title: "Qualified Business Income (QBI) Deduction",
    category: "Business Structure & Elections",
    appliesTo: ["self_employed", "business_owner"],
    summary: "Owners of pass-through businesses — sole proprietorships, partnerships, S-corps, and LLCs — get an automatic deduction of up to 20% of their qualified business income, available whether you itemize or take the standard deduction. Above certain income thresholds, the deduction gets restricted based on how much the business pays in W-2 wages, and specialty service businesses can lose it entirely.",
    keyFacts: [
      "Up to 20% deduction on qualified business income; doesn't apply to investment income, foreign business income, or guaranteed partnership payments",
      "2025 phase-out begins at $191,950 single / $383,900 married filing jointly, completing at $241,950 single / $483,900 married",
      "Above the threshold, the deduction is capped at the greater of 50% of W-2 wages paid by the business, or 25% of W-2 wages plus 2.5% of the unadjusted basis of qualified property",
      "Specialty Service Trades or Businesses (SSTBs — health, law, accounting, consulting, financial services, athletics, and similar reputation/skill-driven fields) lose the deduction entirely once income exceeds the upper threshold",
      "Doesn't reduce self-employment tax and doesn't require itemizing to claim"
    ],
    eligibilitySignals: ["owns a sole proprietorship, partnership, S-corp, or LLC", "income near or above roughly $190,000 single / $380,000 married", "in a specialty service field like law, medicine, consulting, or finance"],
    clarifyingQuestions: [
      "What's your business structure, and roughly what is your taxable income?",
      "Would your business be considered a specialty service field like law, medicine, consulting, or financial services?"
    ],
    notFinancialAdviceNote: "A tax professional should calculate your exact deduction, especially if you're near the income thresholds or in an SSTB, where the rules get complex fast."
  },
  {
    id: "ptet-election",
    title: "Pass-Through Entity Tax (PTET) Election",
    category: "Business Structure & Elections",
    appliesTo: ["business_owner", "self_employed"],
    summary: "PTET is a state-level workaround that lets a pass-through business pay state income tax at the entity level instead of the owner paying it personally — turning what would otherwise be a capped personal SALT deduction into a fully deductible business expense on the federal return. Most states with income tax now offer some version of this election.",
    keyFacts: [
      "Generally available to partnerships and S-corps; sole proprietors typically can't use it directly unless they restructure",
      "Because the business pays the tax as a deductible expense, the full amount is federally deductible, sidestepping the $10,000/$40,000 personal SALT cap entirely",
      "Election deadlines vary drastically by state and can be nearly a year apart — the guide cites New York and NYC at March 15, 2025, California at June 15, 2025, and New Jersey at March 15, 2026",
      "IRS formally approved the approach as valid in 2020 after initial scrutiny",
      "In a modeled scenario at a 10% state tax rate and the 37% federal bracket, a business owner with $1,000,000 of pass-through income could see roughly $37,000 in additional federal tax savings"
    ],
    eligibilitySignals: ["owns a partnership or S-corp", "pays significant state income tax", "already at or near the SALT cap through other means"],
    clarifyingQuestions: [
      "Is your business structured as a partnership or S-corp?",
      "What state is your business based in, and do you know that state's PTET election deadline and filing requirements?"
    ],
    notFinancialAdviceNote: "PTET rules and deadlines vary enormously by state — a tax professional familiar with your specific state's implementation should handle this, not a generic checklist."
  },
  {
    id: "sticky-states-domicile-planning",
    title: "State Residency and Domicile Planning",
    category: "State & Residency",
    appliesTo: ["universal"],
    summary: "Some states are notoriously aggressive about continuing to tax people who claim they've moved away, and successfully 'breaking' residency requires more than just spending fewer days there — it requires establishing clear, documented ties to a new location and cutting concrete ties to the old one.",
    keyFacts: [
      "Most aggressive states on residency audits: California (presumes continued residency unless proven otherwise), New York (scrutinizes ties and days present), and Virginia (difficult domicile rules)",
      "States with no income tax, generally easier to establish residency in: Alaska, Florida, Nevada, South Dakota, Tennessee, Texas, Washington, and Wyoming",
      "Practical steps to break ties: change your driver's license, register to vote in the new location, close local bank accounts, and sell or rent out your prior primary residence, with the departure well documented",
      "Some people establish residency in a no-tax state before an international move, providing a cleaner break from a high-tax state than moving abroad directly"
    ],
    eligibilitySignals: ["relocating between states", "planning a move abroad from a high-tax state", "currently lives in a state known for aggressive residency audits"],
    clarifyingQuestions: [
      "What state are you moving from, and is it one known for aggressive residency enforcement?",
      "Have you taken concrete steps yet (license, voter registration, bank accounts) to establish ties to your new location?"
    ],
    notFinancialAdviceNote: "A state tax attorney should review your specific situation, since residency audits weigh a wide range of factual ties beyond just days present."
  },
  {
    id: "foreign-earned-income-exclusion",
    title: "Foreign Earned Income Exclusion (FEIE)",
    category: "State & Residency",
    appliesTo: ["self_employed", "universal"],
    summary: "The U.S. taxes citizens on worldwide income no matter where they live, but the Foreign Earned Income Exclusion lets qualifying expats and digital nomads exclude a large chunk of foreign-earned wages or self-employment income from U.S. tax entirely, as long as they meet a physical-presence or residency test abroad.",
    keyFacts: [
      "Excludes up to roughly $130,000 of foreign earned income for 2025 (each spouse can claim their own exclusion if both have qualifying foreign earned income)",
      "Two ways to qualify: the Physical Presence Test (330 full days outside the U.S. in any 12-month period) or the Bona Fide Residence Test (a full tax year as a genuine resident of a foreign country)",
      "Only applies to earned income — salaries, self-employment income, professional fees, commissions — not investment income, capital gains, or rental income",
      "It's an exclusion, not a deduction, so it doesn't lower the tax rate applied to any remaining income; self-employment tax still applies in full regardless of the exclusion",
      "Claimed via Form 2555, generally due by your original filing deadline plus extensions"
    ],
    eligibilitySignals: ["living or working abroad, or planning to", "has foreign-earned wages or self-employment income", "digital nomad or remote worker based outside the U.S."],
    clarifyingQuestions: [
      "Are you currently living abroad, or planning a move, and for roughly how long?",
      "Is your foreign income primarily earned income (salary/self-employment), or mostly investment income?"
    ],
    notFinancialAdviceNote: "An expat tax specialist should confirm which qualification test you meet and file Form 2555 correctly and on time."
  },
  {
    id: "foreign-tax-credit",
    title: "Foreign Tax Credit (FTC)",
    category: "State & Residency",
    appliesTo: ["universal"],
    summary: "As an alternative (or complement) to the FEIE, the Foreign Tax Credit gives a dollar-for-dollar credit for foreign income taxes already paid, and unlike the FEIE it has no income cap and can be applied against investment income too — often making it the better choice for high earners living in high-tax countries.",
    keyFacts: [
      "No income limit, unlike the FEIE's exclusion cap",
      "Unused credits can be carried back 1 year or forward up to 10 years",
      "Can be applied against investment income, where the FEIE cannot",
      "Generally favored over the FEIE when living in a high-tax country (much of Europe), when investment income is significant, or when income exceeds the FEIE cap; the two can be combined on different income types, but not on the same dollar of income"
    ],
    eligibilitySignals: ["living in a high-tax foreign country", "has significant foreign investment income", "income above the FEIE exclusion limit"],
    clarifyingQuestions: [
      "What country are you living in, and roughly what is the local income tax rate there?",
      "Do you have meaningful investment income in addition to earned income while abroad?"
    ],
    notFinancialAdviceNote: "A cross-border tax specialist should model FEIE vs. FTC vs. a blended approach against your specific numbers before you file."
  },
  {
    id: "fbar-fatca-international-reporting",
    title: "FBAR, FATCA, and Foreign Corporation Reporting",
    category: "State & Residency",
    appliesTo: ["universal"],
    summary: "Living or investing abroad comes with reporting obligations well beyond a normal tax return, and the penalties for missing them can dwarf the tax savings involved. These filings are separate and cumulative requirements, not optional add-ons, if your foreign holdings cross the relevant thresholds.",
    keyFacts: [
      "FBAR (FinCEN Form 114): required if foreign financial accounts exceed $10,000 in aggregate at any point in the year; due April 15 with an automatic extension to October 15; willful violations can carry penalties up to $250,000 and 5 years imprisonment",
      "FATCA (Form 8938): required if foreign assets exceed $200,000 (single) or $400,000 (married) at year-end thresholds; filed with your tax return; penalties start at $10,000",
      "Form 5471: required if you own 10%+ of a foreign corporation; extremely complex to prepare; penalties start at $10,000+ per form, per year",
      "These are separate from, and in addition to, your normal U.S. tax return obligations, which continue regardless of where you live"
    ],
    eligibilitySignals: ["holds foreign bank or investment accounts", "owns 10%+ of a company incorporated outside the U.S.", "living abroad with local financial accounts"],
    clarifyingQuestions: [
      "Do you hold any foreign bank or investment accounts, and do they collectively exceed $10,000 at any point in the year?",
      "Do you own 10% or more of any company incorporated outside the United States?"
    ],
    notFinancialAdviceNote: "An expat or international tax specialist should review your specific holdings — the penalties for missing these filings are severe and unforgiving."
  },
  {
    id: "expat-self-employment-tax-mitigation",
    title: "Managing Self-Employment Tax While Working Abroad",
    category: "State & Residency",
    appliesTo: ["self_employed"],
    summary: "The FEIE doesn't touch self-employment tax, which continues to apply in full even if your income tax is fully excluded — a frequent surprise for self-employed expats. A few structural tools exist to reduce that burden while abroad.",
    keyFacts: [
      "Self-employment tax (15.3%) still applies to net self-employment earnings even after the FEIE excludes the income for regular income tax purposes",
      "An S-corp election can shift part of the income into distributions not subject to self-employment tax, similar to how it works domestically",
      "Solo 401(k) contributions reduce taxable income and can meaningfully offset the impact",
      "The U.S. has totalization agreements with 30+ countries to prevent paying into two countries' social security systems simultaneously — worth checking if your destination country has one"
    ],
    eligibilitySignals: ["self-employed and living or working abroad", "surprised by a self-employment tax bill despite excluding income via FEIE"],
    clarifyingQuestions: [
      "Does the country you're living in have a totalization agreement with the U.S.?",
      "Have you considered an S-corp election or Solo 401(k) contributions to offset self-employment tax while abroad?"
    ],
    notFinancialAdviceNote: "An expat tax specialist should confirm whether a totalization agreement applies to your specific country and situation."
  },
  {
    id: "startup-equity-valuation-basics",
    title: "Understanding and Valuing Startup Equity",
    category: "Equity & Startups",
    appliesTo: ["universal"],
    summary: "Most startup employees have no real idea what their equity is worth because the numbers involved — strike price, preferred price, vesting — read like jargon. A simple framework using two distinct share prices makes it possible to calculate a real present-day value for stock options rather than treating them as an abstract perk.",
    keyFacts: [
      "Company value = total shares outstanding x share price; if you know two of the three variables, you can solve for the third",
      "Early-stage companies have two different share prices: the internal/409A price (what you pay to exercise options, kept low by design) and the external/preferred price (what investors pay in a funding round, kept high by design)",
      "Value of your equity = number of shares you own x (external price - internal price)",
      "Annual value of your equity = total equity value / total years of vesting required",
      "If a company hasn't raised a priced round yet, the valuation implied by its most recent SAFE note can approximate the external price"
    ],
    eligibilitySignals: ["holds stock options or equity at a startup", "evaluating a job offer that includes equity compensation"],
    clarifyingQuestions: [
      "Do you know your company's most recent funding round valuation and preferred share price?",
      "What was your strike price when your options were granted?"
    ],
    notFinancialAdviceNote: "Ask your company directly for the current 409A price and most recent preferred price — don't estimate these numbers."
  },
  {
    id: "equity-vesting-and-ownership-percentage",
    title: "Vesting Schedules and Ownership Percentage",
    category: "Equity & Startups",
    appliesTo: ["universal"],
    summary: "Two numbers matter beyond the raw share count: how long you have to stay to actually earn your equity, and what percentage of the whole company those shares actually represent — both of which change over time as the company raises more funding.",
    keyFacts: [
      "Percentage ownership = your shares / total shares outstanding at the company",
      "Every new funding round increases total shares outstanding, diluting your percentage ownership even if the dollar value of your stake is growing",
      "Vesting is the schedule over which you 'earn' your equity by staying employed; the 'cliff' is the minimum time you must stay before earning anything at all",
      "You have the right to know your percentage ownership and total shares outstanding — reluctance to share this is considered a red flag"
    ],
    eligibilitySignals: ["negotiating a startup job offer with equity", "wants to benchmark whether their equity grant is fair for their role and seniority"],
    clarifyingQuestions: [
      "Do you know your current percentage ownership and vesting schedule, including the cliff?",
      "Has the company shared total shares outstanding with you?"
    ],
    notFinancialAdviceNote: "Get vesting terms and total share counts in writing before accepting an offer — verbal estimates aren't reliable for negotiation or tax planning."
  },
  {
    id: "liquidation-preference",
    title: "Liquidation Preference",
    category: "Equity & Startups",
    appliesTo: ["universal"],
    summary: "Investors in a startup typically hold preferred shares that get paid back before any common shareholder — including employees — sees a dime in an exit. Understanding a company's total liquidation preference stack matters most when evaluating a company that's raised a lot of money but might have a mediocre exit.",
    keyFacts: [
      "Liquidation preference generally equals the total capital the company has raised to date, though some deals include a multiple on top of the raised amount",
      "The company must sell for at least the total liquidation preference before any common shareholder (employees included) receives proceeds",
      "Matters far less in a highly successful exit, but becomes very relevant when evaluating a company that's raised hundreds of millions but has an uncertain outcome"
    ],
    eligibilitySignals: ["evaluating equity at a company that has raised significant venture funding", "negotiating an offer at a later-stage startup"],
    clarifyingQuestions: [
      "Do you know how much total capital your company has raised, and whether any investors have a liquidation multiple rather than a straight 1x preference?"
    ],
    notFinancialAdviceNote: "Ask the company directly for confirmation of the liquidation preference stack — don't assume it's simply the total capital raised without verifying multiples."
  },
  {
    id: "post-termination-exercise-period",
    title: "Post-Termination Exercise Period (PTEP)",
    category: "Equity & Startups",
    appliesTo: ["universal"],
    summary: "If you leave a company before an exit, you're usually given a limited window to come up with the cash to exercise your vested stock options or lose them entirely. Historically that window was often just 90 days, which forced people into expensive, risky decisions — but many modern startups now offer much longer windows.",
    keyFacts: [
      "Exercising requires paying the strike price multiplied by the number of shares, which can total tens or hundreds of thousands of dollars depending on your grant",
      "Historically, a 90-day PTEP was standard, forcing departing employees to scramble for cash or forfeit their options",
      "Many modern startups now offer significantly longer PTEP windows, sometimes years, reducing the pressure to exercise before you're confident the company will succeed",
      "This is a genuine risk-and-liquidity decision, since exercised shares in a failed startup are a total loss"
    ],
    eligibilitySignals: ["considering leaving a startup with unexercised vested options", "evaluating a job offer and wants to compare PTEP terms"],
    clarifyingQuestions: [
      "Do you know your company's post-termination exercise period for vested options?",
      "Have you calculated the total cost to exercise your vested options at the current strike price?"
    ],
    notFinancialAdviceNote: "Confirm the exact PTEP terms in your option agreement — this varies by company and sometimes even by grant."
  },
  {
    id: "qsbs-overview",
    title: "Qualified Small Business Stock (QSBS) Exclusion",
    category: "Equity & Startups",
    appliesTo: ["business_owner", "universal"],
    summary: "QSBS is arguably the single most generous tax break available to startup founders, employees, and investors — it can let you pay zero federal tax on millions of dollars of gain from selling C-corp stock, as long as the company and the shares meet a specific set of requirements from the start.",
    keyFacts: [
      "Excludes federal tax on the greater of $15 million in gains (for stock acquired after July 4, 2025; $10 million before that date) or 10 times what you paid for the shares",
      "Only applies to C-corp stock; if your business is an LLC or S-corp, you'd need to convert to a C-corp, and the eligibility clock only starts from the conversion date",
      "You generally must hold the shares for 5 years to claim the full exclusion",
      "Applies per shareholder, per company — so QSBS status isn't something you apply for, it's a position you and your tax preparer take when filing after a sale",
      "40+ states either honor QSBS or have no state income tax; notable exceptions that still tax QSBS gains at the state level include California, Alabama, Mississippi, Pennsylvania, New Jersey, and Puerto Rico (Hawaii and Massachusetts offer partial treatment)"
    ],
    eligibilitySignals: ["founder, early employee, or investor holding C-corp stock", "company incorporated as a Delaware or similar C-corp from the start", "planning to hold shares 5+ years before a sale"],
    clarifyingQuestions: [
      "Is your equity in a C-corp, and if not, would converting to one be feasible for your business?",
      "How long have you held your current shares, and when were they issued?"
    ],
    notFinancialAdviceNote: "A tax attorney or CPA experienced with QSBS should confirm your specific stock actually qualifies before you rely on this exclusion — the requirements are detailed and easy to trip up."
  },
  {
    id: "qsbs-requirements",
    title: "QSBS Eligibility Requirements and Common Pitfalls",
    category: "Equity & Startups",
    appliesTo: ["business_owner", "universal"],
    summary: "QSBS eligibility is less about proactively doing something right and more about avoiding a handful of specific mistakes that can accidentally disqualify the stock for every single shareholder in the company, not just the person who caused it — making this a high-stakes area for founders to understand well before it matters.",
    keyFacts: [
      "The business must be an active C-corporation, and at least 80% of its assets must be used in a qualifying trade or business — most services businesses (health, law, accounting, consulting, finance, and similar reputation/skill-driven fields) don't qualify",
      "Asset test: gross assets must stay at or below $75 million (raised from $50 million for stock issued after July 2025) at all times up to and including when the stock was issued",
      "Common ways to accidentally blow up QSBS status: repurchasing significant stock from departing employees or cofounders without legal review, investing more than roughly 10% of company assets in non-operating investments like bonds or mutual funds, or exceeding the asset test threshold",
      "Once shares qualify, they generally keep their QSBS status even if the company later grows past the asset threshold, and status carries over if shares are gifted or transferred to a trust"
    ],
    eligibilitySignals: ["founder or early employee at a C-corp planning stock buybacks or a large financing round", "company approaching the asset test threshold"],
    clarifyingQuestions: [
      "Is your company approaching or has it exceeded the asset test threshold?",
      "Is the company planning any stock repurchases from departing employees or investing significant cash in non-operating assets?"
    ],
    notFinancialAdviceNote: "Legal counsel should review any share repurchase or large balance-sheet investment decision in advance — these can jeopardize QSBS status for every shareholder, not just one person."
  },
  {
    id: "qsbs-rollover-1045",
    title: "QSBS Rollover (Section 1045)",
    category: "Equity & Startups",
    appliesTo: ["business_owner", "universal"],
    summary: "If your company gets acquired before you've held your QSBS-eligible shares for 5 years, you don't automatically lose the tax break — a Section 1045 rollover lets you reinvest the proceeds into another qualifying small business within a short window and keep your original holding-period clock running.",
    keyFacts: [
      "Requires having held the original shares at least 6 months, and reinvesting the proceeds into new QSBS-eligible stock within 60 days",
      "Your holding period clock picks up from where it left off rather than resetting — if you'd held the original shares 3 years, you'd only need 2 more years on the new investment to reach full eligibility",
      "Under new partial-exclusion rules, holding for 3 years qualifies for a 50% exclusion and 4 years for 75%, even without a full 5-year hold or rollover",
      "A common real-world use is reinvesting proceeds from an earlier exit or angel investment directly into your own next company, effectively funding it with pre-tax dollars",
      "Getting paid in stock (rather than cash) from the acquiring company is more complex, but QSBS treatment can sometimes still be preserved until that new stock is eventually sold"
    ],
    eligibilitySignals: ["QSBS-eligible shares being sold or acquired before the 5-year mark", "considering reinvesting exit proceeds into a new qualifying business"],
    clarifyingQuestions: [
      "How long have you held your current QSBS-eligible shares, and is a sale or acquisition imminent?",
      "Are you considering reinvesting the proceeds into another C-corp within 60 days of the sale?"
    ],
    notFinancialAdviceNote: "The 60-day reinvestment window is unforgiving — a tax attorney should be involved before the sale closes, not after."
  },
  {
    id: "qsbs-stacking-gifting",
    title: "Multiplying QSBS Through Gifting Shares",
    category: "Equity & Startups",
    appliesTo: ["business_owner", "universal"],
    summary: "Because the QSBS exclusion applies per shareholder rather than per company, gifting shares to family members before a sale can multiply your household's total tax-free exclusion many times over — a strategy some well-known founders have used to add tens of millions of dollars in additional tax-free proceeds.",
    keyFacts: [
      "Each recipient of gifted QSBS shares gets their own separate $10M/$15M exclusion, since the limit is per shareholder, per company",
      "Gifts to a spouse don't create an additional exclusion if you file jointly, but gifts to parents, siblings, children, and in-laws each create a fresh exclusion",
      "Gifts under the annual gift tax exclusion amount ($19,000 in 2025) don't count against your lifetime gift tax exemption",
      "The 5-year holding period clock does not reset when shares are gifted — it carries over from the original purchase date, so a gift made 4 years in only requires the recipient to wait 1 more year"
    ],
    eligibilitySignals: ["founder or early shareholder anticipating significant appreciation before an exit", "has family members willing to receive gifted shares"],
    clarifyingQuestions: [
      "Do you anticipate significant appreciation in your company's value before an eventual sale?",
      "Do you have family members you'd be willing to gift shares to ahead of a liquidity event?"
    ],
    notFinancialAdviceNote: "An estate and tax attorney should structure any share gifting well in advance of a known exit to avoid gift tax and valuation complications."
  },
  {
    id: "qsbs-stacking-trusts",
    title: "Multiplying QSBS Through Trusts",
    category: "Equity & Startups",
    appliesTo: ["business_owner", "universal"],
    summary: "Beyond gifting shares directly to individuals, certain irrevocable trusts can each qualify as their own separate taxpayer with their own QSBS exclusion — letting sophisticated founders multiply their tax-free exclusion well beyond what direct gifting alone could achieve, while potentially reducing estate tax exposure at the same time.",
    keyFacts: [
      "To multiply QSBS, a trust generally needs to be established for the benefit of someone other than the original shareholder — such as children, future children, or a spouse",
      "Named structures the guide cites as commonly used for this purpose: Spousal Lifetime Access Non-Grantor Trusts (SLANT), Dynasty Trusts, and Incomplete Non-Grantor Trusts (DINGs, NINGs)",
      "A Charitable Remainder Unitrust (CRUT) is a notable exception that can be structured to pay income back to the original owner while still functioning as its own taxpayer",
      "These trusts can also carry the separate benefit of reducing estate tax exposure at large wealth levels",
      "Most people who successfully multiply QSBS by many multiples combine both gifting and trust strategies together"
    ],
    eligibilitySignals: ["founder or shareholder with substantial anticipated QSBS gains", "already working with estate planning counsel", "wants to combine estate tax planning with QSBS exclusion multiplication"],
    clarifyingQuestions: [
      "Are you already working with an estate planning attorney on trust structures?",
      "How significant is the anticipated gain on your QSBS-eligible shares relative to a single shareholder's exclusion?"
    ],
    notFinancialAdviceNote: "These are complex, irrevocable trust structures requiring specialized estate planning and tax counsel — this is not something to set up without professional guidance."
  },
  {
    id: "obbba-tax-rates-and-corporate-rate-permanent",
    title: "OBBBA: Lower Individual Tax Rates Made Permanent",
    category: "Recent Law Changes",
    appliesTo: ["universal"],
    summary: "The 2017 tax reform's lower individual brackets were originally set to expire, which would have pushed most taxpayers back to higher pre-2017 rates. The One Big Beautiful Bill Act, signed July 4, 2025, locks in the lower brackets permanently instead of letting them lapse.",
    keyFacts: [
      "2017 reform had temporarily lowered brackets from 15/25/28/33/39.6% down to 12/22/24/32/37%, on a schedule to expire",
      "OBBBA makes the lower 10/12/22/24/32/35/37% bracket structure permanent rather than allowing a reversion to the older, higher rates",
      "The flat 21% C-corp tax rate (down from a pre-2017 high of 35%) is unchanged and remains in place",
      "Signed into law July 4, 2025, as part of legislation representing roughly $5 trillion in total tax changes"
    ],
    eligibilitySignals: ["any taxpayer planning multi-year income or bracket-timing strategies"],
    clarifyingQuestions: [
      "Were you making any financial decisions based on an assumption that rates would rise after 2025?"
    ],
    notFinancialAdviceNote: "A tax professional should confirm how this affects any multi-year projections you've already built around the prior expiration date."
  },
  {
    id: "obbba-qsbs-expansion",
    title: "OBBBA: QSBS Exclusion Expanded",
    category: "Recent Law Changes",
    appliesTo: ["business_owner", "universal"],
    summary: "The 2025 tax bill made an already generous startup tax break significantly more generous, raising the dollar cap, expanding which companies qualify as a 'small business,' and — for the first time — allowing a partial benefit even if you sell before the full 5-year holding period.",
    keyFacts: [
      "Per-shareholder exclusion raised from $10 million to $15 million, indexed for inflation starting December 31, 2026",
      "'Small business' asset test raised from a $50 million to a $75 million ceiling, also indexed for inflation starting in 2027",
      "New partial exclusion tiers: 50% exclusion after holding 3 years, 75% after 4 years, full 100% at 5+ years — previously there was no benefit at all before the 5-year mark without a rollover",
      "These changes apply going forward and interact with, but don't replace, the underlying QSBS eligibility rules"
    ],
    eligibilitySignals: ["holds or is considering acquiring C-corp stock", "founder or early employee planning around the 5-year QSBS holding requirement"],
    clarifyingQuestions: [
      "When were your current shares issued — before or after the relevant 2025 effective dates?"
    ],
    notFinancialAdviceNote: "A tax attorney should confirm which version of the QSBS rules (old vs. new limits) applies to your specific shares based on issuance date."
  },
  {
    id: "obbba-bonus-depreciation-restored",
    title: "OBBBA: 100% Bonus Depreciation Restored",
    category: "Recent Law Changes",
    appliesTo: ["business_owner", "self_employed"],
    summary: "Bonus depreciation had been scheduled to phase down, reducing how much of a physical asset's cost could be written off immediately. The new legislation restores the ability to depreciate 100% of qualifying shorter-lived assets in year one, which is especially significant for real estate investors using cost segregation studies.",
    keyFacts: [
      "Restores 100% first-year bonus depreciation for qualifying assets with a useful life under 20 years",
      "Real estate investors can pair this with a cost segregation study to break a property into components and front-load a large deduction in the year of purchase",
      "Selling the property later can still trigger depreciation recapture, clawing back some of the earlier benefit"
    ],
    eligibilitySignals: ["business owner purchasing real estate, equipment, or other depreciable physical assets"],
    clarifyingQuestions: [
      "Have you purchased or are you planning to purchase real estate or major equipment recently?"
    ],
    notFinancialAdviceNote: "A cost segregation specialist and CPA should quantify the actual deduction for your specific asset purchase."
  },
  {
    id: "obbba-software-rd-amortization-relief",
    title: "OBBBA: Software and R&D Salary Amortization Relief",
    category: "Recent Law Changes",
    appliesTo: ["business_owner"],
    summary: "A widely disliked 2017 rule had forced companies to spread the tax deduction for software developer and R&D salaries over 5 years instead of deducting them immediately, which could leave a company owing taxes even while losing money. The new legislation reverses this for U.S.-based talent.",
    keyFacts: [
      "Restores full first-year deductibility of R&D and software development salaries for U.S.-based employees",
      "Previously, businesses could only deduct roughly 20% of these salary costs in the first year, spreading the rest over the following years",
      "This relief does not extend to foreign R&D expenses, which still face the amortization treatment",
      "The prior rule was widely cited as a contributing factor to tech industry layoffs, since it distorted the true after-tax cost of engineering headcount"
    ],
    eligibilitySignals: ["business owner employing software developers or R&D staff", "tech or product-focused business with US-based engineering talent"],
    clarifyingQuestions: [
      "Do you employ software developers or R&D staff, and are they based in the U.S. or overseas?"
    ],
    notFinancialAdviceNote: "A CPA should confirm how this changes your current-year deduction calculation versus prior years' amortized treatment."
  },
  {
    id: "obbba-gift-estate-tax-exemption-increase",
    title: "OBBBA: Gift and Estate Tax Exemption Increase",
    category: "Recent Law Changes",
    appliesTo: ["universal"],
    summary: "The amount you can pass on tax-free during life or at death was scheduled to roughly halve at the end of 2025 as earlier tax reform provisions expired. Instead, the new legislation raises the exemption further and makes the higher amount permanent, a significant change for wealthy households doing estate planning.",
    keyFacts: [
      "Exemption raised to $15 million single / $30 million married, indexed for inflation going forward",
      "This is an increase from the roughly $14 million single / $28 million married levels reached by 2024 under prior law, and avoids a scheduled reversion toward the original pre-2017 levels (roughly $5M/$10M base, adjusted for inflation)",
      "Applies to combined lifetime gifts and estate transfers at death, not just estate transfers alone",
      "Particularly relevant for households doing significant gifting (including QSBS share gifting) or estate planning"
    ],
    eligibilitySignals: ["household net worth approaching or exceeding the exemption thresholds", "engaged in estate or gift planning, including QSBS stacking via gifts or trusts"],
    clarifyingQuestions: [
      "Is your household's net worth approaching the exemption thresholds, or are you doing significant lifetime gifting?"
    ],
    notFinancialAdviceNote: "An estate planning attorney should incorporate the updated, permanent exemption amount into any existing estate plan."
  },
  {
    id: "obbba-qbi-deduction-permanence",
    title: "OBBBA: QBI Deduction Made Permanent",
    category: "Recent Law Changes",
    appliesTo: ["self_employed", "business_owner"],
    summary: "The 20% pass-through business income deduction was originally set to expire at the end of 2025. The new legislation removes that sunset date entirely, so business owners can count on this deduction continuing indefinitely rather than needing to plan around its disappearance.",
    keyFacts: [
      "The QBI/Section 199A deduction was scheduled to sunset in 2026 under the original 2017 legislation",
      "OBBBA extends the deduction indefinitely with no new expiration date",
      "The underlying mechanics — income thresholds, W-2 wage limitations, SSTB restrictions — remain in place and still require the same wage-optimization planning as before",
      "Removes a major planning uncertainty that previously existed for pass-through business owners heading into 2026"
    ],
    eligibilitySignals: ["owns a pass-through business (sole proprietorship, partnership, S-corp, or LLC)", "was previously planning around a 2026 QBI expiration"],
    clarifyingQuestions: [
      "Were you making any business or compensation decisions based on the QBI deduction potentially disappearing in 2026?"
    ],
    notFinancialAdviceNote: "This doesn't change the underlying wage and income-threshold rules — a tax professional should still optimize your specific QBI calculation each year."
  },
  {
    id: "obbba-trump-accounts-law-change",
    title: "OBBBA: Trump Accounts Created for Children",
    category: "Recent Law Changes",
    appliesTo: ["universal"],
    summary: "This legislation created an entirely new type of tax-advantaged account for minors, distinct from a custodial Roth IRA, that doesn't require the child to have earned income — a meaningful new savings tool for any family with young children.",
    keyFacts: [
      "Children born within the qualifying window (described in the guide as roughly 2025-2029) receive a $1,000 government-funded seed contribution",
      "All children under 18 are eligible to open an account, regardless of birth year, even outside the seed-funding window",
      "Accounts are designed to track a major U.S. stock index like the S&P 500",
      "Parents can contribute up to an additional $5,000/year after-tax; withdrawals for qualified expenses (education, a first home) are taxed as long-term capital gains rather than ordinary income"
    ],
    eligibilitySignals: ["has children under 18, or is expecting a child"],
    clarifyingQuestions: [
      "Do you have children under 18 who could benefit from opening one of these accounts?"
    ],
    notFinancialAdviceNote: "Since this program is brand new, confirm the current mechanics and available providers with a financial professional before contributing."
  },
  {
    id: "obbba-opportunity-zone-permanence",
    title: "OBBBA: Opportunity Zone Program Made Permanent",
    category: "Recent Law Changes",
    appliesTo: ["universal"],
    summary: "The Opportunity Zone capital gains tax incentive was set to sunset, but the new legislation makes the program permanent — though it also resets the rules for investments made from 2027 onward, creating an odd transition period in the meantime.",
    keyFacts: [
      "The program, which was scheduled to expire, is now extended indefinitely",
      "New program rules (5-year gain deferral, 10% basis step-up, tax-free growth after a 10-year hold) apply specifically to investments made starting January 1, 2027",
      "In the interim, capital gains can only be deferred through December 31, 2026 under the older rule set",
      "New criteria for what qualifies as a designated opportunity zone are being established for the post-2027 program"
    ],
    eligibilitySignals: ["has a capital gain they're considering deferring through an opportunity zone investment", "timing a QOF investment relative to the 2027 transition"],
    clarifyingQuestions: [
      "Are you evaluating an opportunity zone investment now, or would it make more sense to wait until the new 2027 rules take effect?"
    ],
    notFinancialAdviceNote: "A tax professional should clarify which rule set (pre- or post-2027) applies to your specific timeline before committing capital."
  },
  {
    id: "obbba-gambling-loss-deduction-change",
    title: "OBBBA: Gambling Loss Deduction Reduced",
    category: "Recent Law Changes",
    appliesTo: ["self_employed", "universal"],
    summary: "Gamblers used to be able to deduct 100% of their losses against their winnings. The new legislation caps that at 90%, a change that sounds minor but can be severe for high-volume, thin-margin professional gamblers who could now owe tax even in a break-even or losing year.",
    keyFacts: [
      "Loss deduction against winnings reduced from 100% to 90%",
      "For a professional gambler operating on high volume with a small statistical edge, this can mean owing significant tax even while breaking even or losing money overall",
      "Applies to how gambling losses offset gambling winnings for tax purposes, not to other unrelated income"
    ],
    eligibilitySignals: ["professional or high-volume gambler", "reports gambling winnings and losses on their tax return"],
    clarifyingQuestions: [
      "Do you gamble at a professional or high-volume level where losses regularly approach or exceed winnings?"
    ],
    notFinancialAdviceNote: "A tax professional should model your specific win/loss volume under the new 90% rule, since the impact scales with betting volume."
  },
  {
    id: "obbba-salt-cap-increase-to-40k",
    title: "OBBBA: SALT Deduction Cap Raised to $40,000",
    category: "Recent Law Changes",
    appliesTo: ["universal"],
    summary: "After years at a flat $10,000 cap regardless of filing status, the new legislation quadruples the state and local tax deduction cap — a meaningful, if temporary and income-limited, relief for residents of high-tax states.",
    keyFacts: [
      "Cap raised from $10,000 to $40,000 starting in 2025, with roughly 1% annual growth planned through 2029, before reverting to $10,000 in 2030",
      "The cap still applies equally to single and married filers, so the 'marriage penalty' built into the original $10,000 cap remains in place",
      "Higher earners see the benefit phased down: the full $40,000 cap only applies below $500,000 of income, and the cap shrinks back toward $10,000 by roughly $600,000 of income",
      "Notably, the legislation did not eliminate the Pass-Through Entity Tax (PTET) workaround, which some earlier drafts had proposed removing — business owners retain that additional option"
    ],
    eligibilitySignals: ["itemizes deductions", "lives in a high-tax state", "income under roughly $600,000"],
    clarifyingQuestions: [
      "Roughly what is your household income, and do you itemize deductions?"
    ],
    notFinancialAdviceNote: "A tax professional should calculate your specific phase-out amount if your income is near the $500,000-$600,000 range."
  }
];
