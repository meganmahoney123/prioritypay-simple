import Link from "next/link";
import BlogArticle from "@/components/BlogArticle";

// Blog post adapted from Megan's script "How to Budget Irregular Income"
// (V 0.5, the latest draft in the Google Doc). No video yet, so no embed;
// add videoId once it's on YouTube. Target searches: "how to budget
// irregular income", "budgeting with irregular income", "how to budget
// variable income self employed", "percentage budget for business owners".
// Applies to self-employed people and business owners, so it lives in the
// general blog and is cross-listed on both hubs (lib/blogPosts.js).
// Fixes vs. the script: HSA Monthly Cap is $367 (4,400 / 12 = 366.67,
// rounded up so 12 months reach the limit); added the LLC / S corp owner's
// draw note and the business-expenses caveat. Product wording follows the
// site footer: PrioritySave calculates the split and shows what to send;
// the person makes each transfer.
const PATH = "/blog/how-to-budget-irregular-income";
const TITLE = "How to Budget Irregular Income: The Percentage Split System";
const DEK =
  "When your income changes every month, a normal budget breaks. Here's a simple system that splits every deposit by percentage, so taxes, bills, and retirement are covered first and you know exactly what's yours to spend.";

export const metadata = {
  title: "How to Budget Irregular Income: A Simple Percentage System (2026) | PrioritySave",
  description:
    "How to budget irregular income as a self-employed person or business owner: split every deposit by percentage into taxes, fixed costs, retirement, and guilt-free spending, with real numbers and a two-stage example.",
  alternates: { canonical: `https://www.prioritysave.com${PATH}` },
  robots: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large" },
  openGraph: {
    type: "article",
    title: "How to Budget Irregular Income: The Percentage Split System",
    description:
      "Split every deposit by percentage so taxes, bills, and retirement come first, and spend what's left without guilt.",
    url: `https://www.prioritysave.com${PATH}`,
  },
  twitter: { card: "summary_large_image" },
};

const TOC = [
  { id: "core-idea", label: "The core idea: split every deposit" },
  { id: "example-split", label: "A real example split" },
  { id: "before-you-start", label: "Before you start: business expenses and owner's draws" },
  { id: "taxes", label: "1. Taxes" },
  { id: "fixed-costs", label: "2. Fixed costs and the waterfall" },
  { id: "emergency-fund", label: "3. Emergency fund" },
  { id: "retirement", label: "4. Retirement and investments" },
  { id: "goals", label: "5. Travel and other goals" },
  { id: "reinvest", label: "6. Reinvesting in the business" },
  { id: "guilt-free", label: "7. Guilt-free spending" },
  { id: "one-account", label: "Can you use one savings account for everything?" },
  { id: "faq", label: "FAQ" },
];

const FAQ = [
  {
    q: "What is the best way to budget irregular income?",
    a: "One of the simplest ways is to split every deposit by percentage before you spend any of it. For example, 25% to taxes and 75% to fixed costs until your monthly bills are covered, then 25% to taxes, 25% to retirement, 15% to goals, 10% to the business, and 25% for spending. Because it works on percentages, it adjusts on its own to big months and slow months.",
  },
  {
    q: "How much of each payment should I set aside for taxes if I'm self-employed?",
    a: "Many self-employed people start at 25 to 30% of every deposit. Self-employed people pay the full 15.3% Social Security and Medicare tax on top of income tax. Lean toward 30% if you earn more or your state has an income tax. This is a starting point, not a guarantee of what you'll owe.",
  },
  {
    q: "How do I cover bills in a slow month?",
    a: "Fill fixed costs first. Send most of each deposit (for example 75%, with the other 25% going to taxes) to fixed costs until the month's bills are covered, and only then start funding retirement, goals, and spending. An emergency fund covers any month where deposits don't reach that amount.",
  },
  {
    q: "How big should an emergency fund be with irregular income?",
    a: "A common guideline is 3 to 6 months of fixed costs, and many people with irregular income keep more. Some keep up to 12 months for extra peace of mind, which means giving up some investment growth on that cash.",
  },
  {
    q: "Does this work if my business is an LLC or S corp?",
    a: "Yes, with one extra step. Deposits land in your business account, so you first pay yourself (an owner's draw for a sole proprietor or single-member LLC, or a salary plus distributions for an S corp), then split what you pay yourself. S corp owners have taxes withheld from their salary, so they usually need a smaller tax percentage on distributions.",
  },
];

const RELATED = [
  { href: "/blog/how-to-save-on-taxes", title: "How to Save on Taxes as an Entrepreneur (2026)" },
  { href: "/self-employed/solo-401k", title: "What Is a Solo 401(k)? 2026 Limits and Examples" },
  { href: "/blog/business-tax-deductions", title: "10 Tax Deductions Business Owners Should Know About" },
  { href: "/self-employed/self-employed-tax-guide", title: "Taxes for Self Employed: The Complete Guide" },
];

