"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import PersonaToggle from "@/components/PersonaToggle";
import { Card, PrimaryButton, GhostButton, currency } from "@/components/ui";
import { LEDGER_TOKENS, ledgerInputStyle } from "@/lib/ledgerTheme";

const DEFAULT_DEBTS = [
  { id: "d1", name: "Credit Card", balance: 4000, apr: 22, minPayment: 120, type: "personal" },
  { id: "d2", name: "Car Loan", balance: 12000, apr: 6, minPayment: 280, type: "personal" },
];

// Month-by-month simulation: accrue interest on every open balance, pay
// each debt's minimum, then throw whatever's left of the extra amount
// (monthly + yearly + a one-time lump, all optional) at whichever debt
// the strategy targets first -- smallest balance for snowball (fastest
// wins, keeps motivation up), highest APR for avalanche (mathematically
// optimal, least total interest).
//
// fixedTotal controls what happens to a paid-off debt's minimum payment,
// matching the same toggle most standalone debt calculators expose:
//   true  -- the freed-up minimum gets added to the extra pool for the
//            remaining debts, so the total monthly payment stays fixed
//            until everything's paid off (this is the faster, more
//            standard "snowball/avalanche" behavior, and the default).
//   false -- the freed-up minimum just goes away; total monthly outlay
//            shrinks as debts close, which is slower but matches what
//            someone would actually see happen if they don't consciously
//            redirect that payment.
function simulatePayoff(debts, opts, strategy) {
  const { extraMonthly = 0, extraYearly = 0, oneTimeAmount = 0, oneTimeMonth = 0, fixedTotal = true } = opts;
  const working = debts.map((d) => ({
    ...d,
    balance: Math.max(0, Number(d.balance) || 0),
    minPayment: Math.max(0, Number(d.minPayment) || 0),
    apr: Math.max(0, Number(d.apr) || 0),
    _closed: false,
  }));
  const order = (list) =>
    strategy === "avalanche" ? [...list].sort((a, b) => b.apr - a.apr) : [...list].sort((a, b) => a.balance - b.balance);

  let months = 0;
  let totalInterest = 0;
  let freedPool = 0;
  const maxMonths = 600;
  while (working.some((d) => d.balance > 0.5) && months < maxMonths) {
    months += 1;
    working.forEach((d) => {
      if (d.balance > 0) {
        const interest = d.balance * (d.apr / 100 / 12);
        d.balance += interest;
        totalInterest += interest;
      }
    });
    working.forEach((d) => {
      if (d.balance > 0) d.balance -= Math.min(d.balance, d.minPayment);
    });
    working.forEach((d) => {
      if (fixedTotal && d.balance <= 0.5 && !d._closed) {
        d._closed = true;
        freedPool += d.minPayment;
      }
    });

    let extra =
      Math.max(0, Number(extraMonthly) || 0) +
      (fixedTotal ? freedPool : 0) +
      (months % 12 === 0 ? Math.max(0, Number(extraYearly) || 0) : 0) +
      (months === Number(oneTimeMonth) ? Math.max(0, Number(oneTimeAmount) || 0) : 0);

    for (const d of order(working.filter((x) => x.balance > 0))) {
      if (extra <= 0) break;
      const pay = Math.min(d.balance, extra);
      d.balance -= pay;
      extra -= pay;
    }
  }
  return { months, totalInterest, reachedCap: months >= maxMonths };
}

function monthsToYearsLabel(months) {
  if (months <= 0) return "Debt-free already";
  const y = Math.floor(months / 12);
  const m = months % 12;
  const parts = [];
  if (y > 0) parts.push(`${y} yr${y > 1 ? "s" : ""}`);
  if (m > 0 || y === 0) parts.push(`${m} mo`);
  return parts.join(" ");
}

