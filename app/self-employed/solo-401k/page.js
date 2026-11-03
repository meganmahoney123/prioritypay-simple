import Link from "next/link";
import BlogArticle from "@/components/BlogArticle";

// Blog post adapted from the "What is a Solo 401k?" YouTube video
// (youtube.com/watch?v=oC_6HUxvCJU) and its script. Target searches:
// "solo 401k", "what is a solo 401k", "solo 401k contribution limits 2026",
// "mega backdoor roth solo 401k". Jess's numbers assume a single filer, the
// 2026 standard deduction ($16,100), and 2026 brackets; the employer amount
// is 20% of profit after subtracting half of self-employment tax.
const PATH = "/self-employed/solo-401k";
const TITLE = "What Is a Solo 401(k)? 2026 Limits, Examples, and the Mega Backdoor Roth";
const DEK =
  "A Solo 401(k) lets self-employed people with no full-time employees put away up to $72,000 in 2026 by contributing as both the employee and the employer. Here's how it works, how much you can put in, and what it can save on taxes.";

export const metadata = {
  title: "What Is a Solo 401(k)? 2026 Contribution Limits, Examples & Mega Backdoor Roth | PrioritySave",
  description:
    "How a Solo 401(k) works for self-employed people in 2026: the $24,500 employee and ~20% employer contributions, the $72,000 cap, a worked tax example, the Mega Backdoor Roth, pre-tax vs. Roth, and deadlines.",
  alternates: { canonical: `https://www.prioritysave.com${PATH}` },
  robots: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large" },
  openGraph: {
    type: "article",
    title: "What Is a Solo 401(k)? 2026 Limits, Examples, and the Mega Backdoor Roth",
    description:
      "Contribute as both employee and employer, up to $72,000 in 2026. A plain-English guide with a worked example.",
    url: `https://www.prioritysave.com${PATH}`,
  },
  twitter: { card: "summary_large_image" },
};

const TOC = [
  { id: "what-is-it", label: "What is a Solo 401(k)?" },
  { id: "who-qualifies", label: "Who can open one" },
  { id: "why-it-matters", label: "Why it matters" },
  { id: "how-it-works", label: "How it works: two buckets" },
  { id: "limits", label: "2026 contribution limits" },
  { id: "example", label: "Example: what Jess can save" },
  { id: "mega-backdoor", label: "The Mega Backdoor Roth" },
  { id: "compare", label: "Comparing Jess's three options" },
  { id: "pretax-roth", label: "Pre-tax or Roth?" },
  { id: "overcontributing", label: "Avoiding overcontributions" },
  { id: "deadlines", label: "Deadlines" },
  { id: "provider", label: "Choosing a provider and getting started" },
  { id: "faq", label: "FAQ" },
];

const FAQ = [
  {
    q: "What is the Solo 401(k) contribution limit for 2026?",
    a: "In 2026, you can contribute up to $24,500 as the employee, plus an employer contribution of roughly 20% of your profit (25% of W-2 salary for an S corp). The combined cap is $72,000 if you're under 50. People 50 and older can add $8,000 more, and people ages 60 to 63 can add $11,250.",
  },
  {
    q: "Can I have a Solo 401(k) if I also have a job with a 401(k)?",
    a: "Yes, if you have self-employment income and no full-time employees other than a spouse. But the $24,500 employee limit is shared across every 401(k) you contribute to, so money you put into your workplace 401(k) uses up part of it.",
  },
  {
    q: "Do I need an LLC to open a Solo 401(k)?",
    a: "No. Sole proprietors can open a Solo 401(k). You'll need an EIN, which is free from the IRS.",
  },
  {
    q: "Is a Solo 401(k) better than a SEP IRA?",
    a: "For most people with no employees, a Solo 401(k) allows more at the same income because it adds the $24,500 employee contribution on top of the employer contribution. At $100,000 of profit, a SEP IRA allows about $18,600, while a Solo 401(k) allows about $43,000.",
  },
  {
    q: "What is the Mega Backdoor Roth in a Solo 401(k)?",
    a: "It's a third bucket of after-tax contributions that some plans allow on top of the employee and employer contributions, up to the overall cap. The after-tax money is converted to Roth inside the plan, ideally right away, so it can grow tax-free. Not every provider supports it.",
  },
];

