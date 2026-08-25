"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Plus, X } from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { PrimaryButton, currency } from "@/components/ui";
import { BLOOM_TOKENS } from "@/lib/bloomTheme";

const DEFAULT_DEBTS = [
  { id: "d1", name: "Credit Card", balance: 4000, apr: 22, minPayment: 120 },
  { id: "d2", name: "Car Loan", balance: 12000, apr: 6, minPayment: 280 },
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

function PillButton({ active, onClick, children, wide }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontSize: 15,
        fontWeight: 700,
        padding: wide ? "13px 26px" : "13px 20px",
        borderRadius: 999,
        cursor: "pointer",
        border: `2px solid ${active ? "var(--color-accent)" : "var(--color-neutral-300)"}`,
        background: active ? "var(--color-accent)" : "var(--color-surface)",
        color: active ? "#fff" : "#3B1C7A",
        transition: "border-color 140ms ease",
      }}
    >
      {children}
    </button>
  );
}

export default function DebtPayoffPublicClient() {
  const router = useRouter();
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
    setDebts((prev) => [...prev, { id: `d_${Date.now()}`, name: "New debt", balance: 1000, apr: 15, minPayment: 50 }]);

  const totalBalance = useMemo(() => debts.reduce((s, d) => s + (Number(d.balance) || 0), 0), [debts]);
  const totalMin = useMemo(() => debts.reduce((s, d) => s + (Number(d.minPayment) || 0), 0), [debts]);

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
  const showSavings = hasAnyExtra && !noExtra.reachedCap && !result.reachedCap;

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

  const summaryTiles = [
    { value: currency(totalBalance), label: `Total balance today across ${debts.length} debt${debts.length === 1 ? "" : "s"}` },
    { value: `${currency(totalMin)}/mo`, label: "Minimums alone" },
    { value: currency(result.totalInterest), label: "Total interest paid" },
  ];

  return (
    <div style={BLOOM_TOKENS}>
      <PublicHeader />
      <div style={{ maxWidth: 940, margin: "0 auto", padding: "56px clamp(18px, 4vw, 28px) 96px" }}>
        <h1
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(38px, 4.6vw, 52px)",
            lineHeight: 1.04,
            letterSpacing: "-0.035em",
            fontWeight: 800,
            margin: "0 0 16px",
          }}
        >
          Debt Payoff Calculator
        </h1>
        <p style={{ fontSize: 19, lineHeight: 1.6, color: "var(--color-neutral-800)", margin: "0 0 36px", maxWidth: "40em" }}>
          Compare the snowball and avalanche strategies and see exactly how long it takes and what it costs in
          interest. Free, no account needed.
        </p>

        {/* Debts card */}
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-divider)", borderRadius: 30, padding: 32 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text)", marginBottom: 14 }}>Your debts</div>
          <div className="flex flex-col gap-3">
            {debts.map((d) => (
              <div key={d.id} style={{ background: "var(--color-neutral-100)", border: "1px solid var(--color-divider)", borderRadius: 22, padding: 20 }}>
                <div className="flex items-center gap-3">
                  <input
                    value={d.name}
                    onChange={(e) => updateDebt(d.id, { name: e.target.value })}
                    aria-label="Debt name"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontSize: 19,
                      fontWeight: 800,
                      letterSpacing: "-0.015em",
                      color: "var(--color-text)",
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-neutral-300)",
                      borderRadius: 14,
                      padding: "12px 14px",
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={() => removeDebt(d.id)}
                    aria-label="Remove debt"
                    style={{
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--color-neutral-700)",
                      background: "none",
                      border: "1px solid var(--color-neutral-300)",
                      borderRadius: 999,
                      width: 44,
                      height: 44,
                      cursor: "pointer",
                    }}
                  >
                    <X size={17} />
                  </button>
                </div>
                <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", marginTop: 14 }}>
                  <label className="flex flex-col gap-2">
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-neutral-800)" }}>Remaining balance</span>
                    <span
                      style={{
                        height: 50,
                        boxSizing: "border-box",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-neutral-300)",
                        borderRadius: 14,
                        padding: "0 14px",
                      }}
                    >
                      <span style={{ fontSize: 16, fontWeight: 700, color: "var(--color-neutral-700)" }}>$</span>
                      <input
                        type="number"
                        onFocus={(e) => e.target.select()}
                        min={0}
                        step={100}
                        value={d.balance}
                        onChange={(e) => updateDebt(d.id, { balance: Math.max(0, Number(e.target.value) || 0) })}
                        style={{
                          flex: 1,
                          width: "100%",
                          fontSize: 18,
                          fontWeight: 800,
                          color: "var(--color-text)",
                          background: "none",
                          border: 0,
                          padding: 0,
                          outline: "none",
                          fontFamily: "var(--font-mono)",
                        }}
                      />
                    </span>
                  </label>
                  <label className="flex flex-col gap-2">
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-neutral-800)" }}>Interest rate</span>
                    <span
                      style={{
                        height: 50,
                        boxSizing: "border-box",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-neutral-300)",
                        borderRadius: 14,
                        padding: "0 14px",
                      }}
                    >
                      <input
                        type="number"
                        onFocus={(e) => e.target.select()}
                        min={0}
                        step={0.1}
                        value={d.apr}
                        onChange={(e) => updateDebt(d.id, { apr: Math.max(0, Number(e.target.value) || 0) })}
                        style={{
                          flex: 1,
                          width: "100%",
                          fontSize: 18,
                          fontWeight: 800,
                          color: "var(--color-text)",
                          background: "none",
                          border: 0,
                          padding: 0,
                          outline: "none",
                          fontFamily: "var(--font-mono)",
                        }}
                      />
                      <span style={{ fontSize: 16, fontWeight: 700, color: "var(--color-neutral-700)" }}>%</span>
                    </span>
                  </label>
                  <label className="flex flex-col gap-2">
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-neutral-800)" }}>Monthly or minimum payment</span>
                    <span
                      style={{
                        height: 50,
                        boxSizing: "border-box",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-neutral-300)",
                        borderRadius: 14,
                        padding: "0 14px",
                      }}
                    >
                      <span style={{ fontSize: 16, fontWeight: 700, color: "var(--color-neutral-700)" }}>$</span>
                      <input
                        type="number"
                        onFocus={(e) => e.target.select()}
                        min={0}
                        step={10}
                        value={d.minPayment}
                        onChange={(e) => updateDebt(d.id, { minPayment: Math.max(0, Number(e.target.value) || 0) })}
                        style={{
                          flex: 1,
                          width: "100%",
                          fontSize: 18,
                          fontWeight: 800,
                          color: "var(--color-text)",
                          background: "none",
                          border: 0,
                          padding: 0,
                          outline: "none",
                          fontFamily: "var(--font-mono)",
                        }}
                      />
                    </span>
                  </label>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addDebt}
            style={{
              width: "100%",
              marginTop: 14,
              fontSize: 16,
              fontWeight: 700,
              color: "var(--color-accent-700)",
              background: "none",
              border: "1px dashed var(--color-accent-400)",
              borderRadius: 20,
              padding: 16,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Plus size={16} /> Add debt
          </button>

          {/* Extra payments */}
          <div style={{ borderTop: "1px solid var(--color-divider)", marginTop: 28, paddingTop: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text)", marginBottom: 14 }}>Extra payments</div>
            <div className="flex gap-4 flex-wrap">
              <label className="flex flex-col gap-2" style={{ flex: "1 1 180px" }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text)" }}>Per month</span>
                <span
                  style={{
                    marginTop: "auto",
                    height: 56,
                    boxSizing: "border-box",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: "var(--color-accent-100)",
                    border: "2px solid var(--color-accent-400)",
                    borderRadius: 16,
                    padding: "0 16px",
                  }}
                >
                  <span style={{ fontSize: 19, fontWeight: 700, color: "var(--color-accent-700)" }}>$</span>
                  <input
                    type="number"
                    onFocus={(e) => e.target.select()}
                    min={0}
                    step={25}
                    value={extraMonthly}
                    onChange={(e) => setExtraMonthly(Math.max(0, Number(e.target.value) || 0))}
                    style={{
                      flex: 1,
                      width: "100%",
                      fontSize: 22,
                      fontWeight: 800,
                      color: "var(--color-text)",
                      background: "none",
                      border: 0,
                      padding: 0,
                      outline: "none",
                      fontFamily: "var(--font-mono)",
                      letterSpacing: "-0.02em",
                    }}
                  />
                </span>
              </label>
              <label className="flex flex-col gap-2" style={{ flex: "1 1 180px" }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text)" }}>Per year</span>
                <span
                  style={{
                    marginTop: "auto",
                    height: 56,
                    boxSizing: "border-box",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: "var(--color-neutral-100)",
                    border: "1px solid var(--color-neutral-300)",
                    borderRadius: 16,
                    padding: "0 16px",
                  }}
                >
                  <span style={{ fontSize: 19, fontWeight: 700, color: "var(--color-neutral-700)" }}>$</span>
                  <input
                    type="number"
                    onFocus={(e) => e.target.select()}
                    min={0}
                    step={100}
                    value={extraYearly}
                    onChange={(e) => setExtraYearly(Math.max(0, Number(e.target.value) || 0))}
                    style={{
                      flex: 1,
                      width: "100%",
                      fontSize: 22,
                      fontWeight: 800,
                      color: "var(--color-text)",
                      background: "none",
                      border: 0,
                      padding: 0,
                      outline: "none",
                      fontFamily: "var(--font-mono)",
                      letterSpacing: "-0.02em",
                    }}
                  />
                </span>
              </label>
              <label className="flex flex-col gap-2" style={{ flex: "1 1 260px" }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text)" }}>One-time, during month #</span>
                <span className="flex items-center gap-2 flex-wrap" style={{ marginTop: "auto" }}>
                  <span
                    style={{
                      flex: "1 1 120px",
                      height: 56,
                      boxSizing: "border-box",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      background: "var(--color-neutral-100)",
                      border: "1px solid var(--color-neutral-300)",
                      borderRadius: 16,
                      padding: "0 16px",
                    }}
                  >
                    <span style={{ fontSize: 19, fontWeight: 700, color: "var(--color-neutral-700)" }}>$</span>
                    <input
                      type="number"
                      onFocus={(e) => e.target.select()}
                      min={0}
                      step={100}
                      value={oneTimeAmount}
                      onChange={(e) => setOneTimeAmount(Math.max(0, Number(e.target.value) || 0))}
                      style={{
                        flex: 1,
                        width: "100%",
                        fontSize: 22,
                        fontWeight: 800,
                        color: "var(--color-text)",
                        background: "none",
                        border: 0,
                        padding: 0,
                        outline: "none",
                        fontFamily: "var(--font-mono)",
                      }}
                    />
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "var(--color-neutral-800)" }}>in month</span>
                  <span
                    style={{
                      height: 56,
                      boxSizing: "border-box",
                      display: "flex",
                      alignItems: "center",
                      background: "var(--color-neutral-100)",
                      border: "1px solid var(--color-neutral-300)",
                      borderRadius: 16,
                      padding: "0 14px",
                    }}
                  >
                    <input
                      type="number"
                      onFocus={(e) => e.target.select()}
                      min={1}
                      step={1}
                      value={oneTimeMonth}
                      onChange={(e) => setOneTimeMonth(Math.max(1, Number(e.target.value) || 1))}
                      aria-label="One-time payment month"
                      style={{
                        width: 58,
                        fontSize: 18,
                        fontWeight: 800,
                        color: "var(--color-text)",
                        background: "none",
                        border: 0,
                        padding: 0,
                        outline: "none",
                        textAlign: "center",
                        fontFamily: "var(--font-mono)",
                      }}
                    />
                  </span>
                </span>
              </label>
            </div>
            <p
              style={{
                fontSize: 16,
                lineHeight: 1.6,
                color: "var(--color-neutral-800)",
                background: "var(--color-accent-100)",
                borderRadius: 16,
                padding: "15px 18px",
                margin: "18px 0 0",
              }}
            >
              The "Per month" amount is the one lever most worth playing with -- see exactly how much sooner a
              bigger number gets you out of debt in "See the impact of paying more" below.
            </p>
          </div>

          {/* Strategy + fixed total */}
          <div className="flex gap-8 flex-wrap" style={{ borderTop: "1px solid var(--color-divider)", marginTop: 28, paddingTop: 24 }}>
            <div style={{ flex: "1 1 340px" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text)", marginBottom: 14 }}>Strategy</div>
              <div className="flex gap-2 flex-wrap" role="group" aria-label="Payoff strategy">
                {[
                  { value: "avalanche", label: "Avalanche (highest rate first)" },
                  { value: "snowball", label: "Snowball (smallest balance first)" },
                ].map((s) => (
                  <PillButton key={s.value} active={strategy === s.value} onClick={() => setStrategy(s.value)}>
                    {s.label}
                  </PillButton>
                ))}
              </div>
            </div>

            <div style={{ flex: "0 1 200px" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text)", marginBottom: 14 }}>Fixed total monthly payment?</div>
              <div className="flex gap-2" role="group" aria-label="Fixed total monthly payment">
                {[
                  { value: true, label: "Yes" },
                  { value: false, label: "No" },
                ].map((opt) => (
                  <PillButton key={String(opt.value)} active={fixedTotal === opt.value} onClick={() => setFixedTotal(opt.value)} wide>
                    {opt.label}
                  </PillButton>
                ))}
              </div>
            </div>
          </div>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: "var(--color-neutral-800)", margin: "18px 0 0", maxWidth: "60em" }}>
            {fixedTotal
              ? 'Yes: once a debt is paid off, the payment that was going to it gets redirected to your remaining debts, so the total you\'re putting toward debt each month stays the same until everything\'s paid off. This is the faster, more standard way to run either strategy.'
              : "No: once a debt is paid off, that payment just goes away instead of being redirected -- so the total you're putting toward debt each month shrinks as debts close, and payoff takes longer."}
          </p>
        </div>

        {/* Result panel -- plum, white text */}
        <div style={{ background: "#3B1C7A", color: "#fff", borderRadius: 30, padding: 34, marginTop: 20 }}>
          <div className="flex items-baseline gap-5 flex-wrap">
            <span style={{ flex: 1, minWidth: 200, fontFamily: "var(--font-heading)", fontSize: 18, fontWeight: 700, opacity: 0.85 }}>
              Debt-free in
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(38px, 5vw, 54px)", fontWeight: 800, letterSpacing: "-0.035em" }}>
              {result.reachedCap ? "50+ yrs" : monthsToYearsLabel(result.months)}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginTop: 26 }}>
            {summaryTiles.map((t) => (
              <div key={t.label} style={{ background: "rgba(255,255,255,0.1)", borderRadius: 18, padding: 18 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>{t.value}</div>
                <div style={{ fontSize: 14, fontWeight: 600, opacity: 0.8, marginTop: 6, lineHeight: 1.4 }}>{t.label}</div>
              </div>
            ))}
          </div>

          {showSavings && (
            <div
              className="flex items-center gap-4 flex-wrap"
              style={{ background: "#fff", color: "var(--color-text)", borderRadius: 20, padding: "22px 24px", marginTop: 20 }}
            >
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "#22684C",
                  background: "#E9F6EF",
                  borderRadius: 999,
                  padding: "8px 14px",
                }}
              >
                Extra payments
              </span>
              <span style={{ flex: 1, minWidth: 240, fontSize: 18, fontWeight: 700, lineHeight: 1.45 }}>
                save you <strong>{monthsToYearsLabel(Math.max(0, noExtra.months - result.months))}</strong> and{" "}
                <strong>{currency(Math.max(0, noExtra.totalInterest - result.totalInterest))}</strong> in interest vs.
                minimums only.
              </span>
            </div>
          )}

          {result.reachedCap && (
            <p
              style={{
                fontSize: 16,
                lineHeight: 1.6,
                fontWeight: 600,
                background: "#FBEEEA",
                color: "#9C3B22",
                borderRadius: 16,
                padding: "15px 18px",
                margin: "20px 0 0",
              }}
            >
              At these minimums and extra amounts, this doesn't pay off within 50 years -- increase your extra
              payments.
            </p>
          )}
        </div>

        {/* Impact table */}
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-divider)", borderRadius: 30, padding: 32, marginTop: 20 }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 24, fontWeight: 800, letterSpacing: "-0.025em", margin: "0 0 8px" }}>
            See the impact of paying more
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: "var(--color-neutral-800)", margin: "0 0 22px" }}>
            Same debts, same strategy -- only the extra monthly amount changes. This is the one number worth
            experimenting with above.
          </p>

          <div className="flex flex-col gap-2">
            <div className="flex gap-4" style={{ padding: "0 18px 6px" }}>
              <span style={{ flex: "0 0 110px", fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>
                Extra/mo
              </span>
              <span style={{ flex: 1, fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>
                Debt-free in
              </span>
              <span style={{ flex: "0 0 120px", textAlign: "right", fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>
                Total interest
              </span>
            </div>
            {impactRows.map((row) => (
              <div
                key={row.amount}
                className="flex items-center gap-4"
                style={{
                  background: row.isCurrent ? "var(--color-accent-100)" : "var(--color-surface)",
                  border: `1px solid ${row.isCurrent ? "var(--color-accent-400)" : "var(--color-divider)"}`,
                  borderRadius: 16,
                  padding: "16px 18px",
                }}
              >
                <span style={{ flex: "0 0 110px", display: "flex", alignItems: "center", gap: 8, fontSize: 18, fontWeight: row.isCurrent ? 800 : 500, fontFamily: "var(--font-mono)" }}>
                  {currency(row.amount)}
                  {row.isCurrent && (
                    <span
                      style={{
                        fontFamily: "var(--font-heading)",
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "#fff",
                        background: "var(--color-accent)",
                        borderRadius: 999,
                        padding: "4px 8px",
                      }}
                    >
                      Now
                    </span>
                  )}
                </span>
                <span style={{ flex: 1, minWidth: 90, fontSize: 17, fontWeight: row.isCurrent ? 800 : 500 }}>
                  {row.reachedCap ? "50+ yrs" : monthsToYearsLabel(row.months)}
                </span>
                <span style={{ flex: "0 0 120px", textAlign: "right", fontSize: 18, fontWeight: row.isCurrent ? 800 : 500, fontFamily: "var(--font-mono)" }}>
                  {row.reachedCap ? "—" : currency(row.totalInterest)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA banner */}
        <div
          style={{
            background: "#EDE6FF",
            borderRadius: 26,
            padding: "28px 32px",
            marginTop: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <p style={{ fontSize: 19, fontWeight: 700, margin: 0, color: "var(--color-text)" }}>
            Want your extra payment routed automatically every time you get paid?
          </p>
          <PrimaryButton onClick={() => router.push("/signup")}>
            Get started free <ArrowRight size={14} />
          </PrimaryButton>
        </div>

        <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--color-neutral-700)", margin: "22px 0 0" }}>
          Estimate only. This assumes a fixed APR and steady payments each month, and doesn't account for new
          charges, promotional rates, or fees.
        </p>
      </div>
      <PublicFooter />
    </div>
  );
}
