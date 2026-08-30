"use client";

import { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, currency } from "@/components/ui";

// Cycled for any category label that doesn't match a color already in the
// user's current split rules (e.g. a category they've since renamed or
// deleted) -- same look-and-feel palette as DEFAULT_SPLIT_RULES.
const FALLBACK_PALETTE = [
  "#6D3BE0", "#4E22B8", "#3B1C7A", "#9A72F0", "#C4A9FA",
];

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

const MODES = [
  { key: "month", label: "By month" },
  { key: "6mo", label: "Last 6 months" },
  { key: "12mo", label: "Last 12 months" },
];

// The Dashboard's single money-distribution chart -- replaced four
// separate blocks (stat cards, a "last completed month" chart, a
// simulated "Preview a split" pie, and a raw "Recent transfers" list)
// with one real, live view: how deposits have actually split, by
// category, either for a specific month (navigable back to signup) or
// rolled up over the trailing 6 or 12 months. Always real transfer_
// allocations data -- never a simulation.
export default function MoneyDistributionChart({ rules = [] }) {
  const maxPeriod = useMemo(() => currentPeriod(), []);
  const [mode, setMode] = useState("month");
  const [period, setPeriod] = useState(maxPeriod);
  const [earliestPeriod, setEarliestPeriod] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const url =
      mode === "month"
        ? `/api/allocations/history/${period}`
        : `/api/allocations/history/range?months=${mode === "6mo" ? 6 : 12}`;
    fetch(url)
      .then((r) => r.json())
      .then((res) => {
        setData(res);
        if (res.earliestPeriod) setEarliestPeriod(res.earliestPeriod);
      })
      .finally(() => setLoading(false));
  }, [mode, period]);

  const colorByLabel = useMemo(() => Object.fromEntries(rules.map((r) => [r.label, r.color])), [rules]);

  const categories = data?.categories || [];
  const total = data?.total || 0;
  const pieData = categories.map((c, i) => ({
    name: c.label,
    value: c.amount,
    color: colorByLabel[c.label] || FALLBACK_PALETTE[i % FALLBACK_PALETTE.length],
  }));

  const atEarliest = earliestPeriod ? period <= earliestPeriod : false;
  const atLatest = period >= maxPeriod;
  const rangeLabel = mode === "6mo" ? "last 6 months" : "last 12 months";
  const emptyLabel = mode === "month" ? periodLabel(period) : `the ${rangeLabel}`;

  return (
    <Card className="p-5" style={{ borderRadius: 26, background: "var(--color-surface)" }}>
      <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 700, color: "var(--color-text)" }}>How your income has been distributed</h2>
        <div className="flex items-center gap-1.5 flex-wrap">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: 13,
                letterSpacing: "0.06em",
                color: mode === m.key ? "var(--color-accent-700)" : "var(--color-neutral-700)",
                background: "transparent",
                border: `1px solid ${mode === m.key ? "var(--color-accent)" : "var(--color-divider)"}`,
                borderRadius: 999,
                padding: "8px 16px",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {m.label}
            </button>
          ))}
          {mode === "month" && (
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
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 15, width: 108, textAlign: "center" }}>{periodLabel(period)}</span>
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
          )}
        </div>
      </div>
      <p className="text-xs text-neutral-500 mb-4">
        {mode === "month"
          ? "Real deposits that have split this month, by category. Updates as more deposits land."
          : `Real deposits that split over the ${rangeLabel}, by category — not a projection.`}
      </p>

      {loading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : categories.length === 0 ? (
        <p className="text-sm text-neutral-400">No transfers found for {emptyLabel}.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                {/* Animation off on purpose -- with mode/period changing
                    right after mount (loading -> data fetched -> earliestPeriod
                    set), Recharts' pie-enter animation can get out of sync with
                    a fast sequence of re-renders and leave a sector or two
                    undrawn. Skipping the animation avoids that class of bug
                    entirely and the chart renders correctly on first paint. */}
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75} paddingAngle={2} isAnimationActive={false}>
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
              <span className="font-semibold text-neutral-700">Total split</span>
              <span className="font-bold font-mono">{currency(total)}</span>
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
                      ({total > 0 ? Math.round((c.value / total) * 100) : 0}%)
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
