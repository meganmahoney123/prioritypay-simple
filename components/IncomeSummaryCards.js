"use client";

import { useMemo } from "react";
import { colorForLabel } from "@/lib/allocations";

// The three summary cards at the very top of the Dashboard (above the
// "Transfers to make" card): Total income, Saved via PrioritySave, and
// Guilt-Free Spending available. Side by side on desktop, stacked on
// mobile. Moved here (Nov 2026) from inside CategoryDistributionSection.
//
// Business Expenses (OPEX) isn't savings, so the middle card has two
// sections: "Saved" (every other category) and "Set aside for business
// expenses". The guilt-free card's math subtracts both, so it still adds
// up to total income:
//   guilt-free = total income - credit card payments - saved - set aside
// (category-summary's `unallocated` is already exactly that, since
// totalAllocated = saved + set aside.)
//
// Data: the same GET /api/allocations/category-summary response the rest of
// the Dashboard uses, fetched once in app/(app)/dashboard/page.js.

// "Business Expenses (OPEX)" is the built-in label; a custom
// "Business Expenses ..." category counts too.
export function isBusinessExpenseLabel(label) {
  return /^business expenses\b/i.test(String(label || "").trim());
}

// "$720" for whole dollars, "$175.50" otherwise, so the guilt-free math
// visibly adds up instead of each line rounding on its own.
function currency(n) {
  const v = Number(n) || 0;
  const whole = Math.abs(v - Math.round(v)) < 0.005;
  return v.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 });
}

const cardStyle = {
  border: "1px solid var(--color-accent-300)",
  borderRadius: "var(--radius-lg)",
  background: "var(--color-accent-200)",
  color: "var(--color-accent-800)",
  padding: "20px 22px",
};
const eyebrow = { fontSize: 11.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-accent-700)" };
const bigNumber = { fontSize: 30, fontWeight: 700, lineHeight: 1.15, marginTop: 6, color: "var(--color-accent-900)" };
const divider = { height: 1, background: "var(--color-accent-300)", margin: "14px 0 10px" };
const minus = { color: "#9C3B22" };

function Breakdown({ items }) {
  return (
    <div className="flex flex-col gap-1.5">
      {items.map((c) => (
        <div key={c.label} className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: colorForLabel(c.label) }} />
            <span className="truncate">{c.label}</span>
          </span>
          <span className="font-mono shrink-0" style={{ color: "var(--color-accent-700)" }}>
            {currency(c.amount)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function IncomeSummaryCards({ summary, loading, mode = "month", rangeLabel }) {
  const periodWord = mode === "year" ? "this year" : "this month";
  const periodTitle = mode === "year" ? "This Year" : "This Month";

  const { saved, business, savedTotal, businessTotal } = useMemo(() => {
    // Every label's amount this period (monthlyByLabel includes renamed or
    // removed categories, so saved + set aside always equals totalAllocated),
    // in the current split-rule order first.
    const byLabel = summary?.monthlyByLabel || Object.fromEntries((summary?.categories || []).map((c) => [c.label, c.monthlyContribution]));
    const order = (summary?.categories || []).map((c) => c.label);
    const labels = [...order.filter((l) => l in byLabel), ...Object.keys(byLabel).filter((l) => !order.includes(l))];
    const contributing = labels.map((label) => ({ label, amount: Number(byLabel[label]) || 0 })).filter((c) => c.amount > 0);
    const s = contributing.filter((c) => !isBusinessExpenseLabel(c.label));
    const b = contributing.filter((c) => isBusinessExpenseLabel(c.label));
    const sum = (rows) => rows.reduce((t, r) => t + r.amount, 0);
    return { saved: s, business: b, savedTotal: sum(s), businessTotal: sum(b) };
  }, [summary]);

  if (loading && !summary) {
    return <p className="text-sm text-neutral-400">Loading…</p>;
  }
  const totalDeposited = summary?.totalDeposited || 0;
  if (!summary || totalDeposited === 0) return null;

  const guiltFree = summary.unallocated || 0;
  const cardCharges = summary.netCardCharges || 0;
  const cardChargesExcluded = summary.excludedByWithdrawal || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Total income */}
      <div style={cardStyle}>
        <div style={eyebrow}>Total Income {periodTitle}</div>
        <div className="font-mono" style={bigNumber}>
          {currency(totalDeposited)}
        </div>
        {rangeLabel && <div style={{ fontSize: 12.5, color: "var(--color-accent-700)", marginTop: 2 }}>{rangeLabel}</div>}
        <div style={divider} />
        <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--color-accent-700)" }}>
          All deposits, including those that didn&apos;t meet the minimum split trigger threshold.
        </div>
      </div>

      {/* Saved, plus set aside for business expenses */}
      <div style={cardStyle}>
        <div style={eyebrow}>Saved {periodTitle} via PrioritySave</div>
        <div className="font-mono" style={bigNumber}>
          {currency(savedTotal)}
        </div>
        {saved.length > 0 && (
          <>
            <div style={divider} />
            <Breakdown items={saved} />
          </>
        )}
        {business.length > 0 && (
          <>
            <div style={divider} />
            <div className="flex items-baseline justify-between gap-3">
              <span style={eyebrow}>Set aside for business expenses</span>
              <span className="font-mono" style={{ fontSize: 16, fontWeight: 700, color: "var(--color-accent-900)" }}>
                {currency(businessTotal)}
              </span>
            </div>
            {business.length > 1 && (
              <div style={{ marginTop: 8 }}>
                <Breakdown items={business} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Guilt-free spending available */}
      <div style={cardStyle}>
        <div style={eyebrow}>Guilt-Free Spending Available</div>
        <div className="font-mono" style={{ ...bigNumber, fontSize: 32 }}>
          {currency(guiltFree)}
        </div>
        {rangeLabel && <div style={{ fontSize: 12.5, color: "var(--color-accent-700)", marginTop: 2 }}>{rangeLabel}</div>}
        <div style={divider} />
        <div className="font-mono flex flex-col gap-1.5" style={{ fontSize: 12.5 }}>
          <div className="flex justify-between gap-3" style={{ color: "var(--color-accent-800)" }}>
            <span className="font-sans font-semibold">Total income</span>
            <span>{currency(totalDeposited)}</span>
          </div>
          {cardCharges > 0 && (
            <div className="flex justify-between gap-3" style={minus}>
              <span className="font-sans font-semibold">− Credit card payments</span>
              <span>{currency(cardCharges)}</span>
            </div>
          )}
          <div className="flex justify-between gap-3" style={minus}>
            <span className="font-sans font-semibold">− Saved {periodWord}</span>
            <span>{currency(savedTotal)}</span>
          </div>
          {businessTotal > 0 && (
            <div className="flex justify-between gap-3" style={minus}>
              <span className="font-sans font-semibold">− Set aside for business expenses</span>
              <span>{currency(businessTotal)}</span>
            </div>
          )}
        </div>
        {cardChargesExcluded > 0 && (
          <div style={{ fontSize: 11, color: "var(--color-accent-700)", marginTop: 10, lineHeight: 1.4 }}>
            Excludes the {currency(cardChargesExcluded)} already covered by category withdrawals. E.g. a charge allocated to a category reduces that
            category, so it isn&apos;t included in &quot;Credit card payments&quot; here.
          </div>
        )}
      </div>
    </div>
  );
}
