import Link from "next/link";
import BlogArticle from "@/components/BlogArticle";

// Blog post adapted from the "10 Business Deductions Every Biz Owner Should
// Know" YouTube video (youtube.com/watch?v=j5G5wCO-QW4) and its script.
// Target searches: "business tax deductions", "self-employed tax deductions
// 2026", "small business tax write-offs". 2026 figures: IRS mileage rate
// (72.5 cents Jan to Jun, 76 cents from Jul 1), Section 179 ($2,560,000),
// Solo 401(k) ($24,500 / $72,000).
const PATH = "/self-employed/business-tax-deductions";
const TITLE = "10 Tax Deductions Business Owners Should Know About (2026)";
const DEK =
  "The home office, mileage, health insurance, hiring your kids, the QBI deduction, and five more write-offs for self-employed people and business owners, with 2026 numbers, how to qualify, and the mistakes that get people in trouble.";

export const metadata = {
  title: "10 Business Tax Deductions for Self-Employed People and Business Owners (2026) | PrioritySave",
  description:
    "A plain-English guide to 10 business tax deductions for 2026: home office, mileage (72.5 cents a mile), phone and software, meals, education, health insurance, hiring your kids, QBI, equipment, and retirement.",
  alternates: { canonical: `https://www.prioritysave.com${PATH}` },
  robots: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large" },
  openGraph: {
    type: "article",
    title: "10 Tax Deductions Business Owners Should Know About (2026)",
    description:
      "Home office, mileage, health insurance, hiring your kids, QBI, and more, with 2026 numbers and the rules for qualifying.",
    url: `https://www.prioritysave.com${PATH}`,
  },
  twitter: { card: "summary_large_image" },
};

const TOC = [
  { id: "how-deductions-work", label: "How a tax deduction works" },
  { id: "at-a-glance", label: "The 10 deductions at a glance" },
  { id: "home-office", label: "1. Home office" },
  { id: "mileage", label: "2. Car and mileage" },
  { id: "phone-software", label: "3. Phone, internet, and software" },
  { id: "meals", label: "4. Business meals" },
  { id: "education", label: "5. Education and training" },
  { id: "health-insurance", label: "6. Health insurance" },
  { id: "hiring-kids", label: "7. Hiring your kids" },
  { id: "qbi", label: "8. The QBI deduction" },
  { id: "equipment", label: "9. Equipment" },
  { id: "retirement", label: "10. Retirement contributions" },
  { id: "faq", label: "FAQ" },
];

const FAQ = [
  {
    q: "What is the 2026 IRS mileage rate for business driving?",
    a: "The IRS business mileage rate for 2026 is 72.5 cents a mile from January 1 to June 30, and 76 cents a mile from July 1. So 5,000 business miles in the first half of the year works out to a $3,625 deduction.",
  },
  {
    q: "Are business meals deductible in 2026?",
    a: "Meals with clients, customers, or other business contacts are generally 50% deductible when you keep a record of who attended and what business was discussed. Entertainment, like concert tickets or golf, isn't deductible. Starting in 2026, snacks and meals provided at the office for employees' convenience are generally no longer deductible, though a company-wide event like a holiday party can still be.",
  },
  {
    q: "How much is the simplified home office deduction?",
    a: "The simplified method is $5 per square foot of space used regularly and only for business, up to 300 square feet. That means the most it can be is $1,500 a year. A 200-square-foot office comes to $1,000.",
  },
  {
    q: "Do deductions lower self-employment tax too?",
    a: "Business expenses on Schedule C, like mileage, software, and the home office, lower both income tax and self-employment tax because they reduce your business profit. Some deductions, like the self-employed health insurance deduction, the QBI deduction, and a sole proprietor's retirement contributions, lower income tax but not self-employment tax.",
  },
  {
    q: "Is it worth buying equipment just for the tax write-off?",
    a: "Usually not. A deduction saves a percentage of the cost, not the whole cost. If your combined tax rate is about 30% and you spend $3,000 on a camera, you save about $900 in taxes and are still out $2,100.",
  },
];

const RELATED = [
  { href: "/self-employed/how-to-save-on-taxes", title: "How to Save on Taxes When You're Self-Employed (2026)" },
  { href: "/self-employed/solo-401k", title: "What Is a Solo 401(k)? 2026 Limits and Examples" },
  { href: "/self-employed/self-employed-tax-guide", title: "Taxes for Self Employed: The Complete Guide" },
  { href: "/self-employed/sole-proprietor-vs-llc-vs-s-corp", title: "Sole Proprietor vs. LLC vs. S Corp (free calculator)" },
];

