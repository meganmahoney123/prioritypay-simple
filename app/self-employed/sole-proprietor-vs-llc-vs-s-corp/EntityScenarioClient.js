"use client";

import { useMemo, useState } from "react";
import PublicHeader from "@/components/PublicHeader";
import { LEDGER_TOKENS } from "@/lib/ledgerTheme";
import { computeEntityScenarios, WHO_OPTIONS } from "@/lib/entityScenarioCalculator";

// Ported from Megan's standalone HTML export (entity-scenario-modeler_2.html)
// into a real page in the app: same content, same calculator, same
// editorial design (deliberately its own navy/blue look, not the
// Ledger theme -- this is a blog/resource article, not app chrome) --
// just driven by React state instead of raw DOM manipulation, and
// reachable from the new Blog nav dropdown (see components/PublicHeader.js).
// The scoped styles below are copied over near-verbatim from the source
// file's <style> block, with `:root` swapped for `.entity-scope` since
// styled-jsx can't scope a `:root` rule to just this component.

const M = (n) => (n < 0 ? "−" : "") + "$" + Math.round(Math.abs(n)).toLocaleString("en-US");

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

  const { cols, warnSalary, warnQbi } = useMemo(
    () => computeEntityScenarios({ profit, status, salary, stateCost, adminCost, sstb }),
    [profit, status, salary, stateCost, adminCost, sstb]
  );
  const [sole, llc, scorp] = cols;

  const whoMeta = WHO_OPTIONS.find((w) => w.value === who) || WHO_OPTIONS[0];
  const salPct = profit > 0 ? Math.round((salary / profit) * 100) : null;

  const headline = useMemo(() => {
    if (sole.profit <= 0) return "Put in a profit above to see all three side by side.";
    const llcD = llc.left - sole.left;
    const scD = scorp.left - sole.left;
    const a =
      Math.abs(llcD) < 1
        ? "Sole proprietor and LLC come out **exactly the same**. An LLC does not change your tax."
        : `The LLC leaves **${M(-llcD)} less**. That is only the state fee. The tax is the same.`;
    let b;
    if (Math.abs(scD) < 300) b = " The S-corp lands within a few hundred dollars of the other two.";
    else if (scD > 0) b = ` The S-corp leaves **${M(scD)} more**, after paying for payroll and the second tax return.`;
    else b = ` The S-corp leaves **${M(-scD)} less**. Here the fees cost more than the tax it saves.`;
    return a + b;
  }, [sole, llc, scorp]);

  const totalForBars = Math.max(1, sole.profit);
  const barKeys = [
    ["tax", "Tax", "var(--s1)"],
    ["fees", "Fees and forms", "var(--s2)"],
    ["left", "What is left", "var(--s3)"],
  ];

  const copyForAccountant = () => {
    const L = [
      "Sole proprietor vs LLC vs S-corp — modelled for the 2026 federal tax year",
      "",
      `Profit: ${M(profit)}`,
      `Filing status: ${status === "mfj" ? "married filing jointly" : "single"}`,
      `Paycheck used for the S-corp: ${M(salary)}`,
      `State fee: ${M(stateCost)}   Payroll and extra tax prep: ${M(adminCost)}`,
      `Consulting / health / law / finance type of work: ${sstb ? "yes" : "no"}`,
      "",
    ];
    cols.forEach((c) => {
      L.push(
        c.label,
        `  paycheck ${c.wages ? M(c.wages) : "—"} / profit ${c.dist ? M(c.dist) : "—"}`,
        `  self-employment or payroll tax ${M(c.workTax)}`,
        `  20% small business deduction ${M(c.qbiDed)}${c.qbiLimited ? " (limited)" : ""}`,
        `  income you get taxed on ${M(c.taxable)}`,
        `  income tax ${M(c.incomeTax)}`,
        `  total tax ${M(c.tax)}`,
        `  fees and forms ${M(c.fees)}`,
        `  what is left ${M(c.left)}`,
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
  };

  const numOr0 = (v) => {
    const n = parseFloat(v);
    return isFinite(n) && n >= 0 ? n : 0;
  };

  const same = (a, b) => Math.abs(a - b) < 0.5;
  const tableRows = [
    { grp: "How the money reaches you" },
    { label: "Profit for the year", vals: cols.map((c) => M(c.profit)) },
    { label: "Paid as a paycheck", vals: cols.map((c) => (c.wages === 0 ? "—" : M(c.wages))) },
    { label: "Paid as profit", vals: cols.map((c) => (c.dist === 0 ? "—" : M(c.dist))) },
    { grp: "Federal tax" },
    { label: "Self-employment or payroll tax", vals: cols.map((c) => M(c.workTax)) },
    { label: "20% small business deduction", vals: cols.map((c) => M(c.qbiDed)) },
    { label: "Income you get taxed on", vals: cols.map((c) => M(c.taxable)) },
    { label: "Income tax", vals: cols.map((c) => M(c.incomeTax)) },
    { label: "Total tax", vals: cols.map((c) => M(c.tax)), total: true },
    { grp: "Fees and forms" },
    { label: "State fee", vals: cols.map((c) => (c.stateFee === 0 ? "—" : M(c.stateFee))) },
    { label: "Payroll and extra tax prep", vals: cols.map((c) => (c.adminFee === 0 ? "—" : M(c.adminFee))) },
    { grp: "The bottom line" },
    { label: "What is left", vals: cols.map((c) => M(c.left)), total: true },
    {
      label: "Next to sole proprietor",
      vals: cols.map((c, i) => (i === 0 ? "—" : same(c.left, cols[0].left) ? "the same" : M(c.left - cols[0].left))),
    },
  ];

  return (
    <div style={LEDGER_TOKENS}>
      <PublicHeader />
      <div className="entity-scope">
        <div className="wrap">
          <h1>Sole proprietor, LLC or S-corp?</h1>
          <p className="sub">
            Here is what each one is, what it costs, and why people pick it. Then you can put in your own numbers
            and see all three side by side.
          </p>
          <p className="stamp">2026 tax year</p>

          <div className="cards">
            <div className="c">
              <h3>Sole proprietor</h3>
              <p className="one">Free and simple to run, but if the business gets sued your own savings are exposed.</p>
              <div className="cost">
                <b>What it costs</b>Nothing to start. Nothing each year.
              </div>
            </div>
            <div className="c">
              <h3>LLC</h3>
              <p className="one">
                Lowers the risk to your personal savings for a small yearly fee. The protection has real gaps,
                though, and it changes nothing at all about your taxes.
              </p>
              <div className="cost">
                <b>What it costs</b>About $35 to $500 to set up. Then $0 to $800 a year, depending on your state.
              </div>
            </div>
            <div className="c">
              <h3>S-corp</h3>
              <p className="one">
                Can cut your self-employment tax once profit is high enough, but it adds payroll, a second tax
                return and real yearly cost.
              </p>
              <div className="cost">
                <b>What it costs</b>Your LLC cost, plus roughly $700 to $3,500 a year, depending on how much you
                hand off.
              </div>
            </div>
          </div>

          <h2>Side by side</h2>
          <div className="tblwrap">
            <table className="plain cmp">
              <thead>
                <tr>
                  <th scope="col" />
                  <th scope="col">Sole proprietor</th>
                  <th scope="col">LLC</th>
                  <th scope="col">S-corp</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">What it is</th>
                  <td>The default. You start working and you are one.</td>
                  <td>A company you register with your state.</td>
                  <td>Not a company. A tax choice you make for a company you already have.</td>
                </tr>
                <tr>
                  <th scope="row">Setup</th>
                  <td>Nothing to do.</td>
                  <td>File with your state, pick a name, get an EIN. About a day of work.</td>
                  <td>Set up the company first, then file Form 2553 with the IRS. Then start payroll.</td>
                </tr>
                <tr>
                  <th scope="row">Taxes</th>
                  <td>Profit goes on your personal return. You pay 15.3% self-employment tax on it.</td>
                  <td>
                    <b>Exactly the same as sole proprietor.</b> An LLC does not change your tax.
                  </td>
                  <td>Split into a paycheck and the rest. Only the paycheck pays the 15.3%. That is the saving.</td>
                </tr>
                <tr>
                  <th scope="row">If you get sued</th>
                  <td>Your own savings and the things you own are at risk.</td>
                  <td>
                    Puts some distance between business money and your own. Not a guarantee. Ask a lawyer what your
                    real exposure is.
                  </td>
                  <td>Same as the company underneath it.</td>
                </tr>
                <tr>
                  <th scope="row">If you make a mistake in your own work</th>
                  <td>Not protected.</td>
                  <td>Not protected. Insurance covers this, not a company.</td>
                  <td>Not protected.</td>
                </tr>
                <tr>
                  <th scope="row">Tax audit risk</th>
                  <td>
                    Schedule C draws attention, especially with big deductions next to small income, a home office,
                    vehicle write-offs, or losses several years running.
                  </td>
                  <td>Same as sole proprietor. It is still a Schedule C.</td>
                  <td>
                    One flag stands out: a small paycheck next to a big profit share. The return is also more
                    complex, so there is more to get wrong.
                  </td>
                </tr>
                <tr>
                  <th scope="row">Paperwork each year</th>
                  <td>None beyond your personal return.</td>
                  <td>A short yearly report to your state to keep the LLC alive. Usually online, usually the same date each year.</td>
                  <td>The state report, payroll forms every three months, a W-2 for yourself, and a separate company tax return.</td>
                </tr>
                <tr>
                  <th scope="row">Backing out</th>
                  <td>Nothing to back out of. Keep working, or stop.</td>
                  <td>File to close it with your state and stop paying the fee. Simple, but your set-up cost is gone.</td>
                  <td>
                    You can drop the tax choice and go back to being taxed as an LLC, but the timing is fussy and the
                    IRS usually makes you wait five years before choosing it again.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 id="top-calc">Try your own numbers</h2>

          <div className="note">
            <p>
              <strong>What this is.</strong> A what-if tool. If the numbers you put in were exactly right for a whole
              year, the three columns show how each one would work out. Change any number and all three update.
            </p>
            <p>
              <strong>What this is not.</strong> A recommendation. Nothing here ranks them or picks one for you. Two
              of the three often come out the same, and one may come out worse. That is the point of showing all
              three.
            </p>
          </div>

          <div className="inputs">
            <div className="grid">
              <div>
                <label htmlFor="profit">Profit for the year</label>
                <div className="money">
                  <span>$</span>
                  <input type="number" id="profit" value={profit} min={0} step={1000} onChange={(e) => setProfit(numOr0(e.target.value))} />
                </div>
                <div className="why">Money left over after you pay business costs. Before you pay yourself.</div>
              </div>
              <div>
                <label htmlFor="status">How you file taxes</label>
                <select id="status" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="single">Single</option>
                  <option value="mfj">Married, filing together</option>
                </select>
                <div className="why">This assumes no other income in your home.</div>
              </div>
              <div style={{ gridColumn: "1/-1", borderTop: "1px solid var(--line)", paddingTop: 15, marginTop: 2 }}>
                <label htmlFor="who">Who does the work?</label>
                <select id="who" style={{ maxWidth: "100%", width: "auto", minWidth: 300 }} value={who} onChange={(e) => setWho(e.target.value)}>
                  {WHO_OPTIONS.map((w) => (
                    <option key={w.value} value={w.value}>
                      {w.label}
                    </option>
                  ))}
                </select>
                <div className="why">This does not change any tax math. It only changes the paycheck range we suggest below.</div>
              </div>

              <div style={{ gridColumn: "1/-1", borderTop: "1px solid var(--line)", paddingTop: 15 }}>
                <label htmlFor="salary">
                  The paycheck part <span style={{ fontWeight: 400, color: "var(--ink3)" }}>&mdash; S-corp only</span>
                </label>
                <p className="explain">
                  An S-corp splits your profit into two parts: a <b>paycheck</b>, and <b>the rest</b>. You take both.
                  Only the paycheck pays payroll tax, and that is where the savings come from.
                </p>
                <div className="quick">
                  <div className="money" style={{ maxWidth: 170 }}>
                    <span>$</span>
                    <input type="number" id="salary" value={salary} min={0} step={1000} onChange={(e) => setSalary(numOr0(e.target.value))} />
                  </div>
                  <span className="pctnow">{salPct !== null ? `${salPct}% of profit` : ""}</span>
                  <span className="qbtns">
                    {whoMeta.pcts.map((p) => (
                      <button
                        key={p}
                        type="button"
                        className={`qb${salPct !== null && Math.abs(salPct - p) < 1 ? " on" : ""}`}
                        onClick={() => setSalary(Math.round(((profit * p) / 100) / 500) * 500)}
                      >
                        {p}%
                      </button>
                    ))}
                  </span>
                </div>
                <div
                  className="why"
                  dangerouslySetInnerHTML={{
                    __html:
                      "<b>How to pick a number:</b> think about what your salary would be if you did this same job as an employee at a company. Pick the number closest to that. If it is too low you could owe back taxes. This is really a number an accountant should set.",
                  }}
                />
              </div>

              <div>
                <label htmlFor="stateCost">Yearly state fee, if you know it</label>
                <div className="money">
                  <span>$</span>
                  <input type="number" id="stateCost" value={stateCost} min={0} step={25} onChange={(e) => setStateCost(numOr0(e.target.value))} />
                </div>
                <div className="why">
                  Only the LLC and S-corp pay this. It runs from $0 to $800 a year depending on your state, and
                  California is the highest at $800. Leave it at 0 if you are not sure.
                </div>
              </div>

              <div style={{ gridColumn: "1/-1", borderTop: "1px solid var(--line)", paddingTop: 15 }}>
                <label htmlFor="adminCost">Who would handle your payroll and tax returns?</label>
                <p className="explain">
                  With an S-corp, your company pays you like an employee. So there is payroll to run for{" "}
                  <b>one person &mdash; you</b>. There is also a second tax return, for the company. Both cost money
                  every year, and this is the part people forget.
                </p>
                <p className="explain" style={{ color: "var(--ink3)" }}>
                  Contractors work differently. You pay them and send a 1099. They never go on your payroll, so
                  having them or not does not change this cost.
                </p>
                <div className="money" style={{ maxWidth: 170 }}>
                  <span>$</span>
                  <input type="number" id="adminCost" value={adminCost} min={0} step={250} onChange={(e) => setAdminCost(numOr0(e.target.value))} />
                </div>
                <div className="why">
                  Most people land somewhere between <b>$700 and $3,500 a year</b>, depending on how much you hand
                  off. Only the company return is extra &mdash; you would pay for a personal return either way. Get a
                  real quote before you decide anything.
                </div>
              </div>

              <div style={{ gridColumn: "1/-1", borderTop: "1px solid var(--line)", paddingTop: 15 }}>
                <label>Kind of work</label>
                <div className="chk">
                  <input type="checkbox" id="sstb" checked={sstb} onChange={(e) => setSstb(e.target.checked)} />
                  <span>
                    My work is consulting, health, law, money, accounting, acting or sports. This only matters at
                    higher incomes.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {warnSalary && (
            <div className="warn">
              The paycheck you put in is as big as the whole profit. It has been capped at the profit, so there is
              nothing left to take as profit. That removes the only tax difference the S-corp would show.
            </div>
          )}
          {warnQbi && (
            <div className="warn">
              At this income the 20% small business deduction starts to get cut back, and the rules get tricky. This
              tool keeps them simple. Ask an accountant about these numbers before you rely on them.
            </div>
          )}

          <p className="headline">
            {headline.split("**").map((chunk, i) => (i % 2 === 1 ? <b key={i}>{chunk}</b> : chunk))}
          </p>

          <div className="bars">
            {cols.map((c) => (
              <div className="barrow" key={c.label}>
                <div className="name">
                  {c.label}
                  <em>{M(c.left)}</em>
                </div>
                <div className="track">
                  {barKeys.map(([k, name, color]) => {
                    const val = Math.max(0, c[k]);
                    const p = (val / totalForBars) * 100;
                    if (p <= 0) return null;
                    return (
                      <div key={k} className="seg" style={{ width: `${p}%`, background: color }} title={`${name}: ${M(val)}`}>
                        {p > 13 ? M(val) : ""}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="legend">
            <span>
              <i className="sw" style={{ background: "var(--s1)" }} />Tax
            </span>
            <span>
              <i className="sw" style={{ background: "var(--s2)" }} />Fees and forms
            </span>
            <span>
              <i className="sw" style={{ background: "var(--s3)" }} />What is left
            </span>
          </div>
          <p style={{ margin: "12px 0 0", fontSize: ".85rem", color: "var(--ink3)" }}>
            Each bar adds up to the same profit. The parts show where it goes.
          </p>

          <div className="tblwrap">
            <table>
              <caption>Federal tax only, for a full 2026 tax year, using the numbers above.</caption>
              <thead>
                <tr>
                  <th scope="col">Each year</th>
                  <th scope="col">Sole proprietor</th>
                  <th scope="col">LLC</th>
                  <th scope="col">S-corp</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((r, i) =>
                  r.grp ? (
                    <tr className="grp" key={i}>
                      <td colSpan={4}>{r.grp}</td>
                    </tr>
                  ) : (
                    <tr className={r.total ? "total" : ""} key={i}>
                      <td dangerouslySetInnerHTML={{ __html: r.label }} />
                      {r.vals.map((v, j) => (
                        <td key={j} className={j === 1 && v === r.vals[0] ? "dim" : ""}>
                          {v}
                        </td>
                      ))}
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          <button className="btn" onClick={copyForAccountant}>
            Copy this for my accountant
          </button>
          {copied && <span className="ok">Copied. Paste it into an email.</span>}

          <div className="artdivide" />

          <article className="article">
            <h2 id="guide">The full guide</h2>
            <p className="artsub">Sole Proprietor vs. LLC vs. S-Corp: What Actually Changes for Freelancers</p>
            <p className="updated">Last updated 20 August 2026 &middot; 2026 tax year</p>

            <div className="disc top">
              <b>Before you read this.</b> This is general educational information, not tax or legal advice. It
              explains how the rules generally work. It does not tell you what to do in your own situation, and it
              cannot. These decisions turn on facts specific to you: your state, your income, your filing status, and
              the nature of your work. The right answer for one freelancer is regularly the wrong answer for another.
              Talk to a CPA or an attorney licensed in your state before acting on any of it.
            </div>

            <nav className="toc" aria-label="In this guide">
              <b>In this guide</b>
              <ol>
                <li><a href="#opt1">Option 1: Sole proprietor</a></li>
                <li><a href="#opt2">Option 2: LLC with default tax treatment</a></li>
                <li><a href="#opt3">Option 3: S-corp election</a></li>
                <li><a href="#breakeven">At what income does an S-corp actually make sense?</a></li>
                <li><a href="#sued">Does an LLC actually protect you from being sued?</a></li>
                <li><a href="#boi">Does your LLC need to file a BOI report?</a></li>
              </ol>
            </nav>

            <h3 id="opt1">Option 1: Sole proprietor</h3>
            <p>
              <b>What it is:</b> The default. If you have clients or customers paying you money, you are a sole
              proprietor by default.
            </p>

            <h4 className="up">Pros</h4>
            <ul>
              <li>Setup is free. There&apos;s nothing to file or renew.</li>
              <li>Simplest possible tax filing; Schedule C and Schedule SE with your 1040.</li>
              <li>No separate business tax return, no payroll, no annual report.</li>
              <li>You can use a DBA (&quot;doing business as&quot;) to trade under a business name without forming anything.</li>
              <li>No state franchise tax or entity-level fee.</li>
              <li>Easy to abandon or change. Nothing to dissolve.</li>
            </ul>

            <h4 className="dn">Cons</h4>
            <ul>
              <li>
                <b>No liability separation.</b> A business debt or judgment can reach your personal assets, including
                savings, car, and in some circumstances, your home.
              </li>
              <li>
                Some clients, especially larger companies and agencies, require a registered entity before
                they&apos;ll sign and therefore won&apos;t work with sole proprietors.
              </li>
              <li>No entity name protection in your state.</li>
              <li>Business credit is essentially inseparable from your personal credit.</li>
            </ul>

            <h4>When it genuinely makes sense</h4>
            <ul>
              <li>You&apos;re starting out, or freelancing part-time alongside a job.</li>
              <li>
                Your work is low-risk: you write, design, consult, or advise, and a mistake produces a disappointed
                client rather than injury or major financial loss.
              </li>
              <li>You have no employees or subcontractors.</li>
              <li>No client contract requires an entity.</li>
              <li>You carry professional liability insurance, which handles more of your actual risk than an entity does.</li>
            </ul>
            <p>Plenty of freelancers earning well into six figures operate as sole proprietors and are fine.</p>

            <h3 id="opt2">Option 2: LLC with default tax treatment</h3>
            <p>
              <b>What it is:</b> A limited liability company formed under state law, taxed exactly like a
              sole proprietorship (single-member) or partnership (multi-member).
            </p>

            <h4 className="up">Pros</h4>
            <ul>
              <li>Liability separation between business and personal assets, when properly maintained.</li>
              <li>Satisfies clients and platforms that require a registered entity.</li>
              <li>Reserves your business name in your state.</li>
              <li>
                <b>It&apos;s the platform for an S-corp election later.</b> You can form the LLC now and elect S-corp
                treatment in a future year when the math works. You don&apos;t have to decide both at once.
              </li>
              <li>Multi-member LLCs get a written operating agreement, which is genuinely useful if you have a partner.</li>
              <li>Cleaner separation for bookkeeping, which makes a business bank account and business credit easier.</li>
            </ul>

            <h4 className="dn">Cons</h4>
            <ul>
              <li>
                <b>Zero federal tax benefit</b> on its own.
              </li>
              <li>
                Costs money: formation fees, annual reports, registered agent, and in some states a franchise tax or
                gross-receipts fee whether or not you profit.
              </li>
              <li>The protection is conditional. You MUST keep business and personal finances separate.</li>
              <li>More paperwork to maintain, and penalties in some states for missing an annual report.</li>
              <li>Doesn&apos;t protect against your own professional mistakes (the next section covers this).</li>
              <li>
                Registering in a state where you don&apos;t operate (&quot;Delaware for the prestige&quot;) usually
                means registering as a foreign entity in your home state too, doubling the cost for no benefit.
              </li>
            </ul>

            <h4>When it genuinely makes sense</h4>
            <ul>
              <li>A client contract requires it.</li>
              <li>
                You have real liability exposure: you hire subcontractors, work on client premises, handle sensitive
                data, ship a physical product, or your errors could cause significant financial loss.
              </li>
              <li>You have a business partner and want the ownership terms documented.</li>
              <li>Your income is approaching the range where an S-corp election might pay off, and you want the structure in place.</li>
              <li>Your state&apos;s cost is low and the separation is worth it to you for peace of mind.</li>
            </ul>

            <h3 id="opt3">Option 3: S-corp election</h3>
            <div className="disc">
              <b>On the numbers in this section.</b> All figures are for the 2026 tax year and come from the IRS and
              SSA sources listed at the end. Tax figures change every year, so check the date above. &quot;Reasonable
              compensation&quot; has no published formula or safe number. It is a judgment call an accountant should
              make with you, and getting it wrong carries a real cost in either direction.
            </div>

            <p>
              <b>What it is:</b> A tax election, filed on Form 2553, available to an LLC or a corporation. It changes
              how your business profit is taxed, but doesn&apos;t change your legal structure.
            </p>
            <p>
              <b>How the tax saving works.</b> As a sole proprietor, essentially all your net profit is subject to
              15.3% self-employment tax. With an S-corp election, you become an employee of your own business. You
              pay yourself a <i>reasonable salary</i>, which carries payroll taxes at the same combined 15.3%.
              Remaining profit is distributed to you and is <b>not</b> subject to self-employment or payroll tax.
            </p>
            <p>The saving is the payroll tax you avoid on the distribution portion.</p>

            <h4 className="up">Pros</h4>
            <ul>
              <li>Real self-employment tax savings once profit is high enough relative to your reasonable salary.</li>
              <li>You become a W-2 employee of your business, which can simplify mortgage applications and some benefit arrangements.</li>
              <li>Access to certain retirement plan structures with an employer-contribution side.</li>
              <li>Run health insurance premiums through the business, subject to specific rules for shareholder-employees.</li>
              <li>Distributions aren&apos;t subject to payroll tax, so income above your salary is taxed more lightly.</li>
            </ul>

            <h4 className="dn">Cons</h4>
            <ul>
              <li>
                <b>You must run actual payroll</b>, with withholding, quarterly employment tax returns, and a W-2.
                That means you must have a payroll provider.
              </li>
              <li>A separate business tax return (Form 1120-S) is required, which costs meaningfully more to prepare.</li>
              <li>
                <b>&quot;Reasonable compensation&quot; is a real IRS requirement, not a number you pick.</b> The IRS
                can reclassify distributions as wages, with back taxes and penalties. Its stated factors include your
                training and experience, duties, time devoted to the business, what you&apos;d pay someone else to
                do the work, and industry norms.
              </li>
              <li>
                <b>It shrinks your QBI deduction.</b> Reasonable compensation from an S-corp is explicitly{" "}
                <i>not</i> qualified business income. Every dollar you shift from distribution to salary reduces the
                profit eligible for the 20% deduction. This is the factor most break-even articles ignore, and it
                matters a lot.
              </li>
              <li>Ongoing compliance: You may be penalized for missing a payroll deadline or a filing.</li>
              <li>Some states and cities don&apos;t recognize the federal S election, or impose entity-level taxes anyway.</li>
              <li>Harder to undo. Revoking an S election has consequences and timing rules.</li>
              <li>Strict eligibility: no more than 100 shareholders, no non-resident alien shareholders, one class of stock, and only certain kinds of owners.</li>
            </ul>

            <div className="callout">
              <b>Critical deadline.</b> Form 2553 must be filed no more than{" "}
              <b>2 months and 15 days after the start of the tax year</b> you want it to apply to (so mid-March for a
              calendar-year business) or any time during the <i>preceding</i> year. Miss it and late-election relief
              is available under Rev. Proc. 2013-30 if you can show reasonable cause and acted diligently, but you
              don&apos;t want to depend on it.
            </div>

            <h4>When it genuinely makes sense</h4>
            <ul>
              <li>Your net profit is comfortably above your reasonable salary, with a wide spread between them.</li>
              <li>Your profit is stable and predictable. Payroll is a fixed commitment.</li>
              <li>You&apos;re already paying for bookkeeping, so the added admin is incremental rather than new.</li>
              <li>You&apos;ve run the actual numbers for <i>your</i> income and <i>your</i> reasonable salary, not a rule of thumb.</li>
            </ul>

            <h3 id="breakeven">At what income does an S-corp actually make sense?</h3>
            <p>Here are the four components to consider:</p>
            <ol>
              <li>
                <b>Payroll tax saved</b>: roughly 15.3% of the profit you take as distribution instead of salary.
                (Precisely: self-employment tax applies to 92.35% of net profit, which slightly reduces the
                sole-proprietor side.)
              </li>
              <li>
                <b>Administrative cost added</b>: Payroll service, 1120-S preparation, any state entity tax. This can
                be realistically $1,500&ndash;$4,000 a year.
              </li>
              <li>
                <b>QBI deduction lost</b>: 20% of the amount you convert from distribution to salary, multiplied by
                your marginal tax rate.
              </li>
              <li>
                <b>The Social Security wage base</b>: For 2026, the 12.4% Social Security portion applies only to the
                first $184,500. Above that, only the 2.9% Medicare portion continues (plus 0.9% additional Medicare
                tax above $200,000 single / $250,000 married filing jointly). So the savings per dollar shrink at
                higher incomes.
              </li>
            </ol>
            <p className="tiptop">
              <a href="#top-calc">The calculator above</a> runs all four of these on your own numbers.
            </p>

            <h3 id="sued">Does an LLC actually protect you from being sued?</h3>
            <div className="disc">
              <b>On this section specifically.</b> Liability is a matter of state law, and it turns on the facts of a
              particular claim. What follows describes how LLC protection is generally understood to work. It is not
              legal advice, it is not a complete account, and it is not a prediction about any real situation.
              Whether an LLC would shield you from a specific claim is a question for an attorney licensed in your
              state. If you take one thing from this section, make it the point about insurance.
            </div>

            <p>
              <b>Anyone can sue you regardless of your entity.</b> An LLC doesn&apos;t prevent lawsuits. What it can
              do is limit which <i>assets</i> are available to satisfy a judgment.
            </p>

            <p>
              <b>What an LLC generally does protect against:</b>
              <br />
              <span className="aside">(However, this is not a complete list and is not legal advice.)</span>
            </p>
            <ul>
              <li>Business contract disputes and business debts, where the LLC is the contracting party</li>
              <li>Claims arising from an employee&apos;s or subcontractor&apos;s conduct</li>
              <li>Business credit obligations you haven&apos;t personally guaranteed</li>
            </ul>

            <p>
              <b>What an LLC generally does NOT protect against:</b>
              <br />
              <span className="aside">(But not limited to the below. Not legal advice.)</span>
            </p>
            <ul>
              <li>
                <b>Your own professional negligence.</b> This is the big one. If you&apos;re a designer, developer,
                consultant, writer, or advisor and your work causes a client a loss, you can be sued personally for
                your own conduct. The LLC doesn&apos;t stand between you and your own mistake.
              </li>
              <li>
                <b>Debts you personally guarantee.</b> This includes most small business loans, credit lines, and
                commercial leases.
              </li>
              <li>
                <b>Unpaid payroll taxes.</b> Trust fund taxes withheld from employees carry personal liability for
                responsible persons.
              </li>
              <li>
                <b>Fraud or intentional wrongdoing.</b>
              </li>
              <li>
                <b>Claims where the separation wasn&apos;t maintained.</b> If you pay personal expenses from the
                business account, don&apos;t keep records, or treat the LLC as a pocket, a court may disregard it
                (commonly called piercing the veil).
              </li>
            </ul>

            <h4>What actually handles a freelancer&apos;s real risk</h4>
            <p>
              For most solo freelancers, the exposures that would genuinely hurt are professional mistakes and
              contract disputes, and the LLC addresses neither well. The tools that do:
            </p>
            <ul>
              <li>
                <b>Professional liability insurance (errors and omissions).</b> This is the direct answer to
                &quot;what if I mess up a client project.&quot; It&apos;s usually inexpensive for low-risk service
                work and it&apos;s what an LLC is often mistakenly bought to do.
              </li>
              <li>
                <b>Contract terms.</b> A limitation-of-liability clause capping your exposure at fees paid, a mutual
                indemnification clause, and a clear scope of work do more practical protection than an entity.
              </li>
              <li>
                <b>General liability insurance.</b> If you visit client sites or host clients.
              </li>
              <li>
                <b>Cyber liability.</b> If you handle client data.
              </li>
              <li>
                <b>Actually maintaining separation</b> if you do form an LLC: separate bank account, no personal
                spending from it, documented owner draws.
              </li>
            </ul>
            <p>None of this means don&apos;t form an LLC. It means form it for the right reason, and don&apos;t let it substitute for insurance and decent contracts.</p>

            <h3 id="boi">Does your LLC need to file a BOI report? (2026: No)</h3>
            <p>
              <b>Short answer: if your LLC is a US company, no. You have nothing to file.</b>
            </p>
            <div className="disc">
              <b>Check the date on this one.</b> This reflects FinCEN&apos;s final rule as of 20 August 2026.
              Beneficial ownership reporting changed several times between 2024 and 2026 and could change again.
              Confirm the current position with FinCEN or your accountant before relying on it.
            </div>
            <p>This one confused a lot of people for two years, and much of the content still online is out of date.</p>
            <p>
              <b>What happened.</b> The Corporate Transparency Act required most small entities to report beneficial
              ownership information to FinCEN, with filings starting in January 2024. After extensive litigation,
              FinCEN issued an interim final rule on <b>March 26, 2025</b> redefining &quot;reporting company&quot;
              to cover only foreign entities. Then on <b>August 11, 2026</b>, FinCEN issued a <b>final rule</b>{" "}
              permanently removing the requirement for US companies and US persons to report.
            </p>

            <p>
              <b>Where that leaves you:</b>
            </p>
            <ul>
              <li>
                <b>US-formed LLCs and corporations: exempt.</b> No BOI filing, no update obligation, no deadline to
                watch.
              </li>
              <li>
                <b>US persons: exempt</b> from being reported as beneficial owners. FinCEN has said it will delete
                previously reported US-person information from its database.
              </li>
              <li>
                <b>Foreign entities registered to do business in the US: still required</b> to report beneficial
                ownership information for foreign individuals.
              </li>
              <li>If you filed a BOI report during the window when it was required, you don&apos;t need to do anything now.</li>
            </ul>

            <p>
              <b>Two things to still check:</b>
            </p>
            <ol>
              <li>
                <b>Your state may have its own version.</b> A handful of states have enacted or proposed
                beneficial-ownership disclosure laws that operate independently of the federal rule.
              </li>
              <li>
                <b>Be skeptical of BOI filing services.</b> Companies charged fees to file these reports, and some
                continued marketing the service after the requirement lapsed. There is no federal filing fee, because
                there is no federal filing.
              </li>
            </ol>
            <p>If you see a letter or email demanding a BOI filing fee with a deadline, treat it as a solicitation, not a government notice.</p>

            <div className="artfoot">
              <p>
                <b>About this article.</b> This is general educational information about how these rules work, not
                tax or legal advice for your situation. Entity and tax decisions depend on facts specific to you
                &mdash; your state, your income, your filing status, the nature of your work &mdash; and the right
                answer for one freelancer is often wrong for another. Figures are current for the 2026 tax year as of
                publication. Rules change; check the date. Talk to a CPA or attorney licensed in your state before
                making a decision.
              </p>

              <h4>Sources</h4>
              <ul className="srcs">
                <li>
                  IRS &mdash;{" "}
                  <a href="https://www.irs.gov/businesses/small-businesses-self-employed/single-member-limited-liability-companies">
                    Single member limited liability companies
                  </a>
                </li>
                <li>
                  IRS &mdash;{" "}
                  <a href="https://www.irs.gov/businesses/small-businesses-self-employed/self-employment-tax-social-security-and-medicare-taxes">
                    Self-employment tax (Social Security and Medicare taxes)
                  </a>
                </li>
                <li>
                  IRS &mdash; <a href="https://www.irs.gov/instructions/i2553">Instructions for Form 2553</a>
                </li>
                <li>
                  IRS &mdash;{" "}
                  <a href="https://www.irs.gov/businesses/small-businesses-self-employed/s-corporation-compensation-and-medical-insurance-issues">
                    S corporation compensation and medical insurance issues
                  </a>
                </li>
                <li>
                  IRS &mdash; <a href="https://www.irs.gov/newsroom/qualified-business-income-deduction">Qualified business income deduction</a>
                </li>
                <li>
                  IRS &mdash; <a href="https://www.irs.gov/pub/irs-drop/rp-25-32.pdf">Rev. Proc. 2025-32</a> (2026 QBI thresholds, standard deduction, brackets)
                </li>
                <li>
                  SSA &mdash; <a href="https://www.ssa.gov/oact/cola/cbb.html">Contribution and benefit base</a> (2026 Social Security wage base)
                </li>
                <li>
                  FinCEN &mdash;{" "}
                  <a href="https://www.fincen.gov/news/news-releases/fincen-permanently-ends-beneficial-ownership-reporting-requirements-millions">
                    Final rule ending BOI reporting for US companies, 11 August 2026
                  </a>
                </li>
                <li>
                  California FTB &mdash;{" "}
                  <a href="https://www.ftb.ca.gov/file/business/types/limited-liability-company/index.html">
                    Limited liability company annual tax and fee
                  </a>
                </li>
              </ul>
            </div>
          </article>

          <footer>
            <p>
              This is a model, not advice. It uses 2026 federal tax rules. It leaves out state income tax, other
              income, and many deductions. It assumes a full year, no employees but you, and that you take the
              standard deduction. The paycheck amount is something you choose, not something this tool works out,
              because that part is a judgment call. Talk to an accountant or a lawyer in your state before you decide
              anything.
            </p>
            <p>
              Numbers come from <a href="https://www.irs.gov/pub/irs-drop/rp-25-32.pdf">IRS Rev. Proc. 2025-32</a>,{" "}
              <a href="https://www.irs.gov/pub/irs-drop/n-25-67.pdf">IRS Notice 2025-67</a> and the{" "}
              <a href="https://www.ssa.gov/oact/cola/cbb.html">SSA wage base</a>.
            </p>
          </footer>
        </div>
      </div>

      <style jsx>{`
        .entity-scope {
          --bg: #f5f6f8;
          --card: #ffffff;
          --soft: #fafbfc;
          --line: #e1e5eb;
          --line2: #c7cfda;
          --ink: #14181d;
          --ink2: #4c5765;
          --ink3: #76808d;
          --navy: #1f3864;
          --accent: #0f5c8c;
          --s1: #2a78d6;
          --s2: #eb6834;
          --s3: #1baf7a;
          --good: #0b6b53;
          --bad: #9d3520;
          --warnbg: #fff5db;
          --warnline: #c98a00;
          --warnink: #5a4200;
          --notebg: #eaf2fa;
          --noteline: #0f5c8c;
          --r: 12px;
          background: var(--bg);
          color: var(--ink);
          font: 16px/1.62 -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Helvetica, Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        .entity-scope .wrap { max-width: 1000px; margin: 0 auto; padding: 38px 20px 64px; }
        .entity-scope h1 { font-size: 1.65rem; line-height: 1.24; margin: 0 0 8px; letter-spacing: -0.02em; }
        .entity-scope h2 { font-size: 1.15rem; margin: 38px 0 10px; }
        .entity-scope .sub { color: var(--ink2); margin: 0; font-size: 1.02rem; max-width: 70ch; }
        .entity-scope .stamp { font-size: 0.78rem; color: var(--ink3); text-transform: uppercase; letter-spacing: 0.07em; margin-top: 10px; }
        .entity-scope p { margin: 0 0 12px; }

        .entity-scope .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin: 22px 0 0; }
        @media (max-width: 760px) { .entity-scope .cards { grid-template-columns: 1fr; } }
        .entity-scope .c { background: var(--card); border: 1px solid var(--line); border-radius: var(--r); padding: 17px 18px; display: flex; flex-direction: column; }
        .entity-scope .c h3 { margin: 0 0 4px; font-size: 1.08rem; }
        .entity-scope .c .one { font-size: 0.95rem; color: var(--ink); margin: 0 0 13px; line-height: 1.5; }
        .entity-scope .c .cost { font-size: 0.84rem; line-height: 1.5; background: var(--soft); border: 1px solid var(--line); border-radius: 8px; padding: 9px 11px; margin: 0 0 13px; }
        .entity-scope .c .cost b { display: block; font-size: 0.72rem; letter-spacing: 0.05em; text-transform: uppercase; color: var(--ink3); margin-bottom: 2px; }

        .entity-scope .cmp th[scope="row"] { font-weight: 650; width: 19%; min-width: 148px; background: var(--soft); }
        .entity-scope .cmp td, .entity-scope .cmp th { font-size: 0.89rem; line-height: 1.5; }
        .entity-scope .cmp thead th { width: auto; }

        .entity-scope .note { background: var(--notebg); border-left: 4px solid var(--noteline); padding: 13px 16px; border-radius: 0 8px 8px 0; margin: 22px 0; font-size: 0.94rem; }
        .entity-scope .note p:last-child { margin-bottom: 0; }

        .entity-scope .inputs { background: var(--card); border: 1px solid var(--line); border-radius: var(--r); padding: 19px 20px; margin: 16px 0; }
        .entity-scope .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(215px, 1fr)); gap: 15px 18px; }
        .entity-scope label { display: block; font-size: 0.88rem; font-weight: 650; margin-bottom: 6px; }
        .entity-scope .money { position: relative; }
        .entity-scope .money > span { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--ink3); }
        .entity-scope input[type="number"], .entity-scope select { width: 100%; padding: 10px 12px; font: inherit; font-size: 1.02rem; background: var(--soft); color: var(--ink); border: 1px solid var(--line2); border-radius: 8px; }
        .entity-scope .money input { padding-left: 26px; }
        .entity-scope input:focus, .entity-scope select:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
        .entity-scope .why { font-size: 0.82rem; color: var(--ink3); margin-top: 5px; line-height: 1.5; }
        .entity-scope .chk { display: flex; gap: 9px; align-items: flex-start; }
        .entity-scope .chk input { width: 16px; height: 16px; margin-top: 4px; flex: none; }
        .entity-scope .chk span { font-size: 0.86rem; color: var(--ink2); }
        .entity-scope .explain { font-size: 0.88rem; color: var(--ink2); margin: 0 0 10px; line-height: 1.55; max-width: 74ch; }
        .entity-scope .quick { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .entity-scope .pctnow { font-size: 0.86rem; color: var(--ink3); font-variant-numeric: tabular-nums; }
        .entity-scope .qbtns { display: flex; gap: 6px; margin-left: auto; }
        .entity-scope .qb { font: inherit; font-size: 0.8rem; font-weight: 650; padding: 6px 11px; border-radius: 20px; cursor: pointer; background: var(--soft); color: var(--ink2); border: 1px solid var(--line2); }
        .entity-scope .qb:hover { border-color: var(--accent); color: var(--accent); }
        .entity-scope .qb.on { background: var(--accent); border-color: var(--accent); color: #fff; }

        .entity-scope .warn { background: var(--warnbg); border-left: 4px solid var(--warnline); color: var(--warnink); padding: 12px 15px; border-radius: 0 8px 8px 0; margin: 16px 0; font-size: 0.92rem; }

        .entity-scope .headline { font-size: 1.16rem; line-height: 1.55; margin: 24px 0 18px; }

        .entity-scope .bars { display: flex; flex-direction: column; gap: 13px; }
        .entity-scope .barrow { display: grid; grid-template-columns: 150px 1fr; gap: 14px; align-items: center; }
        @media (max-width: 560px) { .entity-scope .barrow { grid-template-columns: 1fr; gap: 5px; } }
        .entity-scope .name { font-weight: 650; font-size: 0.95rem; }
        .entity-scope .name em { display: block; font-style: normal; font-size: 1.05rem; font-weight: 750; font-variant-numeric: tabular-nums; margin-top: 1px; }
        .entity-scope .track { display: flex; height: 36px; border-radius: 6px; overflow: hidden; background: var(--soft); }
        .entity-scope .seg { display: flex; align-items: center; justify-content: flex-end; padding-right: 8px; font-size: 0.76rem; font-weight: 700; color: #fff; white-space: nowrap; box-shadow: 0 0 0 2px var(--card) inset; transition: opacity 0.12s; }
        .entity-scope .seg:first-child { border-radius: 5px 0 0 5px; }
        .entity-scope .seg:last-child { border-radius: 0 5px 5px 0; }
        .entity-scope .track:hover .seg { opacity: 0.5; }
        .entity-scope .track .seg:hover { opacity: 1; }
        .entity-scope .legend { display: flex; gap: 16px; flex-wrap: wrap; font-size: 0.85rem; color: var(--ink2); margin: 14px 0 0; }
        .entity-scope .legend span { display: flex; align-items: center; gap: 6px; }
        .entity-scope .sw { width: 10px; height: 10px; border-radius: 2px; flex: none; }

        .entity-scope .tblwrap { overflow-x: auto; background: var(--card); border: 1px solid var(--line); border-radius: var(--r); margin-top: 20px; }
        .entity-scope table { border-collapse: collapse; width: 100%; min-width: 620px; font-size: 0.93rem; }
        .entity-scope caption { text-align: left; padding: 13px 16px 0; font-size: 0.84rem; color: var(--ink3); }
        .entity-scope th, .entity-scope td { padding: 10px 14px; text-align: right; border-bottom: 1px solid var(--line); font-variant-numeric: tabular-nums; vertical-align: top; }
        .entity-scope th:first-child, .entity-scope td:first-child { text-align: left; font-variant-numeric: normal; }
        .entity-scope thead th { background: var(--navy); color: #fff; font-size: 0.79rem; letter-spacing: 0.03em; text-transform: uppercase; font-weight: 650; }
        .entity-scope tbody tr:nth-child(even) { background: var(--soft); }
        .entity-scope tr.grp td { background: var(--bg); font-weight: 700; font-size: 0.76rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink3); padding-top: 12px; padding-bottom: 6px; }
        .entity-scope tr.total td { font-weight: 750; border-top: 2px solid var(--line2); border-bottom: none; font-size: 1.02rem; }
        .entity-scope td.dim { color: var(--ink3); }
        .entity-scope .plain td, .entity-scope .plain th { text-align: left; font-variant-numeric: normal; }

        .entity-scope .btn { font: inherit; font-size: 0.88rem; padding: 9px 15px; border-radius: 8px; cursor: pointer; background: var(--soft); color: var(--ink2); border: 1px solid var(--line2); margin-top: 18px; }
        .entity-scope .btn:hover { border-color: var(--accent); color: var(--accent); }
        .entity-scope .ok { font-size: 0.85rem; color: var(--ink3); margin-left: 8px; }

        .entity-scope .artdivide { height: 1px; background: var(--line2); margin: 46px 0 0; }
        .entity-scope .article { max-width: 74ch; margin: 0 auto; }
        .entity-scope .article h2 { margin: 34px 0 4px; font-size: 1.5rem; letter-spacing: -0.02em; }
        .entity-scope .artsub { font-size: 1.12rem; font-weight: 650; color: var(--ink); margin: 0 0 4px; line-height: 1.35; }
        .entity-scope .artmeta, .entity-scope .updated { font-size: 0.86rem; color: var(--ink3); font-style: italic; margin: 0 0 6px; }
        .entity-scope .article h3 { margin: 36px 0 8px; font-size: 1.2rem; letter-spacing: -0.01em; padding-bottom: 6px; border-bottom: 1px solid var(--line); }
        .entity-scope .article h4 { margin: 22px 0 7px; font-size: 0.78rem; font-weight: 750; letter-spacing: 0.07em; text-transform: uppercase; color: var(--ink3); }
        .entity-scope .article h4.up { color: var(--good); }
        .entity-scope .article h4.dn { color: var(--bad); }
        .entity-scope .article p { margin: 0 0 13px; line-height: 1.68; }
        .entity-scope .article ul, .entity-scope .article ol { margin: 0 0 15px; padding-left: 22px; line-height: 1.62; }
        .entity-scope .article li { margin-bottom: 8px; }
        .entity-scope .article .aside { font-size: 0.87rem; color: var(--ink3); font-style: italic; }
        .entity-scope .toc { background: var(--card); border: 1px solid var(--line); border-radius: var(--r); padding: 15px 20px 15px 22px; margin: 20px 0 30px; }
        .entity-scope .toc b { display: block; font-size: 0.74rem; letter-spacing: 0.07em; text-transform: uppercase; color: var(--ink3); margin-bottom: 8px; }
        .entity-scope .toc ol { margin: 0; padding-left: 18px; font-size: 0.94rem; line-height: 1.55; }
        .entity-scope .toc li { margin-bottom: 4px; }
        .entity-scope .toc a { color: var(--accent); text-decoration: none; }
        .entity-scope .toc a:hover { text-decoration: underline; }
        .entity-scope .callout { background: var(--warnbg); border-left: 4px solid var(--warnline); color: var(--warnink); padding: 13px 16px; border-radius: 0 8px 8px 0; margin: 18px 0; font-size: 0.94rem; line-height: 1.6; }
        .entity-scope .disc { background: var(--soft); border: 1px solid var(--line); border-left: 3px solid var(--ink3); border-radius: 0 8px 8px 0; padding: 12px 15px; margin: 16px 0; font-size: 0.87rem; line-height: 1.6; color: var(--ink2); }
        .entity-scope .disc b { color: var(--ink); }
        .entity-scope .disc.top { border-left-color: var(--accent); background: var(--notebg); font-size: 0.9rem; }
        .entity-scope .tiptop { font-size: 0.92rem; color: var(--ink2); }
        .entity-scope .tiptop a { color: var(--accent); }
        .entity-scope .artfoot { margin-top: 38px; padding-top: 20px; border-top: 1px solid var(--line); }
        .entity-scope .artfoot p { font-size: 0.9rem; color: var(--ink2); }
        .entity-scope .srcs { font-size: 0.88rem; line-height: 1.55; }
        .entity-scope .srcs a { color: var(--accent); }
        .entity-scope .srcs li { margin-bottom: 5px; }

        .entity-scope footer { margin-top: 34px; padding-top: 18px; border-top: 1px solid var(--line); font-size: 0.83rem; color: var(--ink3); line-height: 1.6; }
        .entity-scope footer a { color: var(--accent); }
        .entity-scope a { color: var(--accent); }
      `}</style>
    </div>
  );
}
