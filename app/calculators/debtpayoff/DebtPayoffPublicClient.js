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
// each debt's minimum, then throw whatever's left of the extra monthly
// amount at whichever debt the strategy targets first -- smallest balance
// for snowball (fastest wins, keeps motivation up), highest APR for
// avalanche (mathematically optimal, least total interest). A freed-up
// minimum automatically becomes available as extra the moment a debt hits
// zero, since every remaining debt still gets its own minimum paid first
// each month regardless of order.
function simulatePayoff(debts, extraMonthly, strategy) {
  const working = debts.map((d) => ({ ...d, balance: Math.max(0, Number(d.balance) || 0) }));
  const order = (list) =>
    strategy === "avalanche"
      ? [...list].sort((a, b) => (Number(b.apr) || 0) - (Number(a.apr) || 0))
      : [...list].sort((a, b) => a.balance - b.balance);

  let months = 0;
  let totalInterest = 0;
  const maxMonths = 600;
  while (working.some((d) => d.balance > 0.5) && months < maxMonths) {
    months += 1;
    working.forEach((d) => {
      if (d.balance > 0) {
        const interest = d.balance * ((Number(d.apr) || 0) / 100 / 12);
        d.balance += interest;
        totalInterest += interest;
      }
    });
    working.forEach((d) => {
      if (d.balance > 0) {
        d.balance -= Math.min(d.balance, Number(d.minPayment) || 0);
      }
    });
    let extra = Math.max(0, Number(extraMonthly) || 0);
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
  const [strategy, setStrategy] = useState("avalanche");

  const updateDebt = (id, patch) => setDebts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const removeDebt = (id) => setDebts((prev) => prev.filter((d) => d.id !== id));
  const addDebt = () =>
    setDebts((prev) => [...prev, { id: `d_${Date.now()}`, name: "New debt", balance: 1000, apr: 15, minPayment: 50, type: "personal" }]);

  const totalBalance = useMemo(() => debts.reduce((s, d) => s + (Number(d.balance) || 0), 0), [debts]);
  const totalMin = useMemo(() => debts.reduce((s, d) => s + (Number(d.minPayment) || 0), 0), [debts]);
  const personalBalance = useMemo(() => debts.filter((d) => d.type !== "business").reduce((s, d) => s + (Number(d.balance) || 0), 0), [debts]);
  const businessBalance = useMemo(() => debts.filter((d) => d.type === "business").reduce((s, d) => s + (Number(d.balance) || 0), 0), [debts]);

  const result = useMemo(() => simulatePayoff(debts, extraMonthly, strategy), [debts, extraMonthly, strategy]);
  const noExtra = useMemo(() => simulatePayoff(debts, 0, strategy), [debts, strategy]);

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
                  Balance $
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
                  APR %
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
                  Min $
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
          <GhostButton onClick={addDebt} className="mb-5">
            <Plus size={15} /> Add debt
          </GhostButton>

          <div className="flex gap-6 flex-wrap items-end">
            <label className="text-xs flex flex-col gap-1" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
              Extra you can put toward debt each month (beyond minimums)
              <span style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontFamily: "var(--font-heading)", fontSize: 18, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>$</span>
                <input
                  type="number"
                  min={0}
                  step={25}
                  value={extraMonthly}
                  onChange={(e) => setExtraMonthly(Math.max(0, Number(e.target.value) || 0))}
                  style={ledgerInputStyle({ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 600, width: 120 })}
                />
              </span>
            </label>

            <div className="flex gap-2" role="group" aria-label="Payoff strategy">
              {[
                { value: "avalanche", label: "Avalanche (highest APR first)" },
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
            {extraMonthly > 0 && !noExtra.reachedCap && (
              <li>
                Extra {currency(extraMonthly)}/mo saves you{" "}
                <strong>{monthsToYearsLabel(Math.max(0, noExtra.months - result.months))}</strong> and{" "}
                <strong>{currency(Math.max(0, noExtra.totalInterest - result.totalInterest))}</strong> in interest vs. minimums only
              </li>
            )}
          </ul>
          {result.reachedCap && (
            <p className="text-sm mt-2" style={{ color: "#7a2f2a" }}>
              At these minimums and extra amount, this doesn't pay off within 50 years -- increase the extra monthly
              amount.
            </p>
          )}
          {persona === "business_owner" && businessBalance > 0 && (
            <p className="text-xs mt-3" style={{ color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}>
              Of the total above: {currency(personalBalance)} personal, {currency(businessBalance)} business.
            </p>
          )}
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
          Estimate only -- assumes a fixed APR and steady payments each month, and doesn't account for new charges,
          promotional rates, or fees.
        </p>
      </div>
    </div>
  );
}
