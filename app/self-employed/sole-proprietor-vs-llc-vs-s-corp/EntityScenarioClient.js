"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import { LEDGER_TOKENS } from "@/lib/ledgerTheme";
import { computeEntityScenarios, WHO_OPTIONS } from "@/lib/entityScenarioCalculator";

// Redesigned per Megan's "Entity-Scenario-Modeler.dc.html" export (Aug 2026
// refresh): the article now styles itself directly off the shared Ledger
// design tokens (var(--color-bg), var(--font-heading), --color-accent-700,
// etc.) instead of its own bespoke navy/blue palette, so it reads as part
// of the same site as the dashboard rather than a separate blog theme.
// Calculator math is unchanged -- still lib/entityScenarioCalculator.js,
// already verified -- this file only changes how it's presented. The
// hover-tracking tooltip from the original vanilla-JS build is simplified
// to a native title attribute; everything else (copy, structure, warnings,
// "copy for my accountant" button) is a faithful port.

const M = (n) => (n < 0 ? "−" : "") + "$" + Math.round(Math.abs(n)).toLocaleString("en-US");

const COLORS = { tax: "var(--color-accent-700)", fees: "var(--color-accent-300)", left: "#17140e" };
const TEXTON = { tax: "#fff3e4", fees: "#3a270d", left: "var(--color-accent-300)" };

