"use client";

import { useState } from "react";
import { Card, currency } from "@/components/ui";

// Plaid's personal_finance_category.primary values -> friendly labels.
const PFC_LABELS = {
  FOOD_AND_DRINK: "Food & Drink",
  GENERAL_MERCHANDISE: "Shopping",
  GENERAL_SERVICES: "Services",
  TRANSPORTATION: "Transportation",
  TRAVEL: "Travel",
  ENTERTAINMENT: "Entertainment",
  RENT_AND_UTILITIES: "Rent & Utilities",
  HOME_IMPROVEMENT: "Home",
  MEDICAL: "Medical",
  PERSONAL_CARE: "Personal Care",
  LOAN_PAYMENTS: "Loan Payments",
  BANK_FEES: "Bank Fees",
  GOVERNMENT_AND_NON_PROFIT: "Government & Giving",
};

function labelFor(pfc) {
  if (!pfc) return "Other";
  return PFC_LABELS[pfc] || pfc.toLowerCase().split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

const COLORS = ["#6D3BD9", "#12A39A", "#E8873A", "#D6457A", "#3B82D9", "#8BB92F", "#B07CF0", "#C9A227", "#5C6B8A", "#E0584B"];

function fmtDate(iso) {
  if (!iso) return "";
  const [, m, d] = iso.slice(0, 10).split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[(Number(m) || 1) - 1]} ${Number(d) || ""}`;
}

function slicePath(cx, cy, r, a0, a1) {
  const p = (a) => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
}

// Spend by Category: every outgoing charge this month that the person
// hasn't marked "Exclude" (internal transfers, card payments), grouped by
// Plaid's spending category, drawn as a pie. Tap a slice or a legend row to
// see exactly which charges make it up.
export default function SpendByCategory({ transactions }) {
  const [selected, setSelected] = useState(null);
  const groups = {};
  let total = 0;
  (transactions || []).forEach((t) => {
    if (t.direction !== "out") return;
    if ((t.confirmed_category || t.suggested_category) === "exclude") return;
    if (t.pfc_primary === "TRANSFER_OUT" || t.pfc_primary === "TRANSFER_IN") return;
    const key = labelFor(t.pfc_primary);
    const amt = Number(t.amount) || 0;
    (groups[key] = groups[key] || { amount: 0, items: [] });
    groups[key].amount += amt;
    groups[key].items.push(t);
    total += amt;
  });
  const rows = Object.entries(groups).sort((a, b) => b[1].amount - a[1].amount);
  const active = rows.find(([label]) => label === selected);

  let angle = 0;
  const slices = rows.map(([label, g], idx) => {
    const frac = total > 0 ? g.amount / total : 0;
    const a0 = angle;
    angle += frac * Math.PI * 2;
    return { label, g, frac, a0, a1: angle, color: COLORS[idx % COLORS.length] };
  });
  const toggle = (label) => setSelected((cur) => (cur === label ? null : label));

  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold mb-1">Spend by Category</h2>
      <p className="text-xs text-[var(--color-neutral-700)] mb-4">
        Where your money went this month, from the charges across your linked accounts. Tap a slice to see exactly what
        you spent. Transfers between your own accounts aren&apos;t counted.
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-[var(--color-neutral-700)]">No spending found for this month.</p>
      ) : (
        <div>
          <div className="flex flex-col sm:flex-row gap-6 items-center">
            <svg viewBox="0 0 200 200" width="220" height="220" role="img" aria-label="Spending by category pie chart" style={{ flex: "0 0 auto", maxWidth: "100%" }}>
              {slices.length === 1 ? (
                <circle cx="100" cy="100" r={selected ? 96 : 90} fill={slices[0].color} style={{ cursor: "pointer" }} onClick={() => toggle(slices[0].label)} />
              ) : (
                slices.map((sl) => (
                  <path
                    key={sl.label}
                    d={slicePath(100, 100, sl.label === selected ? 97 : 90, sl.a0, sl.a1)}
                    fill={sl.color}
                    stroke="#fff"
                    strokeWidth="2"
                    opacity={selected && sl.label !== selected ? 0.45 : 1}
                    style={{ cursor: "pointer" }}
                    onClick={() => toggle(sl.label)}
                  >
                    <title>{`${sl.label}: ${currency(sl.g.amount)}`}</title>
                  </path>
                ))
              )}
            </svg>
            <div className="w-full space-y-1" style={{ minWidth: 0 }}>
              {slices.map((sl) => (
                <button
                  key={sl.label}
                  type="button"
                  onClick={() => toggle(sl.label)}
                  aria-pressed={sl.label === selected}
                  className="w-full flex items-center justify-between text-xs rounded-lg px-2 py-2"
                  style={{ background: sl.label === selected ? "var(--color-neutral-200)" : "transparent", border: 0, cursor: "pointer", textAlign: "left" }}
                >
                  <span className="flex items-center gap-2 font-semibold" style={{ minWidth: 0 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: sl.color, flex: "0 0 auto" }} />
                    {sl.label}
                  </span>
                  <span className="font-mono">
                    {currency(sl.g.amount)} <span style={{ color: "var(--color-neutral-700)" }}>({Math.round(sl.frac * 100)}%)</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {active && (
            <div className="mt-4 rounded-xl p-4" style={{ border: "2px solid #9A72F0" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">{active[0]}: {active[1].items.length} charge{active[1].items.length === 1 ? "" : "s"}</span>
                <button type="button" onClick={() => setSelected(null)} className="text-xs font-semibold" style={{ background: "none", border: 0, cursor: "pointer", color: "#4E22B8" }}>Close</button>
              </div>
              <div className="space-y-1">
                {[...active[1].items]
                  .sort((a, b) => Number(b.amount) - Number(a.amount))
                  .map((t) => (
                    <div key={t.id} className="flex items-center justify-between gap-3 text-xs py-1" style={{ borderTop: "1px solid var(--color-divider)" }}>
                      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <span style={{ color: "var(--color-neutral-700)" }}>{fmtDate(t.txn_date)}</span> &nbsp;{t.name}
                      </span>
                      <span className="font-mono">{currency(t.amount)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="pt-3 mt-4 border-t border-[var(--color-divider)] flex items-center justify-between">
            <span className="text-sm font-semibold">Total spent</span>
            <span className="text-sm font-mono font-bold">{currency(total)}</span>
          </div>
        </div>
      )}
    </Card>
  );
}
