"use client";

import { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, currency } from "@/components/ui";

// Replaces the old MoneyDistributionChart -- same pie-plus-legend idea
// ("how did this month's deposits split by category"), but now:
//   1. adds an "Unallocated" slice for whatever a deposit's own % splits
//      didn't claim (source_amount minus the sum of that month's category
//      allocations), so the pie always accounts for 100% of what actually
//      landed, not just the portion that got a home.
//   2. replaces the flat legend list with one detail card per category,
//      each showing that category's own running BALANCE (starting_balance
//      the person declared before joining, plus every dollar ever split
//      into it, minus every dollar ever withdrawn from it via Close Out --
//      NOT any connected account's balance, since one account can hold
//      several categories) alongside this month's contribution, the most
//      recent withdrawal if any, and a progress meter toward the
//      category's goal cap if one is set.
// Sourced from GET /api/allocations/category-summary?period=YYYY-MM (see
// that route for the full balance/withdrawal/cap math). Rendered in place
// of the old chart, directly under the "Total saved" hero card and ahead
// of everything else on the Dashboard -- see app/(app)/dashboard/page.js.
const FALLBACK_PALETTE = ["#6D3BE0", "#4E22B8", "#3B1C7A", "#9A72F0", "#C4A9FA"];
const UNALLOCATED_COLOR = "#D9C9FF";