export default function BusinessTaxDeductionsPage() {
  return (
    <BlogArticle
      path={PATH}
      title={TITLE}
      dek={DEK}
      updated="November 2026"
      readMinutes={11}
      videoId="j5G5wCO-QW4"
      videoTitle="10 Business Deductions Every Biz Owner Should Know"
      toc={TOC}
      faq={FAQ}
      related={RELATED}
      datePublished="2026-11-03"
    >
      <p>
        If you work for yourself, there's a good chance you're paying tax on money you already spent on your
        business. This guide walks through 10 tax deductions that apply to self-employed people and business
        owners: how each one works, a simple example with 2026 numbers, how to qualify, and the most common
        mistakes.
      </p>
      <p>
        A few of these work differently if your business is taxed as an S corp. When that happens, you'll see an{" "}
        <b>S corp note</b>.
      </p>

      <h2 id="how-deductions-work">How a tax deduction works</h2>
      <p>
        A deduction doesn't cut your tax bill dollar for dollar. It lowers the income you get taxed on. So if you
        made $100,000 and you have $20,000 in deductions, you're taxed on $80,000.
      </p>
      <p>
        How much a deduction saves depends on your tax rate. At a 22% federal rate, a $1,000 deduction saves
        about $220 in federal income tax. Business expenses can also lower self-employment tax, which is 15.3% on
        most of your profit.
      </p>

      <h2 id="at-a-glance">The 10 deductions at a glance</h2>
      <div className="ps-table">
        <table>
          <thead>
            <tr>
              <th>Deduction</th>
              <th>2026 example</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>1. Home office</td><td>200 sq ft × $5 = $1,000 (simplified method, max $1,500)</td></tr>
            <tr><td>2. Car and mileage</td><td>5,000 miles × 72.5¢ = $3,625</td></tr>
            <tr><td>3. Phone, internet, software</td><td>$100/month phone, 60% business = $720/year</td></tr>
            <tr><td>4. Business meals</td><td>$80 client lunch = $40 deduction (50%)</td></tr>
            <tr><td>5. Education and training</td><td>$600 course for your current line of work</td></tr>
            <tr><td>6. Health insurance</td><td>$500/month premium = $6,000/year</td></tr>
            <tr><td>7. Hiring your kids</td><td>$8,000 in wages moved to your child's lower bracket</td></tr>
            <tr><td>8. QBI deduction</td><td>$80,000 of qualified income = up to $16,000</td></tr>
            <tr><td>9. Equipment</td><td>$3,000 laptop and camera deducted in the year bought</td></tr>
            <tr><td>10. Retirement contributions</td><td>Solo 401(k): up to $72,000 total in 2026</td></tr>
          </tbody>
        </table>
      </div>

      <h2 id="home-office">1. Home office deduction</h2>
      <p>
        If part of your home is used for your business, you may be able to deduct it. The simplified method is $5
        per square foot, up to 300 square feet. So a 200-square-foot office is a $1,000 deduction, and the most
        you can deduct this way is $1,500.
      </p>
      <h3>How to qualify</h3>
      <ul>
        <li>The space is used <b>regularly and only</b> for work. This is called the exclusive use test.</li>
        <li>
          It's the main place you run the business, even if that just means it's where you do billing, scheduling,
          and admin. A place where you meet clients can also count.
        </li>
        <li>A separate structure used only for business, like a detached studio, can qualify too.</li>
      </ul>
      <h3>Limits</h3>
      <ul>
        <li>The simplified method tops out at $1,500 (300 square feet).</li>
        <li>
          The regular method, which uses a share of your actual home costs, can't be more than your business
          profit. The extra carries forward to future years.
        </li>
        <li>W-2 employees working from home for an employer can't take this deduction.</li>
      </ul>
      <p>
        <b>S corp note:</b> owners generally can't use Form 8829. The usual route is for the business to reimburse
        the owner through an accountable plan.
      </p>
      <div className="ps-warn">
        <p>
          <b>Common mistake:</b> a desk in the guest room or the kitchen table usually doesn't count. The space has
          to be used only for work.
        </p>
      </div>

      <h2 id="mileage">2. Car and mileage deduction</h2>
      <p>
        Business driving can be deducted using the IRS standard mileage rate or your actual costs. For 2026, the
        rate is 72.5 cents a mile for the first half of the year and 76 cents a mile from July 1. So 5,000
        business miles at 72.5 cents is a $3,625 deduction. The other option is deducting actual costs, like gas,
        repairs, insurance, and depreciation.
      </p>
      <h3>What counts</h3>
      <ul>
        <li>Driving to clients, between work locations, to pick up supplies, or to temporary job sites.</li>
        <li>
          When your home office is your main place of business, trips from home to other work locations can count.
        </li>
        <li>Parking and tolls on business trips are deductible on top of the mileage rate.</li>
      </ul>
      <h3>What doesn't</h3>
      <ul>
        <li>Commuting to a regular office or workplace never counts.</li>
        <li>
          To use the mileage rate on a car you own, it has to be chosen in the car's first year of business use. A
          leased car using the mileage rate has to stay on it for the whole lease.
        </li>
      </ul>
      <p>
        <b>S corp note:</b> a personal car is usually reimbursed by the business through an accountable plan, or the
        business owns the car.
      </p>
      <div className="ps-warn">
        <p>
          <b>Common mistake:</b> no mileage log. The IRS expects a record made at the time with the date, the miles,
          and why you drove. Plenty of apps track this for you. Rebuilding a year of trips from memory at tax time is
          weak proof.
        </p>
      </div>

      <h2 id="phone-software">3. Phone, internet, and software</h2>
      <p>
        If you use your phone and internet for both business and personal reasons, you can deduct the business
        share. Say your phone bill is $100 a month and 60% of your use is for work. That's about $720 a year.
        Software and tools you only use for work, like design apps or scheduling tools, are generally fully
        deductible.
      </p>
      <ul>
        <li>The expense has to be ordinary and necessary for your type of business: common and helpful, not lavish.</li>
        <li>An easy way to set your business-use percentage is to track one normal month and use that.</li>
        <li>Keep the bill or receipt, and pay from a business account when you can.</li>
      </ul>
      <p>
        <b>S corp note:</b> personal phone and internet are usually reimbursed through an accountable plan. Software
        the business pays for is deducted by the business.
      </p>
      <div className="ps-warn">
        <p>
          <b>Common mistake:</b> deducting 100% of a phone you also use to text friends. And personal streaming
          subscriptions don't count just because you watched one thing for research.
        </p>
      </div>

      <h2 id="meals">4. Business meals</h2>
      <p>
        Meals with clients, customers, or other business contacts are usually 50% deductible. So an $80 lunch with
        a client is a $40 deduction. Meals while traveling overnight for business are also 50% deductible.
      </p>
      <h3>How to make it count</h3>
      <p>
        Write down five things: how much, when, where, who was there, and what business you talked about. A note
        on the back of the receipt works.
      </p>
      <h3>What changed</h3>
      <ul>
        <li>Entertainment, like concert tickets, golf, or a game, isn't deductible.</li>
        <li>
          Starting in 2026, snacks and meals your business provides at the office for employees' convenience are
          generally not deductible either.
        </li>
        <li>A company-wide event, like a holiday party for your whole team, can still be fully deductible.</li>
      </ul>
      <div className="ps-warn">
        <p>
          <b>Common mistake:</b> deducting entertainment, or solo meals while working near home.
        </p>
      </div>

      <h2 id="education">5. Education and training</h2>
      <p>
        Courses, books, coaching, and conferences can be deductible when they keep up or improve the skills you
        use in your business right now. A $600 marketing course for a marketing business can count. Keep the
        receipt and a quick note on how it connects to your work.
      </p>
      <ul>
        <li>Training required by law or a license for your current work counts too.</li>
        <li>
          Courses taken before the business started may count as startup costs instead, with up to $5,000
          deductible in the first year (this phases out at higher startup costs).
        </li>
        <li>Travel to a conference counts only when the trip is mainly for business.</li>
      </ul>
      <div className="ps-warn">
        <p>
          <b>Common mistake:</b> deducting training for a brand-new career. A photographer taking a coding bootcamp
          is generally a personal expense, not a business one.
        </p>
      </div>

      <h2 id="health-insurance">6. Self-employed health insurance deduction</h2>
      <p>
        If you're self-employed, you can generally deduct what you pay for health, dental, and long-term care
        insurance for yourself, your spouse, and your kids (including children under 27). So a $500 monthly
        premium is a $6,000 deduction for the year.
      </p>
      <ul>
        <li>Your business needs a net profit for the year, and the deduction can't be more than that profit.</li>
        <li>
          It isn't allowed for any month you or your spouse could have joined an employer's subsidized health plan,
          even if you didn't sign up.
        </li>
        <li>It lowers income tax, but not self-employment tax.</li>
        <li>
          Marketplace premium tax credits change the math, so a tax professional can help sort out how the two
          interact.
        </li>
      </ul>
      <p>
        <b>S corp note:</b> for owners with more than 2% of the company, the S corp pays or reimburses the premiums
        and adds them to the owner's W-2 wages. The owner then takes the deduction personally.
      </p>
      <div className="ps-warn">
        <p>
          <b>Common mistake:</b> claiming months when an employer plan was available through a spouse's job.
        </p>
      </div>

      <h2 id="hiring-kids">7. Hiring your kids</h2>
      <p>
        This is the one almost nobody uses. If your kids do real work for your business, like filing, cleaning, or
        helping with social media, you can pay them a wage, and your business deducts it. Your child might owe
        little or no income tax on it because of their own standard deduction.
      </p>
      <p>
        Say you pay your teenager $8,000 for real work. Your business deducts $8,000, and that money moves from your
        tax bracket to theirs. If you're a sole proprietor and your child is under 18, those wages are generally
        also exempt from Social Security and Medicare taxes.
      </p>
      <h3>How to qualify</h3>
      <ul>
        <li>The work is real and the business needs it.</li>
        <li>The pay is reasonable, about what you'd pay someone else for the same job.</li>
        <li>Keep timesheets and a written job description, and run it through payroll with a W-2.</li>
      </ul>
      <p>
        <b>S corp note:</b> the wages are still deductible, but the payroll tax exemption doesn't apply. The
        exemption is only for children under 18 working for a sole proprietorship or a partnership owned only by
        their parents.
      </p>
      <div className="ps-warn">
        <p>
          <b>Common mistake:</b> no records. Without timesheets and real pay, it looks like a gift. And no, a
          four-year-old is not your social media manager.
        </p>
      </div>

      <h2 id="qbi">8. Qualified business income (QBI) deduction</h2>
      <p>
        Many business owners can deduct up to 20% of their qualified business income, and they don't have to spend
        anything to get it. When Congress cut taxes for big corporations in 2017, most small businesses didn't
        benefit, because they don't pay corporate tax. This deduction was added to even things out, and in 2025 it
        was made permanent. So $80,000 of qualified business income could mean up to a $16,000 deduction.
      </p>
      <ul>
        <li>It works for sole proprietors, partnerships, LLCs, and S corps, but not C corps.</li>
        <li>
          Above certain income limits, specified service businesses (like consulting, law, health, and finance) see
          it shrink or disappear, and wage and property limits can also reduce it.
        </li>
        <li>An S corp owner's salary isn't qualified business income. Only the profit is.</li>
        <li>The total deduction is capped at 20% of taxable income, minus capital gains.</li>
      </ul>
      <div className="ps-warn">
        <p>
          <b>Common mistake:</b> assuming it always applies at higher incomes.
        </p>
      </div>

      <h2 id="equipment">9. Equipment (Section 179 and bonus depreciation)</h2>
      <p>
        Computers, cameras, furniture, and some vehicles can often be fully deducted in the year you buy them,
        instead of spread out over several years. For 2026, the Section 179 limit is $2,560,000, and 100% bonus
        depreciation is back for property acquired after January 19, 2025.
      </p>
      <ul>
        <li>The equipment has to be set up and in use by the end of the year, not just ordered.</li>
        <li>It has to be used more than half the time for business.</li>
        <li>Heavy SUVs have a lower Section 179 cap of $32,000 in 2026.</li>
        <li>
          If business use later drops to 50% or less, part of the deduction can be taken back. Some states don't
          follow the federal rules.
        </li>
      </ul>
      <div className="ps-warn">
        <p>
          <b>Common mistake:</b> buying something just for the write-off. If your combined tax rate is about 30% and
          you spend $3,000 on a camera, you save about $900 in taxes. You're still out $2,100. A deduction is a
          discount, not free money.
        </p>
      </div>

      <h2 id="retirement">10. Retirement contributions</h2>
      <p>
        This is usually the biggest one. With a Solo 401(k), you can put in up to $24,500 as the employee, plus an
        employer contribution, up to $72,000 total in 2026 if you're under 50. People 50 and older can add $8,000
        more, and people ages 60 to 63 can add $11,250. Every pre-tax dollar lowers your taxable income.
      </p>
      <ul>
        <li>
          A Solo 401(k) needs self-employment income and no full-time employees other than you and your spouse.
        </li>
        <li>
          If you have employees, a SEP IRA is another option, but it has to cover eligible employees at the same
          percentage you give yourself.
        </li>
        <li>The $24,500 employee limit is shared with any 401(k) at a day job.</li>
        <li>
          <b>S corp note:</b> the employer part is based on the owner's W-2 salary, not distributions.
        </li>
      </ul>
      <div className="ps-warn">
        <p>
          <b>Common mistake:</b> waiting until tax season. Some deadlines hit on December 31, so waiting can mean
          missing the chance for last year.
        </p>
      </div>
      <p>
        For the full breakdown, read <Link href="/self-employed/solo-401k">What Is a Solo 401(k)?</Link>
      </p>

      <h2 id="recap">Recap</h2>
      <p>
        Those are 10 deductions: your home office, mileage, phone and software, meals, education, health
        insurance, hiring your kids, QBI, equipment, and retirement. Deductions lower your tax bill, but they don't
        make it go away. A lot of self-employed people still get caught off guard in April because the money for
        taxes was never set aside.
      </p>
    </BlogArticle>
  );
}
