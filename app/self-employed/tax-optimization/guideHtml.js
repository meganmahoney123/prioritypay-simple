// Body content for the Tax Optimization guide, ported to the Bloom theme to
// match self-employed-tax-guide (the "Taxes for Self Employed" basics guide).
// Source: se-optimization-guide.html (the standalone build), restructured:
// - added the <nav class="crumbs"> breadcrumb (matches the basics guide's
//   pattern; the standalone file never had one since it had no site nav)
// - added class="about" to the closing <footer> so guideStyles.js's
//   ".se-guide footer.about" rule (ported from the Bloom design, same
//   selector name self-employed-tax-guide's own footer uses) applies
// - restored the general "this is educational, not individualized advice"
//   disclaimer paragraph in the footer, matching what self-employed-tax-guide
//   keeps live in its own footer -- only the earlier "Draft. Not for
//   publication..." line (review status, not meant for a live page) was
//   dropped
// Everything else -- rows, sections, TOC, filter markup, inline SVG
// diagrams, calculator markup -- is unchanged; class names and CSS custom
// properties (--ink/--gold/--muted/--rule/--surface/...) already matched the
// Bloom theme's naming, so no other restructuring was needed.
export default `<div class="wrap">

<nav class="crumbs" aria-label="Breadcrumb">
  <a href="/">Home</a><span aria-hidden="true">/</span><span>Blog</span><span aria-hidden="true">/</span><a href="/self-employed">Self Employed</a><span aria-hidden="true">/</span><strong>Tax Optimization For The Self Employed: Complete Guide</strong>
</nav>

<header class="mast">
  <div class="eyebrow">PriorityPay &middot; Self Employed</div>
  <h1>Tax Optimization For The Self Employed: Complete Guide</h1>
  <p class="standfirst">Learn about how to leverage retirement accounts, entity structure, timing, family payroll and other levers that allow you to save money on taxes as your profit grows. This is the layer above the basics.</p>
  <div class="stamp">
    <span>Tax year <b>2026</b></span>
    <span>Updated <b>August 2026</b></span>
    <span>Figures from <b>IRS sources</b></span>
    <span><b>Education, not tax advice</b></span>
  </div>
</header>

<div class="filter">
  <div class="filter-head">
    <div class="filter-t">Five questions to sort this page</div>
    <div class="filter-s">This guide is very long, and most of it will not apply to you. Answering these questions will shorten it to the sections that fit your situation.</div>
  </div>

  <div class="q">
    <label class="q-l" for="q-profit">Roughly what does your business make in profit each year?</label>
    <div class="sel">
      <select id="q-profit" data-q="profit">
        <option value="">Choose one</option>
        <option value="u30">Under $30,000</option>
        <option value="p30">$30,000 to $75,000</option>
        <option value="p75">$75,000 to $150,000</option>
        <option value="p150">$150,000 to $400,000</option>
        <option value="p400">Over $400,000</option>
      </select>
    </div>
  </div>

  <div class="q">
    <label class="q-l" for="q-setup">What have you already set up?</label>
    <div class="sel">
      <select id="q-setup" data-q="setup">
        <option value="">Choose one</option>
        <option value="nothing">Nothing yet</option>
        <option value="bank">A separate business bank account</option>
        <option value="retire">A retirement account for the business</option>
        <option value="scorp">An S-corp election</option>
      </select>
    </div>
  </div>

  <div class="q">
    <label class="q-l" for="q-otherplan">Do you have a retirement account anywhere else?</label>
    <div class="sel">
      <select id="q-otherplan" data-q="otherplan">
        <option value="">Choose one</option>
        <option value="none">No</option>
        <option value="ownw2">Yes, through my own W-2 job</option>
        <option value="spousew2">Yes, through a spouse&rsquo;s job</option>
      </select>
    </div>
  </div>

  <div class="q">
    <label class="q-l" for="q-health">How do you get health insurance?</label>
    <div class="sel">
      <select id="q-health" data-q="health">
        <option value="">Choose one</option>
        <option value="marketplace">I buy it through the marketplace</option>
        <option value="hdhp">I have a high-deductible plan</option>
        <option value="spouse">Through a spouse&rsquo;s job</option>
        <option value="none">I don&rsquo;t have coverage right now</option>
      </select>
    </div>
  </div>

  <fieldset class="checks">
    <legend class="q-l">Check all that apply</legend>
    <div class="checkgrid">
      <label class="chk"><input type="checkbox" data-v="spouse"><span>I have a spouse who could work in the business</span></label>
      <label class="chk"><input type="checkbox" data-v="kids"><span>I have kids</span></label>
      <label class="chk"><input type="checkbox" data-v="invests"><span>I invest outside retirement accounts</span></label>
      <label class="chk"><input type="checkbox" data-v="property"><span>I own property</span></label>
      <label class="chk"><input type="checkbox" data-v="states"><span>I work with clients in other states</span></label>
      <label class="chk"><input type="checkbox" data-v="none"><span>None of these</span></label>
    </div>
  </fieldset>

  <div class="filter-foot">
    <span id="filter-status">Showing all 47 topics.</span>
    <span class="foot-actions">
      <button class="reset" id="showall" hidden>Show the rest anyway</button>
      <button class="reset" id="reset">Clear answers</button>
    </span>
  </div>
</div>


<div class="toc" id="toc">
<div class="toc-head"><span class="toc-t">What&rsquo;s in this guide</span><span class="toc-c" id="toc-count">9 sections &middot; 47 topics</span></div>
<div class="toc-grid">
<div class="toc-sec" data-sec="foundation">
<a class="toc-s-h" href="#foundation"><span class="toc-n">01</span>Before You Optimize Anything</a>
<ul>
<li data-ref="not-deductions"><a href="#not-deductions">Retirement Contributions Are Arguably Better Than Deductions</a></li>
<li data-ref="separate-banking"><a href="#separate-banking">Creating a Separate Business Account</a></li>
<li data-ref="bookkeeping"><a href="#bookkeeping">Accurate Bookkeeping Is Essential For Tax Optimization</a></li>
<li data-ref="order"><a href="#order">The Order of Actions Matters</a></li>
</ul></div>
<div class="toc-sec" data-sec="retirement">
<a class="toc-s-h" href="#retirement"><span class="toc-n">02</span>Retirement Accounts: The Biggest Lever</a>
<ul>
<li data-ref="why-retirement"><a href="#why-retirement">Why This Section Is Most Valuable</a></li>
<li data-ref="business-vs-personal"><a href="#business-vs-personal">Business Side vs. Personal Accounts</a></li>
<li data-ref="business-accounts-overview"><a href="#business-accounts-overview">Overview of Business Side Accounts</a></li>
<li data-ref="solo-401k"><a href="#solo-401k">The Solo 401k</a></li>
<li data-ref="mega-backdoor"><a href="#mega-backdoor">The Mega Backdoor Roth Through A Solo 401k</a></li>
<li data-ref="sep-ira"><a href="#sep-ira">The SEP IRA, And When It Still Makes Sense</a></li>
<li data-ref="simple-ira"><a href="#simple-ira">The SIMPLE IRA</a></li>
<li data-ref="personal-accounts-overview"><a href="#personal-accounts-overview">Overview of Personal Accounts</a></li>
<li data-ref="trad-vs-roth"><a href="#trad-vs-roth">Traditional Or Roth</a></li>
<li data-ref="backdoor"><a href="#backdoor">The Backdoor Roth, And The Mistake That Ruins It</a></li>
<li data-ref="spousal-ira"><a href="#spousal-ira">A Spousal IRA</a></li>
</ul></div>
<div class="toc-sec" data-sec="health">
<a class="toc-s-h" href="#health"><span class="toc-n">03</span>Health Accounts</a>
<ul>
<li data-ref="hsa-what"><a href="#hsa-what">What An HSA Is And Who Qualifies</a></li>
<li data-ref="hsa-triple"><a href="#hsa-triple">The Benefit of an HSA: Three Separate Tax Breaks</a></li>
<li data-ref="hsa-receipts"><a href="#hsa-receipts">Paying Out Of Pocket And Reimbursing Yourself Later</a></li>
<li data-ref="aca-income"><a href="#aca-income">How Your Income Affects What Health Insurance Costs</a></li>
</ul></div>
<div class="toc-sec" data-sec="which-first">
<a class="toc-s-h" href="#which-first"><span class="toc-n">04</span>How These Accounts Compare In Tax Strength</a>
<ul>
<li data-ref="which-first"><a href="#which-first">How These Accounts Compare In Tax Strength</a></li>
</ul></div>
<div class="toc-sec" data-sec="timing">
<a class="toc-s-h" href="#timing"><span class="toc-n">05</span>Timing: Using Uneven Income To Your Advantage</a>
<ul>
<li data-ref="lumpy"><a href="#lumpy">Why Uneven Income Is An Opportunity</a></li>
<li data-ref="expense-timing"><a href="#expense-timing">Moving Expenses Between Years</a></li>
<li data-ref="roth-conversion"><a href="#roth-conversion">Roth Conversions In A Low Year</a></li>
<li data-ref="bunching"><a href="#bunching">Bunching Deductions Into Alternating Years</a></li>
</ul></div>
<div class="toc-sec" data-sec="structure">
<a class="toc-s-h" href="#structure"><span class="toc-n">06</span>When Changing Your Structure Starts To Pay</a>
<ul>
<li data-ref="scorp-calc"><a href="#scorp-calc">Calculator to Run Your Numbers</a></li>
<li data-ref="scorp-what"><a href="#scorp-what">What An S-Corp Election Actually Does</a></li>
<li data-ref="reasonable-comp"><a href="#reasonable-comp">Reasonable Compensation</a></li>
<li data-ref="scorp-cost"><a href="#scorp-cost">What An S-Corp Costs You</a></li>
<li data-ref="qbi-salary"><a href="#qbi-salary">Setting Salary To Protect The 20% Deduction</a></li>
<li data-ref="scorp-limits"><a href="#scorp-limits">What An S-Corp Does Not Fix</a></li>
</ul></div>
<div class="toc-sec" data-sec="family">
<a class="toc-s-h" href="#family"><span class="toc-n">07</span>Putting Family On The Payroll</a>
<ul>
<li data-ref="hire-spouse"><a href="#hire-spouse">Hiring Your Spouse</a></li>
<li data-ref="hire-kids"><a href="#hire-kids">Hiring Your Children</a></li>
<li data-ref="kids-roth"><a href="#kids-roth">A Retirement Account For Your Kids</a></li>
<li data-ref="augusta"><a href="#augusta">Renting Your Home To Your Business, And Why It Does Not Work For Most People</a></li>
<li data-ref="529"><a href="#529">529 Plans For Education</a></li>
</ul></div>
<div class="toc-sec" data-sec="investing">
<a class="toc-s-h" href="#investing"><span class="toc-n">08</span>Investments And Giving</a>
<ul>
<li data-ref="gains"><a href="#gains">Long-Term And Short-Term Gains Are Taxed Differently</a></li>
<li data-ref="tlh"><a href="#tlh">Tax-Loss Harvesting</a></li>
<li data-ref="wash-sale"><a href="#wash-sale">The Wash Sale Rule</a></li>
<li data-ref="idle-cash"><a href="#idle-cash">Where Idle Cash Sits</a></li>
<li data-ref="charitable"><a href="#charitable">Donating Appreciated Assets Instead Of Cash</a></li>
<li data-ref="card-points"><a href="#card-points">Business Credit Card Points</a></li>
</ul></div>
<div class="toc-sec" data-sec="bigger">
<a class="toc-s-h" href="#bigger"><span class="toc-n">09</span>Bigger Levers, And Knowing When To Stop</a>
<ul>
<li data-ref="ptet"><a href="#ptet">Paying State Tax Through Your Business</a></li>
<li data-ref="cash-balance"><a href="#cash-balance">Cash Balance Plans</a></li>
<li data-ref="depreciation"><a href="#depreciation">Property Depreciation</a></li>
<li data-ref="multi-state"><a href="#multi-state">Where You Owe State Tax</a></li>
<li data-ref="choosing-pro"><a href="#choosing-pro">How To Choose A Tax Professional</a></li>
<li data-ref="outgrown"><a href="#outgrown">Signs You Have Outgrown This Guide</a></li>
</ul></div>
</div></div>

<nav class="mini" aria-label="Sections"><ol>
<li data-sec="foundation"><a href="#foundation">Start here</a></li>
<li data-sec="retirement"><a href="#retirement">Retirement accounts</a></li>
<li data-sec="health"><a href="#health">Health accounts</a></li>
<li data-sec="which-first"><a href="#which-first">Tax Strength</a></li>
<li data-sec="timing"><a href="#timing">Timing</a></li>
<li data-sec="structure"><a href="#structure">Business structure</a></li>
<li data-sec="family"><a href="#family">Family</a></li>
<li data-sec="investing"><a href="#investing">Investments &amp; giving</a></li>
<li data-sec="bigger"><a href="#bigger">Bigger levers</a></li>
</ol></nav>

<section id="foundation">
<div class="sec-head"><div class="sec-num">01</div><h2>Before You Optimize Anything</h2></div>
<p class="sec-intro">Three things have to be true before any strategy on this page is worth attempting. None of them save you money on their own.</p>
<div class="rows">
<details class="row" id="not-deductions" data-t="core">
<summary>
<div class="row-h">Retirement Contributions Are Arguably Better Than Deductions</div>
<div class="row-s">Most people believe tax optimization is about finding more items to write off. However, putting that money in a retirement account is often more advantageous.</div>
</summary>
<div class="row-body"><p>This is because a deduction only allows you to receive a fraction of what you paid another vendor. Whereas putting it in a retirement account gets you a tax break and you can still access the money later.</p>
<p>Here&rsquo;s an example.</p>
<p>A business expense reduces your taxable profit, so a $1,000 deduction at a 22% rate saves you $220. That is real, but the money is gone. You spent $1,000 to keep $220.</p>
<p>A $1,000 retirement contribution reduces your taxable profit by the same $1,000 and saves the same $220. The difference is where the $1,000 ends up. It is in an account with your name on it.</p>
<div class="cmpwrap"><table class="cmp">
<thead><tr><th></th><th>$1,000 business expense</th><th>$1,000 into a retirement account</th></tr></thead>
<tbody>
<tr><td>Cash out of your pocket</td><td>&minus;$1,000</td><td>&minus;$1,000</td></tr>
<tr><td>Tax saved at a 22% rate</td><td>+$220</td><td>+$220</td></tr>
<tr><td>What you own afterwards</td><td>$0</td><td>+$1,000</td></tr>
<tr class="tot"><td>Net position</td><td>&minus;$780</td><td>+$220</td></tr>
</tbody>
</table></div>
<p>This is why the section on retirement accounts comes before everything else on this page. It is the only lever that reduces your tax bill without spending the money, and the $1,000 inside it also grows without owing tax each year, while the same $1,000 sitting in a taxable brokerage account would owe tax on its dividends and any gains along the way.</p>
<p>None of which means expenses do not matter. Claiming what you are entitled to is still beneficial, and <a href="https://prioritypay.co/self-employed/">the basics guide</a> covers expense qualification.</p>
<p class="fine">Illustration only. If the numbers entered were true, this is what the comparison would look like.</p></div>
</details>
<details class="row" id="separate-banking" data-t="core">
<summary>
<div class="row-h">Creating a Separate Business Account</div>
<div class="row-s">Every strategy on this page assumes you can tell business money from personal money. A business account used for nothing else is what makes that possible.</div>
</summary>
<div class="row-body"><p>It sounds insignificant, but if you mix personal and business money, it can cause the rest of the strategies in this guide to fail.</p>
<h4>What a separate business account makes possible</h4>
<ul>
<li><b>Knowing your net profit.</b> Every calculation on this page starts from net profit (Total Revenue &minus; Total Expenses). If business and personal spending run through one account, that figure is a guess.</li>
<li><b>Claiming deductions.</b> People routinely miss deductions because the expense is buried in a personal statement they never review.</li>
<li><b>Proving deduction legitimacy.</b> Mixed accounts are a common reason a deduction is hard to defend.</li>
<li><b>Keeping an LLC&rsquo;s protection intact.</b> If you have an LLC, running personal money through the business account is one of the ways a court can set that liability protection aside.</li>
</ul>
<p>A business checking account is sufficient. You do not need an entity to open one, though most banks will ask for either an EIN or your Social Security number.</p>
<p>A second account for tax money is a separate idea, covered in <a href="https://prioritypay.co/self-employed/">the basics guide</a> under setting money aside.</p></div>
</details>
<details class="row" id="bookkeeping" data-t="core">
<summary>
<div class="row-h">Accurate Bookkeeping Is Essential For Tax Optimization</div>
<div class="row-s">You cannot decide whether an S-corp is worth it, how much to put into a retirement account, or what to set aside, without knowing your profit to within a few thousand dollars.</div>
</summary>
<div class="row-body"><p>All tax optimization strategies rely on one number: net profit. Revenue or money that landed in your account is not a sufficient number for making tax optimization decisions.</p>
<h4>What the strategies need from your books</h4>
<div class="cmpwrap"><table class="cmp">
<tbody>
<tr><td>Retirement contribution limits</td><td>Net profit, and W-2 wages if you have an entity</td></tr>
<tr><td>Whether an S-corp pays for itself</td><td>Net profit, and your state&rsquo;s rules</td></tr>
<tr><td>The 20% business deduction</td><td>Profit, plus taxable income after other deductions</td></tr>
<tr><td>What to set aside per payment</td><td>Profit, plus other household income</td></tr>
</tbody>
</table></div>
<p>Bookkeeping at this level does not mean you need to have an accountant on retainer. However, you must have transactions categorized and be able to provide a net profit number.</p>
<p>The threshold worth noticing: once you are deciding between strategies rather than just filing correctly, guessing at profit is often more costly than simply hiring a bookkeeper.</p></div>
</details>
<details class="row" id="order" data-t="core">
<summary>
<div class="row-h">The Order of Actions Matters</div>
<div class="row-s">Changing the structure of your business and other advanced tax strategies are often the last steps. To leverage these strategies, you must have a solid foundation first and do the right actions in the right order.</div>
</summary>
<div class="row-body"><p>Almost everything on this page assumes the step before it is already done.</p>
<div class="cmpwrap"><table class="cmp ann">
<tbody>
<tr><td>1. Separate accounts and books</td><td>Everything else needs a reliable profit figure</td><td></td></tr>
<tr><td>2. Ordinary deductions</td><td>What the business already qualifies for, covered in <a href="https://prioritypay.co/self-employed/">the basics guide</a></td><td></td></tr>
<tr><td>3. A retirement account</td><td>The largest lever, and available at any profit level</td><td></td></tr>
<tr><td>4. Deliberate timing</td><td>Needs books good enough to see the year coming</td><td></td></tr>
<tr><td>5. Business structure</td><td>Only worth analyzing once profit is consistent</td><td></td></tr>
<tr><td>6. Family, investments, property</td><td>Each adds its own paperwork</td><td></td></tr>
</tbody>
</table></div>
<p>People commonly try step 5 first, because entity choice is what is frequently discussed publicly. Entity choice is genuinely valuable, and it is also the step most likely to be wrong if the four previous steps have not been executed.</p></div>
</details>
</div></section>
<section id="retirement">
<div class="sec-head"><div class="sec-num">02</div><h2>Retirement Accounts: The Biggest Lever</h2></div>
<p class="sec-intro">For most self-employed people this section is worth more than everything else on the page combined. It is also the only tax optimization strategy available at every profit level.</p>
<div class="rows">
<details class="row" id="why-retirement" data-t="core">
<summary>
<div class="row-h">Why This Section Is Most Valuable</div>
<div class="row-s">Every dollar that goes into a self-employed retirement account is subtracted from taxable profit. Self-employed retirement accounts are also much more advantageous than traditional employee retirement accounts thanks to high contribution limits.</div>
</summary>
<div class="row-body"><p>An employee can put $24,500 into a 401k in 2026. A self-employed person with a Solo 401k can put in up to <b>$72,000</b>, because they contribute as both the employee and the employer.</p>
<div class="figs">
<div><span>Employee contribution limit</span><span>$24,500</span></div>
<div><span>Employee and business contributions combined</span><span>$72,000</span></div>
<div><span>Catch-up on top of that, age 50 to 59 or 64 and over</span><span>$8,000</span></div>
<div><span>Catch-up on top of that, age 60 to 63</span><span>$11,250</span></div>
</div>
<p>Eligible individuals can also add catch-up contributions on top of the $72,000, so the ceiling for someone aged 50 or older is $80,000, and $83,250 between 60 and 63.</p>
<p class="fine">New for 2026: anyone who received more than $145,000 in W-2 wages in 2025 must make catch-up contributions as Roth rather than pre-tax. The rule keys off W-2 wages, so a sole proprietor or partner with no W-2 wages is not covered by it. An S-corp owner paid above that figure is.</p>
<p>At higher profit levels contributing to a retirement account is often the only lever big enough to move your effective rate by several points in a single year.</p>
<p>Here&rsquo;s an example of someone who makes $300,000:</p>
<div class="cmpwrap"><table class="cmp">
<thead><tr><th>$300,000 of profit, single filer</th><th>No retirement contribution</th><th>$72,000 into a Solo 401k</th></tr></thead>
<tbody>
<tr><td>Total tax</td><td>$91,431</td><td>$61,228</td></tr>
<tr class="tot"><td>Effective rate</td><td>30.5%</td><td>20.4%</td></tr>
</tbody>
</table></div>
<details class="subdrop"><summary>What is an effective rate?</summary>
<div class="subdrop-body">
<p>A tax bracket only taxes one slice of your income at that bracket&rsquo;s rate. It never applies to everything you made. Effective rate skips all of that and asks a simpler question: how much of your profit went to taxes?</p>
<p>Effective Rate = Total Tax Paid / Total Profit</p>
<div class="figs">
<div><span>Total tax paid</span><span>$20,000</span></div>
<div><span>Total profit</span><span>$100,000</span></div>
<div><span>Effective rate</span><span>20%</span></div>
</div>
<p>Most single tax optimization strategies, like another deduction or a different filing date, only shift that percentage by a small fraction. A large retirement contribution can shift it by several whole points in one year, which is unusual enough to matter.</p>
<div class="cmpwrap"><table class="cmp">
<thead><tr><th>$300,000 of profit, single filer</th><th>No retirement contribution</th><th>$72,000 into a Solo 401k</th></tr></thead>
<tbody>
<tr><td>Total tax</td><td>$91,431</td><td>$61,228</td></tr>
<tr class="tot"><td>Effective rate</td><td>30.5%</td><td>20.4%</td></tr>
</tbody>
</table></div>
<p>That ten-point swing comes from two things stacking together. The contribution directly lowers taxable profit, and at this income level it also moves taxable income back under the threshold where the 20% business deduction starts shrinking, restoring the full deduction on top of the direct saving.</p>
<p class="fine">Illustration using 2026 figures for a sole proprietor with no other household income.</p>
</div>
</details>
<p>Note that contributing to a retirement account does not reduce self-employment tax. Retirement contributions come off income tax only. Self-employment tax is calculated before any of this, which <a href="https://prioritypay.co/self-employed/">the basics guide</a> explains in the section on how your tax bill is calculated.</p>
<p class="fine">Contribution limits rise most years. These are 2026 figures.</p></div>
</details>
<details class="row" id="business-vs-personal" data-t="core">
<summary>
<div class="row-h">Business Side vs. Personal Accounts</div>
<div class="row-s">A self-employed person has access to two categories of retirement accounts: business-side plans funded through the business, and personal accounts funded directly by the individual with earned income. The business-side plans can hold far more money and are the focus of most of this section.</div>
</summary>
<div class="row-body"><p>A self-employed person has access to two categories of retirement accounts:</p>
<ul>
<li><b>Business-side plans.</b> These are funded through the business itself.</li>
<li><b>Personal accounts.</b> These are funded directly by you, the same way anyone with earned income can fund one, whether or not they also run a business.</li>
</ul>
<div class="cmpwrap"><table class="cmp">
<thead><tr><th>Business-side plans</th><th>Personal accounts</th></tr></thead>
<tbody>
<tr><td><ul><li>Solo 401k</li><li>SEP IRA</li><li>SIMPLE IRA</li></ul></td><td><ul><li>Traditional IRA</li><li>Roth IRA</li><li>Spousal IRA</li></ul></td></tr>
</tbody>
</table></div></div>
</details>
<details class="row" id="business-accounts-overview" data-t="core">
<summary>
<div class="row-h">Overview of Business Side Accounts</div>
<div class="row-s">This section compares the Solo 401k, SEP IRA, and SIMPLE IRA side by side: what each is for, how much each can hold, and how the mega backdoor Roth can push a Solo 401k&rsquo;s total even higher.</div>
</summary>
<div class="row-body"><h4>The three business-side plans, and what each is for</h4>
<div class="cmpwrap"><table class="cmp">
<thead><tr><th></th><th>What it is for</th><th>Holds at $150,000 of profit</th><th>The catch</th></tr></thead>
<tbody>
<tr><td><b>Solo 401k</b></td><td><b>The default for most self employed people, as it often allows the highest contribution amount.</b> You contribute twice, once as the employee and once as the business.</td><td>$52,381</td><td>Has to exist by December 31</td></tr>
<tr><td><b>SEP IRA</b></td><td>A fallback for two situations. You missed the December deadline, or you have employees to cover. Many people also hold one from earlier years alongside a Solo 401k</td><td>$27,881</td><td>Blocks a clean backdoor Roth later</td></tr>
<tr class="tot"><td><b>SIMPLE IRA</b></td><td>For a business with a handful of employees that wants something cheaper to run than a full 401k</td><td>$18,100 plus the employer part</td><td>Rarely the right pick for one person with zero employees</td></tr>
</tbody>
</table></div>

<h4>Maximum Contribution, Side by Side</h4>
<p>The employee and business contributions work differently, and that difference is what separates these three plans more than anything else.</p>
<div class="cmpwrap"><table class="cmp">
<thead><tr><th></th><th>Solo 401k</th><th>SEP IRA</th><th>SIMPLE IRA</th></tr></thead>
<tbody>
<tr><td>You contribute as the employee</td><td>Up to $24,500</td><td>Not available</td><td>Up to $18,100</td></tr>
<tr><td>You contribute as the business</td><td>Up to 20% of net earnings</td><td>Up to 20% of net earnings</td><td>3% match, or 2% for everyone</td></tr>
<tr class="tot"><td>Combined ceiling</td><td>$72,000</td><td>$72,000</td><td>Not part of the $72,000 ceiling</td></tr>
</tbody>
</table></div>
<p>In the table above, you&rsquo;ll see that technically, a SEP IRA and a Solo 401k can reach the same ceiling of $72,000.</p>
<p>However, the business would have to make about $376,000 in net profit for a SEP IRA alone to reach that ceiling (net earnings come to about $360,000. 360,000 x 20% = $72,000). A Solo 401k can reach that same $72,000 ceiling at a much lower net profit, about $252,000, thanks to the added employee contribution.</p>
<p>Here is what that looks like at $100,000 of profit:</p>
<div class="barcmp">
<div class="barcmp-row"><div class="barcmp-label">Solo 401k</div><div class="barcmp-track"><div class="barcmp-seg employee" style="width:34.03%">$24,500</div><div class="barcmp-seg business" style="width:25.82%">$18,587</div><div class="barcmp-seg room" style="width:40.15%">room to $72,000</div></div></div>
<div class="barcmp-row"><div class="barcmp-label">SEP IRA</div><div class="barcmp-track"><div class="barcmp-seg business" style="width:25.82%">$18,587</div><div class="barcmp-seg room" style="width:74.18%">room to $72,000, but nothing to put there</div></div></div>
<div class="barcmp-scale"><span>$0</span><span>$72,000</span></div>
<div class="barcmp-legend"><span><i class="barcmp-sw employee"></i>Max Employee Contribution</span><span><i class="barcmp-sw business"></i>Max Business contribution (20% of net earnings)</span><span><i class="barcmp-sw room"></i>Unused room under the ceiling</span></div>
<p class="fine">Note: To make the full $24,500 employee contribution, you need at least $24,500 in net earnings from self-employment, which works out to about $26,400 in net profit. Below that, the Solo 401k can still be opened, just with a smaller employee contribution.</p>
</div>
<p>The employee contribution is a flat dollar amount set by the IRS each year, not a percentage of profit. A SEP IRA has no employee contribution option.</p>
<p>Additionally, the Solo 401k opens up the option to leverage the mega backdoor Roth (which we&rsquo;ll discuss later), and it allows you to reach the $72,000 ceiling with an even lower net profit (approximately $77,500).</p>
<h4>Can I Have a SEP IRA and a Solo 401k</h4>
<p>Technically, yes, you can have both a SEP IRA and a Solo 401k. However, there is no benefit to having both. This is because the total amount a business can contribute to retirement is capped at 20% of net earnings, up to $72,000. As you can already max that out in a Solo 401k, you wouldn&rsquo;t be able to add another dollar to the SEP IRA.</p>
<div class="aside-box"><b>A SIMPLE IRA works differently.</b> It is not part of this $72,000 ceiling at all. It runs on its own structure: up to $18,100 as the employee, plus a 3% match, or a flat 2% for everyone, regardless of net earnings.</div>

<h4>What Can You Do After Maxing Out a Solo 401k?</h4>
<p>Unless your business is doing at least $252,000 in net profit, the $24,500 employee contribution and the business contribution will add up to <em>less</em> than the $72,000 ceiling.</p>
<p>As you can see below, the business is doing $100,000 in net profit, and there&rsquo;s still $28,913 left before hitting the ceiling of $72,000. To contribute more towards that $72,000, there&rsquo;s a third option: the mega backdoor Roth.</p>
<div class="barcmp">
<div class="barcmp-title">At $100,000 in net profit</div>
<div class="barcmp-row"><div class="barcmp-label">Solo 401k</div><div class="barcmp-track"><div class="barcmp-seg employee" style="width:34.03%">$24,500</div><div class="barcmp-seg business" style="width:25.82%">$18,587</div><div class="barcmp-seg room" style="width:40.15%">room to $72,000</div></div></div>
<div class="barcmp-scale"><span>$0</span><span>$72,000</span></div>
<div class="barcmp-legend"><span><i class="barcmp-sw employee"></i>Employee Contribution</span><span><i class="barcmp-sw business"></i>Business Contribution (20% of net earnings)</span><span><i class="barcmp-sw room"></i>Unused Room Under the Ceiling</span></div>
</div>
<h4>The Mega Backdoor Roth</h4>
<p>If you still have additional room under that $72,000 ceiling, you can make an after-tax contribution instead. That after-tax money goes into the same Solo 401k account, tracked separately from your employee and business contributions.</p>
<p>That is the mega backdoor Roth: the plan lets you contribute after-tax dollars into that same account, then convert that after-tax portion to Roth, usually right away so there is little or no growth to tax at conversion.</p>
<div class="barcmp">
<div class="barcmp-title">At $100,000 in net profit</div>
<div class="barcmp-row"><div class="barcmp-label">Solo 401k</div><div class="barcmp-track"><div class="barcmp-seg employee" style="width:34.03%">$24,500</div><div class="barcmp-seg business" style="width:25.82%">$18,587</div><div class="barcmp-seg aftertax" style="width:40.15%">$28,913</div></div></div>
<div class="barcmp-scale"><span>$0</span><span>$72,000</span></div>
<div class="barcmp-legend"><span><i class="barcmp-sw employee"></i>Employee Contribution</span><span><i class="barcmp-sw business"></i>Business Contribution (20% of net earnings)</span><span><i class="barcmp-sw aftertax"></i>Contributed via Mega Backdoor Roth</span></div>
</div>
<p>It only works inside a Solo 401k, and only if the plan documents allow both after-tax contributions and in-plan conversion, which is not every provider. It is not available through a SEP IRA or a SIMPLE IRA at all.</p>

<h4>How the three compare, feature by feature</h4>
<div class="cmpwrap"><table class="cmp">
<thead><tr><th></th><th>Solo 401k</th><th>SEP IRA</th><th>SIMPLE IRA</th></tr></thead>
<tbody>
<tr><td>Extra at 50 or older</td><td>$8,000</td><td>Not available</td><td>$3,850</td></tr>
<tr><td>Roth version</td><td>Yes, widely offered</td><td>Permitted since 2023, rarely offered</td><td>Permitted since 2023, rarely offered</td></tr>
<tr><td>Deadline to open it</td><td>December 31, with a first-year exception for sole proprietors</td><td>Your filing deadline, including extensions</td><td>October 1</td></tr>
<tr><td>Works once you have employees</td><td>No</td><td>Yes, at the same percentage for everyone</td><td>Yes, up to 100 employees</td></tr>
<tr><td>You can borrow from it</td><td>Yes, if the plan allows</td><td>No</td><td>No</td></tr>
<tr class="tot"><td>Blocks a clean backdoor Roth</td><td>No</td><td>Yes</td><td>Yes</td></tr>
</tbody>
</table></div>
<p>The last row matters more than it looks. A SEP or SIMPLE balance counts in the calculation that decides whether a backdoor Roth is tax-free. A Solo 401k balance does not. Choosing a SEP because it is easier to open can quietly close off the backdoor route later.</p>
<p class="fine">2026 figures, for a sole proprietor with no other household income. Contribution amounts are calculated on net earnings after the deduction for half of self-employment tax.</p></div>
</details>
<details class="row" id="solo-401k" data-t="core">
<summary>
<div class="row-h">The Solo 401k</div>
<div class="row-s">A Solo 401k is a 401k for a business with no employees other than you and a spouse. You can contribute twice, once as the employee and once as the business, which is what produces the $72,000 ceiling.</div>
</summary>
<div class="row-body"><h4>Who can have a Solo 401k</h4>
<ul>
<li>You have self-employment income. A side business alongside a job counts.</li>
<li>You have no full-time W-2 employees other than yourself and a spouse. Contractors do not count as employees.</li>
<li>You do not need an entity. Sole proprietors qualify.</li>
</ul>
<h4>The two contributions</h4>
<div class="cmpwrap"><table class="cmp ann">
<tbody>
<tr><td>As the employee</td><td>Up to $24,500, pre-tax or Roth</td><td>$24,500</td></tr>
<tr><td>As the business</td><td>Up to 20% of net self-employment income for a sole proprietor, or 25% of W-2 wages for an S-corp</td><td>varies</td></tr>
<tr class="tot"><td>Combined ceiling</td><td>Cannot exceed your net earnings</td><td>$72,000</td></tr>
</tbody>
</table></div>
<h4>Deadlines</h4>
<p>Two deadlines apply, and they are not the same one.</p>
<div class="cmpwrap"><table class="cmp">
<tr><th>Situation</th><th>Deadline for the employee contribution</th></tr>
<tr><td>You already have a Solo 401k</td><td>You have to put the election in writing by December 31 of the tax year. The money can go in later.</td></tr>
<tr><td>You are opening the first one, as a sole proprietor or single-member LLC with no employees</td><td>You can open the plan and make a first-year election after the year ends, up to your return due date without extensions.</td></tr>
<tr><td>You are opening the first one, and the business has elected S-corp treatment</td><td>December 31. The relief above does not cover owners paid through payroll.</td></tr>
</table></div>
<p>The business contribution is more forgiving in every case. It can be made up to your filing date, including extensions.</p>
<p class="fine">The retroactive first-year rule for sole proprietors comes from the SECURE 2.0 Act and applies to accounts opened after December 29, 2022. It is a one-time allowance for the first year of a new account, not an annual one.</p>
<h4>Other features worth knowing</h4>
<ul>
<li>You can borrow from your Solo 401k, if the paperwork you signed when you opened it allows borrowing. The usual limit is half the account balance, capped at $50,000, and some providers permit borrowing up to $10,000 even when that is more than half.</li>
<li>Investment options are far wider than a workplace 401k, where the employer preselects a menu of twenty or thirty funds. A Solo 401k at a mainstream brokerage can hold anything that brokerage sells, including individual stocks, ETFs, bonds and CDs.</li>
<li>Once the Solo 401k balance passes $250,000 an annual information return is required, normally handled by the provider.</li>
</ul>
<h4>It also makes the mega backdoor Roth possible</h4>
<p>A Solo 401k is the only one of the three business-side plans that allows a mega backdoor Roth. This is a separate move that fills the remaining room under the $72,000 ceiling with after-tax dollars, then converts that money into Roth status so it grows and comes out completely tax-free.</p>
<p>It is useful because it reaches that same $72,000 ceiling at a much lower profit than a SEP IRA would ever require on its own, about $77,500 in net profit instead of roughly $376,000, and because the money it produces is Roth money rather than pre-tax money. A SEP IRA and a SIMPLE IRA do not offer this option at all. A full explanation appears in the section directly below.</p></div>
</details>
<details class="row" id="mega-backdoor" data-t="p150">
<summary>
<div class="row-h">The Mega Backdoor Roth Through A Solo 401k</div>
<div class="row-s">A route to putting far more than the $7,500 IRA limit into a Roth, using after-tax contributions to a Solo 401k that are then converted. It requires a plan that specifically allows it.</div>
</summary>
<div class="row-body"><p>The employee and business contributions do not always add up to the full $72,000 ceiling. Unless net profit is at least $252,000, the two combined fall short of it, leaving room under the ceiling unused.</p>
<p>Here is what that looks like on $150,000 of profit, counting only the employee and business contributions.</p>
<div class="barcmp">
<div class="barcmp-title">At $150,000 in net profit</div>
<div class="barcmp-row"><div class="barcmp-label">Solo 401k</div><div class="barcmp-track"><div class="barcmp-seg employee" style="width:34.03%">$24,500</div><div class="barcmp-seg business" style="width:38.72%">$27,881</div><div class="barcmp-seg room" style="width:27.25%">room to $72,000</div></div></div>
<div class="barcmp-scale"><span>$0</span><span>$72,000</span></div>
<div class="barcmp-legend"><span><i class="barcmp-sw employee"></i>Employee Contribution</span><span><i class="barcmp-sw business"></i>Business Contribution (20% of net earnings)</span><span><i class="barcmp-sw room"></i>Unused Room Under the Ceiling</span></div>
</div>
<p>A Solo 401k has three contribution types, not two. Alongside the employee and business contributions there is a third option, an <b>after-tax</b> contribution, which is neither deductible nor Roth by default.</p>
<p>It goes into the same Solo 401k account as the employee and business money, just tracked separately, since it is contributed after tax rather than pretax. No deduction is taken on it, which is exactly what makes it possible to convert that money into a Roth account inside the plan without creating a new tax bill.</p>
<p><b>That combination, an after-tax contribution followed by a conversion, is what makes this the mega backdoor Roth.</b></p>
<div class="barcmp">
<div class="barcmp-title">At $150,000 in net profit</div>
<div class="barcmp-row"><div class="barcmp-label">Solo 401k</div><div class="barcmp-track"><div class="barcmp-seg employee" style="width:34.03%">$24,500</div><div class="barcmp-seg business" style="width:38.72%">$27,881</div><div class="barcmp-seg aftertax" style="width:27.25%">$19,619</div></div></div>
<div class="barcmp-scale"><span>$0</span><span>$72,000</span></div>
<div class="barcmp-legend"><span><i class="barcmp-sw employee"></i>Employee Contribution</span><span><i class="barcmp-sw business"></i>Business Contribution (20% of net earnings)</span><span><i class="barcmp-sw aftertax"></i>Contributed via Mega Backdoor Roth</span></div>
</div>
<p>Here is the same example in full.</p>
<div class="cmpwrap"><table class="cmp">
<thead><tr><th>Contribution type</th><th>Tax treatment</th><th>Amount</th></tr></thead>
<tbody>
<tr><td>Employee</td><td>Pre-tax or Roth</td><td>$24,500</td></tr>
<tr><td>Business</td><td>Pre-tax</td><td>$27,881</td></tr>
<tr><td>Subtotal</td><td></td><td>$52,381</td></tr>
<tr><td>After-tax (Mega Backdoor Roth)</td><td>No deduction, then converted to Roth</td><td>$19,619</td></tr>
<tr class="tot"><td>Ceiling for all three combined</td><td></td><td>$72,000</td></tr>
</tbody>
</table></div>
<p>The after-tax figure is whatever is left below the ceiling, which is $19,619 here ($72,000 less $52,381). It shrinks as the first two contributions grow, and it is zero for anyone already at the ceiling.</p>
<p>The strategy is to make after-tax contributions and then convert them to Roth, ideally straight away so there are no gains to tax on the way through the conversion.</p>
<h4>Why Converting It Matters</h4>
<p>Making the after-tax contribution is only half of the strategy. If it never gets converted to Roth, the $19,619 does not disappear, but it ends up worse off than if it had just gone into an ordinary taxable account instead.</p>
<div class="cmpwrap"><table class="cmp">
<thead><tr><th>The same $19,619 over 20 years at 7%</th><th>Value at year 20</th><th>Tax when withdrawn</th><th>What you keep</th></tr></thead>
<tbody>
<tr><td>Converted to Roth</td><td>$75,919</td><td>$0</td><td>$75,919</td></tr>
<tr><td>A taxable brokerage account</td><td>$75,919</td><td>$8,445 at 15%</td><td>$67,474</td></tr>
<tr class="tot"><td>Left as after-tax in the 401k, never converted</td><td>$75,919</td><td>$12,386 at 22%</td><td>$63,533</td></tr>
</tbody>
</table></div>
<p>The bottom row is the worst of the three, which surprises people. After-tax money that is never converted returns your contributions tax-free but taxes everything they earned as ordinary income at your regular rate. A taxable brokerage account at least gets the lower capital gains rates. Contributing after-tax without converting means taking on the paperwork for a worse result than doing nothing.</p>
<h4>What it requires</h4>
<ul>
<li><b>A plan document that allows after-tax contributions and in-plan conversions.</b> Many low-cost Solo 401k providers do not, and the limitation is rarely obvious from their marketing.</li>
<li><b>Enough net earnings to cover it.</b> The ceiling is still your income.</li>
</ul>
<p>For comparison: the ordinary route into a Roth IRA is capped at $7,500 for 2026. This route can be several times that.</p>
<p>It is also the strategy most dependent on your provider, which is why the account choice matters more than it appears when you open it.</p>
<p class="fine">Illustration only, using 2026 limits, a 7% annual return, a 15% capital gains rate and a 22% ordinary rate at withdrawal. The business contribution shown is for a sole proprietor.</p></div>
</details>
<details class="row" id="sep-ira" data-t="core">
<summary>
<div class="row-h">The SEP IRA, And When It Still Makes Sense</div>
<div class="row-s">A SEP IRA is simpler to open than a Solo 401k, with a later deadline that applies every year, but it has only one contribution type. This means you need much more profit to reach the contribution ceiling.</div>
</summary>
<div class="row-body"><p>A SEP IRA has the same overall ceiling of $72,000, but you can only contribute as the business. There is no employee contribution.</p>

<h4>The exact math, at $100,000 of profit</h4>
<p>The business contribution is not 20% of profit. It is 20% of profit after a smaller deduction for half of self-employment tax.</p>
<div class="cmpwrap"><table class="cmp">
<thead><tr><th></th><th>Amount</th></tr></thead>
<tbody>
<tr><td>Profit</td><td>$100,000</td></tr>
<tr><td>Net self-employment earnings, 92.35% of profit</td><td>$92,350</td></tr>
<tr><td>Self-employment tax</td><td>$14,130</td></tr>
<tr><td>Half of that tax, the amount that reduces the retirement calculation</td><td>$7,065</td></tr>
<tr class="tot"><td>Net earnings the business contribution is based on</td><td>$92,935</td></tr>
</tbody>
</table></div>
<p>The business contribution for a SEP IRA is 20% of that last figure (20% &times; $92,935 = $18,587).</p>

<h4>Why The SEP IRA Ceiling is Misleading</h4>
<p>A Solo 401k and a SEP IRA both have a ceiling of $72,000. However, reaching that number takes very different profit, because a SEP IRA only allows the business to contribute using the same 20%-of-net-earnings formula, while the Solo 401k adds a flat $24,500 employee contribution on top of it, reaching the ceiling at a much lower profit.</p>
<div class="cmpwrap"><table class="cmp wide">
<thead><tr><th>Your profit</th><th>Into a SEP IRA<br><span class="fine">20% of net earnings</span></th><th>Solo 401k: Employee</th><th>Solo 401k: Business<br><span class="fine">20% of net earnings</span></th><th>Solo 401k: Total</th></tr></thead>
<tbody>
<tr><td>$100,000</td><td>$18,587</td><td>$24,500</td><td>$18,587</td><td>$43,087</td></tr>
<tr><td>$150,000</td><td>$27,881</td><td>$24,500</td><td>$27,881</td><td>$52,381</td></tr>
<tr><td>$200,000</td><td>$37,177</td><td>$24,500</td><td>$37,177</td><td>$61,677</td></tr>
<tr><td>$300,000</td><td>$56,909</td><td>$24,500</td><td>$47,500</td><td>$72,000</td></tr>
<tr class="tot"><td>Profit needed to reach the full $72,000</td><td>$376,480</td><td></td><td></td><td>$252,318</td></tr>
</tbody>
</table></div>
<p class="fine">At $300,000 of profit, 20% of net earnings alone would be $56,909. The Solo 401k business contribution shown is capped at $47,500 instead, so that it plus the $24,500 employee contribution does not exceed the $72,000 ceiling.</p>
<p>The SEP IRA&rsquo;s ceiling is only met when income is near $400,000, while the Solo 401k gets there at just over $250,000.</p>

<h4>Can you have a Solo 401k and a SEP IRA?</h4>
<p>Yes, but the <b>total</b> amount your business can contribute to your retirement is capped at 20% of net earnings, up to $72,000. Therefore, if you already reached that ceiling with a Solo 401k, you can&rsquo;t contribute another dollar to a SEP IRA. In fact, it&rsquo;s often best to only have a Solo 401k, as the SEP IRA may block the option to do a backdoor Roth.</p>
<p>This is because the SEP IRA balance counts toward the backdoor Roth pro-rata calculation, while Solo 401k balances do not. Therefore, a SEP IRA blocks a clean backdoor Roth in a way a Solo 401k does not. Rolling the SEP into the Solo 401k clears it, which is the usual reason people move it rather than leaving it alone.</p>

<h4>Where a SEP IRA still wins</h4>
<ul>
<li><b>The deadline is later, and it is later every year.</b> A SEP IRA can be opened and funded after the year ends, up to your filing date including extensions. The Solo 401k relief described above is narrower: it covers the first year of a new plan only, it excludes extensions, and it does not cover owners paid through S-corp payroll. If even that narrower window is missed, a SEP IRA can cover the missed year instead, and the balance can later be rolled into a Solo 401k once one is opened.</li>
<li><b>You have employees and want to contribute for them.</b> A Solo 401k is not available at all once you have full-time staff, but a SEP IRA still is. The trade is that a SEP IRA requires the same contribution percentage for every eligible employee as the owner takes, so contributing 20% for yourself means 20% for each of them.</li>
</ul>
<p class="fine">Illustration only, using 2026 limits. The business contribution is calculated on net earnings after the deduction for half of self-employment tax.</p></div>
</details>
<details class="row" id="simple-ira" data-t="core">
<summary>
<div class="row-h">The SIMPLE IRA</div>
<div class="row-s">A SIMPLE IRA is a smaller plan with lower limits and less paperwork, designed for businesses with a handful of employees. It is rarely the best choice for someone working alone, but can be relevant if you start hiring.</div>
</summary>
<div class="row-body"><div class="figs">
<div><span>Employee contribution limit, employers with 25 or fewer employees</span><span>$18,100</span></div>
<div><span>Extra if you are 50 or older, those same employers</span><span>$3,850</span></div>
<div><span>Employee contribution limit, larger employers</span><span>$17,000</span></div>
<div><span>Extra if you are 50 or older, larger employers</span><span>$4,000</span></div>
</div>
<p>The higher pair is the one that applies to a business this guide is written for. A 2022 law raised the limit by 10% for employers with 25 or fewer employees, which covers anyone working alone.</p>
<p>The employer also has to contribute, either matching up to 3% of pay or putting in 2% for everyone regardless of whether they contribute.</p>
<p>For someone working alone, a SIMPLE IRA is almost always the wrong pick. Even at the higher limit, the ceiling is far below a Solo 401k and the administrative saving is small.</p>
<p>A SIMPLE IRA becomes worth considering once you have a few employees, because it is much cheaper to run than a full 401k plan while still offering something. At that point you are past what this guide covers, and the business owner guide picks it up.</p></div>
</details>
<details class="row" id="personal-accounts-overview" data-t="core">
<summary>
<div class="row-h">Overview of Personal Accounts</div>
<div class="row-s">A Traditional or Roth IRA, a backdoor Roth, and a spousal IRA are personal accounts that sit under a separate $7,500 limit from the Solo 401k. In many situations it makes sense to hold one on top of a business-side plan.</div>
</summary>
<div class="row-body"><h4>Three More Personal Accounts</h4>
<p>A Traditional or Roth IRA, a backdoor Roth, and a spousal IRA are personal accounts. In many situations, it makes sense to open a personal account in addition to a Solo 401k.</p>
<div class="cmpwrap"><table class="cmp wider">
<thead><tr><th></th><th>What it is for</th><th>Pretax or Post-Tax?</th><th>How It Works</th><th>What has to already exist</th><th>Maximum for 2026</th><th>The catch</th></tr></thead>
<tbody>
<tr><td><b>Traditional IRA</b></td><td>Saving in a personal retirement account you open and fund directly, independent of any business plan</td><td>Pretax, if the deduction is allowed (see Catch). Withdrawals in retirement are taxed as ordinary income.</td><td>You open the account and contribute money to it directly, up to the yearly limit.</td><td>Nothing. Anyone with earned income can open one.</td><td>$7,500</td><td>The deduction shrinks to zero as income rises between $81,000 and $91,000, but only if you are covered by a plan like a SEP or Solo 401k. Without that coverage, the deduction has no income limit at all</td></tr>
<tr><td><b>Roth IRA</b></td><td>Saving in a personal retirement account you open and fund directly, independent of any business plan</td><td>Post-tax. Withdrawals in retirement are completely tax-free.</td><td>You open the account and contribute money to it directly, up to the yearly limit, as long as income is under the limit.</td><td>Nothing. Anyone with earned income can open one.</td><td>$7,500</td><td>The $7,500 contribution maximum shrinks to zero as income rises between $153,000 and $168,000</td></tr>
<tr><td><b>Backdoor Roth</b></td><td>Getting money into a Roth IRA once your income is too high to contribute directly</td><td>Post-tax, since no deduction is taken on the Traditional IRA contribution. Withdrawals in retirement are completely tax-free, once converted.</td><td>Contribute to a Traditional IRA without taking the deduction, then convert that money to a Roth IRA soon after.</td><td>A traditional IRA and a Roth IRA. No employer plan is needed.</td><td>$7,500</td><td>Only tax-free if you hold no other pre-tax money in a Traditional, SEP, or SIMPLE IRA</td></tr>
<tr class="tot"><td><b>Spousal IRA</b></td><td>Funding a Roth or traditional IRA for a spouse who has little or no income of their own</td><td>Follows whichever type, Traditional or Roth, is chosen for that account.</td><td>A working spouse funds an account opened in the name of a spouse with little or no income of their own.</td><td>A traditional or Roth IRA opened for that spouse. No employer plan is needed.</td><td>$7,500 for that spouse</td><td>Requires filing jointly</td></tr>
</tbody>
</table></div>
<div class="aside-box"><b>Note:</b> A backdoor Roth and a mega backdoor Roth are unrelated moves that happen to share a name. Neither has to come before the other, and most people only ever use one of them.</div>
<h4>What is a Backdoor Roth?</h4>
<p>A backdoor Roth works by contributing to a Traditional IRA without taking the deduction. In other words, you are taxed on the money before it is contributed, but you do not take a deduction.</p>
<p>Since the money went in after-tax, converting it to a Roth IRA does not create a new tax bill, as long as there is no other pre-tax money in a Traditional, SEP, or SIMPLE IRA to complicate the math. Once inside the Roth IRA, both that money and everything it earns afterward can be withdrawn completely tax-free in retirement.</p>

<h4>Can I Have Multiple Personal Accounts?</h4>
<p>Yes. It is common to hold a Traditional IRA and a Roth IRA at the same time, and a backdoor Roth actually requires both. Accounts of the same type can also be spread across more than one brokerage.</p>
<p>However, the $7,500 limit applies across both your Traditional and Roth IRAs. Splitting contributions between a Traditional and a Roth IRA in the same year is allowed, but the two contributions still have to add up to $7,500 or less.</p>

<h4>Does It Make Sense to Have a Personal Account on Top of a Solo 401k?</h4>
<p>Usually, yes. A personal IRA and a Solo 401k sit under separate limits. A Solo 401k does not use up any of the $7,500 IRA limit, and an IRA does not use up any of the Solo 401k&rsquo;s $72,000 ceiling.</p>
<p>A Roth IRA is the simplest to add, since nothing about having a Solo 401k affects it. The only limit is the Roth IRA&rsquo;s own income phase-out.</p>
<p>A Traditional IRA is more nuanced. Having a Solo 401k counts as being covered by a retirement plan, which lowers the income level at which the Traditional IRA deduction phases out, to $81,000 through $91,000 for 2026. Below that band, a Traditional IRA contribution stacks on top of a Solo 401k with no downside.</p>
<p>Above it, the contribution can still be made, just without the deduction, which is often when it turns into a backdoor Roth instead.</p>
<div class="barcmp">
<div class="barcmp-title">Traditional IRA deduction, with a Solo 401k open (2026, single filer)</div>
<div class="barcmp-row"><div class="barcmp-label">Your income</div><div class="barcmp-track"><div class="barcmp-seg full" style="width:67.5%">Full deduction</div><div class="barcmp-seg partial" style="width:8.33%"></div><div class="barcmp-seg none" style="width:24.17%">No deduction</div></div></div>
<div class="barcmp-ticks"><span class="barcmp-tick first">$0</span><span class="barcmp-tick" style="left:67.5%">$81,000</span><span class="barcmp-tick" style="left:75.83%">$91,000</span></div>
<div class="barcmp-legend"><span><i class="barcmp-sw full"></i>Full deduction, no downside to stacking</span><span><i class="barcmp-sw partial"></i>Deduction shrinking</span><span><i class="barcmp-sw none"></i>No deduction, but the contribution can still be made</span></div>
</div>
<p>For example, someone netting $150,000 in profit with a Solo 401k already open would get no deduction on a Traditional IRA contribution, making a backdoor Roth the more useful move.</p>
<p>The traditional-versus-Roth choice itself, which tax treatment to pick, is covered in its own section further down and applies to every account on this page, not just the IRA.</p>
<p class="fine">2026 figures, for a sole proprietor with no other household income. Contribution amounts are calculated on net earnings after the deduction for half of self-employment tax.</p></div>
</details>
<details class="row" id="trad-vs-roth" data-t="core">
<summary>
<div class="row-h">Traditional Or Roth</div>
<div class="row-s">A traditional account gives you the tax break now and taxes the money when you take it out. A Roth does the opposite. The best choice depends on whether your rate today is higher or lower than it will be later.</div>
</summary>
<div class="row-body"><div class="cmpwrap"><table class="cmp">
<thead><tr><th></th><th>Traditional</th><th>Roth</th></tr></thead>
<tbody>
<tr><td>Tax break</td><td>Now</td><td>Later</td></tr>
<tr><td>Reduces this year&rsquo;s taxable profit</td><td>Yes</td><td>No</td></tr>
<tr><td>Growth is taxed</td><td>No</td><td>No</td></tr>
<tr><td>Withdrawals in retirement</td><td>Taxed as income</td><td>Not taxed</td></tr>
</tbody>
</table></div>
<p>In simple terms, traditional is better if your tax rate is higher now than it will be when you withdraw. Roth is better if the reverse is true. So if you have a low income year, a Roth IRA may be best. If you have a high income year, a Traditional IRA may be best.</p>
<p>The answer to that question is difficult to know in advance, so a few things people weigh alongside it:</p>
<ul>
<li><b>Self-employment income swings.</b> A year with unusually low profit is a comparatively cheap year to pay tax, which favors Roth in that year specifically.</li>
<li><b>Roth contributions can be withdrawn penalty free at any age.</b> The money you put into a Roth can be withdrawn at any age without tax or penalty. The growth on top of it cannot be taken out tax-free until 59&frac12;, and five years after the account was opened. Traditional IRA withdrawals are always taxed as ordinary income, and pulling money out before 59&frac12; adds a 10% penalty on top of that.</li>
<li><b>No required withdrawals.</b> Traditional accounts force distributions starting in your seventies. Roth IRAs do not.</li>
</ul>
<p>Splitting between both is common as nobody knows what rates will be in thirty years.</p></div>
</details>
<details class="row" id="backdoor" data-t="p150">
<summary>
<div class="row-h">The Backdoor Roth, And The Mistake That Ruins It</div>
<div class="row-s">Once income passes $168,000 single or $252,000 joint, money cannot go into a Roth IRA directly. A traditional IRA has no income limit and neither does converting one into a Roth, which is the opening this route uses.</div>
</summary>
<div class="row-body"><h4>What it is</h4>
<p>A backdoor Roth is a way to get money into a Roth IRA when your income is too high to put it there directly.</p>
<p>It is not a special account or a product you sign up for. It is two ordinary transactions done in order.</p>
<ol>
<li>Money goes into a traditional IRA.</li>
<li>That money is moved into a Roth IRA. The move is called a <b>conversion</b>.</li>
</ol>
<p>The reason this works is that the two accounts have different rules. A Roth IRA has an income limit on money coming in from outside. A traditional IRA has none, and moving money from a traditional IRA into a Roth has none either.</p>

<h4>Who this applies to</h4>
<div class="cmpwrap"><table class="cmp">
<thead><tr><th>Amount allowed into a Roth IRA directly</th><th>Single filer</th><th>Married filing jointly, each</th></tr></thead>
<tbody>
<tr><td>The full $7,500</td><td>Under $153,000</td><td>Under $242,000</td></tr>
<tr><td>A reduced amount, shrinking as income rises</td><td>$153,000 to $168,000</td><td>$242,000 to $252,000</td></tr>
<tr class="tot"><td>Nothing</td><td>Over $168,000</td><td>Over $252,000</td></tr>
</tbody>
</table></div>
<p>Anyone in the bottom row is the audience for this. Anyone in the two rows above it can contribute directly and skip all of this.</p>

<h4>Why not just leave it in the traditional IRA</h4>
<p>A traditional IRA contribution has no income limit either, only the deduction does. So above the Roth income limit, the money could just stay in the traditional IRA instead of being converted.</p>
<p>The reason it is usually not left in a traditional IRA is that while the original contribution comes back out tax-free later (since it was already taxed going in), everything it earns along the way is taxed as ordinary income on withdrawal. Traditional IRAs also force required withdrawals starting in your seventies.</p>
<p>On the other hand, once it&rsquo;s converted to a Roth IRA, you pay nothing in taxes on growth or the principal on withdrawal. This is because you contributed after-tax dollars, which is also why the conversion itself doesn&rsquo;t come with a tax bill. Roth IRAs also have no required withdrawals, unlike a traditional IRA. The only consideration is to avoid adding pre-tax IRA money, like a SEP IRA or SIMPLE IRA, which could trigger the pro-rata rule covered further down.</p>
<div class="cmpwrap"><table class="cmp">
<thead><tr><th>The same $7,500 over 20 years at 7%</th><th>Value at year 20</th><th>Tax when withdrawn</th><th>What you keep</th></tr></thead>
<tbody>
<tr><td>Converted to Roth</td><td>$29,023</td><td>$0</td><td>$29,023</td></tr>
<tr class="tot"><td>Left in the traditional IRA, never converted</td><td>$29,023</td><td>$4,735 at 22%</td><td>$24,288</td></tr>
</tbody>
</table></div>
<p class="fine">Illustration only, using a 7% annual return and a 22% ordinary income tax rate at withdrawal.</p>

<h4>The Benefit of a Backdoor Roth</h4>
<p>You&rsquo;re never taxed on money the Roth IRA gains or when it&rsquo;s withdrawn.</p>
<p>However, why should you use the backdoor Roth rather than just putting it in a taxable brokerage account?</p>
<p>A taxable brokerage account is an ordinary investment account with no contribution limit, no income limit and no tax break. Below is an illustration of how much money you can save by getting your money in a Roth IRA rather than a taxable brokerage account.</p>
<div class="cmpwrap"><table class="cmp">
<thead><tr><th>$7,500 a year for 20 years, 7% a year</th><th>Roth IRA</th><th>Taxable account</th></tr></thead>
<tbody>
<tr><td>Total contributed</td><td>$150,000</td><td>$150,000</td></tr>
<tr><td>Value after 20 years</td><td>$307,466</td><td>$307,466</td></tr>
<tr><td>Tax owed on withdrawal</td><td>$0</td><td>$23,620</td></tr>
<tr class="tot"><td>What you keep</td><td>$307,466</td><td>$283,846</td></tr>
</tbody>
</table></div>
<div class="cmpwrap"><table class="cmp">
<thead><tr><th>Where the difference comes from</th><th>Roth IRA</th><th>Taxable account</th></tr></thead>
<tbody>
<tr><td>Tax on dividends each year</td><td>None</td><td>Owed annually</td></tr>
<tr><td>Tax on selling and rebuying inside the account</td><td>None</td><td>Owed on each gain</td></tr>
<tr><td>Tax on withdrawal</td><td>None</td><td>Capital gains rates</td></tr>
<tr class="tot"><td>Required withdrawals in your seventies</td><td>None</td><td>Not applicable</td></tr>
</tbody>
</table></div>
<p>A married couple each doing this doubles both columns, putting the gap near $47,000.</p>

<h4>How The Backdoor Roth Works (Compared to a Direct Roth IRA Contribution)</h4>
<div class="cmpwrap"><table class="cmp">
<thead><tr><th></th><th>Someone under the Roth IRA income limit</th><th>Someone over the Roth IRA income limit</th></tr></thead>
<tbody>
<tr><td>Start</td><td>$7,500 in a checking account</td><td>$7,500 in a checking account</td></tr>
<tr><td>First move</td><td>Deposit into the Roth IRA</td><td>Deposit into a traditional IRA</td></tr>
<tr><td>Second move</td><td>Not needed</td><td>Convert the traditional IRA into the Roth IRA</td></tr>
<tr><td>Where it ends up</td><td>Roth IRA</td><td>Roth IRA</td></tr>
<tr><td>The traditional IRA afterward</td><td>Never involved</td><td>Sitting empty until next year</td></tr>
<tr class="tot"><td>Paperwork</td><td>None</td><td>Form 8606 with that year&rsquo;s return</td></tr>
</tbody>
</table></div>
<p><b>What a conversion is.</b> A conversion is when you request your brokerage to move your traditional IRA balance into your Roth IRA. Nothing is sold or leaves the firm. You&rsquo;re simply moving the money from one account to another. The traditional IRA is a waiting room the money passes through.</p>
<p><b>Why the conversion is not taxed.</b> In a traditional IRA contribution, pretax dollars go in, you get a deduction on the amount contributed, but then you owe taxes when the money comes out in retirement.</p>
<p>Converting the traditional IRA to a Roth IRA would then tax those pretax dollars at conversion.</p>
<p>However, if you&rsquo;re already above the income limits to receive a deduction and you contribute after-tax dollars to the traditional IRA, there is no tax when converting it to a Roth IRA because you&rsquo;ve already paid taxes on it when it went into the traditional IRA.</p>

<h4>What ruins it</h4>
<p>The problem is called the <b>pro-rata rule</b>, and it is what can turn a clean backdoor Roth into a taxable one. The IRS does not let you choose to convert just the after-tax dollars you contributed. Instead, it treats every traditional, SEP, and SIMPLE IRA you own as one combined pool of money, some after-tax and some not, and works out what percentage of that whole pool is after-tax money. That percentage is then applied to your conversion, so you may end up paying tax on part of the converted money, even though it was contributed as after-tax dollars (assuming other pre-tax IRA money exists).</p>
<h4>How the Pro Rata Rule Works</h4>
<div class="cmpwrap"><table class="cmp">
<thead><tr><th>Converting $7,500</th><th>No other IRA money</th><th>A $90,000 rollover IRA already held</th></tr></thead>
<tbody>
<tr><td>Already-taxed money in your IRAs</td><td>$7,500</td><td>$7,500</td></tr>
<tr><td>Total across all your IRAs</td><td>$7,500</td><td>$97,500</td></tr>
<tr><td>Share already taxed</td><td>100%</td><td>7.7%</td></tr>
<tr><td>Converts tax-free</td><td>$7,500</td><td>$577</td></tr>
<tr class="tot"><td>Taxable</td><td>$0</td><td>$6,923</td></tr>
</tbody>
</table></div>
<div class="cmpwrap"><table class="cmp">
<thead><tr><th>Counts in the calculation</th><th>Does not count</th></tr></thead>
<tbody>
<tr><td>Traditional IRAs</td><td>Solo 401k and other 401k balances</td></tr>
<tr><td>SEP IRAs</td><td>Roth IRAs</td></tr>
<tr><td>SIMPLE IRAs</td><td>A spouse&rsquo;s IRAs</td></tr>
<tr class="tot"><td>Rollover IRAs from former employers</td><td></td></tr>
</tbody>
</table></div>

<h4>The fix</h4>
<p>Rolling an existing IRA balance into a Solo 401k removes it from the calculation, because the calculation looks only at IRAs.</p>
<p>The balance is measured on December 31 of the conversion year rather than on the day of the conversion, so a rollover finished later in the same year still clears the way.</p>
<p><b>One timing note.</b> Any growth between the contribution and the conversion is taxable when the conversion happens. Converting within the same week keeps that amount near zero.</p>
<p class="fine">Illustration only. The brokerage column assumes only the final gain is taxed; a taxable account also owes tax on dividends each year, so the real gap is wider. A 15% capital gains rate is assumed, and higher earners pay an additional 3.8%, or 20% above $545,500 single.</p></div>
</details>
<details class="row" id="spousal-ira" data-t="spouse">
<summary>
<div class="row-h">A Spousal IRA</div>
<div class="row-s">A spouse with little or no income of their own can still have an IRA funded from household earnings, which doubles what a couple can put away in IRAs each year.</div>
</summary>
<div class="row-body"><p>Normally an IRA requires earned income. The exception is for a married couple filing jointly: one spouse&rsquo;s earnings can fund an IRA for the other.</p>
<div class="figs">
<div><span>IRA contribution limit each, 2026</span><span>$7,500</span></div>
<div><span>Extra if 50 or older</span><span>$1,100</span></div>
<div><span>Combined for a couple</span><span>$15,000</span></div>
<div><span>Combined for a couple both 50 or older</span><span>$17,200</span></div>
</div>
<p>The account belongs to the spouse it is opened for. It is not a joint account, and it stays theirs regardless of what happens to the marriage.</p>
<p>The same income limits apply as any other IRA, so at higher household income the backdoor route may be the relevant one for both people.</p>
<p>This is separate from actually employing a spouse in the business, which is a different strategy with much larger numbers, covered in the family section below.</p></div>
</details>
</div></section>
<section id="health">
<div class="sec-head"><div class="sec-num">03</div><h2>Health Accounts</h2></div>
<p class="sec-intro">The HSA is an excellent account for tax optimization. We&rsquo;ll discuss what it is, how it works, and whether or not your health plan allows it.</p>
<div class="rows">
<details class="row" id="hsa-what" data-t="core">
<summary>
<div class="row-h">What An HSA Is And Who Qualifies</div>
<div class="row-s">A Health Savings Account is a savings and investment account attached to a high-deductible health plan. You can only open one if your health insurance qualifies.</div>
</summary>
<div class="row-body"><p>Unlike a health insurance plan purchased through the marketplace, which only provides coverage, an HSA is an account that holds real money you own. It does not expire at year end, and it follows you when you change plans or jobs.</p>
<p>Money in an HSA can be used for qualified medical, dental, and vision expenses, such as doctor visits, prescriptions, and copays. It works much like a regular bank account: expenses can be paid directly with a linked debit card, or paid out of pocket and reimbursed from the account later.</p>
<h4>What makes a plan qualify for 2026</h4>
<p>You can open an HSA if your plan&rsquo;s deductible and out-of-pocket maximum fall within the following limits:</p>
<div class="cmpwrap"><table class="cmp">
<thead><tr><th></th><th>Self-only</th><th>Family</th></tr></thead>
<tbody>
<tr><td>Minimum deductible</td><td>$1,700</td><td>$3,400</td></tr>
<tr class="tot"><td>Maximum out-of-pocket</td><td>$8,500</td><td>$17,000</td></tr>
</tbody>
</table></div>
<h4>What you can contribute</h4>
<p>The maximum you can contribute to an HSA is $4,400 annually for self-only coverage and $8,750 annually for family coverage. You&rsquo;re allowed to contribute an additional $1,000 annually when you turn 55.</p>
<div class="cmpwrap"><table class="cmp">
<thead><tr><th>Your situation in 2026</th><th>Maximum contribution</th></tr></thead>
<tbody>
<tr><td>Self-only coverage</td><td>$4,400</td></tr>
<tr><td>Self-only, 55 or older</td><td>$5,400</td></tr>
<tr><td>Family coverage</td><td>$8,750</td></tr>
<tr><td>Family coverage, one spouse 55 or older</td><td>$9,750</td></tr>
<tr class="tot"><td>Family coverage, both spouses 55 or older</td><td>$10,750</td></tr>
</tbody>
</table></div>
<p>The $1,000 catch-up is per person and has to go into that person&rsquo;s own account, so a couple who are both 55 or older need two HSAs to claim both. The family limit itself is one shared amount, split between spouses however they choose, not $8,750 each.</p>
<h4>What disqualifies you from an HSA</h4>
<ul>
<li>Any other health coverage that is not a high-deductible plan (a standard PPO or HMO, a spouse&rsquo;s non-HDHP plan, a general-purpose FSA, TRICARE, or VA benefits used in the past three months)</li>
<li>Being enrolled in Medicare</li>
<li>Being claimed as a dependent on someone else&rsquo;s return</li>
</ul>
<p>Self-employed people can open an HSA directly at a bank or brokerage. You do not need an employer to have one.</p>
<p>The contribution deadline is the tax filing deadline, not December 31, which makes this one of the few decisions you can still make after the year has ended.</p></div>
</details>
<details class="row" id="hsa-triple" data-t="core">
<summary>
<div class="row-h">The Benefit of an HSA: Three Separate Tax Breaks</div>
<div class="row-s">Money goes in untaxed, grows untaxed, and comes out untaxed for medical costs. No retirement account does all three.</div>
</summary>
<div class="row-body"><div class="cmpwrap"><table class="cmp">
<thead><tr><th></th><th>Traditional 401k</th><th>Roth IRA</th><th>HSA</th></tr></thead>
<tbody>
<tr><td>Untaxed going in</td><td>Yes</td><td>No</td><td>Yes</td></tr>
<tr><td>Untaxed growth</td><td>Yes</td><td>Yes</td><td>Yes</td></tr>
<tr class="tot"><td>Untaxed coming out</td><td>No</td><td>Yes</td><td>Yes</td></tr>
</tbody>
</table></div>
<p>The third row is what nothing else offers. A traditional account taxes you on the way out. A Roth taxed you on the way in. An HSA does neither, as long as the money goes to qualified medical costs.</p>
<p>All three breaks apply from the day the account is opened. Withdrawals for medical costs are tax-free at any age, with no waiting period and no minimum age.</p>
<h4>Two things people miss</h4>
<p><b>It can be invested.</b> Money in an HSA sits there earning almost nothing unless you tell it to do something else. Most providers let you invest it once the balance passes a set amount, often $1,000 or $2,000, and nobody does that step for you.</p>
<div class="cmpwrap"><table class="cmp">
<thead><tr><th>Putting $4,400 a year into an HSA for 20 years</th><th>Left sitting in cash, 0.5% a year</th><th>Invested, 7% a year</th></tr></thead>
<tbody>
<tr><td>Total you put in</td><td>$88,000</td><td>$88,000</td></tr>
<tr><td>What it grows to</td><td>$92,308</td><td>$180,380</td></tr>
<tr class="tot"><td>Growth on top of what you put in</td><td>$4,308</td><td>$92,380</td></tr>
</tbody>
</table></div>
<p>Same $88,000 either way. The only difference is whether anyone turned investing on.</p>
<p><b>After 65 it behaves like a traditional retirement account.</b> Withdrawals for anything at all are allowed, taxed as income with no penalty. Medical withdrawals stay untaxed. Before 65, withdrawals for non-medical costs carry income tax plus a 20% penalty, which is steeper than most retirement accounts.</p>
<h4>One limit on the first of the three breaks</h4>
<p>For a self-employed person an HSA contribution is deducted against income tax only. It does not reduce self-employment tax, and neither do retirement contributions.</p>
<div class="cmpwrap"><table class="cmp">
<thead><tr><th>A $4,400 HSA contribution</th><th>Self-employed person</th><th>Employee contributing through work payroll</th></tr></thead>
<tbody>
<tr><td>Reduces income tax</td><td>Yes</td><td>Yes</td></tr>
<tr><td>Reduces Social Security and Medicare tax</td><td>No</td><td>Yes</td></tr>
<tr class="tot"><td>Tax saved at a 22% rate</td><td>$968</td><td>$1,305</td></tr>
</tbody>
</table></div>
<p>The $337 gap is the 7.65% Social Security and Medicare tax on $4,400 that the employee escapes. Self-employment tax is calculated on net profit before the HSA deduction is taken, so the deduction never reaches it.</p>
<p class="fine">Illustration only, assuming 0.5% a year on uninvested cash, 7% a year invested, and a 22% income tax rate.</p></div>
</details>
<details class="row" id="hsa-receipts" data-t="hdhp">
<summary>
<div class="row-h">Paying Out Of Pocket And Reimbursing Yourself Later</div>
<div class="row-s">There is no deadline for reimbursing yourself from an HSA. A medical bill you pay from your checking account today can be repaid from the account decades later, tax-free, which is why it can be worth paying cash now and letting the HSA compound.</div>
</summary>
<div class="row-body"><p>Most people use an HSA the way it looks designed to be used: money in, medical bill out. That leaves the tax-free growth unused.</p>
<p>Say there is a $3,000 dental bill in 2026, and the HSA has been open since 2024.</p>
<div class="cmpwrap"><table class="cmp">
<thead><tr><th></th><th>Paying it from the HSA now</th><th>Paying from checking, reimbursing later</th></tr></thead>
<tbody>
<tr><td>2026: the $3,000 bill</td><td>Paid from the HSA</td><td>Paid from a checking account</td></tr>
<tr><td>The HSA afterward</td><td>$3,000 smaller</td><td>Untouched, still invested</td></tr>
<tr><td>What that $3,000 becomes by 2056 at 7%</td><td>Nothing, it was spent</td><td>$22,837</td></tr>
<tr><td>2056: withdraw against the 2026 receipt</td><td>Not available</td><td>$3,000, tax-free</td></tr>
<tr class="tot"><td>Left in the HSA after that</td><td>$0</td><td>$19,837</td></tr>
</tbody>
</table></div>
<p>Same bill, same year, same amount. The difference is that in the second column the money stayed invested for thirty years, and the receipt carried the right to pull $3,000 back out tax-free at any point.</p>
<h4>What the receipt has to satisfy</h4>
<ul>
<li>The expense happened after the HSA was opened. A bill from before the account existed does not count.</li>
<li>It was never claimed anywhere else, such as an itemized medical deduction.</li>
<li>The receipt still exists and can be read.</li>
</ul>
<p>Beyond those, there is no time limit written into the rule.</p>
<div class="caution">This strategy depends entirely on the records. Receipts kept for twenty years, in a form you can still find and read, are what make the eventual withdrawal defensible. A folder in cloud storage is the usual approach.</div>
<p class="fine">Illustration only, assuming a 7% annual return.</p>
<p>It also requires being able to pay medical costs from other money in the meantime, which is the constraint that decides whether it is realistic.</p></div>
</details>
<details class="row" id="aca-income" data-t="marketplace">
<summary>
<div class="row-h">How Your Income Affects What Health Insurance Costs</div>
<div class="row-s">For 2026 the premium tax credit, which is the government discount on marketplace health insurance, drops straight to zero once household income passes 400% of the federal poverty line. So if your income is close to the line, using certain deductions to slightly lower that income figure can save you thousands.</div>
</summary>
<div class="row-body"><h4>Who this applies to</h4>
<p>This section applies to self-employed people with marketplace health insurance whose household income sits close to a specific dollar threshold, about $62,600 for a single person and higher for larger households. The deductions that keep income at or below that threshold can lower income tax and help preserve eligibility for a premium tax credit (a government discount on health insurance).</p>

<h4>Why this sits in a tax guide</h4>
<p>The marketplace does not look at how much revenue your business generated. It looks at the income figure on your tax return.</p>
<p>So if you&rsquo;re close to the line and want to reduce your income, there are two deductions self-employed people should know about:</p>
<ul>
<li>Money you put into a retirement account</li>
<li>The self-employed health insurance deduction</li>
</ul>

<h4>What the premium tax credit is</h4>
<p>The premium tax credit is a subsidy (a payment from the government that lowers your cost) that reduces the monthly cost of a marketplace health insurance plan.</p>
<p>It disappears once household income passes 400% of the federal poverty level for the household size, referred to as &ldquo;the line&rdquo; for the rest of this section. For 2026, that line looks like this.</p>
<div class="cmpwrap"><table class="cmp">
<thead><tr><th>Household size</th><th>The line for 2026 coverage</th></tr></thead>
<tbody>
<tr><td>1 person</td><td>$62,600</td></tr>
<tr><td>2 people</td><td>$84,600</td></tr>
<tr><td>3 people</td><td>$106,600</td></tr>
<tr class="tot"><td>4 people</td><td>$128,600</td></tr>
</tbody>
</table></div>
<p>Household income at or below these figures qualifies for the discount, but only down to a point. Below 100% of the federal poverty level (about $15,650 for a single person) the premium tax credit is generally not available either, because Medicaid is meant to cover that income level instead.</p>
<p class="fine">These figures are for the 48 contiguous states and Washington DC. Alaska and Hawaii use higher ones. Note also that 2026 coverage uses the poverty guidelines published in 2025, so a current-year chart will look a year out of step with this table.</p>

<p>Here&rsquo;s an example of how income could be reduced to meet the line:</p>
<div class="cmpwrap"><table class="cmp">
<thead><tr><th>Single person, 2026</th><th></th></tr></thead>
<tbody>
<tr><td>Profit before these deductions</td><td>$68,000</td></tr>
<tr><td>The line for a household of one</td><td>$62,600</td></tr>
<tr><td>Solo 401k contribution</td><td>&minus;$8,000</td></tr>
<tr><td>Income the marketplace counts</td><td>$60,000</td></tr>
<tr class="tot"><td>Result</td><td>Under $62,600, discount kept</td></tr>
</tbody>
</table></div>
<p>An $8,000 contribution moved this person from $5,400 over the line to $2,600 under it.</p>

<h4>Three things to know about that income figure</h4>
<ul>
<li>It counts everyone in your household, not just the business owner.</li>
<li>The health insurance deduction and the discount affect each other, each one changing the other, so tax software calculates them together. It is not a calculation to do by hand.</li>
<li>A few uncommon items get added back, mainly tax-exempt interest and the untaxed portion of Social Security benefits.</li>
</ul>

<h4>How to use this info</h4>
<div class="cmpwrap"><table class="cmp">
<thead><tr><th>If your household income is</th><th>What this means</th></tr></thead>
<tbody>
<tr><td>Well below the line</td><td>Nothing here changes anything</td></tr>
<tr><td>Within a few thousand dollars of it</td><td>Maximizing retirement contributions to stay under the line can save thousands</td></tr>
<tr class="tot"><td>Well above the line</td><td>The discount is already gone, and the ordinary reasons to contribute still apply</td></tr>
</tbody>
</table></div>
<ul>
<li><b>Household income is the important number, not revenue or profit before deductions.</b> Those get reduced by deductions before this calculation happens.</li>
<li><b>Near the line, the arithmetic changes.</b> An $8,000 contribution that saves about $960 in tax can also preserve several thousand dollars of discount. The tax saving is secondary compared to the discount it protects.</li>
<li><b>This is one of the few things still fixable after the year ends.</b> A SEP IRA, or the business portion of a Solo 401k, can be funded up to your filing deadline and still lowers the income figure for the year that already closed. So if you discover in March that you landed just over the line, you may still be able to get back under it if you maximize retirement contributions.</li>
<li><b>The discount is settled on the tax return.</b> If it was taken upfront as a lower monthly premium and income ended up over the line, the difference is repaid at filing. So the March contribution is not chasing a refund, it is avoiding a bill.</li>
</ul>
<div class="caution">Legislation to extend the larger subsidies was still moving through Congress in early 2026 and had not passed as of August 2026. Any change could apply backwards to the 2026 plan year.</div>
<p class="fine">A dedicated guide to health insurance for the self employed covers the coverage side of this in full.</p></div>
</details>
</div></section>
<section id="which-first">
<div class="sec-head"><div class="sec-num">04</div><h2>How These Accounts Compare In Tax Strength</h2></div>
<p class="sec-intro">With retirement and health accounts both covered, it helps to compare how they stack up in tax strength when there is not enough money to fund all of them.</p>
<div class="rows">
<details class="row" id="which-first" data-t="core">
<summary>
<div class="row-h">How These Accounts Compare In Tax Strength</div>
<div class="row-s">Retirement and health savings accounts differ widely in tax strength. An HSA and an employer match sit at the strong end, and a taxable brokerage account sits at the weak end.</div>
</summary>
<div class="row-body">
<p>There is no ranking that fits everyone. Here is how these accounts compare, from the strongest tax treatment to the weakest, and the reasoning behind each one:</p>
<div class="cmpwrap"><table class="cmp ann">
<tbody>
<tr><td>An employer match, if you have a job</td><td>Money someone else adds. Nothing else on this list returns 100% immediately</td><td></td></tr>
<tr><td>HSA, if you qualify</td><td>The only account with three separate tax breaks (tax-free contributions, tax-free growth, and tax-free withdrawals for medical costs)</td><td></td></tr>
<tr><td>Roth IRA, or a backdoor Roth if your income is too high</td><td>Contributions come back out at any time without penalty</td><td></td></tr>
<tr><td>Solo 401k, up to the employee limit</td><td>Large, flexible, and reduces this year&rsquo;s taxable profit</td><td></td></tr>
<tr><td>The business contribution to the Solo 401k</td><td>Can raise the combined ceiling to $72,000, if net earnings are high enough</td><td></td></tr>
<tr><td>A taxable brokerage account</td><td>No tax break, but no restrictions either</td><td></td></tr>
</tbody>
</table></div>
<p>Two things shift this ranking.</p>
<p>If your income is low enough for the Saver&rsquo;s Credit, retirement contributions carry an extra credit on top of the deduction. Therefore, retirement accounts are often prioritized for low income individuals.</p>
<p>Additionally, if you expect to need the money before retirement, the flexibility of a Roth IRA or a taxable account matters more than the tax break.</p>
<p class="fine">The Saver&rsquo;s Credit is covered in <a href="https://prioritypay.co/self-employed/">the basics guide</a>, under tax credits.</p></div>
</details>
</div></section>
<section id="timing">
<div class="sec-head"><div class="sec-num">05</div><h2>Timing: Using Uneven Income To Your Advantage</h2></div>
<p class="sec-intro">Income that arrives unevenly is usually treated as a problem. For tax purposes it is closer to an opportunity, because it gives you years that are cheap to pay tax in.</p>
<div class="rows">
<details class="row" id="lumpy" data-t="core">
<summary>
<div class="row-h">Why Uneven Income Is An Opportunity</div>
<div class="row-s">Tax rates apply per year, not across your lifetime. A year with unusually low profit is taxed at low rates, and there are a few tax optimization strategies you can leverage in these years to reduce your tax bill across your lifetime.</div>
</summary>
<div class="row-body"><p>Someone earning $80,000 every year and someone alternating between $40,000 and $120,000 have the same average. They do not have the same tax bill, because the second person spends part of their time in higher brackets and part in lower ones.</p>
<p>The difference in tax brackets can be used to your advantage to reduce the amount of taxes you pay in your lifetime.</p>
<h4>What a low year makes possible</h4>
<ul>
<li><b>Roth contributions and conversions are cheaper</b> because you pay tax at a lower rate when you make less money in the year.</li>
<li><b>Realizing investment gains may cost nothing</b> because long-term gains sit on top of your other income. Anything below $49,450 of total taxable income is taxed at 0%.</li>
</ul>
<h4>What a high year makes possible</h4>
<ul>
<li><b>Deductions are worth more as your tax bracket rises.</b> A business expense cuts both income tax and self-employment tax. The same $5,000 equipment purchase saves about $1,153 in a year when you are in the 12% bracket and about $1,532 in a year when you are in the 24% bracket.</li>
<li><b>Retirement contributions allow you to save more as your tax bracket rises.</b> A contribution comes off the top of your income, so it saves at your highest rate. A $20,000 Solo 401k contribution saves about $1,920 in a 12% year and about $3,528 in a 24% year.</li>
</ul>
<p>In general, it&rsquo;s most advantageous to pull deductions into high years and push income recognition into low years. We&rsquo;ll describe how to do that in the next three rows.</p>
<p class="fine">Illustration only, for a sole proprietor filing single with the standard deduction. A business expense saves more than your bracket rate because it also reduces self-employment tax. A retirement contribution saves less than your bracket rate because it also shrinks the 20% business deduction.</p></div>
</details>
<details class="row" id="expense-timing" data-t="core">
<summary>
<div class="row-h">Moving Expenses Between Years</div>
<div class="row-s">On cash basis, an expense counts in the year you pay it. Paying a January bill in December, or delaying a purchase to January, shifts the deduction between tax years.</div>
</summary>
<div class="row-body"><p>It is more advantageous to push expenses into the higher earning year. Here is an example.</p>
<p>Say profit is estimated to be $130,000 this year, and next year looks more like $70,000. You have about $8,000 of purchases planned for the first quarter of next year, such as a laptop, annual software renewals and a contractor invoice.</p>
<div class="cmpwrap"><table class="cmp">
<thead><tr><th>$8,000 of planned purchases</th><th>Bought in December</th><th>Bought in January</th></tr></thead>
<tbody>
<tr><td>Which year the deduction lands in</td><td>This year</td><td>Next year</td></tr>
<tr><td>Profit that year</td><td>$130,000</td><td>$70,000</td></tr>
<tr><td>What the deduction is worth that year</td><td>30.5%</td><td>23.1%</td></tr>
<tr class="tot"><td>Tax saved</td><td>$2,439</td><td>$1,844</td></tr>
</tbody>
</table></div>
<p>Buying these items in December ($130,000 year) rather than January ($70,000 year) saves about $595, because you expect to be in a lower bracket next year. It&rsquo;s the same purchase, just moved one calendar year earlier.</p>
<p>This works because most self-employed people use cash-basis accounting, where timing follows the payment rather than the invoice. You can learn more about this concept in <a href="https://prioritypay.co/self-employed/">the basics guide</a>, under the section covering what counts as taxable income.</p>
<h4>Pulling deductions into this year</h4>
<ul>
<li>Prepaying software or service subscriptions for next year</li>
<li>Buying equipment in December rather than January</li>
<li>Paying a contractor invoice before year end rather than after</li>
<li>Charging an expense to a credit card in December, which counts in December even if the card is paid in January</li>
</ul>
<h4>Pushing deductions into next year</h4>
<p>Alternatively, in a year where profit is unusually low, pushing deductions into the next year when you expect to make more money can make the deduction worth more.</p>
<h4>Prepayment has limits</h4>
<p>A prepayment is deductible now only if it passes two tests. First, the thing you paid for cannot last more than twelve months. Second, coverage cannot still be running past December 31 of the year right after the one you paid in. That second test is about the end date of what you paid for, not the date you made the payment. If it fails either test, the deduction gets spread across the years it covers, and none of it lands in the year you paid.</p>
<div class="cmpwrap"><table class="cmp">
<thead><tr><th>You pay in December 2026 for</th><th>How long it lasts</th><th>When it finishes</th><th>Deduct it all in 2026?</th></tr></thead>
<tbody>
<tr><td>Software, January to December 2027</td><td>12 months</td><td>Dec 2027</td><td>Yes</td></tr>
<tr><td>Software, January 2027 to December 2029</td><td>36 months</td><td>Dec 2029</td><td>No</td></tr>
<tr class="tot"><td>Insurance, March 2027 to February 2028</td><td>12 months</td><td>Feb 2028</td><td>No</td></tr>
</tbody>
</table></div>
<p>The most common error is spending money purely to create a deduction. A $5,000 purchase you did not need saves you a fraction of $5,000 (a few hundred dollars, say), but you still spent thousands.</p>
<p class="fine">Illustration only, for a sole proprietor filing single with the standard deduction.</p></div>
</details>
<details class="row" id="roth-conversion" data-t="core">
<summary>
<div class="row-h">Roth Conversions In A Low Year</div>
<div class="row-s">Converting money in a traditional retirement account to a Roth in a low income year when you&rsquo;re in a lower tax bracket can reduce your tax bill. This is because you&rsquo;re taxed on money going into a Roth, and can therefore withdraw it tax free.</div>
</summary>
<div class="row-body"><p>Here is an example. Say there is $10,000 sitting in your Traditional IRA, and it grows to $40,000 by the time you retire.</p>
<div class="cmpwrap"><table class="cmp">
<thead><tr><th></th><th>Convert it now, in a low year<br><span class="fine">say you are in the 12% bracket</span></th><th>Leave it alone<br><span class="fine">say you pull it out in the 22% bracket</span></th></tr></thead>
<tbody>
<tr><td>Tax you pay now</td><td>$1,200 (12% of $10,000)</td><td>$0</td></tr>
<tr><td>It grows to</td><td>$40,000</td><td>$40,000</td></tr>
<tr><td>Tax when you take it out</td><td>$0</td><td>$8,800 (22% of $40,000)</td></tr>
<tr class="tot"><td>Total tax paid</td><td>$1,200</td><td>$8,800</td></tr>
</tbody>
</table></div>
<p>You pay tax on the $10,000 or you pay tax on the $40,000. Converting a traditional IRA into a Roth IRA in a low year means paying on the small number, at a small rate.</p>
<p>There are two reasons why the gap is so wide.</p>
<ul>
<li>First, the rate is lower now, 12% instead of 22%.</li>
<li>Second, the amount is smaller now, $10,000 instead of $40,000. The tax follows the growth, so waiting means taxing everything the money earned as well.</li>
</ul>
<h4>When it is worth converting a traditional retirement account into a Roth</h4>
<ul>
<li>A year with much lower profit than usual</li>
<li>A year with large deductions that reduce taxable income</li>
<li>Early retirement, before Social Security and required withdrawals begin</li>
<li>A gap year between contracts, or a period of reduced work</li>
</ul>
<h4>How the size is usually decided</h4>
<p>Keep in mind that the conversion itself (moving the money from the traditional account into the Roth) counts as income. It is added to your taxable income for that year as if you had earned it. So it is often advantageous to convert only the amount that brings you up to the top of your current bracket and no further.</p>
<p>For example, if taxable income is $30,000 and the 12% bracket runs to about $50,400 for a single filer, converting around $20,000 of your traditional retirement money into a Roth keeps all of it taxed at 12%.</p>
<div class="cmpwrap"><table class="cmp">
<thead><tr><th>Single filer</th><th>No conversion</th><th>Convert $20,000</th><th>Convert $40,000</th></tr></thead>
<tbody>
<tr><td>Taxable income from your work</td><td>$30,000</td><td>$30,000</td><td>$30,000</td></tr>
<tr><td>Plus the conversion</td><td>$0</td><td>$20,000</td><td>$40,000</td></tr>
<tr><td>Total taxable income</td><td>$30,000</td><td>$50,000</td><td>$70,000</td></tr>
<tr class="tot"><td>Tax on the conversion</td><td>$0</td><td>$2,400</td><td>$6,760</td></tr>
</tbody>
</table></div>
<p>There is no annual limit on conversions, and no income limit either. You can convert any amount in any year.</p>
<div class="caution">Because the whole point of the conversion is paying tax now rather than later, you must have money on hand outside the retirement account to cover the tax bill due this year. Paying it out of the converted money means less lands in the Roth, and before age 59&frac12; the portion withheld for tax is treated as an early withdrawal and carries a 10% penalty.</div>
<p class="fine">Illustration only, using 2026 figures for a single filer. Conversions must be completed by December 31 of the tax year, with no extension.</p></div>
</details>
<details class="row" id="bunching" data-t="core">
<summary>
<div class="row-h">Bunching Deductions Into Alternating Years</div>
<div class="row-s">Itemized (personal) deductions only help if they add up to more than the standard deduction. Concentrating two years of itemized deductions into one year can make your itemized deduction higher than the standard deduction for one year. Therefore, you can &ldquo;bunch&rdquo; itemized deductions from two years into one year and then take the standard deduction for the other year.</div>
</summary>
<div class="row-body"><p>Each year you take either the standard deduction or your itemized deductions, whichever is larger.</p>
<p>An itemized deduction is a specific, documented personal expense, such as mortgage interest, state and local taxes up to a cap, charitable donations, or large medical costs.</p>
<p>A standard deduction is available to most people, and it&rsquo;s typically larger than most people&rsquo;s itemized deductions.</p>
<div class="figs">
<div><span>2026 standard deduction, single</span><span>$16,100</span></div>
<div><span>Married filing jointly</span><span>$32,200</span></div>
</div>
<p>However, two years worth of itemized deductions combined can be more than the standard deduction.</p>
<h4>What bunching does</h4>
<p>Somebody with $12,000 of itemizable expenses every year never itemizes, so most of those expenses never reduce their tax. Concentrating two years into one produces $24,000 in one year and nothing in the next. Assuming this person is single, the $24,000 bunched deduction outweighs the $16,100 standard deduction.</p>
<div class="cmpwrap"><table class="cmp">
<thead><tr><th></th><th>Spread evenly</th><th>Bunched</th></tr></thead>
<tbody>
<tr><td>Year one deduction</td><td>$16,100 standard</td><td>$24,000 itemized</td></tr>
<tr><td>Year two deduction</td><td>$16,100 standard</td><td>$16,100 standard</td></tr>
<tr class="tot"><td>Two-year total</td><td>$32,200</td><td>$40,100</td></tr>
</tbody>
</table></div>
<h4>What can be bunched</h4>
<ul>
<li>Charitable donations, which are the most flexible</li>
<li>Property tax payments, where the timing allows</li>
<li>Elective medical costs, which only count above 7.5% of adjusted gross income</li>
</ul>
<p>Business expenses are not itemized deductions. Your laptop, software, mileage and home office come off on Schedule C, before itemized deductions are considered.</p>
<div class="cmpwrap"><table class="cmp">
<thead><tr><th></th><th>Where it goes</th></tr></thead>
<tbody>
<tr><td>Business expenses</td><td>Schedule C, reducing your business profit</td></tr>
<tr class="tot"><td>Standard or itemized deduction</td><td>Your personal return, after profit is calculated</td></tr>
</tbody>
</table></div>
<h4>Two changes that start in 2026</h4>
<ul>
<li><b>A floor on charitable donations for itemizers.</b> Only the amount above 0.5% of adjusted gross income is deductible. For example, if you have $100,000 of income, the first $500 of charitable donations does not count towards itemization.</li>
<li><b>You do not have to itemize to receive a tax break for charitable donations.</b> The whole premise of bunching is that donations are not tax advantageous unless you itemize. Starting in 2026 that is no longer fully true. You can deduct up to $1,000 of cash donations, or $2,000 filing jointly, while still taking the standard deduction.</li>
</ul>
<div class="cmpwrap"><table class="cmp">
<thead><tr><th>Giving $1,000 a year, taking the standard deduction</th><th>Before 2026</th><th>2026 onward</th></tr></thead>
<tbody>
<tr><td>Deduction from that donation</td><td>$0</td><td>$1,000</td></tr>
<tr class="tot"><td>Tax saved at 22%</td><td>$0</td><td>$220</td></tr>
</tbody>
</table></div>
<p class="fine">Illustration only, using 2026 figures for a single filer, before the 0.5% charitable floor.</p></div>
</details>
</div></section>
<section id="structure">
<div class="sec-head"><div class="sec-num">06</div><h2>When Changing Your Structure Starts To Pay</h2></div>
<p class="sec-intro">An S-corp election is the most discussed strategy in self-employment and the most commonly misapplied. In this section, we&rsquo;ll discuss what an S-corp is and when it makes sense.</p>
<div class="rows">
<details class="row" id="scorp-calc" data-t="core">
<summary>
<div class="row-h">Calculator to Run Your Numbers</div>
<div class="row-s">Enter your profit and the salary you would pay yourself, and see the whole calculation both ways. The rows below explain why the numbers land where they do.</div>
</summary>
<div class="row-body"><p>There are multiple factors that determine whether or not an S-corp election saves you anything:</p>
<ul>
<li>Your profit</li>
<li>Your salary</li>
<li>Your filing status</li>
<li>Your state</li>
</ul>
<p>Given that there are so many different moving variables, general figures aren&rsquo;t helpful for providing an explanation. Instead, plug in your own numbers in the calculator below.</p>
<p>The calculator shows every step for both structures side by side, from profit down to total federal tax. It does not tell you what to do with the result.</p>
<div class="calc" id="calc-scorp">
  <div class="calc-head">
    <div class="calc-t">Run it on your own numbers</div>
    <div class="calc-s">The figures above are one example. Enter yours to see the same calculation both ways. Nothing is saved or sent anywhere.</div>
  </div>

  <div class="calc-inputs">
    <div class="ci">
      <label for="cs-profit">Business profit for the year</label>
      <div class="ci-wrap"><span class="ci-pre">$</span><input type="text" inputmode="numeric" id="cs-profit" value="150,000"></div>
    </div>
    <div class="ci">
      <label for="cs-status">Filing status</label>
      <div class="sel"><select id="cs-status">
        <option value="single">Single</option>
        <option value="mfj">Married filing jointly</option>
      </select></div>
    </div>
    <div class="ci">
      <label for="cs-other">Other household income</label>
      <div class="ci-wrap"><span class="ci-pre">$</span><input type="text" inputmode="numeric" id="cs-other" value="0"></div>
      <div class="ci-note">A spouse&rsquo;s salary, a W-2 job, investment income</div>
    </div>
    <div class="ci">
      <label for="cs-salary">Salary you would pay yourself as an S-corp</label>
      <div class="ci-wrap"><span class="ci-pre">$</span><input type="text" inputmode="numeric" id="cs-salary" value="90,000"></div>
      <div class="ci-note" id="cs-salnote">60% of profit</div>
    </div>
  </div>

  <div class="cmpwrap"><table class="cmp calc-out">
    <thead><tr><th>Every step</th><th>Sole proprietor</th><th>S-corp</th></tr></thead>
    <tbody>
      <tr><td>Profit</td><td id="o-p1"></td><td id="o-p2"></td></tr>
      <tr><td>Paid as salary</td><td class="na">Does not apply</td><td id="o-sal"></td></tr>
      <tr><td>Other household income</td><td id="o-o1"></td><td id="o-o2"></td></tr>
      <tr><td>Employment tax</td><td id="o-e1"></td><td id="o-e2"></td></tr>
      <tr><td>Deducted before AGI</td><td id="o-d1"></td><td id="o-d2"></td></tr>
      <tr><td>AGI</td><td id="o-a1"></td><td id="o-a2"></td></tr>
      <tr><td>Less the standard deduction</td><td id="o-s1"></td><td id="o-s2"></td></tr>
      <tr><td>Income before the 20% deduction</td><td id="o-q1"></td><td id="o-q2"></td></tr>
      <tr><td>The 20% business deduction</td><td id="o-b1"></td><td id="o-b2"></td></tr>
      <tr><td>Taxable income</td><td id="o-t1"></td><td id="o-t2"></td></tr>
      <tr><td>Income tax</td><td id="o-i1"></td><td id="o-i2"></td></tr>
      <tr class="tot"><td>Total federal tax</td><td id="o-f1"></td><td id="o-f2"></td></tr>
    </tbody>
  </table></div>

  <div class="calc-result" id="cs-result"></div>
  <div class="calc-note" id="cs-note"></div>

  <p class="fine">Federal tax only, for a sole proprietor or single-member LLC taking the standard deduction, with no retirement contributions and no health insurance deduction. State and local tax is not included and can change the answer entirely. The S-corp column does not subtract payroll processing or the cost of a second tax return. This is an estimate for orientation, not a filing figure.</p>
</div>

<h4>What the result does not include</h4>
<ul>
<li><b>Running costs.</b> Payroll processing and a second tax return run roughly $1,400 to $3,200 a year, and come straight out of any saving shown.</li>
<li><b>State and local tax.</b> Some states and cities tax S-corps more heavily than sole proprietors, which can reverse the answer entirely.</li>
<li><b>Whether the salary is defensible.</b> The figure has to be what the work is genuinely worth, which the next rows cover.</li>
</ul>
<p>If the difference the calculator shows in federal tax is lower than the additional costs, the S-corp election does not pay for itself. If it is much larger, the rows below explain why an S-corp election may make sense.</p></div>
</details>
<details class="row" id="scorp-what" data-t="core">
<summary>
<div class="row-h">What An S-Corp Election Actually Does</div>
<div class="row-s">It splits your business income into a salary and a profit distribution, and self-employment tax applies only to the salary. So an S-corp election can reduce employment tax, but there are also drawbacks, including the additional costs associated with an S-corp election and the fact that the 20% business deduction shrinks as it&rsquo;s based on profit.</div>
</summary>
<div class="row-body"><p>An S-corp election is not a business structure. It is a tax treatment you elect if you operate as an LLC or a corporation.</p>
<p>Below is an example comparing employment tax owed as a sole proprietor versus an individual that used the S-corp election.</p>
<h4>The split</h4>
<div class="cmpwrap"><table class="cmp">
<thead><tr><th>$150,000 of business profit</th><th>Sole proprietor</th><th>S-corp</th></tr></thead>
<tbody>
<tr><td>Paid as salary</td><td>Does not apply</td><td>$90,000</td></tr>
<tr><td>Paid as profit distribution</td><td>Does not apply</td><td>$60,000</td></tr>
<tr><td>Amount employment tax applies to</td><td>$150,000</td><td>$90,000</td></tr>
<tr class="tot"><td>Employment tax</td><td>about $21,200</td><td>about $13,800</td></tr>
</tbody>
</table></div>
<p>In the example above, the employment tax savings of electing an S-corp is about $7,400. However, there are other costs associated with an S-corp election.</p>
<h4>Why income tax goes up rather than staying the same</h4>
<p>The 20% business deduction is calculated on business profit, and a salary is not business profit. So splitting $150,000 into $90,000 of wages and $60,000 of profit shrinks your total deduction amount.</p>
<p>Below you can see a side by side comparison of how $150,000 in profit is treated as a sole proprietor versus an S-corp.</p>
<div class="cmpwrap"><table class="cmp">
<thead><tr><th>Every step, single filer</th><th>Sole proprietor</th><th>S-corp</th></tr></thead>
<tbody>
<tr><td>Profit</td><td>$150,000</td><td>$150,000</td></tr>
<tr><td>Paid as salary</td><td>Does not apply</td><td>$90,000</td></tr>
<tr><td>Employment tax</td><td>$21,194</td><td>$13,770</td></tr>
<tr><td>Deducted before AGI</td><td>$10,597, half the self-employment tax</td><td>$6,885, employer payroll tax</td></tr>
<tr><td>AGI</td><td>$139,403</td><td>$143,115</td></tr>
<tr><td>Less the standard deduction</td><td>&minus;$16,100</td><td>&minus;$16,100</td></tr>
<tr><td>Income before the 20% deduction</td><td>$123,303</td><td>$127,015</td></tr>
<tr><td>The 20% business deduction</td><td>$24,661</td><td>$10,623</td></tr>
<tr><td>Taxable income</td><td>$98,642</td><td>$116,392</td></tr>
<tr><td>Income tax</td><td>$16,413</td><td>$20,532</td></tr>
<tr class="tot"><td>Total federal tax</td><td>$37,608</td><td>$34,302</td></tr>
</tbody>
</table></div>
<p><b>AGI</b> stands for adjusted gross income, which is the remaining amount after subtracting a specific set of deductions from your income, but before the standard deduction. For a self-employed person that set is half the self-employment tax, health insurance premiums, retirement contributions and HSA contributions.</p>
<h4>Employment Tax Saved vs Extra Income Tax + Reduced Deduction</h4>
<div class="cmpwrap"><table class="cmp">
<tbody>
<tr><td>Employment tax saved</td><td>+$7,424</td></tr>
<tr><td>Extra income tax, from a 20% deduction that is $14,038 smaller</td><td>&minus;$4,119</td></tr>
<tr class="tot"><td>Net saving, before payroll and a second tax return</td><td>$3,306</td></tr>
</tbody>
</table></div>
<p>As you can see, making an S-corp election would save $7,400 on self employment tax, but the additional income tax and smaller 20% business deduction bring the savings down to $3,306.</p>
<p>So even though you&rsquo;d technically save $7,400 on self employment taxes, you&rsquo;re only actually saving $3,306 in total. The next two rows cover the costs associated with electing an S-corp.</p>
</div>
</details>
<details class="row" id="reasonable-comp" data-t="p75">
<summary>
<div class="row-h">Reasonable Compensation</div>
<div class="row-s">The salary has to be what you would pay someone else to do your job. Setting it too low is the most common way an S-corp election creates a problem rather than a saving.</div>
</summary>
<div class="row-body"><p>The saving comes from the portion taken as distribution rather than salary, which creates an obvious incentive to make the salary small (the bigger the distribution, the bigger the tax savings). That incentive is exactly what the reasonable compensation rule exists to limit.</p>
<h4>Factors used to determine &ldquo;Reasonable Compensation&rdquo;</h4>
<ul>
<li>What the role pays in your industry and region</li>
<li>Your training, experience and responsibilities</li>
<li>Hours actually worked</li>
<li>What the business could pay someone else to do the same work</li>
<li>What comparable businesses pay for the role</li>
</ul>
<p>There is no percentage in the rules. Various rules of thumb circulate, and none of them are the standard. The standard is the market rate for that job.</p>
<h4>Why stating an unreasonably low compensation can cost you</h4>
<p>While it may seem advantageous to set your compensation as low as possible, there are several drawbacks to this strategy.</p>
<ul>
<li>Reclassified distributions become wages, with back employment tax, interest and penalties</li>
<li>Retirement contribution limits are calculated from your W-2 wages, so a small salary shrinks what you can put away</li>
<li>The 20% business deduction can be limited by W-2 wages at higher income, covered in the next row</li>
</ul>
<p>A defensible number, written down with the reasoning behind it at the time you set it, is worth considerably more than a number chosen to minimize tax.</p></div>
</details>
<details class="row" id="scorp-cost" data-t="p75">
<summary>
<div class="row-h">What An S-Corp Costs You</div>
<div class="row-s">Payroll processing, a separate business tax return, and in some states an additional tax that can cancel the benefit entirely. These are annual costs, not one-time ones.</div>
</summary>
<div class="row-body"><h4>The recurring costs</h4>
<ul>
<li><b>Payroll.</b> You become an employee of your own business, which means real payroll with withholding and filings. Most people pay a service to run it.</li>
<li><b>A second tax return.</b> The business files Form 1120-S, separately from your personal return. Preparation costs more than a Schedule C.</li>
<li><b>More bookkeeping.</b> The separation between business and personal has to be genuinely maintained.</li>
</ul>
<h4>The state problem</h4>
<p>Some states and cities tax S-corps in ways that erase the federal saving. New York City is a classic example. It does not recognize the S-corp election at all, and it taxes S-corps under its General Corporation Tax at a higher rate than the Unincorporated Business Tax a sole proprietor or LLC pays. Therefore, an S-corp election is typically only worthwhile when profit is significantly higher relative to other states.</p>
<p>Other states charge minimum franchise taxes on the entity regardless of profit.</p>
<h4>Typical cost ranges</h4>
<div class="cmpwrap"><table class="cmp">
<thead><tr><th>Annual cost</th><th>Typical range</th></tr></thead>
<tbody>
<tr><td>Payroll service</td><td>$600 to $1,200</td></tr>
<tr><td>Preparing Form 1120-S</td><td>$800 to $2,000</td></tr>
<tr class="tot"><td>Before any state or city tax on the entity</td><td>$1,400 to $3,200</td></tr>
</tbody>
</table></div>
<h4>Where the line usually falls</h4>
<p>You may have heard that an S-corp starts paying for itself somewhere between $75,000 and $100,000 in profit. That number usually only compares two things, the employment tax you save against the cost of running an S-corp:</p>
<div class="eq">
<div>Employment tax saved &minus; running costs = <b>the simple version</b></div>
</div>
<p>It does not consider the additional income tax you owe, given that the 20% business deduction is now smaller. The fuller picture looks like this:</p>
<div class="eq">
<div>Employment tax saved &minus; running costs &minus; extra income tax from the smaller deduction = <b>what is actually left over</b></div>
</div>
<p>Once that full picture is included, the result is flatter than the rule of thumb suggests.</p>
<div class="cmpwrap"><table class="cmp wide">
<thead><tr><th>Profit, salary set at 60%</th><th>Sole proprietor<br><span class="fine">income tax + SE tax</span></th><th>S-corp<br><span class="fine">income tax + payroll tax</span></th><th>Net federal saving</th><th>Left over after running costs<br><span class="fine">running costs of $1,400 to $3,200</span></th></tr></thead>
<tbody>
<tr><td>$60,000</td><td>$12,037</td><td>$9,688</td><td>$2,349</td><td>&minus;$851 to $949</td></tr>
<tr><td>$75,000</td><td>$15,495</td><td>$12,655</td><td>$2,840</td><td>&minus;$360 to $1,440</td></tr>
<tr><td>$100,000</td><td>$22,365</td><td>$19,782</td><td>$2,583</td><td>&minus;$617 to $1,183</td></tr>
<tr><td>$125,000</td><td>$29,986</td><td>$26,935</td><td>$3,051</td><td>&minus;$149 to $1,651</td></tr>
<tr><td>$150,000</td><td>$37,608</td><td>$34,302</td><td>$3,306</td><td>$106 to $1,906</td></tr>
<tr class="tot"><td>$200,000</td><td>$53,453</td><td>$49,491</td><td>$3,962</td><td>$762 to $2,562</td></tr>
</tbody>
</table></div>
<p>As you can see, the saving does not climb significantly. With profits between $60,000 and $200,000, you&rsquo;re seeing only a tax saving between roughly $2,300 and $4,000. And after subtracting running costs of $1,400 to $3,200, the savings an S-corp can gain drops even lower. Additionally, a state or city tax on the entity can wipe out any tax savings entirely.</p>
<p>However, if you earn above $201,750 as a single filer, or $403,500 married filing jointly, an S-corp election can make sense for a different reason: the 20% business deduction, which lets you deduct 1/5th of your qualifying business income. Above that income level, the deduction gets capped based on how much W-2 salary the business pays, and a sole proprietor pays no salary at all, while an S-corp does. We&rsquo;ll cover exactly how that plays out in the next row.</p>
<div class="caution">This is the calculation least suited to a general guide. Profit, state, salary, the effect on the 20% deduction and retirement contributions all interact rather than adding up. The calculator two rows above runs the federal side on your own numbers.</div>
<p class="fine">Illustration only, federal tax only, for a single filer taking the standard deduction with no other household income. Salary is set at 60% of profit purely to hold one variable steady, not as a recommended figure. State and local tax is excluded and can reverse these results.</p></div>
</details>
<details class="row" id="qbi-salary" data-t="p150">
<summary>
<div class="row-h">Setting Salary To Protect The 20% Deduction</div>
<div class="row-s">Above roughly $201,750 single or $403,500 joint, the 20% business deduction becomes limited by the W-2 wages your business pays. Minimizing salary can cost you more deduction than it saves in employment tax.</div>
</summary>
<div class="row-body"><p>Under the thresholds (listed in the chart below), the 20% deduction is not affected by wages at all.</p>
<p>Between the lower threshold and the ceiling of $276,750 (single) or $553,500 (married filing jointly), a wage limit phases in gradually. In this range, the deduction can shrink below 20% if the business hasn&rsquo;t paid enough in W-2 wages to support the full amount.</p>
<p>Once profit reaches the ceiling of $276,750 (single) or $553,500 (married filing jointly), the deduction cannot be more than 50% of the W-2 wages the business paid that year.</p>
<div class="cmpwrap"><table class="cmp">
<thead><tr><th></th><th>Single</th><th>Married filing jointly</th></tr></thead>
<tbody>
<tr><td>Threshold</td><td>$201,750</td><td>$403,500</td></tr>
<tr class="tot"><td>Fully phased in by (the ceiling)</td><td>$276,750</td><td>$553,500</td></tr>
</tbody>
</table></div>
<h4>What this does to a sole proprietor</h4>
<p>A sole proprietor pays no W-2 wages at all. Once fully above the threshold, a limit set at a share of zero wages is zero, so the 20% deduction can disappear completely. Therefore, an S-corp election may make sense to retain the deduction.</p>
<div class="cmpwrap"><table class="cmp">
<thead><tr><th>$400,000 of profit, single filer</th><th>Sole proprietor</th><th>S-corp, $240,000 salary</th></tr></thead>
<tbody>
<tr><td>W-2 wages the business paid</td><td>$0</td><td>$240,000</td></tr>
<tr><td>The 20% business deduction</td><td>$0</td><td>$29,016</td></tr>
<tr class="tot"><td>Total federal tax</td><td>$130,846</td><td>$117,595</td></tr>
</tbody>
</table></div>
<p>That is a $13,252 difference, and almost none of it is employment tax. At this level the reason to elect is the deduction, not the payroll saving, which reverses the usual explanation of why an S-corp is worth having.</p>
<h4>The tension</h4>
<p>A lower salary means less employment tax. It also means fewer W-2 wages, which can shrink the 20% deduction. Past the threshold those two effects run against each other, and which one dominates depends on the numbers.</p>
<p>The result is that some high-earning S-corp owners are better off paying themselves <em>more</em> salary than the minimum defensible figure, purely to preserve the deduction.</p>
<h4>The other complication</h4>
<p>Certain service businesses lose the deduction entirely once fully above the threshold. The listed fields are:</p>
<ul>
<li>Health</li>
<li>Law</li>
<li>Accounting</li>
<li>Actuarial science</li>
<li>Performing arts</li>
<li>Consulting</li>
<li>Athletics</li>
<li>Financial services</li>
<li>Brokerage services</li>
<li>Investing or trading</li>
</ul>
<p>Engineering and architecture are specifically excluded from the list, so they keep the deduction.</p>
<p>In addition to the service businesses listed above, there is also a catch-all for a business whose main asset is the reputation or skill of its owners. However, this catch-all is relatively narrow, and the final regulations limit it to three things: endorsement income, licensing a name, likeness or voice, and appearance fees. A solo consultant is captured by the word <em>consulting</em>, not by the catch-all, and most other one-person businesses are captured by neither.</p>
<div class="caution">This is arithmetic with several interacting variables, and a wrong answer in either direction costs real money. Do not estimate this calculation.</div>
<p class="fine">Illustration only, federal tax only, for a single filer taking the standard deduction. The $400,000 comparison assumes a business that is not one of the listed service fields.</p></div>
</details>
<details class="row" id="scorp-limits" data-t="p75">
<summary>
<div class="row-h">What An S-Corp Does Not Fix</div>
<div class="row-s">It does not reduce income tax, does not create new deductions, and does not change what counts as a business expense. It also does not apply to income you did not earn through the business.</div>
</summary>
<div class="row-body"><p>Here&rsquo;s what the S-corp election actually impacts:</p>
<div class="cmpwrap"><table class="cmp">
<thead><tr><th>What the S-corp election affects</th><th></th></tr></thead>
<tbody>
<tr><td>Reduces employment tax on distributions</td><td>Yes, this is where the saving comes from</td></tr>
<tr><td>Reduces income tax</td><td>No, and usually raises it slightly</td></tr>
<tr><td>Creates new deductions</td><td>No</td></tr>
<tr><td>Changes what qualifies as a business expense</td><td>No</td></tr>
<tr><td>Helps with investment or rental income</td><td>No</td></tr>
</tbody>
</table></div>
<h4>Two things it makes harder</h4>
<ul>
<li><b>Retirement contributions are calculated differently.</b> As a sole proprietor the business contribution is a percentage of net earnings. As an S-corp it is a percentage of W-2 wages. A low salary reduces how much you can contribute to retirement.</li>
<li><b>Reversing it is not simple.</b> After revoking an S-corp election, you must wait five years before you can elect it again. Therefore, it isn&rsquo;t a decision you can change from year to year.</li>
</ul>
<p>This section isn&rsquo;t to say you shouldn&rsquo;t make an S-corp election. Rather, it&rsquo;s important to run the numbers for your specific scenario before making the election.</p></div>
</details>
</div></section>
<section id="family">
<div class="sec-head"><div class="sec-num">07</div><h2>Putting Family On The Payroll</h2></div>
<p class="sec-intro">Employing a spouse or a child moves income within the household, which can lower the household&rsquo;s overall rate and open accounts that would not otherwise exist. However, the work must be real.</p>
<div class="rows">
<details class="row" id="hire-spouse" data-t="spouse">
<summary>
<div class="row-h">Hiring Your Spouse</div>
<div class="row-s">A spouse genuinely working in the business can be paid, and that salary supports a second retirement account. For a couple with a Solo 401k each, the combined ceiling roughly doubles.</div>
</summary>
<div class="row-body"><p>The tax saving does not come from the salary itself. Money paid to a spouse is still household income, and it is deductible to the business but taxable to them.</p>
<p>What it opens is a second set of contribution limits for the Solo 401k.</p>
<div class="cmpwrap"><table class="cmp">
<thead><tr><th></th><th>One participant</th><th>Both spouses</th></tr></thead>
<tbody>
<tr><td>Solo 401k ceiling each</td><td>$72,000</td><td>$72,000</td></tr>
<tr class="tot"><td>Combined</td><td>$72,000</td><td>$144,000</td></tr>
</tbody>
</table></div>
<h4>What it requires</h4>
<ul>
<li><b>Actual work.</b> A spouse on the payroll who does nothing is not a strategy, it is a problem.</li>
<li><b>Reasonable pay for that work.</b> The same standard that applies to your own salary.</li>
<li><b>Real payroll.</b> Wages, withholding, and the filings that go with employing someone.</li>
<li><b>Enough profit.</b> The ceiling is still what the business earns.</li>
</ul>
<p>A spouse is the main exception to the no-employees rule for a Solo 401k, which is why this works at all. Plans may also exclude some other categories, commonly employees under 21, employees working fewer than 1,000 hours a year, union employees and nonresident aliens with no US income. Hiring anyone outside those categories generally ends Solo 401k eligibility.</p>
<div class="caution">Paying a spouse also adds employment tax on those wages, which offsets part of the benefit. Whether the retirement capacity is worth that cost depends on whether you would actually use the extra room.</div></div>
</details>
<details class="row" id="hire-kids" data-t="kids">
<summary>
<div class="row-h">Hiring Your Children</div>
<div class="row-s">Wages paid to a child are deductible to the business and can be untaxed to the child up to the standard deduction. In an unincorporated business, wages to a child under 18 are also exempt from Social Security and Medicare tax.</div>
</summary>
<div class="row-body"><p>Two separate benefits stack here, and the second one surprises people.</p>
<h4>The income tax side</h4>
<p>The business deducts the wages as a normal expense. The child reports the wages on their own tax return, and applies their own standard deduction against them. If the wages stay under that deduction amount (up to $16,100 in 2026), the child owes no federal income tax on them at all.</p>
<div class="figs">
<div><span>2026 standard deduction against earned income</span><span>up to $16,100</span></div>
</div>
<p>The benefit isn&rsquo;t really to the business as its own entity, it&rsquo;s to the family unit as a whole, and the business is the mechanism that makes it happen.</p>
<h4>The employment tax side</h4>
<p>If the business is a sole proprietorship, or a partnership where both partners are the child&rsquo;s parents, wages paid to a child under 18 are exempt from Social Security and Medicare tax.</p>
<p>Those same businesses are also entitled to a second exemption where wages to a child under 21 are exempt from federal unemployment tax as well.</p>
<div class="caution">Neither exemption applies if the business is a corporation, including one that has elected S-corp treatment. Electing S-corp status removes both.</div>
<h4>What makes it legitimate</h4>
<ul>
<li>The work is real and appropriate for the child&rsquo;s age</li>
<li>The pay matches what the work is worth, not what is convenient</li>
<li>Hours are recorded like any other employee</li>
<li>The money is actually paid to the child</li>
</ul>
<p>Arrangements built the other way round, where a number is chosen first and a job invented to justify it, are not acceptable. The tax code only allows a wage deduction for compensation that is reasonable and tied to real work, and arrangements like that are exactly what this standard is used to catch.</p></div>
</details>
<details class="row" id="kids-roth" data-t="kids">
<summary>
<div class="row-h">A Retirement Account For Your Kids</div>
<div class="row-s">Earned income is what makes someone eligible for a Roth IRA, and there is no minimum age. A child with wages from the business can create and start contributing to a Roth IRA.</div>
</summary>
<div class="row-body"><p>This is usually the more valuable half of employing a child, and it has nothing to do with this year&rsquo;s tax bill.</p>
<div class="figs">
<div><span>Contribution limit, 2026</span><span>$7,500</span></div>
<div><span>&hellip; or the child&rsquo;s earned income, whichever is lower</span><span></span></div>
</div>
<p>The account for a child is called a custodial Roth IRA. It&rsquo;s controlled by an adult until the child reaches the age of majority in their state, then handed over.</p>
<h4>Why the timing matters more than the amount</h4>
<p>Money in a Roth IRA grows untaxed and comes out untaxed. A contribution made at fifteen has fifty years to compound before retirement. The same contribution at forty has twenty-five years to compound.</p>
<p>Contributions can also be withdrawn at any time without tax or penalty, which means the account is not as locked away as it appears if the money is needed for something else.</p>
<p>The contribution does not have to come directly from the child&rsquo;s own wages. In practice, this means a parent, grandparent, or anyone else can fund the account with their own money, while the child&rsquo;s actual paycheck gets spent on whatever a kid spends money on.</p>
<p>The only requirement is that the contribution can&rsquo;t be more than the child&rsquo;s wages for the year, or $7,500, whichever is lower.</p></div>
</details>
<details class="row" id="augusta" data-t="scorp">
<summary>
<div class="row-h">Renting Your Home To Your Business, And Why It Does Not Work For Most People</div>
<div class="row-s">A home can be rented out for up to 14 days a year without the rental income being taxable. The business has to be a separate taxpayer for this to do anything, which rules out sole proprietors and most single-owner LLCs.</div>
</summary>
<div class="row-body"><p>This rule was not written for business owners. Instead, it exists so that people can rent their homes out during local events without the income being taxable. This rule is applicable to any rental of 14 days or fewer.</p>
<p>For example, a business owner could rent their home to their own S-corp for a one-day planning meeting, charging the same rate a local meeting space would charge, say $400. The business deducts that $400 as an expense, and the owner does not report it as income, as long as the total rental days for the year stay at 14 or fewer.</p>
<div class="caution">Note that the business must file its own tax return to rent your home to your business. A sole proprietor and a single-member LLC taxed as a disregarded entity are the same taxpayer as the owner, so there is nobody to pay rent to and nothing to deduct. The arrangement only produces a result where the business is an S-corp, a C-corp or a partnership.</div>
<h4>How it gets used, where it is available</h4>
<ul>
<li>The business pays the owner rent for using the home for meetings, planning sessions or team events</li>
<li>The business deducts the rent as an expense on its own return</li>
<li>The owner does not report the rental income, provided the total is 14 days or fewer across the year</li>
</ul>
<h4>What it requires</h4>
<ul>
<li><b>Genuine business use.</b> A real meeting with a real purpose, not a designation applied afterwards.</li>
<li><b>Market rate rent.</b> Documented by comparable rates for similar space in your area.</li>
<li><b>Records.</b> What the meeting was, who attended, what was discussed, what was paid.</li>
<li><b>An actual payment.</b> Business account to personal account.</li>
</ul>
<div class="caution">This is a well-known strategy, which means it is a well-known thing to look at. The version that holds up has documentation created at the time. The version that does not is a round number paid once a year with no meeting behind it.</div>
<p>It also interacts with the home office deduction, and the two are not usually claimed for the same space.</p></div>
</details>
<details class="row" id="529" data-t="kids">
<summary>
<div class="row-h">529 Plans For Education</div>
<div class="row-s">Money in a 529 grows untaxed and comes out untaxed for education costs. There is no federal deduction for putting money in, though most states offer one for their own plan.</div>
</summary>
<div class="row-body"><p>A 529 has no federal tax break going in. The benefit is that growth and qualified withdrawals are untaxed, and that most states give a deduction or credit for contributions to their own plan.</p>
<h4>What counts as a qualified expense</h4>
<ul>
<li>College tuition, fees, books, supplies, and room and board for at least half-time students</li>
<li>Up to $20,000 a year for K-12 tuition and related costs, raised from $10,000 for 2026</li>
<li>Trade schools and registered apprenticeship programs</li>
<li>Up to $10,000 in student loan repayment, as a lifetime limit per borrower</li>
</ul>
<h4>If the money is not needed</h4>
<p>If the money is not used for education, there are two exit paths for the money. First, the beneficiary can be changed to another family member with no tax consequence. Alternatively, up to $35,000 across a lifetime can be rolled into the beneficiary&rsquo;s Roth IRA, provided the account has been open 15 years and subject to annual IRA limits.</p>
<p>Contributions count as gifts, so each person can put in up to $19,000 a year (the 2026 annual gift exclusion) without any extra reporting. Additionally, a single contribution of up to $95,000 is allowed if it&rsquo;s elected to be treated as spread evenly over five years for gift tax purposes.</p>
<p class="fine">State rules vary considerably, including whether K-12 costs qualify at the state level.</p></div>
</details>
</div></section>
<section id="investing">
<div class="sec-head"><div class="sec-num">08</div><h2>Investments And Giving</h2></div>
<p class="sec-intro">Money outside retirement accounts is taxed differently depending on how long you held it and what you do with it. Two of the levers here cost nothing to use.</p>
<div class="rows">
<details class="row" id="gains" data-t="invests">
<summary>
<div class="row-h">Long-Term And Short-Term Gains Are Taxed Differently</div>
<div class="row-s">An investment held more than a year is taxed at long-term rates, which can be 0%. Held a year or less, the gain is taxed as ordinary income at your normal rate.</div>
</summary>
<div class="row-body"><p>The line is one year and a day. Below it, gains are added to your income and taxed at whatever rate that puts you in. Above it, a separate and lower set of rates applies.</p>
<div class="cmpwrap"><table class="cmp">
<thead><tr><th>Long-term rate</th><th>Single (taxable income)</th><th>Married filing jointly (taxable income)</th></tr></thead>
<tbody>
<tr><td>0%</td><td>up to $49,450</td><td>up to $98,900</td></tr>
<tr><td>15%</td><td>up to $545,500</td><td>up to $613,700</td></tr>
<tr class="tot"><td>20%</td><td>above that</td><td>above that</td></tr>
</tbody>
</table></div>
<p>The 0% band is the part people miss. In a year with low profit, realizing long-term gains can genuinely cost nothing in federal tax, and it resets your cost basis higher for the future.</p>
<p>The thresholds apply to taxable income including the gain, so the calculation is about how much room is left below the boundary rather than the gain in isolation.</p>
<h4>A fourth rate that sits on top</h4>
<p>Above $200,000 of income single, or $250,000 filing jointly, investment income carries an additional 3.8% net investment income tax. It applies to the same gains, on top of the rates in the table, which puts the real top federal rate on a long-term gain at 23.8% rather than 20%.</p>
<p class="fine">2026 figures. State tax may still apply.</p></div>
</details>
<details class="row" id="tlh" data-t="invests">
<summary>
<div class="row-h">Tax-Loss Harvesting</div>
<div class="row-s">Selling an investment that has lost value creates a loss you can set against gains elsewhere. Losses beyond your gains can reduce ordinary income by up to $3,000 a year, and the rest carries forward indefinitely.</div>
</summary>
<div class="row-body"><p>Only realized losses count. An investment that has fallen in value does nothing for you until it is sold.</p>
<h4>The order losses are applied in</h4>
<ol>
<li>Short-term losses offset short-term gains, and long-term against long-term</li>
<li>Anything left over offsets the other kind</li>
<li>Still left over: up to $3,000 comes off ordinary income, or $1,500 married filing separately</li>
<li>Beyond that, the remainder carries into future years with no time limit</li>
</ol>
<h4>A worked example</h4>
<svg viewBox="0 0 640 918" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagram of the four-step order losses are applied in for tax-loss harvesting" style="width:100%;height:auto;max-width:620px;display:block;margin:0.5rem auto"><text x="320" y="44" text-anchor="middle" font-family="var(--display)" font-size="19" font-weight="700" fill="var(--ink)">A Worked Example: The Order Losses Are Applied In</text><rect x="20" y="78" width="600" height="108" rx="10" fill="var(--surface)" stroke="var(--rule)" stroke-width="1.4"/><text x="320" y="104" text-anchor="middle" font-family="var(--display)" font-size="14" font-weight="700" fill="var(--ink)">Starting point</text><text x="320" y="134" text-anchor="middle" font-family="var(--util)" font-size="12.6" fill="var(--muted)">Short-term gains: $2,000  &bull;  Short-term losses: $8,000</text><text x="320" y="154" text-anchor="middle" font-family="var(--util)" font-size="12.6" fill="var(--muted)">Long-term gains: $5,000  &bull;  Long-term losses: $1,000</text><line x1="320" y1="196" x2="320" y2="202" stroke="var(--gold)" stroke-width="1.8"/><path d="M 315 198 L 320 208 L 325 198 Z" fill="var(--gold)"/><rect x="20" y="220" width="600" height="139" rx="10" fill="var(--surface)" stroke="var(--rule)" stroke-width="1.4"/><text x="320" y="246" text-anchor="middle" font-family="var(--display)" font-size="14" font-weight="700" fill="var(--ink)">Step 1: Net within each category</text><text x="320" y="276" text-anchor="middle" font-family="var(--util)" font-size="12.6" fill="var(--muted)">Short-term: $2,000 &minus; $8,000 = &minus;$6,000 (a loss)</text><text x="320" y="296" text-anchor="middle" font-family="var(--util)" font-size="12.6" fill="var(--muted)">Long-term: $5,000 &minus; $1,000 = +$4,000 (a gain)</text><text x="320" y="327" text-anchor="middle" font-family="var(--util)" font-size="12.6" fill="var(--muted)">Short-term has a loss left over &rarr; go to Step 2</text><line x1="320" y1="369" x2="320" y2="375" stroke="var(--gold)" stroke-width="1.8"/><path d="M 315 371 L 320 381 L 325 371 Z" fill="var(--gold)"/><rect x="20" y="393" width="600" height="159" rx="10" fill="var(--surface)" stroke="var(--rule)" stroke-width="1.4"/><text x="320" y="419" text-anchor="middle" font-family="var(--display)" font-size="14" font-weight="700" fill="var(--ink)">Step 2: Offset the leftover loss against</text><text x="320" y="439" text-anchor="middle" font-family="var(--display)" font-size="14" font-weight="700" fill="var(--ink)">the other category&rsquo;s gain</text><text x="320" y="469" text-anchor="middle" font-family="var(--util)" font-size="12.6" fill="var(--muted)">$6,000 short-term loss  vs.  $4,000 long-term gain</text><text x="320" y="500" text-anchor="middle" font-family="var(--util)" font-size="12.6" fill="var(--muted)">$4,000 of the loss cancels the $4,000 gain</text><text x="320" y="520" text-anchor="middle" font-family="var(--util)" font-size="12.6" fill="var(--muted)">Loss still remaining: $2,000 &rarr; go to Step 3</text><line x1="320" y1="562" x2="320" y2="568" stroke="var(--gold)" stroke-width="1.8"/><path d="M 315 564 L 320 574 L 325 564 Z" fill="var(--gold)"/><rect x="20" y="586" width="600" height="159" rx="10" fill="var(--surface)" stroke="var(--rule)" stroke-width="1.4"/><text x="320" y="612" text-anchor="middle" font-family="var(--display)" font-size="14" font-weight="700" fill="var(--ink)">Step 3: Apply against ordinary income</text><text x="320" y="632" text-anchor="middle" font-family="var(--display)" font-size="14" font-weight="700" fill="var(--ink)">(up to $3,000, or $1,500 married filing separately)</text><text x="320" y="662" text-anchor="middle" font-family="var(--util)" font-size="12.6" fill="var(--muted)">$2,000 remaining loss is under the $3,000 cap</text><text x="320" y="693" text-anchor="middle" font-family="var(--util)" font-size="12.6" fill="var(--muted)">Full $2,000 comes off ordinary income</text><text x="320" y="713" text-anchor="middle" font-family="var(--util)" font-size="12.6" fill="var(--muted)">Loss still remaining: $0</text><line x1="320" y1="755" x2="320" y2="761" stroke="var(--gold)" stroke-width="1.8"/><path d="M 315 757 L 320 767 L 325 757 Z" fill="var(--gold)"/><rect x="20" y="779" width="600" height="119" rx="10" fill="var(--surface)" stroke="var(--gold)" stroke-width="2"/><text x="320" y="805" text-anchor="middle" font-family="var(--display)" font-size="14" font-weight="700" fill="var(--gold)">Step 4: Carry forward what&rsquo;s left, with no time limit</text><text x="320" y="835" text-anchor="middle" font-family="var(--util)" font-size="12.6" fill="var(--muted)">Nothing is left over this year, so nothing carries forward</text><text x="320" y="866" text-anchor="middle" font-family="var(--util)" font-size="12.6" fill="var(--muted)">(If it had, it would offset gains or income the same way next year)</text></svg>
<p>The $3,000 against ordinary income is the part worth noticing for someone self-employed, because ordinary income is taxed at higher rates than long-term gains.</p>
<h4>What it does and does not do</h4>
<p>Harvesting mostly defers tax rather than removing it. Selling at a loss and buying something similar lowers your cost basis, so a larger gain arrives later. What you gain is the use of the money in the meantime, and the option to realize that gain in a year of your choosing.</p>
<p>It also does nothing inside a retirement account, where gains and losses have no immediate tax effect at all.</p>
<h4>The benefits of tax-loss harvesting</h4>
<ul>
<li><b>Money now versus tax later.</b> Realizing a loss lowers this year&rsquo;s tax bill immediately, even though a larger gain may show up eventually. Keeping that cash sooner rather than later has value on its own.</li>
<li><b>Choosing when the future gain gets taxed.</b> The loss has to be realized whenever the investment happens to be down, but the eventual gain can be realized in whatever year makes sense, including a low income year where some or all of it might qualify for the 0% long-term rate.</li>
<li><b>The $3,000 against ordinary income can become permanent.</b> If the replacement investment is held long enough, including for the rest of the owner&rsquo;s life, that deferred gain may never actually get taxed. Most inherited investments get their cost basis reset to their value on the date of death, which erases the built up gain entirely.</li>
<li><b>A reason to rebalance anyway.</b> If a position was already going to be sold or replaced, doing it while it happens to be down captures a tax benefit on a change that was going to happen regardless.</li>
</ul>
<h4>An example of the timing benefit</h4>
<svg viewBox="0 0 700 874" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Comparison of holding an investment versus tax-loss harvesting it" style="width:100%;height:auto;max-width:660px;display:block;margin:0.5rem auto"><text x="350" y="46" text-anchor="middle" font-family="var(--display)" font-size="18.5" font-weight="700" fill="var(--ink)">Tax-Loss Harvesting: Money Now vs. Tax Later</text><text x="180" y="76" text-anchor="middle" font-family="var(--util)" font-size="12.5" font-weight="700" letter-spacing="0.06em" fill="var(--gold)">WITHOUT HARVESTING</text><text x="520" y="76" text-anchor="middle" font-family="var(--util)" font-size="12.5" font-weight="700" letter-spacing="0.06em" fill="var(--gold)">WITH HARVESTING</text><rect x="20" y="98" width="320" height="80" rx="9" fill="var(--surface)" stroke="var(--rule)" stroke-width="1.3"/><text x="180" y="122" text-anchor="middle" font-family="var(--display)" font-size="13" font-weight="700" fill="var(--ink)">Year 1: buy the fund</text><text x="180" y="147" text-anchor="middle" font-family="var(--util)" font-size="11.6" fill="var(--muted)">Cost basis: $10,000</text><rect x="360" y="98" width="320" height="80" rx="9" fill="var(--surface)" stroke="var(--rule)" stroke-width="1.3"/><text x="520" y="122" text-anchor="middle" font-family="var(--display)" font-size="13" font-weight="700" fill="var(--ink)">Year 1: buy the fund</text><text x="520" y="147" text-anchor="middle" font-family="var(--util)" font-size="11.6" fill="var(--muted)">Cost basis: $10,000</text><rect x="20" y="192" width="320" height="80" rx="9" fill="var(--surface)" stroke="var(--rule)" stroke-width="1.3"/><text x="180" y="216" text-anchor="middle" font-family="var(--display)" font-size="13" font-weight="700" fill="var(--ink)">Year 2: fund drops to $7,000</text><text x="180" y="241" text-anchor="middle" font-family="var(--util)" font-size="11.6" fill="var(--muted)">Still holding it, nothing reported</text><rect x="360" y="192" width="320" height="99" rx="9" fill="var(--surface)" stroke="var(--rule)" stroke-width="1.3"/><text x="520" y="216" text-anchor="middle" font-family="var(--display)" font-size="13" font-weight="700" fill="var(--ink)">Year 2: fund drops to $7,000</text><text x="520" y="241" text-anchor="middle" font-family="var(--util)" font-size="11.6" fill="var(--muted)">Sell it, realize a $3,000 loss,</text><text x="520" y="260" text-anchor="middle" font-family="var(--util)" font-size="11.6" fill="var(--muted)">buy a similar fund for $7,000</text><rect x="20" y="305" width="320" height="80" rx="9" fill="var(--surface)" stroke="var(--rule)" stroke-width="1.3"/><text x="180" y="329" text-anchor="middle" font-family="var(--display)" font-size="13" font-weight="700" fill="var(--ink)">This year&rsquo;s tax effect</text><text x="180" y="354" text-anchor="middle" font-family="var(--util)" font-size="11.6" fill="var(--muted)">None, no sale happened</text><rect x="360" y="305" width="320" height="99" rx="9" fill="var(--surface)" stroke="var(--rule)" stroke-width="1.3"/><text x="520" y="329" text-anchor="middle" font-family="var(--display)" font-size="13" font-weight="700" fill="var(--ink)">This year&rsquo;s tax effect</text><text x="520" y="354" text-anchor="middle" font-family="var(--util)" font-size="11.6" fill="var(--muted)">The $3,000 loss offsets gains</text><text x="520" y="373" text-anchor="middle" font-family="var(--util)" font-size="11.6" fill="var(--muted)">or up to $3,000 of ordinary income</text><rect x="20" y="418" width="320" height="80" rx="9" fill="var(--surface)" stroke="var(--rule)" stroke-width="1.3"/><text x="180" y="442" text-anchor="middle" font-family="var(--display)" font-size="13" font-weight="700" fill="var(--ink)">New cost basis</text><text x="180" y="467" text-anchor="middle" font-family="var(--util)" font-size="11.6" fill="var(--muted)">Still $10,000, unchanged</text><rect x="360" y="418" width="320" height="99" rx="9" fill="var(--surface)" stroke="var(--rule)" stroke-width="1.3"/><text x="520" y="442" text-anchor="middle" font-family="var(--display)" font-size="13" font-weight="700" fill="var(--ink)">New cost basis</text><text x="520" y="467" text-anchor="middle" font-family="var(--util)" font-size="11.6" fill="var(--muted)">$7,000, the price of the</text><text x="520" y="486" text-anchor="middle" font-family="var(--util)" font-size="11.6" fill="var(--muted)">replacement fund</text><rect x="20" y="531" width="320" height="80" rx="9" fill="var(--surface)" stroke="var(--rule)" stroke-width="1.3"/><text x="180" y="555" text-anchor="middle" font-family="var(--display)" font-size="13" font-weight="700" fill="var(--ink)">Later: fund recovers, sold at $15,000</text><text x="180" y="580" text-anchor="middle" font-family="var(--util)" font-size="11.6" fill="var(--muted)">Taxable gain: $5,000</text><rect x="360" y="531" width="320" height="99" rx="9" fill="var(--surface)" stroke="var(--rule)" stroke-width="1.3"/><text x="520" y="555" text-anchor="middle" font-family="var(--display)" font-size="13" font-weight="700" fill="var(--ink)">Later: fund recovers, sold at $15,000</text><text x="520" y="580" text-anchor="middle" font-family="var(--util)" font-size="11.6" fill="var(--muted)">Taxable gain: $8,000</text><text x="520" y="599" text-anchor="middle" font-family="var(--util)" font-size="11.6" fill="var(--muted)">(larger, because basis is lower)</text><rect x="20" y="650" width="660" height="210" rx="9" fill="var(--surface)" stroke="var(--gold)" stroke-width="2.2"/><text x="350" y="676" text-anchor="middle" font-family="var(--display)" font-size="14" font-weight="700" fill="var(--gold)">Where the real benefit comes from</text><text x="350" y="698" text-anchor="middle" font-family="var(--util)" font-size="11.5" fill="var(--muted)">Say this year&rsquo;s business profit is taxed at 32%, and the later gain lands in a year</text><text x="350" y="714" text-anchor="middle" font-family="var(--util)" font-size="11.5" fill="var(--muted)">taxed at 0% (the 0% band covered earlier in this guide).</text><text x="350" y="740" text-anchor="middle" font-family="var(--util)" font-size="12.2" fill="var(--ink)">Without harvesting: $5,000 gain, later, at 0%  =  <tspan font-weight="700">$0 tax, no benefit today</tspan></text><text x="350" y="764" text-anchor="middle" font-family="var(--util)" font-size="12.6" font-weight="700" fill="var(--gold)">With harvesting: $3,000 loss saves $960 today (32% of $3,000)</text><text x="350" y="784" text-anchor="middle" font-family="var(--util)" font-size="12.6" font-weight="700" fill="var(--gold)">then $8,000 gain, later, at 0%  =  still $0 tax then</text><text x="350" y="806" text-anchor="middle" font-family="var(--util)" font-size="12.2" font-weight="700" fill="var(--ink)">Net result: $960 saved, for the same eventual $0 tax bill</text><line x1="36" y1="820" x2="664" y2="820" stroke="var(--rule)" stroke-width="1"/><text x="350" y="838" text-anchor="middle" font-family="var(--util)" font-size="11" fill="var(--muted)">This is the best-case version of the timing bet. If the later gain instead landed in a year</text><text x="350" y="854" text-anchor="middle" font-family="var(--util)" font-size="11" fill="var(--muted)">taxed at 15% or 20%, the larger $8,000 gain could cost more than the $960 saved today.</text></svg></div>
</details>
<details class="row" id="wash-sale" data-t="invests">
<summary>
<div class="row-h">The Wash Sale Rule</div>
<div class="row-s">If you buy the same or a substantially identical investment within 30 days before or after selling at a loss, the loss is disallowed. The window runs both directions.</div>
</summary>
<div class="row-body"><p>The rule exists to stop people selling purely to book a loss and buying straight back in. It applies across all your accounts, and to purchases by a spouse.</p>
<div class="cmpwrap"><table class="cmp">
<tbody>
<tr><td>Sell a fund, rebuy the same fund a week later</td><td>Loss disallowed</td></tr>
<tr><td>Sell one S&amp;P 500 fund, buy a different provider&rsquo;s S&amp;P 500 fund</td><td>Unsettled, and usually avoided</td></tr>
<tr><td>Sell an S&amp;P 500 fund, buy a total market fund</td><td>Generally allowed</td></tr>
<tr><td>Sell a stock, buy a competitor in the same industry</td><td>Allowed</td></tr>
<tr class="tot"><td>Sell, wait 31 days, rebuy the same thing</td><td>Allowed</td></tr>
</tbody>
</table></div>
<p>The IRS has never said that two providers&rsquo; funds tracking the same index are substantially identical, and it has never said they are not. Most people treat that row as a risk to route around rather than a rule to test.</p>
<p>A disallowed loss is usually not destroyed. It gets added to the cost basis of the replacement shares, so it comes back eventually. What you lose is the use of it this year.</p>
<div class="caution">One version of this is permanent rather than deferred. If the replacement shares are bought inside an IRA or Roth IRA, the loss is disallowed and no basis adjustment is made anywhere. It is gone. Because the rule reaches across all accounts, an automatic IRA purchase can do this without anyone noticing.</div>
<p>The 30 days runs in both directions, which catches people with automatic monthly investing. A purchase made three weeks <em>before</em> the sale can disallow the loss just as easily as one made after.</p></div>
</details>
<details class="row" id="idle-cash" data-t="core">
<summary>
<div class="row-h">Where Idle Cash Sits</div>
<div class="row-s">Interest on business cash is taxed as ordinary income at your normal rate. Some options are exempt from state tax, which changes what a given yield is actually worth to you.</div>
</summary>
<div class="row-body"><p>Self-employed people often hold significant cash: money set aside for tax, a buffer for slow months, funds waiting for a purchase. Where it sits changes what it earns after tax.</p>
<h4>The comparison that matters</h4>
<p>Comparing yields directly is misleading when they are taxed differently. Interest from Treasury securities is exempt from state income tax. A regular savings account is not.</p>
<p>Two qualifications on that. Holding a Treasury fund rather than the securities directly means only the share of the fund&rsquo;s income that came from government obligations is exempt, and the fund reports that percentage each year. California, New York and Connecticut also require the fund to hold at least half its assets in those obligations before any of the exemption passes through at all.</p>
<div class="cmpwrap"><table class="cmp">
<thead><tr><th>Someone in a 6% state</th><th>Savings account at 4.0%</th><th>Treasury fund at 3.9%</th></tr></thead>
<tbody>
<tr><td>Federal tax applies</td><td>Yes</td><td>Yes</td></tr>
<tr><td>State tax applies</td><td>Yes</td><td>No</td></tr>
<tr class="tot"><td>Roughly, which is better after tax</td><td></td><td>the Treasury fund</td></tr>
</tbody>
</table></div>
<p>The lower headline number can be the better one once state tax is accounted for. The gap widens the higher your state rate, and disappears entirely in states with no income tax.</p>
<p>Municipal bond interest is exempt from federal tax, and sometimes state tax too, which makes the same comparison worth running in the other direction at higher income levels.</p>
<p class="fine">Illustration only, with rates chosen to show the mechanism rather than to reflect current markets.</p></div>
</details>
<details class="row" id="charitable" data-t="invests">
<summary>
<div class="row-h">Donating Appreciated Assets Instead Of Cash</div>
<div class="row-s">Donating an investment that has gone up in value can be worth more than donating the same amount of cash, because you deduct the full value without ever paying tax on the gain.</div>
</summary>
<div class="row-body"><p>This only works for investments held more than a year, and only if you itemize. New for 2026, itemized charitable deductions are also reduced by 0.5% of adjusted gross income, so the first slice of giving each year does not count.</p>
<div class="cmpwrap"><table class="cmp">
<thead><tr><th>Stock worth $10,000, bought for $4,000</th><th>Sell then donate cash</th><th>Donate the stock</th></tr></thead>
<tbody>
<tr><td>Tax on the $6,000 gain at 15%</td><td>$900</td><td>$0</td></tr>
<tr><td>Amount the charity receives</td><td>$9,100</td><td>$10,000</td></tr>
<tr class="tot"><td>Amount you deduct</td><td>$9,100</td><td>$10,000</td></tr>
</tbody>
</table></div>
<p>Both sides come out ahead, which is unusual.</p>
<h4>Limits worth knowing</h4>
<ul>
<li>Deductions for appreciated assets are capped at 30% of adjusted gross income, with a five-year carryforward for the excess</li>
<li>Cash donations are capped at 60%</li>
<li>Starting in 2026, only giving above 0.5% of adjusted gross income is deductible for itemizers</li>
<li>Held a year or less, the deduction is limited to what you paid rather than what it is worth</li>
</ul>
<p>A donor-advised fund is the common way to combine this with bunching: contribute several years of giving in one year, take the deduction then, and distribute to charities over time.</p>
<p class="fine">Illustration only. If the numbers entered were true, this is what the comparison would look like.</p></div>
</details>
<details class="row" id="card-points" data-t="core">
<summary>
<div class="row-h">Business Credit Card Points</div>
<div class="row-s">Points and cashback earned on business spending are generally treated as a rebate rather than income, which makes them an untaxed return on money you were spending anyway.</div>
</summary>
<div class="row-body"><p>The reasoning is that a rebate reduces what you paid rather than adding to what you earned. Because it is not income, it is not taxed.</p>
<p>Where the spending is a business expense, the deduction is generally reduced by the rebate, which is the part people forget.</p>
<h4>Where this matters most</h4>
<p>Self-employed people with high business spending, such as advertising, software, contractors or inventory, can accumulate meaningful value from purchases they would make regardless.</p>
<div class="caution">Sign-up bonuses that require no spending, such as those for opening an account, may be treated as income rather than a rebate. The distinction is whether you had to spend to earn it.</div>
<p>The thing that makes this worth mentioning at all is that it is untaxed. The thing that makes it dangerous is that spending more to earn points is a loss dressed as a strategy.</p></div>
</details>
</div></section>
<section id="bigger">
<div class="sec-head"><div class="sec-num">09</div><h2>Bigger Levers, And Knowing When To Stop</h2></div>
<p class="sec-intro">These open up at higher profit levels, cost more to implement, and mostly require professional help. The last row is about recognizing when a general guide has stopped being the right tool.</p>
<div class="rows">
<details class="row" id="ptet" data-t="p150">
<summary>
<div class="row-h">Paying State Tax Through Your Business</div>
<div class="row-s">Federal law caps the deduction for state and local taxes on a personal return. Most states now let a business pay the owner&rsquo;s state tax directly, where it is deductible as a business expense instead.</div>
</summary>
<div class="row-body"><p>For 2026 the personal cap is $40,400, or $20,200 married filing separately. It shrinks above $505,000 of modified adjusted gross income but never below $10,000. The cap hits hardest in high-tax states, where someone can pay far more in state tax than they are allowed to deduct federally.</p>
<p>That $40,400 is much higher than the $10,000 cap that applied through 2024, which means the workaround below matters to fewer people than it used to. It still matters at high profit in a high-tax state.</p>
<h4>The workaround states created</h4>
<p>Most states with an income tax now offer an elective tax paid at the entity level, generally called a pass-through entity tax. The business pays the owner&rsquo;s state tax and deducts it as an ordinary business expense, which is not subject to the personal cap. The owner then receives a credit against their state return.</p>
<h4>What it requires</h4>
<ul>
<li>A qualifying entity, which usually means an S-corp or a partnership rather than a sole proprietorship</li>
<li>An election, on that state&rsquo;s schedule, which is often earlier than you would expect</li>
<li>A state that offers it, since the rules and deadlines differ substantially</li>
</ul>
<p>The value scales with your state rate and your profit. In a state with no income tax it does nothing at all. In a high-tax state at high profit it can be one of the larger items on this page.</p>
<div class="caution">Deadlines for the election are the most common way this gets missed, and several states require it well before the tax is due. It is a decision that has to be made before the year begins rather than at filing.</div></div>
</details>
<details class="row" id="cash-balance" data-t="p400">
<summary>
<div class="row-h">Cash Balance Plans</div>
<div class="row-s">A pension-style plan that can absorb far more than a Solo 401k, sometimes several hundred thousand dollars a year. It is expensive to run and commits you to funding it for several years.</div>
</summary>
<div class="row-body"><p>A Solo 401k has a fixed ceiling. A cash balance plan works backwards from a target retirement benefit, so the annual contribution is calculated rather than capped, and rises with age.</p>
<h4>Roughly how the limits scale</h4>
<p>The figure depends on age, income, years to retirement and assumed growth. Older participants can contribute substantially more, because there are fewer years left to reach the target.</p>
<h4>What it costs</h4>
<ul>
<li>Setup and annual administration, including an actuary, running to several thousand dollars a year</li>
<li>A commitment to fund it consistently, generally for at least three years</li>
<li>Conservative investment requirements while the plan is active</li>
</ul>
<h4>Who it tends to suit</h4>
<p>Someone with high and reliable profit, no employees other than a spouse, and typically past their forties. It pairs with a Solo 401k rather than replacing it, so both can run together.</p>
<div class="caution">The commitment is the constraint that matters. A plan set up in a strong year and underfunded in a weak one creates problems that outweigh the original deduction.</div></div>
</details>
<details class="row" id="depreciation" data-t="property">
<summary>
<div class="row-h">Property Depreciation</div>
<div class="row-s">Property used in a business is deducted over a number of years rather than at once. Several provisions allow much of it to be taken immediately instead, which can produce a large deduction in the year of purchase.</div>
</summary>
<div class="row-body"><p>The default is a schedule: residential property over 27.5 years, commercial over 39. Equipment and shorter-lived assets run on much faster schedules.</p>
<h4>The provisions that accelerate it</h4>
<div class="cmpwrap"><table class="cmp">
<tbody>
<tr><td>Bonus depreciation</td><td>100% in year one for qualifying assets</td></tr>
<tr><td>Section 179 limit, 2026</td><td>$2,560,000</td></tr>
<tr><td>Cost segregation</td><td>Splits a building into components with shorter lives, so more can be taken early</td></tr>
</tbody>
</table></div>
<h4>The limit that catches people</h4>
<p>Losses from rental property are generally passive, which means they offset passive income rather than your business profit. Three exceptions exist.</p>
<ul>
<li><b>Active participation in rental real estate.</b> Up to $25,000 of loss can offset ordinary income. The allowance shrinks above $100,000 of modified adjusted gross income and reaches zero at $150,000. This is the exception most people qualify for, and the one that disappears exactly as profit rises.</li>
<li><b>Qualifying as a real estate professional.</b> Demanding hour tests, and rarely available to someone running another business full time.</li>
<li><b>Short-term rentals</b> with an average stay of seven days or less, where the owner materially participates.</li>
</ul>
<p>Without one of those, a large depreciation deduction may not reduce this year&rsquo;s tax on your business income at all.</p>
<div class="caution">Depreciation is also recaptured when the property is sold, which means part of what you deducted is taxed then. It is a timing benefit more than a permanent one.</div></div>
</details>
<details class="row" id="multi-state" data-t="states">
<summary>
<div class="row-h">Where You Owe State Tax</div>
<div class="row-s">Working with clients in other states can create a filing obligation there. The rules vary by state and turn on where the work is performed rather than where the client is.</div>
</summary>
<div class="row-body"><p>For most self-employed people the answer is simple: you owe tax where you live, and a client&rsquo;s location does not change that. The complications arrive with physical presence.</p>
<h4>What tends to create an obligation elsewhere</h4>
<ul>
<li>Physically working in another state, even briefly, in states with low thresholds</li>
<li>Maintaining an office, storage or equipment there</li>
<li>Employees or contractors working in that state</li>
<li>Selling goods above a state&rsquo;s sales threshold, which is a sales tax question rather than income tax</li>
</ul>
<h4>Moving mid-year</h4>
<p>A move generally means part-year returns in both states, with income allocated by when it was earned rather than when it was paid. States differ on how they handle that, and a few are known for contesting departures.</p>
<p>Where two states both tax the same income, a credit for tax paid to the other state usually prevents genuine double taxation, though it does not remove the filing requirement.</p>
<div class="caution">State rules diverge more than federal ones, and remote work has made this messier rather than simpler. A client in another state does not automatically create an obligation, and does not automatically avoid one either.</div></div>
</details>
<details class="row" id="choosing-pro" data-t="core">
<summary>
<div class="row-h">How To Choose A Tax Professional</div>
<div class="row-s">Most of what is on this page benefits from someone who does it professionally. Preparers differ substantially in what they are qualified to do and what they actually offer.</div>
</summary>
<div class="row-body"><h4>What the credentials mean</h4>
<div class="cmpwrap"><table class="cmp ann">
<tbody>
<tr><td>CPA</td><td>State-licensed accountant. Scope varies widely; not all specialize in tax</td><td></td></tr>
<tr><td>Enrolled Agent</td><td>Federally licensed specifically in tax, and can represent you before the IRS</td><td></td></tr>
<tr><td>Tax attorney</td><td>Legal advice, disputes and complex structures</td><td></td></tr>
<tr><td>Unenrolled preparer</td><td>No credential required. Limited ability to represent you</td><td></td></tr>
</tbody>
</table></div>
<h4>Preparation and planning are different services</h4>
<p>Filing a return records what already happened. Planning changes what happens next, and has to occur before the year ends. Many preparers do only the first, and a guide like this one is worth little if the person you hire does not do the second.</p>
<h4>What separates the two in practice</h4>
<ul>
<li>How much of the practice is self-employed clients rather than employees</li>
<li>Whether planning is offered during the year or only preparation at filing</li>
<li>How an S-corp decision gets approached, since that reveals whether the numbers get run or a rule of thumb gets applied</li>
<li>What is charged, and whether planning is billed separately</li>
<li>Who prepares the return and who reviews it</li>
</ul>
<p>The last one matters more than it sounds. Work is often delegated, and that is easier to know in advance than to discover afterwards.</p></div>
</details>
<details class="row" id="outgrown" data-t="core">
<summary>
<div class="row-h">Signs You Have Outgrown This Guide</div>
<div class="row-s">A general guide works up to a point. Past it, the interactions between strategies matter more than the strategies themselves, and generic guidance starts producing wrong answers.</div>
</summary>
<div class="row-body"><p>Several signals suggest the calculations have become specific enough that reading about them stops being useful:</p>
<ul>
<li><b>Profit consistently above roughly $200,000.</b> The 20% deduction limits, wage calculations and state elections begin interacting.</li>
<li><b>You have employees.</b> Almost everything about retirement plans changes, and the business owner guide picks that up.</li>
<li><b>You operate in more than one state.</b> Elections, credits and filing obligations multiply.</li>
<li><b>You are considering selling the business.</b> The structure you have years beforehand shapes what a sale costs.</li>
<li><b>Two strategies here appear to conflict.</b> They often do, and resolving it requires your actual numbers.</li>
</ul>
<p>None of that means a guide stops being worth reading. It means the reading is now preparation for a conversation rather than a substitute for one.</p>
<p>What makes that conversation productive is not a list of strategies. It is clean books, a clear profit figure, and specific questions.</p></div>
</details>
</div></section>

<footer class="about">
  <p>This page describes how the rules work in general. It is educational and does not account for any individual&rsquo;s circumstances. Whether a particular rule applies to a particular situation is a question for a credentialed tax professional.</p>
</footer>

</div>
`;