export default function BudgetIrregularIncomePage() {
  return (
    <BlogArticle
      path={PATH}
      hub={null}
      title={TITLE}
      dek={DEK}
      updated="November 2026"
      readMinutes={11}
      toc={TOC}
      faq={FAQ}
      related={RELATED}
      datePublished="2026-11-03"
    >
      <p>
        A lot of people with irregular income can see money in their bank account but still can't answer simple
        questions. Can I afford that vacation? How much can I put toward retirement this year? Will I have enough
        when the tax bill comes?
      </p>
      <p>
        That uncertainty leads to one of two things. Either you don't spend money on anything you love, or you feel
        guilty when you do. This guide walks through a simple system that fixes that. It works for self-employed
        people, solopreneurs, coaches, consultants, and business owners. No complicated spreadsheets, and it takes
        a few minutes a month.
      </p>

      <h2 id="core-idea">The core idea: split every deposit by percentage</h2>
      <p>
        People with a steady paycheck can budget a set dollar amount for each category. With irregular income, you
        don't know what you'll make this month, so dollar budgets fall apart. Percentages don't.
      </p>
      <p>
        Instead of budgeting dollars, you split <b>every deposit</b> by percentage into categories <b>before you
        spend any of it</b>. A big month fills every category faster. A slow month fills them slower. Either way,
        taxes and bills come first, and whatever is left is truly yours to spend.
      </p>
      <p>The split happens in two stages:</p>
      <ol>
        <li>
          <b>Stage 1:</b> until this month's fixed costs are covered, deposits go only to taxes and fixed costs.
        </li>
        <li>
          <b>Stage 2:</b> once fixed costs are covered, deposits go to taxes, retirement, goals, the business, and
          guilt-free spending.
        </li>
      </ol>

      <h2 id="example-split">A real example split</h2>
      <p>Here is the split Megan, PrioritySave's founder, uses for her own business income.</p>
      <div className="ps-table">
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Stage 1 (until fixed costs are covered)</th>
              <th>Stage 2 (after fixed costs are covered)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Taxes</td><td>25%</td><td>25%</td></tr>
            <tr><td>Fixed costs</td><td>75%</td><td>0%</td></tr>
            <tr><td>Retirement and investments</td><td>0%</td><td>25%</td></tr>
            <tr><td>Travel and vacation</td><td>0%</td><td>15%</td></tr>
            <tr><td>Reinvesting in the business</td><td>0%</td><td>10%</td></tr>
            <tr><td>Guilt-free spending</td><td>0%</td><td>25%</td></tr>
            <tr><td><b>Total</b></td><td><b>100%</b></td><td><b>100%</b></td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Her emergency fund is already at its target, so it isn't in the split right now. In an extra good month,
        she may also make a one-time transfer to retirement.
      </p>
      <p>
        Your numbers will be different. The rest of this guide covers how to pick the right percentage for each
        category.
      </p>

      <h2 id="before-you-start">Before you start: business expenses and owner's draws</h2>
      <p>Two things change how you apply the split.</p>
      <h3>Cover business expenses first</h3>
      <p>
        The split is meant for money you can actually use, not money your business needs to operate. If you have
        real business costs (software, contractors, inventory, ads), pay those first or set them aside before
        splitting. Otherwise your percentages are based on money that was never really yours. Splitting your gross
        income still works if your expenses are small, and it errs on the safe side for taxes.
      </p>
      <h3>If your business is an LLC or S corp</h3>
      <ul>
        <li>
          <b>Sole proprietor or single-member LLC:</b> client payments land in your business account. You pay
          yourself with an owner's draw, which is a transfer to your personal account. You can split each draw, or
          split deposits as they hit the business account.
        </li>
        <li>
          <b>S corp:</b> you pay yourself a salary through payroll, with taxes withheld, plus distributions. Since
          your salary already has withholding, you'd usually use a smaller tax percentage, and apply it mainly to
          distributions. A CPA can help you set that number.
        </li>
      </ul>

      <h2 id="taxes">1. Taxes</h2>
      <p>
        Taxes go first because they're non-negotiable. With a regular job, your employer withholds taxes and pays
        half of the 15.3% Social Security and Medicare tax. When you're self-employed, you pay the full 15.3% yourself,
        on top of income tax, and nobody sets that money aside for you.
      </p>
      <p>A common starting point is <b>25 to 30% of every deposit</b>. Where you land depends on two things:</p>
      <ul>
        <li>
          <b>How much you earn.</b> Tax brackets are progressive, so the more you make, the higher the rate on your
          top dollars. In a lower-income year, 25% may be enough.
        </li>
        <li>
          <b>Whether your state has an income tax.</b> If it does, or you're earning more, 30% is safer.
        </li>
      </ul>
      <p>
        Having extra in April is a much better problem than coming up short. For a closer number, try the free{" "}
        <Link href="/calculators/taxestimator">tax reserve estimator</Link>.
      </p>
      <div className="ps-box">
        <p>
          <b>Example:</b> a $10,000 deposit at 25% means $2,500 goes to your tax savings before you spend anything.
        </p>
      </div>
      <p>
        You can track this yourself, or use PrioritySave. You enter your percentages once. When a deposit of $100 or
        more comes in, PrioritySave texts you the dollar amount for each category, and you send the money.
      </p>
      <p>
        This is a starting point, not a guarantee of what you'll owe. Check your situation with a CPA or tax
        professional.
      </p>

      <h2 id="fixed-costs">2. Fixed costs and the waterfall</h2>
      <p>Fixed costs are the bills you pay every month no matter what you earn. Common ones include:</p>
      <ul>
        <li>Rent or mortgage</li>
        <li>Food</li>
        <li>Health insurance</li>
        <li>Utilities, internet, and phone</li>
        <li>Car payment and other transportation</li>
        <li>Minimum debt payments</li>
        <li>Childcare</li>
      </ul>
      <p>
        Average the last several months and round up. That way, if your rent goes up, you're still covered.
      </p>
      <h3>Fill fixed costs before anything else</h3>
      <p>
        Since taxes and fixed costs are non-negotiable, they get filled first. In Stage 1, every deposit goes 25% to
        taxes and 75% to fixed costs. Nothing goes to retirement, vacation, or spending money until the month's
        bills are covered.
      </p>
      <div className="ps-box">
        <p>
          <b>Example:</b> fixed costs are $5,000 a month. At 75%, it takes about $6,700 in deposits to cover them
          ($6,700 x 75% = about $5,000). Every deposit after that switches to the Stage 2 split.
        </p>
      </div>
      <p>
        This switch is the "waterfall." Once one category is full, the money flows to the next ones. You can track it
        by hand, but it's easy to lose count mid-month. In PrioritySave, you set a $5,000 cap on fixed costs, and
        once the category reaches it, PrioritySave sets fixed costs to 0% and switches its suggested split to Stage
        2.
      </p>
      <h3>Three ways to cap a category</h3>
      <ul>
        <li>
          <b>Monthly cap:</b> for recurring monthly costs, like fixed costs. It tracks how much you've sent to the
          category this month, stops at the cap, and resets next month.
        </li>
        <li>
          <b>Account cap:</b> for a goal with its own bank account. If you keep a $60,000 emergency fund in a
          separate savings account, it stops at $60,000 and starts again if the balance drops.
        </li>
        <li>
          <b>Total savings goal:</b> the same idea, but based on the category's own total (including any starting
          balance) instead of the bank balance. Once it hits the goal, it stops taking new money. Use this when
          several categories share one savings account.
        </li>
      </ul>

      <h2 id="emergency-fund">3. Emergency fund</h2>
      <p>
        A common guideline is 3 to 6 months of fixed costs. Many people with irregular income keep more, because a
        slow quarter hits harder without a paycheck. Megan keeps 12 months. That means giving up some investment
        growth on the cash, in exchange for knowing she's covered even if the business stopped tomorrow.
      </p>
      <div className="ps-box">
        <p>
          <b>Example:</b> with $5,000 in monthly fixed costs, a 12-month target is $60,000. Once the fund is full, it
          comes out of the split. If it dips below $60,000, add a percentage back into Stage 2 (for example 15%,
          taken from guilt-free spending) until it's full again.
        </p>
      </div>
      <p>
        Want to find your own number? Try the free{" "}
        <Link href="/calculators/emergencyfund">emergency fund calculator</Link>.
      </p>

      <h2 id="retirement">4. Retirement and investments</h2>
      <p>
        In the example split, retirement gets 25% of every Stage 2 deposit, spread across four accounts. Order
        matters: tax-advantaged accounts come first, and a regular brokerage account comes last.
      </p>
      <div className="ps-table">
        <table>
          <thead>
            <tr>
              <th>Account</th>
              <th>Share of each Stage 2 deposit</th>
              <th>Monthly cap</th>
              <th>2026 limit</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Roth IRA</td><td>10%</td><td>$625</td><td>$7,500</td></tr>
            <tr><td>HSA</td><td>5%</td><td>$367</td><td>$4,400 individual / $8,750 family</td></tr>
            <tr><td>Solo 401(k)</td><td>6%</td><td>None (moved monthly, see below)</td><td>Up to $72,000 under age 50</td></tr>
            <tr><td>Brokerage</td><td>4%</td><td>None</td><td>No limit</td></tr>
          </tbody>
        </table>
      </div>
      <h3>Roth IRA</h3>
      <p>
        The 2026 limit is $7,500, and $625 a month gets you there. You can only contribute up to what you earned
        that year. If your income is too high to contribute directly, look into a "backdoor Roth."
      </p>
      <h3>HSA (health savings account)</h3>
      <p>
        A lot of self-employed people don't know about this one. It's triple tax-advantaged: the money goes in
        tax-free, grows tax-free, and comes out tax-free for medical costs. It rolls over every year, can be
        invested, and after 65 you can use it for anything (non-medical withdrawals are taxed like a traditional
        IRA).
      </p>
      <p>
        You need a high-deductible health plan. Starting in 2026, that includes every Bronze and Catastrophic plan on
        the healthcare marketplace. A $367 monthly cap reaches the $4,400 individual limit in 12 months.
      </p>
      <h3>Solo 401(k)</h3>
      <p>
        For 2026, you can contribute up to $24,500 as the "employee," plus roughly 20% of your net self-employment
        earnings as the "employer," up to $72,000 combined if you're under 50. Read the full guide:{" "}
        <Link href="/self-employed/solo-401k">What Is a Solo 401(k)?</Link>
      </p>
      <p>
        Because the employer side depends on your profit, it's easy to put in too much. One way to avoid that is to
        send the Solo 401(k) percentage to a general savings account, labeled as retirement. At the end of the month,
        after expenses, move it into the Solo 401(k). In good months, add a one-time transfer on top.
      </p>
      <h3>Brokerage account</h3>
      <p>
        A regular brokerage account has no tax break, but you can take money out anytime without a penalty. That's
        why it comes after the tax-advantaged accounts.
      </p>
      <div className="ps-warn">
        <p>
          <b>Watch out in slow months.</b> Monthly caps only fill in months with enough Stage 2 deposits. If a slow
          month leaves the Roth or HSA short, make a one-time transfer to top it up so you still reach the yearly
          limit.
        </p>
      </div>

      <h2 id="goals">5. Travel and other goals</h2>
      <p>
        This is where your priorities come in. In the example, 15% of each Stage 2 deposit goes to a travel and
        vacation fund. Yours might be a wedding, a house down payment, or a new car.
      </p>
      <p>
        When you spend from a goal, record the withdrawal so the balance stays accurate. That way, when you see a big
        number in your savings account, you know exactly how much of it is for the trip and how much belongs to
        everything else.
      </p>
      <p>
        To figure out how much to save each month for a goal by a certain date, try the free{" "}
        <Link href="/calculators/moneysimulator">Savings Planner</Link>.
      </p>

      <h2 id="reinvest">6. Reinvesting in the business</h2>
      <p>
        It's tempting to keep pouring money into the business. Mike Michalowicz's book <i>Profit First</i> makes the
        case for paying yourself first, which forces the business to run leaner.
      </p>
      <p>
        In the example, 10% of each Stage 2 deposit goes here. This is separate from regular business expenses. It's
        for new ideas, growth, and experiments.
      </p>

      <h2 id="guilt-free">7. Guilt-free spending</h2>
      <p>
        Whatever is left is yours. In the example split, that's 25% of every Stage 2 deposit, plus anything freed up
        once the Roth IRA and HSA hit their monthly caps.
      </p>
      <p>
        Without a system, people with irregular income often wait until the end of the month to know what they can
        spend. With every deposit already split, you can spend what's left throughout the month, guilt free,
        because taxes, bills, and savings are already handled.
      </p>

      <h2 id="one-account">Can you use one savings account for everything?</h2>
      <p>
        Yes. You don't need a separate bank account for every category. Taxes, vacation, and emergency money can all
        live in one savings account, as long as you track each category's balance.
      </p>
      <p>
        The catch is that you have to record withdrawals. If you spend $5,000 from your vacation category and don't
        log it, the account still looks full while one category is actually short. You don't want that short
        category to be your tax money.
      </p>
      <p>
        If you know you won't keep up with recording withdrawals, open separate accounts for the critical
        categories, like taxes and fixed costs.
      </p>

      <h2 id="recap">Recap</h2>
      <ul>
        <li>Split every deposit by percentage before you spend any of it.</li>
        <li>Stage 1: taxes and fixed costs until the month's bills are covered.</li>
        <li>Stage 2: taxes, retirement, goals, the business, and guilt-free spending.</li>
        <li>Start taxes at 25 to 30%, and adjust for your income and state.</li>
        <li>Use caps so full categories stop taking money, and the rest flows to the next ones.</li>
        <li>Fill tax-advantaged retirement accounts before a regular brokerage account.</li>
        <li>Whatever is left is yours to spend, guilt free.</li>
      </ul>
    </BlogArticle>
  );
}