const RELATED = [
  { href: "/self-employed/how-to-save-on-taxes", title: "How to Save on Taxes When You're Self-Employed (2026)" },
  { href: "/business-owner/business-tax-deductions", title: "10 Tax Deductions Business Owners Should Know About" },
  { href: "/self-employed/tax-optimization", title: "Tax Optimization for Self Employed: The Complete Guide" },
  { href: "/calculators/retirementcalculator", title: "Retirement calculator" },
];

export default function Solo401kPage() {
  return (
    <BlogArticle
      path={PATH}
      title={TITLE}
      dek={DEK}
      updated="November 2026"
      readMinutes={12}
      videoId="oC_6HUxvCJU"
      videoTitle="What is a Solo 401k?"
      toc={TOC}
      faq={FAQ}
      related={RELATED}
      datePublished="2026-11-03"
    >
      <h2 id="what-is-it">What is a Solo 401(k)?</h2>
      <p>
        A Solo 401(k) is the self-employed version of the 401(k) you'd get at a regular job. It's a retirement
        account for business owners with no full-time employees, and it's often the biggest tax-saving opportunity
        a self-employed person has.
      </p>

      <h2 id="who-qualifies">Who can open a Solo 401(k)?</h2>
      <ul>
        <li>Anyone with self-employment income, like coaches, consultants, contractors, and creators.</li>
        <li>No full-time employees, other than a spouse. Contractors don't count as employees.</li>
        <li>You don't need an LLC. Sole proprietors can open one too.</li>
        <li>Side income counts, even if you also have a full-time job.</li>
      </ul>

      <h2 id="why-it-matters">Why a Solo 401(k) matters</h2>
      <p>
        It has a very high contribution ceiling. In 2026, you can put in up to $72,000, depending on how much you
        earn (people 50 and older can put in a bit more). That's a lot more than most self-employed people with a
        moderate income can put into other retirement accounts. And the more you put into a pre-tax account, the
        more you lower your taxable income.
      </p>
      <p>There are a few other perks:</p>
      <ul>
        <li>
          <b>Investment choices.</b> You can invest in stocks and ETFs. With a self-directed provider, you can even
          invest in things like real estate, startups, and crypto.
        </li>
        <li>
          <b>Loans.</b> Some plans let you borrow up to 50% of your balance, with a max of $50,000, and pay yourself
          back with interest. If you pay it back on time, there's no penalty.
        </li>
      </ul>

      <h2 id="how-it-works">How a Solo 401(k) works: two buckets</h2>
      <p>
        With a 401(k) at a regular job, you contribute from your paycheck and your employer might add a match. But
        you can't make your employer add one, and most employers don't match the maximum. With a Solo 401(k), you
        contribute as both the employee and the employer, so you can fill both sides.
      </p>
      <h3>Bucket 1: You, the employee</h3>
      <p>
        You can contribute up to $24,500 in 2026, and you choose <b>pre-tax</b> or <b>Roth</b>:
      </p>
      <ul>
        <li>
          <b>Pre-tax:</b> you deduct what you contribute this year, then pay taxes when you take the money out in
          retirement.
        </li>
        <li>
          <b>Roth:</b> you pay taxes on the money now and get no deduction, but it grows tax-free and comes out
          tax-free in retirement.
        </li>
      </ul>
      <h3>Bucket 2: Your business, the employer</h3>
      <p>
        Your business can contribute roughly 20% of your profit. Technically, it's 20% of profit after subtracting
        half of your self-employment tax. If your business is taxed as an S corp, it's 25% of the salary you pay
        yourself. The employer bucket is usually pre-tax only, though a few providers now offer Roth.
      </p>

      <h2 id="limits">2026 Solo 401(k) contribution limits</h2>
      <div className="ps-table">
        <table>
          <thead>
            <tr>
              <th>Piece</th>
              <th>2026 limit</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Employee contribution</td><td>$24,500</td></tr>
            <tr><td>Employer contribution</td><td>~20% of profit (S corp: 25% of W-2 salary)</td></tr>
            <tr><td>Total cap, under 50</td><td>$72,000</td></tr>
            <tr><td>Catch-up, age 50+</td><td>+$8,000</td></tr>
            <tr><td>Catch-up, ages 60 to 63</td><td>+$11,250</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        The total cap applies no matter how much you earn. If your business made $1,000,000, 20% would be about
        $200,000, but you're still capped at $72,000. After $24,500 as the employee, you could add about $47,500 as
        the employer.
      </p>

      <h2 id="example">Example: what Jess can put in and save</h2>
      <p>Meet Jess. She's a self-employed graphic designer who made $100,000 in profit this year.</p>
      <ul>
        <li>As the employee, she can contribute up to <b>$24,500</b>.</li>
        <li>
          As the business, she can add 20% of her profit after subtracting half of her self-employment tax. On
          $100,000, that's about <b>$18,600</b>.
        </li>
        <li>
          That's about <b>$43,000</b> total.
        </li>
      </ul>
      <p>Here's what that does for her federal income tax (single filer, standard deduction):</p>
      <div className="ps-table">
        <table>
          <thead>
            <tr>
              <th>Jess contributes</th>
              <th>Federal income tax</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Nothing</td><td>About $8,200</td></tr>
            <tr><td>$43,000 pre-tax</td><td>About $3,000</td></tr>
            <tr><td><b>Savings this year</b></td><td><b>About $5,200</b></td></tr>
          </tbody>
        </table>
      </div>
      <p>
        If Jess chooses Roth for her employee portion instead, she doesn't get that tax break today. But the money
        grows tax-free, and she keeps all of the growth in retirement. If $24,500 grows at 7% a year for 30 years,
        it could become about $186,000, with no tax owed on it.
      </p>

      <h2 id="mega-backdoor">The Mega Backdoor Roth</h2>
      <p>
        Even with both buckets, Jess can only put in about $43,000. She's still about $29,000 short of the $72,000
        cap, because the employer bucket is tied to profit. She'd need roughly $250,000 in profit to reach the cap
        with just those two buckets. If her plan allows it, the Mega Backdoor Roth fills that leftover room with a
        third bucket: after-tax money.
      </p>
      <ol>
        <li>Fill the employee and employer buckets. For Jess, that's about $43,000.</li>
        <li>
          Put extra money in labeled as <b>after-tax</b>. Jess can put in up to the leftover $29,000.
        </li>
        <li>
          Convert it to Roth right away. Providers call this an <b>in-plan Roth conversion</b>. Any growth before the
          conversion gets taxed, so converting quickly leaves almost nothing to tax.
        </li>
      </ol>
      <p>
        The big win is reaching the $72,000 ceiling at a much lower profit. Two caveats: not every Solo 401(k) plan
        allows this (if the contribution form has no after-tax option, that's a clue), and nobody has to max it out.
        At $100,000 in profit, putting in $72,000 would leave about $28,000 to live on before taxes.
      </p>

      <h2 id="compare">Comparing Jess's three options</h2>
      <div className="ps-table">
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Do nothing</th>
              <th>Solo 401(k)</th>
              <th>+ Mega Backdoor Roth</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Employee (pre-tax)</td><td>$0</td><td>$24,500</td><td>$24,500</td></tr>
            <tr><td>Employer (pre-tax)</td><td>$0</td><td>$18,600</td><td>$18,600</td></tr>
            <tr><td>After-tax, converted to Roth</td><td>$0</td><td>$0</td><td>$29,000</td></tr>
            <tr><td>Total put away</td><td>$0</td><td>~$43,000</td><td>$72,000</td></tr>
            <tr><td>Federal income tax this year</td><td>~$8,200</td><td>~$3,000</td><td>~$3,000</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        The Mega Backdoor Roth doesn't lower this year's tax, because the after-tax money was already taxed. Its
        payoff is later: if that $29,000 grows at 7% a year for 30 years, it could become about $220,000, with no
        tax owed on it.
      </p>

      <h2 id="pretax-roth">Pre-tax or Roth? A simple rule of thumb</h2>
      <ul>
        <li>
          <b>High-income year? Lean pre-tax.</b> You're in a higher bracket, so a deduction now saves more.
        </li>
        <li>
          <b>Low-income year? Lean Roth.</b> Your tax rate is already low, so paying tax now is cheap, and the money
          grows tax-free.
        </li>
      </ul>
      <p>
        Self-employed income changes a lot from year to year, and you can choose differently each year, or split
        between the two in the same year. Back to Jess:
      </p>
      <ul>
        <li>
          <b>Slow year, $40,000 profit:</b> $10,000 pre-tax saves her only about $900 in federal tax. Choosing Roth
          instead, that $10,000 could grow to about $76,000 in 30 years at 7%, tax-free.
        </li>
        <li>
          <b>Big year, $200,000 profit:</b> the same $10,000 pre-tax saves about $1,900, more than twice as much,
          because she's in a higher bracket. Pre-tax looks better here.
        </li>
      </ul>
      <p>The basic idea is to pay taxes when your rate is lowest.</p>

      <h2 id="overcontributing">How to avoid overcontributing</h2>
      <p>
        Because the employer bucket depends on your profit, it's easy to put in too much in a year when income comes
        in lumpy. One approach: set aside a percentage of every deposit in a savings account earmarked for your
        Solo 401(k), then move it into the plan at the end of the month, once you know you won't go over.
        PrioritySave tracks that percentage on each deposit, so the earmarked money is easy to see.
      </p>

      <h2 id="deadlines">Solo 401(k) deadlines</h2>
      <div className="ps-table">
        <table>
          <thead>
            <tr>
              <th>Situation</th>
              <th>Deadline</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>You already have a Solo 401(k)</td>
              <td>Make your employee contribution election in writing by December 31. The money can go in later.</td>
            </tr>
            <tr>
              <td>First Solo 401(k), sole proprietor or single-member LLC with no employees</td>
              <td>You can open the plan and make your first-year election after the year ends, up to your tax filing deadline (not including extensions).</td>
            </tr>
            <tr>
              <td>Business taxed as an S corp</td>
              <td>December 31, no exceptions.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="provider">How to choose a provider and get started</h2>
      <p>Before signing up, check the plan documents for two things:</p>
      <ol>
        <li>
          <b>After-tax contributions and in-plan Roth conversions.</b> That's what makes the Mega Backdoor Roth
          possible. Many low-cost providers don't support it, and it's rarely obvious from their marketing, so dig
          into the plan document or ask directly.
        </li>
        <li>
          <b>What you can invest in.</b> Some providers lock you into a small lineup of their own funds, while a
          mainstream brokerage lets you hold individual stocks, ETFs, bonds, and CDs.
        </li>
      </ol>
      <p>Then the rest is straightforward:</p>
      <ol>
        <li>Get an EIN from the IRS if you don't already have one (it's free).</li>
        <li>Complete the plan adoption paperwork.</li>
        <li>Fund it by the deadline that applies to you.</li>
      </ol>
      <p>
        A Solo 401(k) is one way to save on taxes. For more, read{" "}
        <Link href="/self-employed/how-to-save-on-taxes">How to Save on Taxes When You're Self-Employed</Link>.
      </p>
    </BlogArticle>
  );
}
