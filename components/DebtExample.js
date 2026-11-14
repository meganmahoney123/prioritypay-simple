"use client";

import { Card, currency } from "@/components/ui";
import { buildPlan, debtTypeLabel, payoffLabel } from "@/lib/debtPayoff";

// Made-up numbers so someone with no debts yet can see what the plan looks like.
// Clearly labeled as an example; nothing here is saved or comes from their data.
const SAMPLE = [
  { id: "ex1", name: "Visa card", debtType: "credit_card", balance: 4200, apr: 22.9, minPayment: 95 },
  { id: "ex2", name: "Car loan", debtType: "auto_loan", balance: 7300, apr: 7.2, minPayment: 210 },
  { id: "ex3", name: "Student loan", debtType: "student_loan", balance: 11800, apr: 5.5, minPayment: 130 },
];
const EXTRA = 150;
const INK = "#1F1636";
const MUTED = "#5E5575";
const HAIR = "#E6E1F0";
const mono = { fontFamily: "var(--font-mono, ui-monospace, monospace)", fontWeight: 600 };
const eyebrow = { fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: MUTED };

export default function DebtExample({ onAdd }) {
  const info = buildPlan(SAMPLE, EXTRA, "avalanche");
  const plan = info.plan;
  const last = Math.max(1, ...SAMPLE.map((d) => plan.payoff[d.id] || 0));
  const saved = info.minimumsOnly.neverPaysOff ? null : Math.round(info.minimumsOnly.totalInterest - plan.totalInterest);
  return (
    <Card className="p-6">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <span style={{ ...eyebrow, background: "#F1EDF9", borderRadius: 99, padding: "4px 10px" }}>Example, not your data</span>
        <button type="button" onClick={onAdd} style={{ background: "none", border: 0, cursor: "pointer", fontSize: 14, fontWeight: 600, color: "var(--color-accent-700)" }}>Add my own debts ›</button>
      </div>
      <div style={{ fontSize: 20, fontWeight: 600, color: INK, marginTop: 12 }}>Debt-free by {payoffLabel(plan.months)}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 16, borderTop: `1px solid ${HAIR}`, marginTop: 14, paddingTop: 14 }}>
        <div><div style={eyebrow}>Monthly payment</div><div style={{ ...mono, fontSize: 24, color: INK }}>{currency(info.minimums + EXTRA)}</div><div style={{ fontSize: 12.5, color: MUTED }}>{currency(info.minimums)} minimums + {currency(EXTRA)} extra</div></div>
        <div><div style={eyebrow}>Interest to pay</div><div style={{ ...mono, fontSize: 24, color: "#0F6B4F" }}>{currency(plan.totalInterest)}</div>{saved > 0 && <div style={{ fontSize: 12.5, color: MUTED }}>about {currency(saved)} less than minimums only</div>}</div>
        <div><div style={eyebrow}>Months to go</div><div style={{ ...mono, fontSize: 24, color: INK }}>{plan.months}</div></div>
      </div>
      <div style={{ marginTop: 16 }}>
        {info.payoffOrder.map((d, i) => (
          <div key={d.id} style={{ borderTop: `1px solid ${HAIR}`, padding: "10px 0" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ width: 26, height: 26, borderRadius: 99, background: "#F1EDF9", color: INK, fontWeight: 600, fontSize: 13, display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{i + 1}</span>
              <div style={{ flex: "1 1 140px", minWidth: 0 }}>
                <div style={{ fontSize: 15.5, fontWeight: 600, color: INK }}>{d.name}</div>
                <div style={{ fontSize: 12.5, color: MUTED }}>{debtTypeLabel(d.debtType)}</div>
              </div>
              <div style={{ display: "flex", gap: 18, alignItems: "baseline", flexWrap: "wrap", color: INK }}>
                <span style={{ ...mono, fontSize: 15 }}>{currency(d.balance)}</span>
                <span style={{ ...mono, fontSize: 15, color: d.apr >= 15 ? "#B3261E" : INK }}>{d.apr}%</span>
                <span style={{ ...mono, fontSize: 15 }}>{currency(d.minPayment)}/mo</span>
                <span style={{ fontSize: 14, fontWeight: 600, minWidth: 74, textAlign: "right" }}>{payoffLabel(plan.payoff[d.id])}</span>
              </div>
            </div>
            <div style={{ background: "#EDE9F6", borderRadius: 99, height: 8, marginTop: 8 }}>
              <div style={{ width: `${Math.round(((plan.payoff[d.id] || 0) / last) * 100)}%`, height: 8, borderRadius: 99, background: "var(--color-accent)" }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 13, color: MUTED, marginTop: 10 }}>Highest interest rate first. As each debt is paid off, its minimum rolls into the next one. Made-up numbers.</div>
    </Card>
  );
}