function currentPeriod() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}
function shiftPeriod(period, delta) {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
function periodLabel(period) {
  const [y, m] = period.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}
function formatShortDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function CategoryCard({ category, color }) {
  const { label, monthlyContribution, balance, cap, lastWithdrawal } = category;
  const pct = cap && cap > 0 ? Math.min(100, Math.round((balance / cap) * 100)) : null;

  return (
    <div
      style={{
        border: "1px solid var(--color-divider)",
        borderRadius: "var(--radius-md)",
        background: "var(--color-neutral-100)",
        padding: "16px 18px",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span style={{ fontFamily: "var(--font-heading)", fontSize: 15, fontWeight: 700, color: "var(--color-text)" }}>{label}</span>
      </div>

      <div className="flex items-end justify-between gap-3 mb-1">
        <span className="text-xs" style={{ color: "var(--color-neutral-700)" }}>Balance</span>
        <span className="font-mono" style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text)" }}>{currency(balance)}</span>
      </div>

      <div className="flex items-center justify-between text-xs mb-2" style={{ color: "var(--color-neutral-700)" }}>
        <span>Contributed this month</span>
        <span className="font-mono font-semibold">{currency(monthlyContribution)}</span>
      </div>

      {pct !== null && (
        <div className="mb-2">
          <div style={{ height: 6, borderRadius: 999, background: "var(--color-neutral-300)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, borderRadius: 999, background: color }} />
          </div>
          <div className="flex items-center justify-between text-[11px] mt-1" style={{ color: "var(--color-neutral-700)" }}>
            <span>{pct}% of {currency(cap)} goal</span>
          </div>
        </div>
      )}

      {lastWithdrawal ? (
        <div className="text-[11px] pt-2" style={{ borderTop: "1px solid var(--color-divider)", color: "var(--color-neutral-700)" }}>
          Last withdrawal: <span className="font-semibold">{currency(lastWithdrawal.amount)}</span> on {formatShortDate(lastWithdrawal.occurredAt)}
        </div>
      ) : (
        <div className="text-[11px] pt-2" style={{ borderTop: "1px solid var(--color-divider)", color: "var(--color-neutral-500, var(--color-neutral-700))" }}>
          No withdrawals yet
        </div>
      )}
    </div>
  );
}

export default function CategoryDistributionSection() {
  const maxPeriod = useMemo(() => currentPeriod(), []);
  const [period, setPeriod] = useState(maxPeriod);
  const [earliestPeriod, setEarliestPeriod] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/allocations/category-summary?period=${period}`)
      .then((r) => r.json())
      .then((res) => {
        setData(res);
        if (res.earliestPeriod) setEarliestPeriod(res.earliestPeriod);
      })
      .finally(() => setLoading(false));
  }, [period]);

  const categories = data?.categories || [];
  const unallocated = data?.unallocated || 0;
  const totalDeposited = data?.totalDeposited || 0;

  const pieData = useMemo(() => {
    const slices = categories
      .filter((c) => c.monthlyContribution > 0)
      .map((c, i) => ({
        name: c.label,
        value: c.monthlyContribution,
        color: c.color || FALLBACK_PALETTE[i % FALLBACK_PALETTE.length],
      }));
    if (unallocated > 0) {
      slices.push({ name: "Unallocated", value: unallocated, color: UNALLOCATED_COLOR });
    }
    const total = slices.reduce((s, c) => s + c.value, 0);
    return slices.map((c) => ({ ...c, pct: total > 0 ? Math.round((c.value / total) * 100) : 0 }));
  }, [categories, unallocated]);

  const colorByLabel = useMemo(() => {
    const map = {};
    categories.forEach((c, i) => {
      map[c.label] = c.color || FALLBACK_PALETTE[i % FALLBACK_PALETTE.length];
    });
    return map;
  }, [categories]);

  const atEarliest = earliestPeriod ? period <= earliestPeriod : false;
  const atLatest = period >= maxPeriod;

  // Cards render for every category that has ANY activity to show --
  // a nonzero balance (so a fully-funded goal still shows even in a month
  // with $0 contributed), a contribution this month, or a withdrawal ever
  // -- rather than only categories touched this specific month, so a
  // category doesn't flicker in and out of view month to month.
  const cardCategories = categories.filter((c) => c.balance !== 0 || c.monthlyContribution > 0 || c.lastWithdrawal);

  return (
    <Card className="p-5" style={{ borderRadius: 26, background: "var(--color-surface)" }}>
      <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 700, color: "var(--color-text)" }}>
          How your money has been distributed
        </h2>
        <div className="flex items-center gap-1.5 ml-1">
          <button
            onClick={() => !atEarliest && setPeriod((p) => shiftPeriod(p, -1))}
            disabled={atEarliest}
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 30, height: 30, borderRadius: "50%", background: "transparent",
              border: "1px solid var(--color-divider)", color: "var(--color-text)",
              cursor: atEarliest ? "not-allowed" : "pointer", opacity: atEarliest ? 0.3 : 1,
            }}
          >
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontFamily: "var(--font-heading)", fontSize: 15, width: 130, textAlign: "center" }}>{periodLabel(period)}</span>
          <button
            onClick={() => !atLatest && setPeriod((p) => shiftPeriod(p, 1))}
            disabled={atLatest}
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 30, height: 30, borderRadius: "50%", background: "transparent",
              border: "1px solid var(--color-divider)", color: "var(--color-text)",
              cursor: atLatest ? "not-allowed" : "pointer", opacity: atLatest ? 0.3 : 1,
            }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      <p className="text-xs text-neutral-500 mb-4">
        Where this month&apos;s deposits split, by category, including anything still unclaimed.
      </p>

      {loading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : totalDeposited === 0 ? (
        <p className="text-sm text-neutral-400">No deposits found for {periodLabel(period)}.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={2}
                  isAnimationActive={false}
                  label={({ pct }) => (pct >= 6 ? `${pct}%` : "")}
                  labelLine={false}
                  fontSize={10}
                  fontWeight={700}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => currency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm mb-2 pb-2 border-b border-neutral-100">
              <span className="font-semibold text-neutral-700">Total deposited</span>
              <span className="font-bold font-mono">{currency(totalDeposited)}</span>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {pieData.map((c) => (
                <div key={c.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                    <span className="text-neutral-700 truncate">{c.name}</span>
                  </div>
                  <span className="font-semibold shrink-0 font-mono">
                    {currency(c.value)}
                    <span className="text-neutral-400 font-normal ml-1">
                      ({totalDeposited > 0 ? Math.round((c.value / totalDeposited) * 100) : 0}%)
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!loading && cardCategories.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
          {cardCategories.map((c) => (
            <CategoryCard key={c.label} category={c} color={colorByLabel[c.label] || FALLBACK_PALETTE[0]} />
          ))}
        </div>
      )}
    </Card>
  );
}
