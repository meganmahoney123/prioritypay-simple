import Link from "next/link";
import BlogArticle from "@/components/BlogArticle";

// Blog post adapted from the "6 Ways Entrepreneurs Save THOUSANDS on Taxes"
// YouTube video (youtube.com/watch?v=yVs1S7KrWyY) and its recorded script
// ("Biggest Tax-Saving Moves for Entrepreneurs & Self-Employed"). Target
// searches: "how to save on taxes self employed", "tax saving strategies
// for small business owners", "how to reduce taxes as a business owner".
// Includes the two corrections shown on screen in the video: (1) with a
// reasonable S corp salary at $300K profit, the QBI deduction comes back
// to roughly $40,000 (max about $42,000), not $53,700, because the salary
// itself lowers QBI; (2) the Augusta rule needs a business that's a
// separate taxpayer (S corp, C corp, partnership), so it doesn't work for a
// sole proprietor or single-member LLC. 2026 brackets/standard deduction
// checked against Kiplinger's summary of the IRS release.
const PATH = "/self-employed/how-to-save-on-taxes";
const TITLE = "How to Save on Taxes When You're Self-Employed: 4 Strategies + 2 Bonuses (2026)";
const DEK =
  "Simple, high-impact ways entrepreneurs and self-employed people lower their tax bill: maxing out retirement, deducting health insurance, timing income and expenses, and the S corp election, plus the Augusta rule and hiring your kids.";

export const metadata = {
  title: "How to Save on Taxes When You're Self-Employed: 6 Strategies for 2026 | PrioritySave",
  description:
    "Six tax-saving strategies for self-employed people and business owners in 2026, with real numbers: retirement contributions, the health insurance deduction, year-end timing, the S corp election and QBI, the Augusta rule, and hiring your kids.",
  alternates: { canonical: `https://www.prioritysave.com${PATH}` },
  robots: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large" },
  openGraph: {
    type: "article",
    title: "How to Save on Taxes When You're Self-Employed (2026)",
    description:
      "Four high-impact strategies and two bonuses, with worked examples using 2026 numbers.",
    url: `https://www.prioritysave.com${PATH}`,
  },
  twitter: { card: "summary_large_image" },
};

const TOC = [
  { id: "retirement", label: "1. Max out your retirement contributions" },
  { id: "retirement-plans", label: "Which retirement plan: Solo 401(k), SEP IRA, or safe harbor 401(k)" },
  { id: "health-insurance", label: "2. Deduct your health insurance premiums" },
  { id: "timing", label: "3. Time your income and expenses at year-end" },
  { id: "s-corp", label: "4. Elect S corp tax treatment (in the right situation)" },
  { id: "augusta", label: "Bonus 1: The Augusta rule" },
  { id: "kids", label: "Bonus 2: Hiring your kids" },
  { id: "faq", label: "FAQ" },
];

const FAQ = [
  {
    q: "What is the best way to lower taxes when you're self-employed?",
    a: "For many self-employed people, retirement contributions are the biggest lever. Every dollar in a pre-tax retirement account comes off your taxable income, and a Solo 401(k) allows up to $72,000 in 2026 if you're under 50. At a 22% rate, a $20,000 pre-tax contribution saves about $4,400 in federal income tax.",
  },
  {
    q: "At what profit does an S corp election start to make sense?",
    a: "It mainly makes sense once profit is consistently around $80,000 to $100,000 or more, though the real number depends on your state and your reasonable salary. Below that, payroll, an extra tax return, and a smaller QBI deduction often eat most of the savings.",
  },
  {
    q: "Can a sole proprietor use the Augusta rule?",
    a: "No. The Augusta rule involves renting your home to your business, which only works when the business is a separate taxpayer, like an S corp, C corp, or partnership. A sole proprietorship or single-member LLC can't rent from its own owner.",
  },
  {
    q: "Is health insurance tax deductible for self-employed people?",
    a: "Generally yes. Self-employed people can usually deduct premiums for health, dental, and long-term care insurance for themselves and their family, as long as the business has a profit and they weren't eligible for an employer's plan. It lowers income tax but not self-employment tax.",
  },
  {
    q: "What are the 2026 tax brackets for single filers?",
    a: "10% up to $12,400; 12% up to $50,400; 22% up to $105,700; 24% up to $201,775; 32% up to $256,225; 35% up to $640,600; and 37% above that. The 2026 standard deduction for a single filer is $16,100.",
  },
];

