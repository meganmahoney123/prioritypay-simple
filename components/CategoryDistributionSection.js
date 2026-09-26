"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ChevronRight, Info } from "lucide-react";
import { Card, currency } from "@/components/ui";
import { colorForIndex } from "@/lib/allocations";

// Replaces the old MoneyDistributionChart -- same pie-plus-legend idea
// ("how did this month's deposits split by category"), but now:
//   1. adds a "Guilt-Free Spending" slice for whatever a deposit's own %
//      splits didn't claim (source_amount minus the sum of that month's
//      category allocations, minus net credit card charges), so the pie
//      always accounts for 100% of what actually landed, not just the
//      portion that got a home.
//   2. replaces the flat legend list with one detail card per category,
//      each showing that category's own running BALANCE (starting_balance
//      the person declared before joining, plus every dollar ever split
//      into it, minus every dollar ever withdrawn from it via Close Out --
//      NOT any connected account's balance, since one account can hold
//      several categories) alongside this month's contribution, the most
//      recent withdrawal if any, and a progress meter toward the
//      category's goal cap if one is set.
//   3. surfaces "Saved via PriorityPay" and "Guilt-Free Spending
//      Available" as their own hero boxes above the pie, each showing the
//      real math behind the number, with a This Month/This Year toggle
//      (year mode sums every month of the selected year via the same
//      category-summary endpoint -- see app/api/allocations/category-
//      summary/route.js).
// Sourced from GET /api/allocations/category-summary?period=YYYY-MM (or
// ?period=YYYY for This Year -- see that route for the full balance/
// withdrawal/cap math). Rendered in place of the old chart, directly
// under the "Total saved" hero card and ahead of everything else on the
// Dashboard -- see app/(app)/dashboard/page.js.
const GUILT_FREE_COLOR = "#D9C9FF";
const CARD_CHARGES_COLOR = "#9C3B22";

function periodLabel(period) {
  const [y, m] = period.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}
function formatShortDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function CategoryCard({ category, color, onSavePct, savingPct }) {
  const { label, monthlyContribution, balance, cap, lastWithdrawal } = category;
  const capPct = cap && cap > 0 ? Math.min(100, Math.round((balance / cap) * 100)) : null;
  const [draftPct, setDraftPct] = useState(category.pct);
  const [editingPct, setEditingPct] = useState(false);

  // Keep the draft in sync if the underlying data refreshes (e.g. after
  // saving, or after a different card's edit shifted the "remaining"
  // room) while this one isn't actively being edited.
  useEffect(() => {
    if (!editingPct) setDraftPct(category.pct);
  }, [category.pct, editingPct]);

  const commitPct = async () => {
    setEditingPct(false);
    const next = Math.max(0, Number(draftPct) || 0);
    if (next === category.pct) return;
    await onSavePct(label, next);
  };

  return (
    <div
      style={{
        border: "1px solid var(--color-divider)",
        borderRadius: "var(--radius-md)",
        background: "var(--color-neutral-100)",
        padding: "16px 18px",
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <span className="truncate" style={{ fontFamily: "var(--font-heading)", fontSize: 15, fontWeight: 700, color: "var(--color-text)" }}>{label}</span>
        </div>
        {/* Current split percentage, editable right here -- saves via
            PUT /api/split-rules the moment the field loses focus or Enter
            is pressed, same "clamp to whatever's left" rule the Splits
            page itself uses, so two categories can never add up past
            100% no matter which page someone edits from. */}
        <span className="flex items-center gap-0.5 shrink-0 text-xs font-mono" style={{ color: "var(--color-neutral-700)" }}>
          <input
            type="number"
            min={0}
            step={0.1}
            value={draftPct}
            disabled={savingPct === label}
            onFocus={(e) => {
              setEditingPct(true);
              e.target.select();
            }}
            onChange={(e) => setDraftPct(e.target.value)}
            onBlur={commitPct}
            onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
            className="text-right disabled:opacity-60"
            style={{ width: 40, background: "transparent", border: "none", outline: "none", color: "var(--color-text)", fontWeight: 700 }}
          />
          %
        </span>
      </div>

      <div className="flex items-end justify-between gap-3 mb-1">
        <span className="text-xs" style={{ color: "var(--color-neutral-700)" }}>Balance</span>
        <span className="font-mono" style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text)" }}>{currency(balance)}</span>
      </div>

      <div className="flex items-center justify-between text-xs mb-2" style={{ color: "var(--color-neutral-700)" }}>
        <span>Contributed this month</span>
        <span className="font-mono font-semibold">{currency(monthlyContribution)}</span>
      </div>

      {capPct !== null && (
        <div className="mb-2">
          <div style={{ height: 6, borderRadius: 999, background: "var(--color-neutral-300)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${capPct}%`, borderRadius: 999, background: color }} />
          </div>
          <div className="flex items-center justify-between text-[11px] mt-1" style={{ color: "var(--color-neutral-700)" }}>
            <span>{capPct}% of {currency(cap)} goal</span>
          </div>
        </div>
      )}

      {/* "Withdrawals" links to the withdrawal-entry form pre-filtered to
          this category (see app/(app)/withdrawals/page.js's ?category=
          support) so matching a credit card charge to this category is
          one click away from wherever the category lives on the
          Dashboard. The info icon explains, on hover, why that matters:
          it's what keeps a category's balance -- and the credit-card
          exclusion math above the pie -- accurate. */}
      <Link
        href={`/withdrawals?category=${encodeURIComponent(label)}`}
        className="flex items-center justify-between text-[11px] pt-2 group"
        style={{ borderTop: "1px solid var(--color-divider)", textDecoration: "none" }}
      >
        <span className="flex items-center gap-1 relative font-semibold" style={{ color: "var(--color-accent-700)" }}>
          Withdrawals
          <Info size={12} style={{ color: "var(--color-accent-300)" }} />
          <span
            className="opacity-0 invisible group-hover:opacity-100 group-hover:visible pointer-events-none"
            style={{
              position: "absolute", bottom: "135%", left: 0, width: 220,
              background: "#241634", color: "#FFFFFF", fontSize: 11, fontWeight: 500,
              lineHeight: 1.45, padding: "10px 12px", borderRadius: 12, zIndex: 20,
              transition: "opacity 0.15s ease",
            }}
          >
            Match a credit card charge to this category to reduce its balance by that amount, so it stays up to date.
          </span>
        </span>
        <span className="flex items-center gap-1" style={{ color: "var(--color-neutral-700)" }}>
          {lastWithdrawal ? (
            <>Last {currency(lastWithdrawal.amount)} on {formatShortDate(lastWithdrawal.occurredAt)}</>
          ) : (
            "No withdrawals yet"
          )}
          <ChevronRight size={11} />
        </span>
      </Link>
    </div>
  );
}

export default function CategoryDistributionSection({ mode = "month", period, onEarliestPeriod }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingPct, setSavingPct] = useState(null);
  const [pctError, setPctError] = useState(null);

  const loadSummary = useCallback(() => {
    setLoading(true);
    return fetch(`/api/allocations/category-summary?period=${period}`)
      .then((r) => r.json())
      .then((res) => {
        setData(res);
        if (res.earliestPeriod && onEarliestPeriod) onEarliestPeriod(res.earliestPeriod);
      })
      .finally(() => setLoading(false));
  }, [period, onEarliestPeriod]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // Lets a category's % be edited right from its card here on the
  // Dashboard instead of requiring a trip to the Splits page -- reads the
  // FULL split-rules payload (needed since PUT /api/split-rules replaces
  // the whole percent array at once), patches just this label's pct
  // clamped to whatever room is left across every other category (same
  // rule Splits' own editor enforces), and reloads the summary so the pie
  // and every other card reflect it immediately.
  const savePct = async (label, requestedPct) => {
    setSavingPct(label);
    setPctError(null);
    try {
      const rulesRes = await fetch("/api/split-rules").then((r) => r.json());
      const percent = rulesRes.splitRules?.percent || [];
      const otherTotal = percent.filter((r) => r.label !== label).reduce((s, r) => s + (Number(r.pct) || 0), 0);
      const maxForThis = Math.max(0, Math.round((100 - otherTotal) * 100) / 100);
      const clamped = Math.min(requestedPct, maxForThis);
      const nextPercent = percent.map((r) => (r.label === label ? { ...r, pct: clamped } : r));
      const res = await fetch("/api/split-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ percent: nextPercent }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setPctError(body.error || "Couldn't save that percentage.");
        return;
      }
      await loadSummary();
    } finally {
      setSavingPct(null);
    }
  };

  const categories = data?.categories || [];
  const guiltFree = data?.unallocated || 0;
  const totalDeposited = data?.totalDeposited || 0;
  const totalAllocated = data?.totalAllocated || 0;
  // Net credit card charges this period (see lib/cardCharges.js) --
  // already excluded from `guiltFree` above, so without a slice of its
  // own that money would just silently vanish from the pie instead of
  // reading as "spoken for." excludedByWithdrawal is shown separately so
  // it's clear this is the NET figure, not the card's full balance.
  const cardCharges = data?.netCardCharges || 0;
  const cardChargesExcluded = data?.excludedByWithdrawal || 0;

  const pieData = useMemo(() => {
    const slices = categories
      .filter((c) => c.monthlyContribution > 0)
      .map((c, i) => ({
        name: c.label,
        value: c.monthlyContribution,
        color: c.color || colorForIndex(i),
      }));
    if (cardCharges > 0) {
      slices.push({ name: "Credit card charges", value: cardCharges, color: CARD_CHARGES_COLOR });
    }
    if (guiltFree > 0) {
      slices.push({ name: "Guilt-Free Spending", value: guiltFree, color: GUILT_FREE_COLOR });
    }
    const total = slices.reduce((s, c) => s + c.value, 0);
    return slices.map((c) => ({ ...c, pct: total > 0 ? Math.round((c.value / total) * 100) : 0 }));
  }, [categories, guiltFree, cardCharges]);

  const colorByLabel = useMemo(() => {
    const map = {};
    categories.forEach((c, i) => {
      map[c.label] = c.color || colorForIndex(i);
    });
    return map;
  }, [categories]);

  const savedBreakdown = useMemo(
    () => categories.filter((c) => c.monthlyContribution > 0).map((c, i) => ({
      label: c.label,
      color: c.color || colorForIndex(i),
      amount: c.monthlyContribution,
    })),
    [categories]
  );

  const periodModeLabel = mode === "year" ? "This Year" : "This Month";
  // What shows under each "How your income was distributed" heading -- a
  // real date range for month mode, the plain year (or "so far" when it's
  // the current, still-in-progress year) for year mode. `period` is
  // "YYYY-MM" in month mode and a bare "YYYY" in year mode (see
  // app/(app)/dashboard/page.js, which owns the toggle and passes it
  // down) -- periodLabel only understands the month format, so year mode
  // never passes `period` through it.
  const now = new Date();
  const rangeLabel = mode === "year"
    ? (Number(period) === now.getFullYear()
        ? `Jan–${now.toLocaleDateString("en-US", { month: "long" })} ${period} so far`
        : String(period))
    : periodLabel(period);

  // Cards render for every category that has ANY activity to show --
  // a nonzero balance (so a fully-funded goal still shows even in a month
  // with $0 contributed), a contribution this month, or a withdrawal ever
  // -- rather than only categories touched this specific month, so a
  // category doesn't flicker in and out of view month to month.
  const cardCategories = categories.filter((c) => c.balance !== 0 || c.monthlyContribution > 0 || c.lastWithdrawal);

  return (
    <Card className="p-5" style={{ borderRadius: 26, background: "var(--color-surface)" }}>
      {loading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : totalDeposited === 0 ? (
        <p className="text-sm text-neutral-400">No deposits found for {rangeLabel}.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div style={{ border: "1px solid var(--color-accent-300)", borderRadius: "var(--radius-lg)", background: "var(--color-accent-200)", color: "var(--color-accent-800)", padding: "22px 24px" }}>
            <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>
              Saved {periodModeLabel} via PriorityPay
            </div>
            <div className="font-mono" style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.15, marginTop: 6, color: "var(--color-accent-900)" }}>
              {currency(totalAllocated)}
            </div>
            {savedBreakdown.length > 0 && (
              <>
                <div style={{ height: 1, background: "var(--color-accent-300)", margin: "14px 0 10px" }} />
                <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto pr-1">
                  {savedBreakdown.map((c) => (
                    <div key={c.label} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: c.color }} />
                        <span className="truncate">{c.label}</span>
                      </span>
                      <span className="font-mono shrink-0" style={{ color: "var(--color-accent-700)" }}>{currency(c.amount)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div style={{ border: "1px solid var(--color-accent-300)", borderRadius: "var(--radius-lg)", background: "var(--color-accent-200)", color: "var(--color-accent-800)", padding: "22px 24px" }}>
            <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>
              Guilt-Free Spending Available
            </div>
            <div className="font-mono" style={{ fontSize: 34, fontWeight: 700, lineHeight: 1.15, marginTop: 6, color: "var(--color-accent-900)" }}>
              {currency(guiltFree)}
            </div>
            <div style={{ height: 1, background: "var(--color-accent-300)", margin: "14px 0 10px" }} />
            <div className="font-mono flex flex-col gap-1.5" style={{ fontSize: 12.5 }}>
              <div className="flex justify-between" style={{ color: "var(--color-accent-800)" }}>
                <span className="font-sans font-semibold">Total deposited</span>
                <span>{currency(totalDeposited)}</span>
              </div>
              {cardCharges > 0 && (
                <div className="flex justify-between" style={{ color: "#9C3B22" }}>
                  <span className="font-sans font-semibold">− Credit card charges</span>
                  <span>{currency(cardCharges)}</span>
                </div>
              )}
              <div className="flex justify-between" style={{ color: "#9C3B22" }}>
                <span className="font-sans font-semibold">− Saved via PriorityPay</span>
                <span>{currency(totalAllocated)}</span>
              </div>
            </div>
            {cardChargesExcluded > 0 && (
              <div style={{ fontSize: 11, color: "var(--color-accent-700)", marginTop: 10, lineHeight: 1.4 }}>
                Excludes {currency(cardChargesExcluded)} already covered by category withdrawals.
              </div>
            )}
          </div>
        </div>
      )}

      {pctError && (
        <p className="text-xs mt-3" style={{ color: "#9C3B22" }}>{pctError}</p>
      )}

      {!loading && cardCategories.length > 0 && (
        <div className="mt-5">
          <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 15, fontWeight: 700, color: "var(--color-text)", marginBottom: 12 }}>
            Your Categories
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cardCategories.map((c) => (
              <CategoryCard
                key={c.label}
                category={c}
                color={colorByLabel[c.label] || colorForIndex(0)}
                onSavePct={savePct}
                savingPct={savingPct}
              />
            ))}
          </div>
        </div>
      )}

      {/* "How your income was distributed" -- moved below Your Categories
          per Megan's request, with a heading that names which toggle
          state it's showing since it now sits further from the toggle
          itself (up in the sticky bar, see app/(app)/dashboard/page.js). */}
      {!loading && totalDeposited > 0 && (
        <div className="mt-6">
          <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 15, fontWeight: 700, color: "var(--color-text)" }}>
            How your income was distributed ({mode === "year" ? "this year" : "this month"})
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-neutral-700)" }}>{rangeLabel}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center mt-3">
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
        </div>
      )}
    </Card>
  );
}