export default function DebtPayoffPublicClient() {
  const router = useRouter();
  const [persona, setPersona] = useState("self_employed");
  const [debts, setDebts] = useState(DEFAULT_DEBTS);
  const [extraMonthly, setExtraMonthly] = useState(200);
  const [extraYearly, setExtraYearly] = useState(0);
  const [oneTimeAmount, setOneTimeAmount] = useState(0);
  const [oneTimeMonth, setOneTimeMonth] = useState(1);
  const [fixedTotal, setFixedTotal] = useState(true);
  const [strategy, setStrategy] = useState("avalanche");

  const updateDebt = (id, patch) => setDebts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const removeDebt = (id) => setDebts((prev) => prev.filter((d) => d.id !== id));
  const addDebt = () =>
    setDebts((prev) => [...prev, { id: `d_${Date.now()}`, name: "New debt", balance: 1000, apr: 15, minPayment: 50, type: "personal" }]);

  const totalBalance = useMemo(() => debts.reduce((s, d) => s + (Number(d.balance) || 0), 0), [debts]);
  const totalMin = useMemo(() => debts.reduce((s, d) => s + (Number(d.minPayment) || 0), 0), [debts]);
  const personalBalance = useMemo(() => debts.filter((d) => d.type !== "business").reduce((s, d) => s + (Number(d.balance) || 0), 0), [debts]);
  const businessBalance = useMemo(() => debts.filter((d) => d.type === "business").reduce((s, d) => s + (Number(d.balance) || 0), 0), [debts]);

  const extraOpts = useMemo(
    () => ({ extraMonthly, extraYearly, oneTimeAmount, oneTimeMonth, fixedTotal }),
    [extraMonthly, extraYearly, oneTimeAmount, oneTimeMonth, fixedTotal]
  );
  const result = useMemo(() => simulatePayoff(debts, extraOpts, strategy), [debts, extraOpts, strategy]);
  const noExtra = useMemo(
    () => simulatePayoff(debts, { extraMonthly: 0, extraYearly: 0, oneTimeAmount: 0, oneTimeMonth: 0, fixedTotal }, strategy),
    [debts, fixedTotal, strategy]
  );

  const hasAnyExtra = extraMonthly > 0 || extraYearly > 0 || oneTimeAmount > 0;

  // "See the impact of paying more" -- holds everything else constant
  // (yearly/one-time extras, the fixed-total toggle, strategy) and only
  // varies the monthly extra, so the effect of that one lever is
  // isolated and comparable at a glance rather than buried in a single
  // headline number. Always includes whatever's currently typed in, plus
  // a spread of round numbers above and below it.
  const impactRows = useMemo(() => {
    const presets = new Set([0, 100, 200, 300, 500, Math.round(Number(extraMonthly) || 0)]);
    return [...presets]
      .filter((n) => n >= 0)
      .sort((a, b) => a - b)
      .map((amt) => ({
        amount: amt,
        isCurrent: amt === Math.round(Number(extraMonthly) || 0),
        ...simulatePayoff(debts, { ...extraOpts, extraMonthly: amt }, strategy),
      }));
  }, [debts, extraOpts, strategy, extraMonthly]);

  return (
    <div style={LEDGER_TOKENS}>
      <PublicHeader />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px clamp(18px, 4vw, 40px) 80px" }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(30px, 4vw, 40px)", fontWeight: 400, margin: "0 0 10px" }}>
          Debt Payoff Calculator
        </h1>
        <p className="text-sm" style={{ maxWidth: 580, color: "color-mix(in srgb, var(--color-text) 76%, transparent)", margin: "0 0 32px" }}>
          Compare the snowball and avalanche strategies and see exactly how long it takes and what it costs in
          interest. Free, no account needed.
        </p>

        <Card style={{ padding: "24px 26px", marginBottom: 24 }}>
          <PersonaToggle value={persona} onChange={setPersona} />

          <div className="space-y-2.5 mb-4">
            {debts.map((d) => (
              <div key={d.id} className="flex items-center gap-3 flex-wrap" style={{ padding: "10px 0", borderBottom: "1px solid var(--color-divider)" }}>
                <input
                  value={d.name}
                  onChange={(e) => updateDebt(d.id, { name: e.target.value })}
                  style={ledgerInputStyle({ flex: "1 1 140px", minWidth: 0, fontSize: 14 })}
                />
                <label className="text-xs flex items-center gap-1" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                  Remaining balance $
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={d.balance}
                    onChange={(e) => updateDebt(d.id, { balance: Math.max(0, Number(e.target.value) || 0) })}
                    style={ledgerInputStyle({ width: 90, fontSize: 14 })}
                  />
                </label>
                <label className="text-xs flex items-center gap-1" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                  Interest rate %
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={d.apr}
                    onChange={(e) => updateDebt(d.id, { apr: Math.max(0, Number(e.target.value) || 0) })}
                    style={ledgerInputStyle({ width: 64, fontSize: 14 })}
                  />
                </label>
                <label className="text-xs flex items-center gap-1" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                  Monthly or minimum payment $
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={d.minPayment}
                    onChange={(e) => updateDebt(d.id, { minPayment: Math.max(0, Number(e.target.value) || 0) })}
                    style={ledgerInputStyle({ width: 70, fontSize: 14 })}
                  />
                </label>
                {persona === "business_owner" && (
                  <select
                    value={d.type || "personal"}
                    onChange={(e) => updateDebt(d.id, { type: e.target.value })}
                    style={ledgerInputStyle({ fontSize: 13, width: 96 })}
                  >
                    <option value="personal">Personal</option>
                    <option value="business">Business</option>
                  </select>
                )}
                <button onClick={() => removeDebt(d.id)} aria-label="Remove debt" style={{ background: "transparent", border: 0, color: "var(--color-accent-700)", cursor: "pointer" }}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <GhostButton onClick={addDebt} className="mb-6">
            <Plus size={15} /> Add debt
          </GhostButton>

          <div className="text-xs mb-2" style={{ letterSpacing: "0.06em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
            Extra payments
          </div>
          <div className="flex gap-6 flex-wrap items-end mb-5">
            <label className="text-xs flex flex-col gap-1" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
              Per month
              <span style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontFamily: "var(--font-heading)", fontSize: 18, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>$</span>
                <input
                  type="number"
                  min={0}
                  step={25}
                  value={extraMonthly}
                  onChange={(e) => setExtraMonthly(Math.max(0, Number(e.target.value) || 0))}
                  style={ledgerInputStyle({ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 600, width: 110 })}
                />
              </span>
            </label>
            <label className="text-xs flex flex-col gap-1" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
              Per year
              <span style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontFamily: "var(--font-heading)", fontSize: 18, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>$</span>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={extraYearly}
                  onChange={(e) => setExtraYearly(Math.max(0, Number(e.target.value) || 0))}
                  style={ledgerInputStyle({ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 600, width: 110 })}
                />
              </span>
            </label>
            <label className="text-xs flex flex-col gap-1" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
              One-time, during month #
              <span style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontFamily: "var(--font-heading)", fontSize: 18, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>$</span>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={oneTimeAmount}
                  onChange={(e) => setOneTimeAmount(Math.max(0, Number(e.target.value) || 0))}
                  style={ledgerInputStyle({ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 600, width: 100 })}
                />
                <span className="text-xs">in month</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={oneTimeMonth}
                  onChange={(e) => setOneTimeMonth(Math.max(1, Number(e.target.value) || 1))}
                  style={ledgerInputStyle({ fontSize: 15, width: 50 })}
                />
              </span>
            </label>
          </div>
          <p className="text-xs mt-0 mb-5" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
            The "Per month" amount is the one lever most worth playing with -- see exactly how much sooner a bigger
            number gets you out of debt in "See the impact of paying more" below.
          </p>

          <div className="flex gap-6 flex-wrap items-start">
            <div>
              <div className="text-xs mb-2" style={{ letterSpacing: "0.06em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                Strategy
              </div>
              <div className="flex gap-2" role="group" aria-label="Payoff strategy">
                {[
                  { value: "avalanche", label: "Avalanche (highest rate first)" },
                  { value: "snowball", label: "Snowball (smallest balance first)" },
                ].map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setStrategy(s.value)}
                    style={{
                      fontSize: 13,
                      padding: "8px 14px",
                      borderRadius: 999,
                      cursor: "pointer",
                      border: `1px solid ${strategy === s.value ? "var(--color-accent)" : "var(--color-divider)"}`,
                      background: strategy === s.value ? "color-mix(in srgb, var(--color-accent) 12%, transparent)" : "transparent",
                      color: strategy === s.value ? "var(--color-accent-700)" : "color-mix(in srgb, var(--color-text) 60%, transparent)",
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs mb-2" style={{ letterSpacing: "0.06em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                Fixed total monthly payment?
              </div>
              <div className="flex gap-2" role="group" aria-label="Fixed total monthly payment">
                {[
                  { value: true, label: "Yes" },
                  { value: false, label: "No" },
                ].map((opt) => (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => setFixedTotal(opt.value)}
                    style={{
                      fontSize: 13,
                      padding: "8px 14px",
                      borderRadius: 999,
                      cursor: "pointer",
                      border: `1px solid ${fixedTotal === opt.value ? "var(--color-accent)" : "var(--color-divider)"}`,
                      background: fixedTotal === opt.value ? "color-mix(in srgb, var(--color-accent) 12%, transparent)" : "transparent",
                      color: fixedTotal === opt.value ? "var(--color-accent-700)" : "color-mix(in srgb, var(--color-text) 60%, transparent)",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className="text-xs mt-3 mb-0" style={{ maxWidth: 620, color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}>
            {fixedTotal
              ? 'Yes: once a debt is paid off, the payment that was going to it gets redirected to your remaining debts, so the total you\'re putting toward debt each month stays the same until everything\'s paid off. This is the faster, more standard way to run either strategy.'
              : "No: once a debt is paid off, that payment just goes away instead of being redirected -- so the total you're putting toward debt each month shrinks as debts close, and payoff takes longer."}
          </p>
        </Card>

        <Card style={{ padding: "26px 28px", marginBottom: 24 }}>
          <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4">
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 18 }}>Debt-free in</span>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 30, fontWeight: 600 }}>{monthsToYearsLabel(result.months)}</span>
          </div>
          <ul style={{ fontSize: 14, lineHeight: 2, margin: "0 0 4px", paddingLeft: 18, color: "color-mix(in srgb, var(--color-text) 76%, transparent)" }}>
            <li>Total balance today: <strong>{currency(totalBalance)}</strong> across {debts.length} debt{debts.length === 1 ? "" : "s"}</li>
            <li>Minimums alone: <strong>{currency(totalMin)}</strong>/mo</li>
            <li>Total interest paid: <strong>{currency(result.totalInterest)}</strong></li>
            {hasAnyExtra && !noExtra.reachedCap && (
              <li>
                Your extra payments save you{" "}
                <strong>{monthsToYearsLabel(Math.max(0, noExtra.months - result.months))}</strong> and{" "}
                <strong>{currency(Math.max(0, noExtra.totalInterest - result.totalInterest))}</strong> in interest vs. minimums only
              </li>
            )}
          </ul>
          {result.reachedCap && (
            <p className="text-sm mt-2" style={{ color: "#7a2f2a" }}>
              At these minimums and extra amounts, this doesn't pay off within 50 years -- increase your extra
              payments.
            </p>
          )}
          {persona === "business_owner" && businessBalance > 0 && (
            <p className="text-xs mt-3" style={{ color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}>
              Of the total above: {currency(personalBalance)} personal, {currency(businessBalance)} business.
            </p>
          )}
        </Card>

        <Card style={{ padding: "26px 28px", marginBottom: 24 }}>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 18, marginBottom: 4 }}>See the impact of paying more</div>
          <p className="text-xs mb-4" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
            Same debts, same strategy -- only the extra monthly amount changes. This is the one number worth
            experimenting with above.
          </p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 420, fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "8px 12px 8px 0", borderBottom: "1px solid var(--color-accent)", fontFamily: "var(--font-heading)", fontSize: 11.5, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>
                    Extra/mo
                  </th>
                  <th style={{ textAlign: "left", padding: "8px 12px", borderBottom: "1px solid var(--color-accent)", fontFamily: "var(--font-heading)", fontSize: 11.5, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>
                    Debt-free in
                  </th>
                  <th style={{ textAlign: "right", padding: "8px 0 8px 12px", borderBottom: "1px solid var(--color-accent)", fontFamily: "var(--font-heading)", fontSize: 11.5, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>
                    Total interest
                  </th>
                </tr>
              </thead>
              <tbody>
                {impactRows.map((row) => (
                  <tr key={row.amount} style={row.isCurrent ? { background: "var(--color-accent-100)" } : undefined}>
                    <td style={{ padding: "9px 12px 9px 0", borderBottom: "1px solid var(--color-divider)", fontWeight: row.isCurrent ? 600 : 400 }}>
                      {currency(row.amount)}
                      {row.isCurrent ? <span style={{ fontSize: 11, color: "var(--color-accent-700)", marginLeft: 6 }}>current</span> : null}
                    </td>
                    <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--color-divider)", fontWeight: row.isCurrent ? 600 : 400 }}>
                      {row.reachedCap ? "50+ yrs" : monthsToYearsLabel(row.months)}
                    </td>
                    <td style={{ textAlign: "right", padding: "9px 0 9px 12px", borderBottom: "1px solid var(--color-divider)", fontWeight: row.isCurrent ? 600 : 400 }}>
                      {row.reachedCap ? "--" : currency(row.totalInterest)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", padding: "18px 22px", marginBottom: 20 }}>
          <p className="text-sm m-0" style={{ color: "color-mix(in srgb, var(--color-text) 76%, transparent)" }}>
            Want your extra payment routed automatically every time you get paid?
          </p>
          <PrimaryButton onClick={() => router.push("/signup")}>
            Get started free <ArrowRight size={14} />
          </PrimaryButton>
        </Card>

        <p className="text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 45%, transparent)" }}>
          Estimate only -- interest accrues monthly on each remaining balance at the rate you enter, same as a
          standard amortization simulation. Doesn't account for new charges, promotional/variable rates, or fees.
        </p>
      </div>
    </div>
  );
}