const RELATED = [
  { href: "/business-owner/business-tax-deductions", title: "10 Tax Deductions Business Owners Should Know About" },
  { href: "/self-employed/solo-401k", title: "What Is a Solo 401(k)? 2026 Limits and Examples" },
  { href: "/self-employed/sole-proprietor-vs-llc-vs-s-corp", title: "Sole Proprietor vs. LLC vs. S Corp (free calculator)" },
  { href: "/self-employed/tax-optimization", title: "Tax Optimization for Self Employed: The Complete Guide" },
];

export default function HowToSaveOnTaxesPage() {
  return (
    <BlogArticle
      path={PATH}
      title={TITLE}
      dek={DEK}
      updated="November 2026"
      readMinutes={13}
      videoId="yVs1S7KrWyY"
      videoTitle="6 Ways Entrepreneurs Save THOUSANDS on Taxes"
      toc={TOC}
      faq={FAQ}
      related={RELATED}
      datePublished="2026-11-03"
    >
      <p>
        A lot of business owners and self-employed people overpay on taxes simply because they didn't plan ahead.
        This isn't about moving to Puerto Rico or anything extreme. These are simple, boring, high-impact strategies
        worth knowing about before tax season, picked because they have the biggest payoff for the least effort.
      </p>
      <p>
        They aren't one-size-fits-all. How much each one saves depends on your profit, your business structure, and
        whether you have employees. The first four apply to most people; the last two are bonuses that only fit some
        situations.
      </p>

      <h2 id="retirement">1. Max out your retirement contributions</h2>
      <p>
        Every dollar you put into a pre-tax retirement account is subtracted from your taxable income. If you have
        $100,000 of taxable income and contribute $20,000 pre-tax, you're taxed on $80,000.
      </p>
      <div className="ps-table">
        <table>
          <thead>
            <tr>
              <th>Single filer, 2026 brackets</th>
              <th>Federal income tax</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>$100,000 taxable income, no contribution</td><td>$16,712</td></tr>
            <tr><td>$80,000 after a $20,000 pre-tax contribution</td><td>$12,312</td></tr>
            <tr><td><b>Saved</b></td><td><b>$4,400</b> (the $20,000 was taxed at 22%)</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        A Roth contribution works the other way. You're still taxed on the full $100,000 this year, but the
        contribution grows and comes out tax-free in retirement. At 7% a year for 30 years, $20,000 could grow to
        about $152,000, all tax-free.
      </p>
      <p>
        Either way, retirement accounts beat a regular brokerage account for taxes. A brokerage account usually
        gives no deduction on what you put in, and its growth doesn't compound tax-free the way a Roth account's
        does.
      </p>

      <h2 id="retirement-plans">Which retirement plan: Solo 401(k), SEP IRA, or safe harbor 401(k)?</h2>
      <h3>No employees: the Solo 401(k)</h3>
      <p>
        If you're self-employed with no full-time employees other than a spouse, the Solo 401(k) is designed for
        you, with a $72,000 contribution ceiling in 2026 (with some nuances). Read the full breakdown in{" "}
        <Link href="/self-employed/solo-401k">What Is a Solo 401(k)?</Link>
      </p>
      <h3>With employees: the SEP IRA</h3>
      <p>
        A SEP IRA is simple to set up, but there's a catch: whatever percentage of pay you contribute for yourself,
        you have to contribute the same percentage for every eligible employee.
      </p>
      <p>
        Say you pay yourself $150,000 and contribute 20%, or $30,000. You have two employees earning $50,000 each,
        so you owe them 20% too: $10,000 each, $20,000 combined. That $20,000 is still a deductible business
        expense, so the real cost is $20,000 minus what the deduction saves you. And it's money that helps keep good
        employees, which most deductions don't do.
      </p>
      <h3>With employees: the safe harbor 401(k)</h3>
      <p>
        A safe harbor 401(k) flips the ratio. Instead of matching your percentage, you owe employees a small base
        contribution, usually about 3% to 4% of their pay. For the two employees above, that's about $3,000 to $4,000
        instead of $20,000. Add profit sharing, and you can push your own contribution much closer to $72,000.
      </p>
      <div className="ps-table">
        <table>
          <thead>
            <tr>
              <th>Your contribution</th>
              <th>Saved at a 22% rate</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>$30,000 (the SEP IRA example)</td><td>About $6,600</td></tr>
            <tr><td>$72,000 (safe harbor + profit sharing)</td><td>About $15,800</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        That's about $9,000 more saved, for less than half of what the SEP would have cost in employee
        contributions. The trade-off is that a safe harbor plan costs a few thousand dollars a year to administer.
      </p>

      <h2 id="health-insurance">2. Deduct your health insurance premiums</h2>
      <p>
        Self-employed people can generally deduct health insurance premiums straight off their income, even without
        itemizing.
      </p>
      <ul>
        <li>
          At $150,000 in profit, you're likely in the 22% bracket. A $7,200 individual premium saves roughly
          $1,580.
        </li>
        <li>
          At $300,000 in profit, you could be in the 32% bracket. An $18,000 family premium saves closer to
          $5,800.
        </li>
      </ul>
      <p>
        Sole proprietors and partners claim it against their net self-employment income. S corp owners have one
        extra step: the corporation has to pay or reimburse the premiums and include them in the owner's W-2 wages.
        Skip that step and the deduction is lost, even though the premium is the same.
      </p>

      <h2 id="timing">3. Time your income and expenses around year-end</h2>
      <p>
        How much tax you owe depends on which bracket your total profit lands in. If you're close to the edge of a
        bracket, moving income or expenses between December and January can change your bill.
      </p>
      <div className="ps-table">
        <table>
          <thead>
            <tr>
              <th>2026 rate (single)</th>
              <th>Taxable income</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>10%</td><td>Up to $12,400</td></tr>
            <tr><td>12%</td><td>$12,401 to $50,400</td></tr>
            <tr><td>22%</td><td>$50,401 to $105,700</td></tr>
            <tr><td>24%</td><td>$105,701 to $201,775</td></tr>
            <tr><td>32%</td><td>$201,776 to $256,225</td></tr>
            <tr><td>35%</td><td>$256,226 to $640,600</td></tr>
            <tr><td>37%</td><td>Over $640,600</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Say you're a single filer on track for about $100,000 of taxable income, and a client offers a $20,000
        bonus in late December. That pushes you to $120,000.
      </p>
      <ul>
        <li>
          <b>Take it in December:</b> the first $5,700 is taxed at 22% and the remaining $14,300 at 24%, for about
          $4,686 in tax on the bonus.
        </li>
        <li>
          <b>Take it in January:</b> if next year isn't also near a bracket edge, the whole $20,000 is taxed at 22%,
          about $4,400.
        </li>
      </ul>
      <p>
        That's a $286 difference just from timing, and it grows with bigger amounts. The same logic works in reverse
        for expenses: buying equipment or paying a bill in December moves the deduction into this year.
      </p>

      <h2 id="s-corp">4. Elect S corp tax treatment (in the right situation)</h2>
      <p>
        The S corp election mainly makes sense once you're consistently clearing roughly $80,000 to $100,000 in
        profit, though the real number depends on your state and your salary. Below that, setup and running costs
        usually eat most of the benefit.
      </p>
      <h3>How it saves on self-employment tax</h3>
      <p>
        As a sole proprietor, partnership, or default LLC, every dollar of profit gets hit with self-employment tax,
        generally 15.3%. With an S corp, you split your pay into a salary and a distribution. The salary still pays
        Social Security and Medicare through payroll, but the distribution skips that 15.3%.
      </p>
      <div className="ps-table">
        <table>
          <thead>
            <tr>
              <th>Profit</th>
              <th>Typical yearly savings</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>$150,000</td><td>About $2,600 to $8,200</td></tr>
            <tr><td>$300,000</td><td>About $8,000 to $19,600</td></tr>
          </tbody>
        </table>
      </div>
      <p>The range depends on how the salary-to-profit split is set.</p>
      <h3>The second reason: the QBI deduction</h3>
      <p>
        The qualified business income (QBI) deduction can take up to 20% off your taxable business income, and it
        applies when you file. But once taxable income passes about $200,000 for a single filer, the deduction starts
        to be capped based on the W-2 wages your business pays.
      </p>
      <p>
        A self-employed person with no employees and no salary has no wages, so the deduction can shrink to almost
        nothing. A sole proprietor at $300,000 in profit sees a roughly $56,900 deduction cut to about $6,300.
      </p>
      <p>
        The salary an S corp pays rebuilds that wage base. With a reasonable salary, the deduction comes back to
        roughly $40,000. It doesn't return to the full amount, because the salary itself also lowers qualified
        business income; at this profit level the most it comes back to is about $42,000.
      </p>
      <ul>
        <li>If you already have employees on payroll, you're usually already covered.</li>
        <li>
          The exception is a <b>specified service business</b>, like consulting, coaching, or financial advice, where
          the deduction disappears above the threshold, S corp or not.
        </li>
      </ul>
      <h3>Two things to watch out for</h3>
      <ol>
        <li>
          <b>Don't lowball the salary.</b> The IRS audits reasonable salary. Paying yourself $15,000 a year while the
          business makes millions can mean back payroll taxes and penalties.
        </li>
        <li>
          <b>It's not easy to undo.</b> If you revoke S corp status, the IRS generally won't let you elect it again
          for five years without special approval. Make sure your business is stable above the threshold first.
        </li>
      </ol>
      <p>
        To compare the structures with your own numbers, try the free{" "}
        <Link href="/self-employed/sole-proprietor-vs-llc-vs-s-corp">sole proprietor vs. LLC vs. S corp calculator</Link>.
      </p>

      <h2 id="augusta">Bonus 1: The Augusta rule</h2>
      <p>
        A business can rent the owner's home for up to 14 days a year, for things like board meetings or planning
        sessions. The rent is tax-free to the owner and deductible to the business, as long as it's a real,
        comparable local rate. For example, 10 days at $150 a day is $1,500, tax-free.
      </p>
      <div className="ps-warn">
        <p>
          <b>Who it works for:</b> the business has to be a separate taxpayer, like an S corp, C corp, or
          partnership. It doesn't work for a sole proprietorship or single-member LLC, because there's no separate
          business to pay the rent.
        </p>
      </div>

      <h2 id="kids">Bonus 2: Hiring your kids</h2>
      <p>
        If your kids do real work for your business, paying them can shift income into their lower bracket. Say you
        pay your teenager $8,000 this year to manage your social media:
      </p>
      <ul>
        <li>Your business deducts the $8,000. In the 22% bracket, that's $1,760 off your tax bill.</li>
        <li>
          A dependent's standard deduction is their earned income plus $450, so on $8,000 earned it covers about
          $8,450. They owe no federal income tax on it.
        </li>
        <li>So the same $8,000 is taxed once at 0% instead of once at 22%.</li>
      </ul>
      <h3>Where structure matters</h3>
      <div className="ps-table">
        <table>
          <thead>
            <tr>
              <th>Business type</th>
              <th>Social Security and Medicare (FICA) on the $8,000</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Sole proprietor, or a partnership owned only by the child's parents (child under 18)</td>
              <td>Fully exempt: $0</td>
            </tr>
            <tr>
              <td>S corp</td>
              <td>Normal 15.3%: about $1,224 ($612 paid by the business, $612 withheld from your child's pay)</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        The income tax savings are the same either way. The work has to be real, the pay reasonable, and the
        records (timesheets, a job description, payroll) in place.
      </p>

      <h2 id="recap">Recap</h2>
      <ol>
        <li>Max out your retirement contributions.</li>
        <li>Deduct your health insurance premiums.</li>
        <li>Time your income and expenses around year-end.</li>
        <li>Elect S corp tax treatment, when the numbers work.</li>
        <li>Bonus: the Augusta rule (separate-entity businesses only).</li>
        <li>Bonus: hiring your kids.</li>
      </ol>
      <p>
        These don't cover the everyday business deductions. For those, read{" "}
        <Link href="/business-owner/business-tax-deductions">10 Tax Deductions Business Owners Should Know About</Link>.
      </p>
    </BlogArticle>
  );
}