const eyebrow = {
  display: "block",
  fontFamily: "var(--font-heading)",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--color-accent-700)",
  marginBottom: 6,
};
const muted = (pct) => ({ color: `color-mix(in srgb, var(--color-text) ${pct}%, transparent)` });
const card = {
  border: "1px solid var(--color-divider)",
  borderRadius: "var(--radius-lg)",
  background: "var(--color-neutral-100)",
  boxShadow: "var(--shadow-sm)",
};
const h3Style = {
  fontFamily: "var(--font-heading)",
  fontSize: 30,
  fontWeight: 400,
  letterSpacing: "-0.015em",
  margin: "46px 0 14px",
  paddingBottom: 10,
  borderBottom: "1px solid var(--color-divider)",
};
const h4Pros = {
  fontFamily: "var(--font-heading)",
  fontSize: 18,
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--color-accent-700)",
  margin: "30px 0 12px",
};
const h4Cons = { ...h4Pros, color: "var(--color-neutral-700)" };
const h4When = { ...h4Pros, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" };
// Plain block <ul> -- NOT display:grid/flex. Setting display:grid directly
// on a <ul> blockifies its <li> children into grid items, and per the CSS
// Lists spec, list-item marker boxes aren't generated for flex/grid items
// -- that's what silently dropped the bullets. Spacing between items is
// done with li margin-bottom instead.
const ulStyle = { margin: "0 0 22px", paddingLeft: "1.2em" };
const liStyle = { marginBottom: 9 };
const olStyle = { margin: "0 0 22px", paddingLeft: "1.4em" };
const oliStyle = { marginBottom: 11 };
const note = {
  borderLeft: "1px solid var(--color-accent)",
  padding: "4px 0 4px 20px",
  margin: "0 0 24px",
  fontSize: 16,
  lineHeight: 1.72,
  ...muted(78),
};
const criticalBox = {
  border: "1px solid var(--color-accent-300)",
  background: "var(--color-accent-100)",
  borderRadius: "var(--radius-md)",
  padding: "18px 22px",
  margin: "26px 0",
  fontSize: 16.5,
  lineHeight: 1.7,
  color: "var(--color-accent-900)",
};

function List({ items }) {
  return (
    <ul style={ulStyle}>
      {items.map((it, i) => (
        <li key={i} style={i === items.length - 1 ? undefined : liStyle} dangerouslySetInnerHTML={{ __html: it }} />
      ))}
    </ul>
  );
}

const SOLE_PROS = [
  "Setup is free. There's nothing to file or renew.",
  "Simplest possible tax filing; Schedule C and Schedule SE with your 1040.",
  "No separate business tax return, no payroll, no annual report.",
  'You can use a DBA ("doing business as") to trade under a business name without forming anything.',
  "No state franchise tax or entity-level fee.",
  "Easy to abandon or change. Nothing to dissolve.",
];
const SOLE_CONS = [
  "<b>No liability separation.</b> A business debt or judgment can reach your personal assets, including savings, car, and in some circumstances, your home.",
  "Some clients, especially larger companies and agencies, require a registered entity before they'll sign and therefore won't work with sole proprietors.",
  "No entity name protection in your state.",
  "Business credit is essentially inseparable from your personal credit.",
];
const SOLE_WHEN = [
  "You're starting out, or freelancing part-time alongside a job.",
  "Your work is low-risk: You write, design, consult, or advise, and a mistake produces a disappointed client rather than injury or major financial loss.",
  "You have no employees or subcontractors.",
  "No client contract requires an entity.",
  "You carry professional liability insurance, which handles more of your actual risk than an entity does.",
];

const LLC_PROS = [
  "Liability separation between business and personal assets, when properly maintained.",
  "Satisfies clients and platforms that require a registered entity.",
  "Reserves your business name in your state.",
  "<b>It's the platform for an S-corp election later.</b> You can form the LLC now and elect S-corp treatment in a future year when the math works. You don't have to decide both at once.",
  "Multi-member LLCs get a written operating agreement, which is genuinely useful if you have a partner.",
  "Cleaner separation for bookkeeping, which makes a business bank account and business credit easier.",
];
const LLC_CONS = [
  "<b>Zero federal tax benefit</b> on its own.",
  "Costs money: formation fees, annual reports, registered agent, and in some states a franchise tax or gross-receipts fee whether or not you profit.",
  "The protection is conditional. You MUST keep business and personal finances separate.",
  "More paperwork to maintain, and penalties in some states for missing an annual report.",
  "Doesn't protect against your own professional mistakes (the next section covers this).",
  'Registering in a state where you don’t operate ("Delaware for the prestige") usually means registering as a foreign entity in your home state too, doubling the cost for no benefit.',
];
const LLC_WHEN = [
  "A client contract requires it.",
  "You have real liability exposure: you hire subcontractors, work on client premises, handle sensitive data, ship a physical product, or your errors could cause significant financial loss.",
  "You have a business partner and want the ownership terms documented.",
  "Your income is approaching the range where an S-corp election might pay off, and you want the structure in place.",
  "Your state's cost is low and the separation is worth it to you for peace of mind.",
];

const SCORP_PROS = [
  "Real self-employment tax savings once profit is high enough relative to your reasonable salary.",
  "You become a W-2 employee of your business, which can simplify mortgage applications and some benefit arrangements.",
  "Access to certain retirement plan structures with an employer-contribution side.",
  "Run health insurance premiums through the business, subject to specific rules for shareholder-employees.",
  "Distributions aren't subject to payroll tax, so income above your salary is taxed more lightly.",
];
const SCORP_CONS = [
  "<b>You must run actual payroll</b>, with withholding, quarterly employment tax returns, and a W-2. That means you must have a payroll provider.",
  "A separate business tax return (Form 1120-S) is required, which costs meaningfully more to prepare.",
  '<b>"Reasonable compensation" is a real IRS requirement, not a number you pick.</b> The IRS can reclassify distributions as wages, with back taxes and penalties. Its stated factors include your training and experience, duties, time devoted to the business, what you’d pay someone else to do the work, and industry norms.',
  "<b>It shrinks your QBI deduction.</b> Reasonable compensation from an S-corp is explicitly <i>not</i> qualified business income. Every dollar you shift from distribution to salary reduces the profit eligible for the 20% deduction. This is the factor most break-even articles ignore, and it matters a lot.",
  "Ongoing compliance: You may be penalized for missing a payroll deadline or a filing.",
  "Some states and cities don't recognize the federal S election, or impose entity-level taxes anyway.",
  "Harder to undo. Revoking an S election has consequences and timing rules.",
  "Strict eligibility: no more than 100 shareholders, no non-resident alien shareholders, one class of stock, and only certain kinds of owners.",
];
const SCORP_WHEN = [
  "Your net profit is comfortably above your reasonable salary, with a wide spread between them.",
  "Your profit is stable and predictable. Payroll is a fixed commitment.",
  "You're already paying for bookkeeping, so the added admin is incremental rather than new.",
  "You've run the actual numbers for <i>your</i> income and <i>your</i> reasonable salary, not a rule of thumb.",
];

const LLC_PROTECTS = [
  "Business contract disputes and business debts, where the LLC is the contracting party",
  "Claims arising from an employee's or subcontractor's conduct",
  "Business credit obligations you haven't personally guaranteed",
];
const LLC_DOES_NOT = [
  "<b>Your own professional negligence.</b> This is the big one. If you're a designer, developer, consultant, writer, or advisor and your work causes a client a loss, you can be sued personally for your own conduct. The LLC doesn't stand between you and your own mistake.",
  "<b>Debts you personally guarantee.</b> This includes most small business loans, credit lines, and commercial leases.",
  "<b>Unpaid payroll taxes.</b> Trust fund taxes withheld from employees carry personal liability for responsible persons.",
  "<b>Fraud or intentional wrongdoing.</b>",
  "<b>Claims where the separation wasn't maintained.</b> If you pay personal expenses from the business account, don't keep records, or treat the LLC as a pocket, a court may disregard it (commonly called piercing the veil).",
];
const RISK_TOOLS = [
  '<b>Professional liability insurance (errors and omissions).</b> This is the direct answer to "what if I mess up a client project." It’s usually inexpensive for low-risk service work and it’s what an LLC is often mistakenly bought to do.',
  "<b>Contract terms.</b> A limitation-of-liability clause capping your exposure at fees paid, a mutual indemnification clause, and a clear scope of work do more practical protection than an entity.",
  "<b>General liability insurance.</b> If you visit client sites or host clients.",
  "<b>Cyber liability.</b> If you handle client data.",
  "<b>Actually maintaining separation</b> if you do form an LLC: separate bank account, no personal spending from it, documented owner draws.",
];
const BOI_LEAVES = [
  "<b>US-formed LLCs and corporations: exempt.</b> No BOI filing, no update obligation, no deadline to watch.",
  "<b>US persons: exempt</b> from being reported as beneficial owners. FinCEN has said it will delete previously reported US-person information from its database.",
  "<b>Foreign entities registered to do business in the US: still required</b> to report beneficial ownership information for foreign individuals.",
  "If you filed a BOI report during the window when it was required, you don't need to do anything now.",
];
const SOURCES = [
  ["IRS", "https://www.irs.gov/businesses/small-businesses-self-employed/single-member-limited-liability-companies", "Single member limited liability companies"],
  ["IRS", "https://www.irs.gov/businesses/small-businesses-self-employed/self-employment-tax-social-security-and-medicare-taxes", "Self-employment tax (Social Security and Medicare taxes)"],
  ["IRS", "https://www.irs.gov/instructions/i2553", "Instructions for Form 2553"],
  ["IRS", "https://www.irs.gov/businesses/small-businesses-self-employed/s-corporation-compensation-and-medical-insurance-issues", "S corporation compensation and medical insurance issues"],
  ["IRS", "https://www.irs.gov/newsroom/qualified-business-income-deduction", "Qualified business income deduction"],
  ["IRS", "https://www.irs.gov/pub/irs-drop/rp-25-32.pdf", "Rev. Proc. 2025-32 (2026 QBI thresholds, standard deduction, brackets)"],
  ["SSA", "https://www.ssa.gov/oact/cola/cbb.html", "Contribution and benefit base (2026 Social Security wage base)"],
  ["FinCEN", "https://www.fincen.gov/news/news-releases/fincen-permanently-ends-beneficial-ownership-reporting-requirements-millions", "Final rule ending BOI reporting for US companies, 11 August 2026"],
  ["California FTB", "https://www.ftb.ca.gov/file/business/types/limited-liability-company/index.html", "Limited liability company annual tax and fee"],
];

const INTRO_CARDS = [
  {
    title: "Sole proprietor",
    body: "Free and simple to run, but if the business gets sued your own savings are exposed. There can only be one owner of the business.",
    cost: "Nothing to start. Nothing each year.",
  },
  {
    title: "LLC",
    body: "Lowers the risk to your personal savings for a small yearly fee. The protection has real gaps, though, and it changes nothing at all about your taxes.",
    cost: "About $35 to $500 to set up. Then $0 to $800 a year, depending on your state.",
  },
  {
    title: "S-corp",
    body: "Can cut your self-employment tax once profit is high enough, but it adds payroll, a second tax return and real yearly cost. You must have an LLC to have an S-corp.",
    cost: "Your LLC cost, plus roughly $700 to $3,500 a year, depending on how much you hand off.",
  },
];

const SIDE_BY_SIDE = [
  ["What it is", "The default. You start working and you are one.", "A company you register with your state.", "Not a company. It's a tax choice you make for a company you already have. You must have an LLC."],
  ["Setup", "Nothing to do.", "File with your state, pick a name, get an EIN. About a day of work.", "Set up the company first, then file Form 2553 with the IRS. Then start payroll."],
  ["Taxes", "Profit goes on your personal return. You pay 15.3% self-employment tax on it.", "<b>Exactly the same as sole proprietor.</b> An LLC does not change your tax.", "Split into a paycheck and the rest. Only the paycheck pays the 15.3%. That is the saving."],
  ["If you get sued", "Your own savings and the things you own are at risk.", "Puts some distance between business money and your own. Not a guarantee. Ask a lawyer what your real exposure is.", "Same as the company underneath it."],
  ["If you make a mistake in your own work", "Not protected.", "Not protected. Insurance covers this, not a company.", "Not protected."],
  ["Tax audit risk", "Schedule C draws attention, especially with big deductions next to small income, a home office, vehicle write-offs, or losses several years running.", "Same as sole proprietor. It is still a Schedule C.", "One flag stands out: a small paycheck next to a big profit share. The return is also more complex, so there is more to get wrong."],
  ["Paperwork each year", "None beyond your personal return.", "A short yearly report to your state to keep the LLC alive. Usually online, usually the same date each year.", "The state report, payroll forms every three months, a W-2 for yourself, and a separate company tax return."],
  ["Backing out", "Nothing to back out of. Keep working, or stop.", "File to close it with your state and stop paying the fee. Simple, but your set-up cost is gone.", "You can drop the tax choice and go back to being taxed as an LLC, but the timing is fussy and the IRS usually makes you wait five years before choosing it again."],
];

function inputsValid({ profit, salary, stateCost, adminCost }) {
  return [profit, salary, stateCost, adminCost].every((n) => isFinite(n) && n >= 0);
}

export default function EntityScenarioClient() {
  const [profit, setProfit] = useState(120000);
  const [status, setStatus] = useState("single");
  const [who, setWho] = useState("solo");
  const [salary, setSalary] = useState(70000);
  const [stateCost, setStateCost] = useState(0);
  const [adminCost, setAdminCost] = useState(2000);
  const [sstb, setSstb] = useState(false);
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    if (!inputsValid({ profit, salary, stateCost, adminCost })) return null;
    return computeEntityScenarios({ profit, status, salary, stateCost, adminCost, sstb });
  }, [profit, status, salary, stateCost, adminCost, sstb]);

  const cols = result?.cols || [];
  const pcts = (WHO_OPTIONS.find((w) => w.value === who) || WHO_OPTIONS[0]).pcts;
  const salPct = profit > 0 ? Math.round((salary / profit) * 100) : null;

  const headline = useMemo(() => {
    if (!result || profit <= 0) return "Put in a profit above to see all three side by side.";
    const [sole, llc, scorp] = result.cols;
    const llcD = llc.left - sole.left;
    const scD = scorp.left - sole.left;
    const em = { fontWeight: 600, fontStyle: "italic", color: "var(--color-accent-700)" };
    const a =
      Math.abs(llcD) < 1 ? (
        <>
          Sole proprietor and LLC come out <b style={em}>exactly the same</b>. An LLC does not change your tax.
        </>
      ) : (
        <>
          The LLC leaves <b style={em}>{M(-llcD)} less</b>. That is only the state fee. The tax is the same.
        </>
      );
    let b;
    if (Math.abs(scD) < 300) b = " The S-corp lands within a few hundred dollars of the other two.";
    else if (scD > 0)
      b = (
        <>
          {" "}
          The S-corp leaves <b style={em}>{M(scD)} more</b>, after paying for payroll and the second tax return.
        </>
      );
    else
      b = (
        <>
          {" "}
          The S-corp leaves <b style={em}>{M(-scD)} less</b>. Here the fees cost more than the tax it saves.
        </>
      );
    return (
      <>
        {a}
        {b}
      </>
    );
  }, [result, profit]);

  function copyForAccountant() {
    if (!result) return;
    const L = [
      "Sole proprietor vs LLC vs S-corp — modelled for the 2026 federal tax year",
      "",
      "Profit: " + M(profit),
      "Filing status: " + (status === "mfj" ? "married filing jointly" : "single"),
      "Paycheck used for the S-corp: " + M(salary),
      "State fee: " + M(stateCost) + "   Payroll and extra tax prep: " + M(adminCost),
      "Consulting / health / law / finance type of work: " + (sstb ? "yes" : "no"),
      "",
    ];
    result.cols.forEach((c) => {
      L.push(
        c.label,
        "  paycheck " + (c.wages ? M(c.wages) : "—") + " / profit " + (c.dist ? M(c.dist) : "—"),
        "  self-employment or payroll tax " + M(c.workTax),
        "  20% small business deduction " + M(c.qbiDed) + (c.qbiLimited ? " (limited)" : ""),
        "  income you get taxed on " + M(c.taxable),
        "  income tax " + M(c.incomeTax),
        "  total tax " + M(c.tax),
        "  fees and forms " + M(c.fees),
        "  what is left " + M(c.left),
        ""
      );
    });
    L.push(
      "Federal tax only. Assumes a full year, the standard deduction, no other income,",
      "no employees besides the owner, and no retirement or health insurance deductions.",
      "The paycheck figure is something I chose, not something the tool worked out."
    );
    navigator.clipboard.writeText(L.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3500);
    });
  }

  return (
    <div style={LEDGER_TOKENS}>
      <PublicHeader />
      <div style={{ background: "var(--color-bg)", color: "var(--color-text)", fontFamily: "var(--font-body)", fontSize: 17, lineHeight: 1.7 }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "46px 22px 72px" }}>
          <nav aria-label="Breadcrumb" style={{ fontSize: 13, marginBottom: 22, ...muted(55) }}>
            <Link href="/" style={{ color: "inherit" }}>Home</Link> / Blog / Self Employed / Sole Proprietor vs. LLC vs. S-Corp
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <span style={{ width: 30, height: 1, background: "var(--color-accent)" }} />
            <span style={{ ...eyebrow, marginBottom: 0, fontSize: 11.5, fontVariantNumeric: "lining-nums tabular-nums" }}>2026 tax year</span>
          </div>

          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(34px, 5.4vw, 58px)", fontWeight: 400, lineHeight: 1.04, letterSpacing: "-0.02em", margin: "0 0 16px", maxWidth: "26em" }}>
            For Self Employed: <span style={{ fontStyle: "italic", color: "var(--color-accent-700)" }}>Sole Proprietor vs. LLC vs. S-Corp</span>
          </h1>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gridTemplateRows: "auto auto auto", gap: 18, margin: "38px 0 0" }}>
            {INTRO_CARDS.map((c) => (
              <div key={c.title} style={{ ...card, padding: "22px 24px 24px", display: "grid", gridRow: "span 3", gridTemplateRows: "subgrid", alignContent: "start" }}>
                <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 25, fontWeight: 400, margin: "0 0 10px" }}>{c.title}</h3>
                <p style={{ fontSize: 16, lineHeight: 1.62, margin: "0 0 20px", ...muted(78) }}>{c.body}</p>
                <div style={{ borderTop: "1px solid var(--color-divider)", paddingTop: 14 }}>
                  <span style={eyebrow}>What it costs</span>
                  <span style={{ fontSize: 15, lineHeight: 1.55, ...muted(72) }}>{c.cost}</span>
                </div>
              </div>
            ))}
          </div>

          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(26px, 3.4vw, 34px)", fontWeight: 400, letterSpacing: "-0.015em", margin: "52px 0 4px" }}>Side by side</h2>
          <div style={{ height: 1, background: "var(--color-accent)", width: 54, marginBottom: 22 }} />

          <div style={{ overflowX: "auto", borderTop: "1px solid var(--color-divider)", borderBottom: "1px solid var(--color-divider)" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 680, fontSize: 15 }}>
              <thead>
                <tr>
                  <th scope="col" style={{ textAlign: "left", padding: "14px 16px", borderBottom: "1px solid var(--color-accent)" }} />
                  {["Sole proprietor", "LLC", "S-corp"].map((h) => (
                    <th key={h} scope="col" style={{ textAlign: "left", padding: "14px 16px", borderBottom: "1px solid var(--color-accent)", fontFamily: "var(--font-heading)", fontSize: 12, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SIDE_BY_SIDE.map(([label, ...cells], i) => (
                  <tr key={label}>
                    <th scope="row" style={{ textAlign: "left", verticalAlign: "top", width: i === 0 ? "19%" : undefined, minWidth: i === 0 ? 150 : undefined, padding: "15px 16px", borderBottom: i === SIDE_BY_SIDE.length - 1 ? "none" : "1px solid var(--color-divider)", fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 600, lineHeight: 1.3 }}>
                      {label}
                    </th>
                    {cells.map((cellHtml, j) => (
                      <td key={j} style={{ verticalAlign: "top", padding: "15px 16px", borderBottom: i === SIDE_BY_SIDE.length - 1 ? "none" : "1px solid var(--color-divider)", lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: cellHtml }} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <article style={{ maxWidth: "40em", margin: "0 auto", fontSize: 17.5, lineHeight: 1.75 }}>
            <div id="guide" style={{ height: 1, marginTop: 48 }} />

            <div style={note}>
              <b style={{ fontFamily: "var(--font-heading)", fontSize: 18, fontWeight: 600, color: "var(--color-text)" }}>Before you read this.</b> This is general educational information, not tax or legal advice. It explains how the rules generally work. It does not tell you what to do in your own situation, and it cannot. These decisions turn on facts specific to you: your state, your income, your filing status, and the nature of your work. The right answer for one self employed individual is regularly the wrong answer for another. Talk to a CPA or an attorney licensed in your state before acting on any of it.
            </div>

            <nav aria-label="In this guide" style={{ border: "1px solid var(--color-divider)", borderRadius: "var(--radius-lg)", background: "var(--color-neutral-100)", padding: "22px 26px", margin: "0 0 36px" }}>
              <b style={{ display: "block", fontFamily: "var(--font-heading)", fontSize: 11.5, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--color-accent-700)", marginBottom: 14 }}>In this guide</b>
              <ol style={{ margin: 0, paddingLeft: "1.4em", display: "grid", gap: 8, fontSize: 16.5 }}>
                <li><a href="#opt1">Option 1: Sole proprietor</a></li>
                <li><a href="#opt2">Option 2: LLC with default tax treatment</a></li>
                <li><a href="#opt3">Option 3: S-corp election</a></li>
                <li><a href="#breakeven">At what income does an S-corp actually make sense?</a></li>
                <li><a href="#sued">Does an LLC actually protect you from being sued?</a></li>
                <li><a href="#boi">Does your LLC need to file a BOI report?</a></li>
              </ol>
            </nav>

            <h3 id="opt1" style={h3Style}>Option 1: Sole proprietor</h3>
            <p style={{ margin: "0 0 14px" }}><b>What it is:</b> The default. If you have clients or customers paying you money, you are a sole proprietor by default.</p>
            <h4 style={h4Pros}>Pros</h4>
            <List items={SOLE_PROS} />
            <h4 style={h4Cons}>Cons</h4>
            <List items={SOLE_CONS} />
            <h4 style={h4When}>When it genuinely makes sense</h4>
            <List items={SOLE_WHEN} />
            <p style={{ margin: "0 0 14px" }}>Plenty of self employed individuals earning well into six figures operate as sole proprietors and are fine.</p>

            <h3 id="opt2" style={h3Style}>Option 2: LLC with default tax treatment</h3>
            <p style={{ margin: "0 0 14px" }}><b>What it is:</b> A limited liability company formed under state law, taxed exactly like a sole proprietorship (single-member) or partnership (multi-member).</p>
            <h4 style={h4Pros}>Pros</h4>
            <List items={LLC_PROS} />
            <h4 style={h4Cons}>Cons</h4>
            <List items={LLC_CONS} />
            <h4 style={h4When}>When it genuinely makes sense</h4>
            <List items={LLC_WHEN} />

            <h3 id="opt3" style={h3Style}>Option 3: S-corp election</h3>
            <div style={note}>
              <b style={{ fontFamily: "var(--font-heading)", fontSize: 18, fontWeight: 600, color: "var(--color-text)" }}>On the numbers in this section.</b> All figures are for the 2026 tax year and come from the IRS and SSA sources listed at the end. Tax figures change every year, so check the date above. "Reasonable compensation" has no published formula or safe number. It is a judgment call an accountant should make with you, and getting it wrong carries a real cost in either direction.
            </div>
            <p style={{ margin: "0 0 14px" }}><b>What it is:</b> A tax election, filed on Form 2553, available to an LLC or a corporation. It changes how your business profit is taxed, but doesn't change your legal structure.</p>
            <p style={{ margin: "0 0 14px" }}><b>How the tax saving works.</b> As a sole proprietor, essentially all your net profit is subject to 15.3% self-employment tax. With an S-corp election, you become an employee of your own business. You pay yourself a <i>reasonable salary</i>, which carries payroll taxes at the same combined 15.3%. Remaining profit is distributed to you and is <b>not</b> subject to self-employment or payroll tax.</p>
            <p style={{ margin: "0 0 14px" }}>The saving is the payroll tax you avoid on the distribution portion.</p>
            <h4 style={h4Pros}>Pros</h4>
            <List items={SCORP_PROS} />
            <h4 style={h4Cons}>Cons</h4>
            <List items={SCORP_CONS} />
            <div style={criticalBox}>
              <b style={{ fontFamily: "var(--font-heading)", fontSize: 18, fontWeight: 600 }}>Critical deadline.</b> Form 2553 must be filed no more than <b>2 months and 15 days after the start of the tax year</b> you want it to apply to (so mid-March for a calendar-year business) or any time during the <i>preceding</i> year. Miss it and late-election relief is available under Rev. Proc. 2013-30 if you can show reasonable cause and acted diligently, but you don't want to depend on it.
            </div>
            <h4 style={h4When}>When it genuinely makes sense</h4>
            <List items={SCORP_WHEN} />

            <h3 id="breakeven" style={h3Style}>At what income does an S-corp actually make sense?</h3>
            <p style={{ margin: "0 0 14px" }}>Here are the four components to consider:</p>
            <ol style={olStyle}>
              <li style={oliStyle}><b>Payroll tax saved</b>: roughly 15.3% of the profit you take as distribution instead of salary. (Precisely: self-employment tax applies to 92.35% of net profit, which slightly reduces the sole-proprietor side.)</li>
              <li style={oliStyle}><b>Administrative cost added</b>: Payroll service, 1120-S preparation, any state entity tax. This can be realistically $1,500&ndash;$4,000 a year.</li>
              <li style={oliStyle}><b>QBI deduction lost</b>: 20% of the amount you convert from distribution to salary, multiplied by your marginal tax rate.</li>
              <li><b>The Social Security wage base</b>: For 2026, the 12.4% Social Security portion applies only to the first $184,500. Above that, only the 2.9% Medicare portion continues (plus 0.9% additional Medicare tax above $200,000 single / $250,000 married filing jointly). So the savings per dollar shrink at higher incomes.</li>
            </ol>
            <p style={{ margin: "0 0 14px", fontSize: 16.5, ...muted(74) }}>The calculator below runs all four of these on your own numbers.</p>

            <div style={{ width: "min(1000px, calc(100vw - 44px))", position: "relative", left: "50%", transform: "translateX(-50%)", margin: "40px 0 48px" }}>
              <h2 id="top-calc" style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(26px, 3.4vw, 34px)", fontWeight: 400, letterSpacing: "-0.015em", margin: "56px 0 4px" }}>Try your own numbers</h2>
              <div style={{ height: 1, background: "var(--color-accent)", width: 54, marginBottom: 22 }} />

              <div style={{ ...note, maxWidth: "62em" }}>
                <p style={{ margin: 0, fontSize: 16, lineHeight: 1.7, ...muted(80) }}>
                  <strong style={{ fontFamily: "var(--font-heading)", fontSize: 18, fontWeight: 600 }}>Note:</strong> This is a simple simulation, but not a recommendation. Nothing here ranks them or picks one for you.
                </p>
              </div>

              <div style={{ ...card, padding: "28px 28px 30px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "26px 30px" }}>
                  <div>
                    <label htmlFor="profit" style={{ display: "block", fontFamily: "var(--font-heading)", fontSize: 12, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 9, ...muted(62) }}>Profit for the year</label>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", fontSize: 17, ...muted(45) }}>$</span>
                      <input type="number" id="profit" min="0" step="1000" value={profit} onChange={(e) => setProfit(parseFloat(e.target.value) || 0)}
                        style={{ width: "100%", boxSizing: "border-box", fontFamily: "var(--font-body)", fontSize: 18, color: "var(--color-text)", background: "transparent", border: 0, borderBottom: "1px solid var(--color-divider)", padding: "9px 2px 9px 16px", fontVariantNumeric: "tabular-nums" }} />
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.55, marginTop: 8, ...muted(55) }}>Money left over after you pay business costs. Before you pay yourself.</div>
                  </div>
                  <div>
                    <label htmlFor="status" style={{ display: "block", fontFamily: "var(--font-heading)", fontSize: 12, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 9, ...muted(62) }}>How you file taxes</label>
                    <select id="status" value={status} onChange={(e) => setStatus(e.target.value)}
                      style={{ width: "100%", boxSizing: "border-box", fontFamily: "var(--font-body)", fontSize: 17, color: "var(--color-text)", background: "transparent", border: "1px solid var(--color-divider)", borderRadius: "var(--radius-md)", padding: "9px 10px" }}>
                      <option value="single">Single</option>
                      <option value="mfj">Married, filing together</option>
                    </select>
                    <div style={{ fontSize: 14, lineHeight: 1.55, marginTop: 8, ...muted(55) }}>This assumes no other income in your home.</div>
                  </div>

                  <div style={{ gridColumn: "1 / -1", borderTop: "1px solid var(--color-divider)", paddingTop: 24 }}>
                    <label htmlFor="who" style={{ display: "block", fontFamily: "var(--font-heading)", fontSize: 12, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 9, ...muted(62) }}>Who does the work?</label>
                    <select id="who" value={who} onChange={(e) => setWho(e.target.value)}
                      style={{ width: "auto", maxWidth: "100%", minWidth: 320, boxSizing: "border-box", fontFamily: "var(--font-body)", fontSize: 17, color: "var(--color-text)", background: "transparent", border: "1px solid var(--color-divider)", borderRadius: "var(--radius-md)", padding: "9px 10px" }}>
                      {WHO_OPTIONS.map((w) => (<option key={w.value} value={w.value}>{w.label}</option>))}
                    </select>
                    <div style={{ fontSize: 14, lineHeight: 1.55, marginTop: 8, ...muted(55) }}>This does not change any tax math. It only changes the paycheck range we suggest below.</div>
                  </div>

                  <div style={{ gridColumn: "1 / -1", borderTop: "1px solid var(--color-divider)", paddingTop: 24 }}>
                    <label htmlFor="salary" style={{ display: "block", fontFamily: "var(--font-heading)", fontSize: 12, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 9, ...muted(62) }}>
                      The paycheck part <span style={{ letterSpacing: "0.1em", color: "var(--color-accent-700)" }}>&mdash; S-corp only</span>
                    </label>
                    <p style={{ fontSize: 16, lineHeight: 1.68, margin: "0 0 16px", maxWidth: "62em", ...muted(76) }}>An S-corp splits your profit into two parts: a <b>paycheck</b>, and <b>the rest</b>. You take both. Only the paycheck pays payroll tax, and that is where the savings come from.</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                      <div style={{ position: "relative", maxWidth: 180 }}>
                        <span style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", fontSize: 17, ...muted(45) }}>$</span>
                        <input type="number" id="salary" min="0" step="1000" value={salary} onChange={(e) => setSalary(parseFloat(e.target.value) || 0)}
                          style={{ width: "100%", boxSizing: "border-box", fontFamily: "var(--font-body)", fontSize: 18, color: "var(--color-text)", background: "transparent", border: 0, borderBottom: "1px solid var(--color-divider)", padding: "9px 2px 9px 16px", fontVariantNumeric: "tabular-nums" }} />
                      </div>
                      <span style={{ fontFamily: "var(--font-heading)", fontSize: 14, letterSpacing: "0.08em", textTransform: "uppercase", fontVariantNumeric: "lining-nums tabular-nums", ...muted(55) }}>
                        {salPct !== null ? salPct + "% of profit" : ""}
                      </span>
                      <span style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
                        {pcts.map((p) => {
                          const on = profit > 0 && Math.abs(salPct - p) < 0.6;
                          return (
                            <button key={p} type="button" onClick={() => setSalary(Math.round((profit * p) / 100 / 500) * 500)}
                              style={{ fontFamily: "var(--font-heading)", fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", padding: "8px 15px", borderRadius: 999, cursor: "pointer", fontVariantNumeric: "lining-nums tabular-nums", border: `1px solid ${on ? "var(--color-accent)" : "var(--color-divider)"}`, background: on ? "var(--color-accent-100)" : "transparent", color: on ? "var(--color-accent-800)" : "color-mix(in srgb, var(--color-text) 65%, transparent)" }}>
                              {p}%
                            </button>
                          );
                        })}
                      </span>
                    </div>
                    <div style={{ fontSize: 14.5, lineHeight: 1.6, marginTop: 12, maxWidth: "62em", ...muted(58) }}>
                      <b>How to pick a number:</b> think about what your salary would be if you did this same job as an employee at a company. Pick the number closest to that. If it is too low you could owe back taxes. This is really a number an accountant should set.
                    </div>
                  </div>

                  <div style={{ gridColumn: "1 / -1", borderTop: "1px solid var(--color-divider)", paddingTop: 24 }}>
                    <label htmlFor="stateCost" style={{ display: "block", fontFamily: "var(--font-heading)", fontSize: 12, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 9, ...muted(62) }}>Yearly state fee, if you know it</label>
                    <div style={{ position: "relative", maxWidth: 180 }}>
                      <span style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", fontSize: 17, ...muted(45) }}>$</span>
                      <input type="number" id="stateCost" min="0" step="25" value={stateCost} onChange={(e) => setStateCost(parseFloat(e.target.value) || 0)}
                        style={{ width: "100%", boxSizing: "border-box", fontFamily: "var(--font-body)", fontSize: 18, color: "var(--color-text)", background: "transparent", border: 0, borderBottom: "1px solid var(--color-divider)", padding: "9px 2px 9px 16px", fontVariantNumeric: "tabular-nums" }} />
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.55, marginTop: 8, maxWidth: "62em", ...muted(55) }}>Only the LLC and S-corp pay this. It runs from $0 to $800 a year depending on your state, and California is the highest at $800. Leave it at 0 if you are not sure.</div>
                  </div>

                  <div style={{ gridColumn: "1 / -1", borderTop: "1px solid var(--color-divider)", paddingTop: 24 }}>
                    <label htmlFor="adminCost" style={{ display: "block", fontFamily: "var(--font-heading)", fontSize: 12, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 9, ...muted(62) }}>Who would handle your payroll and tax returns?</label>
                    <p style={{ fontSize: 16, lineHeight: 1.68, margin: "0 0 12px", maxWidth: "62em", ...muted(76) }}>With an S-corp, your company pays you like an employee. So there is payroll to run for <b>one person &mdash; you</b>. There is also a second tax return, for the company. Both cost money every year, and this is the part people forget.</p>
                    <p style={{ fontSize: 16, lineHeight: 1.68, margin: "0 0 16px", maxWidth: "62em", ...muted(56) }}>Contractors work differently. You pay them and send a 1099. They never go on your payroll, so having them or not does not change this cost.</p>
                    <div style={{ position: "relative", maxWidth: 180 }}>
                      <span style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", fontSize: 17, ...muted(45) }}>$</span>
                      <input type="number" id="adminCost" min="0" step="250" value={adminCost} onChange={(e) => setAdminCost(parseFloat(e.target.value) || 0)}
                        style={{ width: "100%", boxSizing: "border-box", fontFamily: "var(--font-body)", fontSize: 18, color: "var(--color-text)", background: "transparent", border: 0, borderBottom: "1px solid var(--color-divider)", padding: "9px 2px 9px 16px", fontVariantNumeric: "tabular-nums" }} />
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.55, marginTop: 8, maxWidth: "62em", ...muted(55) }}>Most people land somewhere between <b>$700 and $3,500 a year</b>, depending on how much you hand off. Only the company return is extra &mdash; you would pay for a personal return either way. Get a real quote before you decide anything.</div>
                  </div>

                  <div style={{ gridColumn: "1 / -1", borderTop: "1px solid var(--color-divider)", paddingTop: 24 }}>
                    <span style={{ display: "block", fontFamily: "var(--font-heading)", fontSize: 12, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 12, ...muted(62) }}>Kind of work</span>
                    <label htmlFor="sstb" style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer", maxWidth: "62em" }}>
                      <input type="checkbox" id="sstb" checked={sstb} onChange={(e) => setSstb(e.target.checked)} style={{ width: 16, height: 16, margin: "6px 0 0", flex: "none", accentColor: "var(--color-accent)" }} />
                      <span style={{ fontSize: 15.5, lineHeight: 1.6, ...muted(74) }}>My work is consulting, health, law, money, accounting, acting or sports. This only matters at higher incomes.</span>
                    </label>
                  </div>
                </div>
              </div>

              {result?.warnSalary && (
                <div style={{ border: "1px solid var(--color-accent-300)", background: "var(--color-accent-100)", borderLeft: "3px solid var(--color-accent)", borderRadius: "var(--radius-md)", padding: "15px 20px", margin: "22px 0 0", fontSize: 15.5, lineHeight: 1.68, color: "var(--color-accent-900)" }}>
                  The paycheck you put in is as big as the whole profit. It has been capped at the profit, so there is nothing left to take as profit. That removes the only tax difference the S-corp would show.
                </div>
              )}
              {result?.warnQbi && (
                <div style={{ border: "1px solid var(--color-accent-300)", background: "var(--color-accent-100)", borderLeft: "3px solid var(--color-accent)", borderRadius: "var(--radius-md)", padding: "15px 20px", margin: "22px 0 0", fontSize: 15.5, lineHeight: 1.68, color: "var(--color-accent-900)" }}>
                  At this income the 20% small business deduction starts to get cut back, and the rules get tricky. This tool keeps them simple. Ask an accountant about these numbers before you rely on them.
                </div>
              )}

              <p style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(21px, 2.6vw, 27px)", fontWeight: 400, lineHeight: 1.42, margin: "38px 0 26px", maxWidth: "40em" }}>{headline}</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {cols.map((c) => {
                  const total = Math.max(1, cols[0].profit);
                  const segs = [
                    ["tax", "Tax", c.tax],
                    ["fees", "Fees and forms", c.fees],
                    ["left", "What is left", c.left],
                  ];
                  return (
                    <div key={c.label} style={{ display: "grid", gridTemplateColumns: "minmax(0,168px) 1fr", gap: 16, alignItems: "center" }}>
                      <div>
                        <div style={{ fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 600 }}>{c.label}</div>
                        <div style={{ fontFamily: "var(--font-heading)", fontSize: 23, fontWeight: 400, fontVariantNumeric: "lining-nums tabular-nums", marginTop: 1 }}>{M(c.left)}</div>
                      </div>
                      <div style={{ display: "flex", height: 40, borderRadius: "var(--radius-md)", overflow: "hidden", background: "var(--color-neutral-200)" }}>
                        {segs.map(([k, name, val]) => {
                          const v = Math.max(0, val);
                          const pct = (v / total) * 100;
                          if (pct <= 0) return null;
                          return (
                            <div key={k} title={name + ": " + M(v)}
                              style={{ width: pct + "%", background: COLORS[k], color: TEXTON[k], display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 10, fontFamily: "var(--font-heading)", fontSize: 13, fontWeight: 600, letterSpacing: "0.04em", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", boxShadow: "0 0 0 1px var(--color-bg) inset" }}>
                              {pct > 13 ? M(v) : ""}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 22, flexWrap: "wrap", margin: "20px 0 0", fontFamily: "var(--font-heading)", fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase", ...muted(60) }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}><i style={{ width: 12, height: 12, borderRadius: 2, flex: "none", background: "var(--color-accent-700)", display: "inline-block" }} />Tax</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}><i style={{ width: 12, height: 12, borderRadius: 2, flex: "none", background: "var(--color-accent-300)", display: "inline-block" }} />Fees and forms</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}><i style={{ width: 12, height: 12, borderRadius: 2, flex: "none", background: "#17140e", display: "inline-block" }} />What is left</span>
              </div>
              <p style={{ margin: "14px 0 0", fontSize: 14.5, ...muted(55) }}>Each bar adds up to the same profit. The parts show where it goes.</p>

              <div style={{ overflowX: "auto", borderTop: "1px solid var(--color-divider)", borderBottom: "1px solid var(--color-divider)", marginTop: 34 }}>
                <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 660, fontSize: 15 }}>
                  <caption style={{ textAlign: "left", padding: "16px 16px 14px", fontSize: 14, fontStyle: "italic", ...muted(58) }}>Federal tax only, for a full 2026 tax year, using the numbers above.</caption>
                  <thead>
                    <tr>
                      <th scope="col" style={{ textAlign: "left", padding: "12px 16px", borderBottom: "1px solid var(--color-accent)", borderTop: "1px solid var(--color-divider)", fontFamily: "var(--font-heading)", fontSize: 12, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>Each year</th>
                      {cols.map((c) => (
                        <th key={c.label} scope="col" style={{ textAlign: "right", padding: "12px 16px", borderBottom: "1px solid var(--color-accent)", borderTop: "1px solid var(--color-divider)", fontFamily: "var(--font-heading)", fontSize: 12, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>{c.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <ResultRows cols={cols} />
                  </tbody>
                </table>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginTop: 26 }}>
                <button type="button" onClick={copyForAccountant} disabled={!result}
                  style={{ fontFamily: "var(--font-heading)", fontSize: 15, cursor: result ? "pointer" : "default", padding: "13px 24px", borderRadius: "var(--radius-md)", background: "var(--color-accent)", border: "1px solid var(--color-accent)", color: "#fff", opacity: result ? 1 : 0.5 }}>
                  Copy this for my accountant
                </button>
                {copied && (
                  <span style={{ fontFamily: "var(--font-heading)", fontSize: 13.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>Copied. Paste it into an email.</span>
                )}
              </div>
            </div>

            <h3 id="sued" style={h3Style}>Does an LLC actually protect you from being sued?</h3>
            <div style={note}>
              <b style={{ fontFamily: "var(--font-heading)", fontSize: 18, fontWeight: 600, color: "var(--color-text)" }}>On this section specifically.</b> Liability is a matter of state law, and it turns on the facts of a particular claim. What follows describes how LLC protection is generally understood to work. It is not legal advice, it is not a complete account, and it is not a prediction about any real situation. Whether an LLC would shield you from a specific claim is a question for an attorney licensed in your state. If you take one thing from this section, make it the point about insurance.
            </div>
            <p style={{ margin: "0 0 14px" }}><b>Anyone can sue you regardless of your entity.</b> An LLC doesn't prevent lawsuits. What it can do is limit which <i>assets</i> are available to satisfy a judgment.</p>
            <p style={{ margin: "0 0 14px" }}><b>What an LLC generally does protect against:</b><br /><span style={{ fontSize: 15.5, fontStyle: "italic", ...muted(55) }}>(However, this is not a complete list and is not legal advice.)</span></p>
            <List items={LLC_PROTECTS} />
            <p style={{ margin: "0 0 14px" }}><b>What an LLC generally does NOT protect against:</b><br /><span style={{ fontSize: 15.5, fontStyle: "italic", ...muted(55) }}>(But not limited to the below. Not legal advice.)</span></p>
            <List items={LLC_DOES_NOT} />
            <h4 style={h4When}>What actually handles a self employed individual&rsquo;s real risk</h4>
            <p style={{ margin: "0 0 14px" }}>For most solo self employed individuals, the exposures that would genuinely hurt are professional mistakes and contract disputes, and the LLC addresses neither well. The tools that do:</p>
            <List items={RISK_TOOLS} />
            <p style={{ margin: "0 0 14px" }}>None of this means don't form an LLC. It means form it for the right reason, and don't let it substitute for insurance and decent contracts.</p>

            <h3 id="boi" style={h3Style}>Does your LLC need to file a BOI report? (2026: No)</h3>
            <p style={{ margin: "0 0 14px" }}><b>Short answer: if your LLC is a US company, no. You have nothing to file.</b></p>
            <div style={note}>
              <b style={{ fontFamily: "var(--font-heading)", fontSize: 18, fontWeight: 600, color: "var(--color-text)" }}>Check the date on this one.</b> This reflects FinCEN's final rule as of 20 August 2026. Beneficial ownership reporting changed several times between 2024 and 2026 and could change again. Confirm the current position with FinCEN or your accountant before relying on it.
            </div>
            <p style={{ margin: "0 0 14px" }}>This one confused a lot of people for two years, and much of the content still online is out of date.</p>
            <p style={{ margin: "0 0 14px" }}><b>What happened.</b> The Corporate Transparency Act required most small entities to report beneficial ownership information to FinCEN, with filings starting in January 2024. After extensive litigation, FinCEN issued an interim final rule on <b>March 26, 2025</b> redefining "reporting company" to cover only foreign entities. Then on <b>August 11, 2026</b>, FinCEN issued a <b>final rule</b> permanently removing the requirement for US companies and US persons to report.</p>
            <p style={{ margin: "0 0 14px" }}><b>Where that leaves you:</b></p>
            <List items={BOI_LEAVES} />
            <p style={{ margin: "0 0 14px" }}><b>Two things to still check:</b></p>
            <ol style={olStyle}>
              <li style={oliStyle}><b>Your state may have its own version.</b> A handful of states have enacted or proposed beneficial-ownership disclosure laws that operate independently of the federal rule.</li>
              <li><b>Be skeptical of BOI filing services.</b> Companies charged fees to file these reports, and some continued marketing the service after the requirement lapsed. There is no federal filing fee, because there is no federal filing.</li>
            </ol>
            <p style={{ margin: "0 0 14px" }}>If you see a letter or email demanding a BOI filing fee with a deadline, treat it as a solicitation, not a government notice.</p>

            <div style={{ marginTop: 48, paddingTop: 26, borderTop: "1px solid var(--color-divider)" }}>
              <p style={{ fontSize: 16, lineHeight: 1.72, margin: "0 0 14px", ...muted(74) }}>
                <b style={{ fontFamily: "var(--font-heading)", fontSize: 18, fontWeight: 600, color: "var(--color-text)" }}>About this article.</b> This is general educational information about how these rules work, not tax or legal advice for your situation. Entity and tax decisions depend on facts specific to you &mdash; your state, your income, your filing status, the nature of your work &mdash; and the right answer for one self employed individual is often wrong for another. Figures are current for the 2026 tax year as of publication. Rules change; check the date. Talk to a CPA or attorney licensed in your state before making a decision.
              </p>
              <h4 style={h4Pros}>Sources</h4>
              <ul style={{ margin: 0, paddingLeft: "1.2em", fontSize: 16, lineHeight: 1.6 }}>
                {SOURCES.map(([org, url, label], i) => (
                  <li key={url} style={i === SOURCES.length - 1 ? undefined : { marginBottom: 8 }}>{org} &mdash; <a href={url} target="_blank" rel="noopener noreferrer">{label}</a></li>
                ))}
              </ul>
            </div>
          </article>

          <footer style={{ marginTop: 56, paddingTop: 26, borderTop: "1px solid var(--color-divider)", fontSize: 15, lineHeight: 1.7, ...muted(60) }}>
            <p style={{ margin: "0 0 12px" }}>This is a model, not advice. It uses 2026 federal tax rules. It leaves out state income tax, other income, and many deductions. It assumes a full year, no employees but you, and that you take the standard deduction. The paycheck amount is something you choose, not something this tool works out, because that part is a judgment call. Talk to an accountant or a lawyer in your state before you decide anything.</p>
            <p style={{ margin: 0 }}>Numbers come from <a href="https://www.irs.gov/pub/irs-drop/rp-25-32.pdf" target="_blank" rel="noopener noreferrer">IRS Rev. Proc. 2025-32</a>, <a href="https://www.irs.gov/pub/irs-drop/n-25-67.pdf" target="_blank" rel="noopener noreferrer">IRS Notice 2025-67</a> and the <a href="https://www.ssa.gov/oact/cola/cbb.html" target="_blank" rel="noopener noreferrer">SSA wage base</a>.</p>
          </footer>
        </div>
      </div>
    </div>
  );
}

function ResultRows({ cols }) {
  if (!cols.length) return null;
  const same = (a, b) => Math.abs(a - b) < 0.5;
  const TH = { textAlign: "right", padding: "11px 16px", borderBottom: "1px solid var(--color-divider)", fontVariantNumeric: "tabular-nums", verticalAlign: "top" };
  const TD1 = { textAlign: "left", padding: "11px 16px", borderBottom: "1px solid var(--color-divider)", verticalAlign: "top" };
  const grp = (t) => (
    <tr key={"grp-" + t}>
      <td colSpan={4} style={{ padding: "22px 16px 8px", borderBottom: "1px solid var(--color-divider)", fontFamily: "var(--font-heading)", fontSize: 11.5, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>{t}</td>
    </tr>
  );
  const row = (label, vals, kind) => {
    const boldExtra = kind === "total" ? { fontWeight: 600, fontSize: 17 } : {};
    const topExtra = kind === "total" ? { borderTop: "1px solid var(--color-accent)", borderBottom: "none" } : {};
    return (
      <tr key={label}>
        <td style={{ ...TD1, ...boldExtra, ...topExtra }}>{label}</td>
        {vals.map((v, i) => {
          const txt = typeof v === "number" ? M(v) : v;
          const dim = i === 1 && typeof v === "number" && same(vals[0], vals[1]) ? { color: "color-mix(in srgb, var(--color-text) 45%, transparent)" } : {};
          return <td key={i} style={{ ...TH, ...boldExtra, ...topExtra, ...dim }}>{txt}</td>;
        })}
      </tr>
    );
  };
  return (
    <>
      {grp("How the money reaches you")}
      {row("Profit for the year", cols.map((x) => x.profit))}
      {row("Paid as a paycheck", cols.map((x) => (x.wages === 0 ? "—" : M(x.wages))))}
      {row("Paid as profit", cols.map((x) => (x.dist === 0 ? "—" : M(x.dist))))}
      {grp("Federal tax")}
      {row("Self-employment or payroll tax", cols.map((x) => x.workTax))}
      {row("20% small business deduction", cols.map((x) => x.qbiDed))}
      {row("Income you get taxed on", cols.map((x) => x.taxable))}
      {row("Income tax", cols.map((x) => x.incomeTax))}
      {row("Total tax", cols.map((x) => x.tax), "total")}
      {grp("Fees and forms")}
      {row("State fee", cols.map((x) => (x.stateFee === 0 ? "—" : M(x.stateFee))))}
      {row("Payroll and extra tax prep", cols.map((x) => (x.adminFee === 0 ? "—" : M(x.adminFee))))}
      {grp("The bottom line")}
      {row("What is left", cols.map((x) => x.left), "total")}
      {row("Next to sole proprietor", cols.map((x, i) => (i === 0 ? "—" : Math.abs(x.left - cols[0].left) < 1 ? "the same" : M(x.left - cols[0].left))))}
    </>
  );
}
