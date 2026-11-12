"use client";

import { useEffect, useMemo, useState } from "react";
import { colorForLabel } from "@/lib/allocations";

// The three summary cards at the very top of the Dashboard (above the
// "Transfers to make" card): Total income, Saved via PrioritySave, and
// Guilt-Free Spending available. Side by side on desktop, stacked on
// mobile. Moved here (Nov 2026) from inside CategoryDistributionSection.
//
// Business Expenses (OPEX) isn't savings, so the middle card lists only the
// saved categories (Nov 2026: the separate "Set aside for business expenses"
// total was removed from both this card and the guilt-free card's math
// lines). The guilt-free number itself still comes from category-summary's
// `unallocated`, which already accounts for every allocated dollar.
//
// The Total Income card also shows the most recent deposits and who they
// were from; clicking it opens a popup with the full list for the period.
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

// Same look as the Bills and Autopays tab: white card, purple outline, small
// spaced-out grey labels, big monospace numbers, thicker hairline dividers.
const cardStyle = {
  border: "1px solid var(--color-divider)",
  boxShadow: "var(--shadow-sm)",
  borderRadius: 14,
  background: "#fff",
  color: "var(--color-text)",
  padding: "20px 22px",
};
const eyebrow = { fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#6B6280" };
const bigNumber = { fontSize: 26, fontWeight: 600, lineHeight: 1.15, marginTop: 4, color: "#241337" };
const divider = { height: 1, background: "#E7DEFA", margin: "14px 0 10px" };
const minus = { color: "#9C3B22" };

function Breakdown({ items }) {
  return (
    <div className="flex flex-col gap-1.5">
      {items.map((c) => (
        <div key={c.label} className="flex items-center justify-between" style={{ fontSize: 15, fontWeight: 500, padding: "5px 0", borderTop: "1px solid #E7DEFA" }}>
          <span className="flex items-center gap-2 min-w-0">
            <span className="shrink-0" style={{ width: 11, height: 11, borderRadius: "50%", backgroundColor: colorForLabel(c.label) }} />
            <span className="truncate">{c.label}</span>
          </span>
          <span className="font-mono shrink-0" style={{ color: "#241337" }}>
            {currency(c.amount)}
          </span>
        </div>
      ))}
    </div>
  );
}

function shortDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function DepositRow({ d }) {
  return (
    <div className="flex items-center justify-between gap-3" style={{ fontSize: 15 }}>
      <span className="min-w-0 truncate">
        <span className="font-semibold">{d.name || "Deposit"}</span>
        <span style={{ color: "var(--color-accent-700)" }}> · {shortDate(d.date)}</span>
      </span>
      <span className="font-mono shrink-0" style={{ color: "var(--color-accent-800)" }}>
        {currency(d.amount)}
      </span>
    </div>
  );
}

// Short row for the card: just the date and the amount. Clicking the block
// opens the popup with the full details (who it was from).
function CompactDepositRow({ d }) {
  return (
    <div className="flex items-center justify-between gap-3" style={{ fontSize: 15, fontWeight: 500, padding: "5px 0", borderTop: "1px solid #E7DEFA" }}>
      <span>{shortDate(d.date)}</span>
      <span className="font-mono shrink-0" style={{ color: "#241337" }}>{currency(d.amount)}</span>
    </div>
  );
}

// Latest few deposits; the whole block is one button that opens the popup.
function RecentDeposits({ deposits, periodTitle, rangeLabel }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  if (!deposits || deposits.length === 0) return null;
  const recent = deposits.slice(0, 3);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="w-full text-left"
        style={{ background: "transparent", border: 0, padding: 0, cursor: "pointer", color: "inherit" }}
      >
        <div style={{ ...eyebrow, marginBottom: 4 }}>Recent deposits</div>
        <div className="flex flex-col">
          {recent.map((d) => (
            <CompactDepositRow key={d.id} d={d} />
          ))}
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-accent-700)", textDecoration: "underline", marginTop: 8 }}>
          View all {deposits.length} {deposits.length === 1 ? "deposit" : "deposits"}
        </div>
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="All deposits"
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(36,19,55,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 520, maxHeight: "80vh", display: "flex", flexDirection: "column", background: "#fff", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-accent-300)", color: "var(--color-accent-800)" }}
          >
            <div className="flex items-start justify-between gap-3" style={{ padding: "18px 20px 12px" }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 600, color: "var(--color-accent-900)" }}>All deposits</div>
                <div style={{ fontSize: 12.5, color: "var(--color-accent-700)" }}>
                  {rangeLabel || periodTitle} · {deposits.length} {deposits.length === 1 ? "deposit" : "deposits"}
                </div>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" style={{ fontSize: 22, lineHeight: 1, border: 0, background: "transparent", cursor: "pointer", color: "var(--color-accent-700)" }}>
                ×
              </button>
            </div>
            <div className="flex flex-col gap-3" style={{ padding: "4px 20px 20px", overflowY: "auto" }}>
              {deposits.map((d) => (
                <DepositRow key={d.id} d={d} />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function IncomeSummaryCards({ summary, loading, mode = "month", rangeLabel }) {
  const periodWord = mode === "year" ? "this year" : "this month";
  const periodTitle = mode === "year" ? "This Year" : "This Month";

  const { saved, savedTotal } = useMemo(() => {
    // Every label's amount this period (monthlyByLabel includes renamed or
    // removed categories, so saved + set aside always equals totalAllocated),
    // in the current split-rule order first.
    const byLabel = summary?.monthlyByLabel || Object.fromEntries((summary?.categories || []).map((c) => [c.label, c.monthlyContribution]));
    const order = (summary?.categories || []).map((c) => c.label);
    const labels = [...order.filter((l) => l in byLabel), ...Object.keys(byLabel).filter((l) => !order.includes(l))];
    const contributing = labels.map((label) => ({ label, amount: Number(byLabel[label]) || 0 })).filter((c) => c.amount > 0);
    const s = contributing.filter((c) => !isBusinessExpenseLabel(c.label));
    const sum = (rows) => rows.reduce((t, r) => t + r.amount, 0);
    return { saved: s, savedTotal: sum(s) };
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
        {rangeLabel && <div style={{ fontSize: 15, color: "#4A3F63", marginTop: 2 }}>{rangeLabel}</div>}
        <div style={divider} />
        {summary.deposits?.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <RecentDeposits deposits={summary.deposits} periodTitle={periodTitle} rangeLabel={rangeLabel} />
          </div>
        )}
        <div style={{ fontSize: 14, lineHeight: 1.5, color: "#4A3F63" }}>
          All deposits, including those that didn&apos;t meet the minimum split trigger threshold.
        </div>
      </div>

      {/* Saved via PrioritySave */}
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
      </div>

      {/* Guilt-free spending available */}
      <div style={cardStyle}>
        <div style={eyebrow}>Guilt-Free Spending Available</div>
        <div className="font-mono" style={{ ...bigNumber, fontSize: 26, color: "#0F6B4F" }}>
          {currency(guiltFree)}
        </div>
        {rangeLabel && <div style={{ fontSize: 15, color: "#4A3F63", marginTop: 2 }}>{rangeLabel}</div>}
        <div style={divider} />
        <div className="font-mono flex flex-col gap-1.5" style={{ fontSize: 15 }}>
          <div className="flex justify-between gap-3" style={{ color: "#241337" }}>
            <span className="font-sans font-medium">Total income</span>
            <span>{currency(totalDeposited)}</span>
          </div>
          {cardCharges > 0 && (
            <div className="flex justify-between gap-3" style={minus}>
              <span className="font-sans font-medium">− Credit card payments</span>
              <span>{currency(cardCharges)}</span>
            </div>
          )}
          <div className="flex justify-between gap-3" style={minus}>
            <span className="font-sans font-medium">− Saved {periodWord}</span>
            <span>{currency(savedTotal)}</span>
          </div>
        </div>
        {cardChargesExcluded > 0 && (
          <div style={{ fontSize: 13, color: "#4A3F63", marginTop: 10, lineHeight: 1.4 }}>
            Excludes the {currency(cardChargesExcluded)} already covered by category withdrawals. E.g. a charge allocated to a category reduces that
            category, so it isn&apos;t included in &quot;Credit card payments&quot; here.
          </div>
        )}
      </div>
    </div>
  );
}
