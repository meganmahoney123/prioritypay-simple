"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, ArrowRight } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, PrimaryButton, GhostButton, currency } from "@/components/ui";
import { bloomInputStyle, bloomAccentCardStyle } from "@/lib/bloomTheme";
import { CATEGORY_COLORS } from "@/lib/allocations";

const BLOOM_DOT_COLORS = ["#D9C9FF", "#C4A9FA", "#9A72F0", "#6D3BE0", "#4E22B8", "#3B1C7A", "#2A1550"];

export function monthsUntil(dateStr) {
  if (!dateStr) return 1;
  const now = new Date();
  const [y, m] = dateStr.split("-").map(Number);
  const target = new Date(y, (m || 1) - 1, 1);
  const months = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
  return Math.max(1, months);
}

export function defaultGoalDate() {
  const d = new Date();
  d.setMonth(d.getMonth() + 12);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function MoneySimulator({
  initialIncome = 10000,
  initialRows,
  initialGoals = [],
  secondaryCtaLabel = "Set up my real accounts",
  secondaryCtaHelp = "Like this split even without a specific goal? Carry it into your real account setup.",
  incomeNote,
  onSetUpReal,
}) {
  // Defensive floor at $0 even if a caller passes a negative initialIncome
  // (e.g. a confirmed month that went net-negative) -- every %/$ split
  // calculation below assumes income can't be negative.
  const [income, setIncome] = useState(Math.max(0, Number(initialIncome) || 0));
  const [rows, setRows] = useState(initialRows);
  const [goals, setGoals] = useState(initialGoals);

  const totalPct = useMemo(() => rows.reduce((s, r) => s + (Number(r.pct) || 0), 0), [rows]);
  const remainingPct = Math.round((100 - totalPct) * 10) / 10;

  const updateRow = (id, patch) => setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const maxPctForRow = (id) => {
    const otherTotal = rows.filter((r) => r.id !== id).reduce((s, r) => s + (Number(r.pct) || 0), 0);
    return Math.max(0, Math.round((100 - otherTotal) * 100) / 100);
  };
  const updatePct = (id, rawValue) => {
    const requested = Math.max(0, Number(rawValue) || 0);
    updateRow(id, { pct: Math.min(requested, maxPctForRow(id)) });
  };
  const updateRowDollar = (id, dollarValue) => {
    const dollar = Math.max(0, Number(dollarValue) || 0);
    const requestedPct = income > 0 ? Math.round((dollar / income) * 10000) / 100 : 0;
    updateRow(id, { pct: Math.min(requestedPct, maxPctForRow(id)) });
  };
  const removeRow = (id) => setRows((prev) => prev.filter((r) => r.id !== id));
  const addRow = () =>
    setRows((prev) => [
      ...prev,
      { id: `custom_${Date.now()}`, label: "New category", pct: 0, fixed: false, color: CATEGORY_COLORS[prev.length % CATEGORY_COLORS.length], custom: true },
    ]);

  const addGoal = () =>
    setGoals((prev) => [...prev, { id: `goal_${Date.now()}`, name: "New goal", type: "goal", target: 5000, date: defaultGoalDate(), monthlyAmount: 500 }]);
  const updateGoal = (id, patch) => setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  const removeGoal = (id) => setGoals((prev) => prev.filter((g) => g.id !== id));
  const GENERIC_GOAL_NAMES = new Set(["New goal", "Wedding", "Mortgage"]);
  const switchGoalType = (goal, type) => {
    const patch = { type };
    if (GENERIC_GOAL_NAMES.has(goal.name)) patch.name = type === "recurring" ? "Mortgage" : "New goal";
    updateGoal(goal.id, patch);
  };

  const monthlyNeededFor = (goal) =>
    goal.type === "recurring" ? Number(goal.monthlyAmount || 0) : goal.target / monthsUntil(goal.date);

  const addGoalToSplit = (goal) => {
    const monthlyNeeded = monthlyNeededFor(goal);
    const pct = income > 0 ? Math.round((monthlyNeeded / income) * 1000) / 10 : 0;
    const goalRow = { id: `custom_${Date.now()}`, label: goal.name, pct, fixed: false, color: "#6D3BE0", custom: true };
    setRows((prev) => [...prev, goalRow]);
  };

  const setUpReal = () => onSetUpReal?.(rows);

  const dotColorFor = (id) => BLOOM_DOT_COLORS[Math.max(0, rows.findIndex((r) => r.id === id)) % BLOOM_DOT_COLORS.length];

  // Same slices the old flat bar showed (each row with pct > 0, plus
  // whatever's left unallocated), just as a pie instead -- easier to read
  // proportions at a glance than a thin single-row bar, and matches the
  // pie-chart language used everywhere else in the app (Dashboard,
  // Accounts) for "how is this money split up."
  const pieData = useMemo(() => {
    const slices = rows
      .filter((r) => r.pct > 0)
      .map((r) => ({ name: r.label, value: r.pct, color: dotColorFor(r.id) }));
    if (remainingPct > 0) {
      slices.push({ name: "Unallocated", value: remainingPct, color: "#E4DCF9" });
    }
    return slices;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, remainingPct]);

  return (
    <div className="space-y-6">
      <Card style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", padding: "18px 22px" }}>
        <span style={{ fontFamily: "var(--font-heading)", fontSize: 17 }}>Monthly income</span>
        <span style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ fontFamily: "var(--font-heading)", fontSize: 22, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>$</span>
          <input
            type="number"
            onFocus={(e) => e.target.select()}
            min={0}
            step={0.01}
            value={income}
            onChange={(e) => setIncome(Math.max(0, Math.round((Number(e.target.value) || 0) * 100) / 100))}
            style={bloomInputStyle({ width: 130, fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 600 })}
          />
        </span>
        <span className="text-sm" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>/ month</span>
        {incomeNote && (
          <span className="text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 50%, transparent)", flexBasis: "100%" }}>
            {incomeNote}
          </span>
        )}
      </Card>

      <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <div>
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 18, fontWeight: 800 }}>Your split</span>
            <span
              className="text-sm"
              style={{
                fontWeight: 700,
                color: remainingPct < 0 ? "#7a2f2a" : "var(--color-accent-700)",
                background: remainingPct < 0 ? "color-mix(in srgb, #9b3b3b 10%, transparent)" : "var(--color-accent-100)",
                borderRadius: 999,
                padding: "4px 12px",
              }}
            >
              {totalPct}% allocated &middot; {remainingPct}% unallocated
            </span>
          </div>
          <div style={{ height: 180, marginBottom: 14 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={2}
                  isAnimationActive={false}
                  label={({ value }) => (value >= 6 ? `${value}%` : "")}
                  labelLine={false}
                  fontSize={10}
                  fontWeight={700}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [`${v}%`, n]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2.5">
            {rows.map((r) => (
              <Card key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", flexWrap: "wrap" }}>
                <span style={{ width: 12, height: 12, borderRadius: "50%", background: dotColorFor(r.id), flex: "none" }} />
                {r.custom ? (
                  <input
                    value={r.label}
                    onChange={(e) => updateRow(r.id, { label: e.target.value })}
                    style={bloomInputStyle({ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700 })}
                  />
                ) : (
                  <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                    {r.label}
                    {r.fixed && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "var(--color-accent-700)",
                          background: "var(--color-accent-200)",
                          borderRadius: 999,
                          padding: "2px 8px",
                        }}
                      >
                        fixed
                      </span>
                    )}
                  </span>
                )}
                <input
                  type="number"
                  onFocus={(e) => e.target.select()}
                  min={0}
                  max={Math.round((r.pct + maxPctForRow(r.id)) * 100) / 100}
                  step={0.1}
                  value={r.pct}
                  onChange={(e) => updatePct(r.id, e.target.value)}
                  style={bloomInputStyle({ width: 76, textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 18, background: "var(--color-neutral-100)", border: "1px solid var(--color-neutral-300)", borderRadius: "var(--radius-sm)", padding: "8px 10px" })}
                />
                <span className="text-sm" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>%</span>
                <span className="text-sm" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>$</span>
                <input
                  type="number"
                  onFocus={(e) => e.target.select()}
                  min={0}
                  max={income > 0 ? Math.round(((income * (r.pct + maxPctForRow(r.id))) / 100) * 100) / 100 : undefined}
                  step={0.01}
                  value={Math.round(((income * (r.pct || 0)) / 100) * 100) / 100}
                  onChange={(e) => updateRowDollar(r.id, e.target.value)}
                  style={bloomInputStyle({ width: 110, textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 18, background: "var(--color-neutral-100)", border: "1px solid var(--color-neutral-300)", borderRadius: "var(--radius-sm)", padding: "8px 10px" })}
                />
                {r.custom ? (
                  <button onClick={() => removeRow(r.id)} aria-label="Remove category" style={{ background: "transparent", border: 0, color: "var(--color-accent-700)", cursor: "pointer" }}>
                    <Trash2 size={15} />
                  </button>
                ) : (
                  <span style={{ width: 15 }} />
                )}
              </Card>
            ))}
          </div>
          <GhostButton onClick={addRow} className="mt-3">
            <Plus size={15} /> Add category
          </GhostButton>
        </div>

        <div>
          <span style={{ fontFamily: "var(--font-heading)", fontSize: 18, display: "block", marginBottom: 12 }}>Goals</span>
          {goals.length === 0 && (
            <p className="text-sm mb-3" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
              Add a goal — a wedding by a target date, or a recurring cost like a new mortgage payment — and see
              what it takes each month.
            </p>
          )}
          <div className="space-y-3">
            {goals.map((g) => {
              const isRecurring = g.type === "recurring";
              const months = monthsUntil(g.date);
              const monthlyNeeded = monthlyNeededFor(g);
              const pctOfIncome = income > 0 ? (monthlyNeeded / income) * 100 : 0;
              const fits = pctOfIncome <= remainingPct + 0.05;
              return (
                <Card key={g.id} style={{ padding: "16px 18px", ...(fits ? {} : { borderColor: "#b3695f", background: "color-mix(in srgb, #9b3b3b 7%, transparent)" }) }}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <input
                      value={g.name}
                      onChange={(e) => updateGoal(g.id, { name: e.target.value })}
                      style={bloomInputStyle({ fontFamily: "var(--font-heading)", fontSize: 16, fontWeight: 600, maxWidth: 140 })}
                    />
                    <button onClick={() => removeGoal(g.id)} aria-label="Remove goal" style={{ background: "transparent", border: 0, color: "var(--color-accent-700)", cursor: "pointer" }}>
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="flex gap-2 mb-3" role="group" aria-label="Goal type">
                    <button
                      type="button"
                      onClick={() => switchGoalType(g, "goal")}
                      style={{
                        fontSize: 12,
                        padding: "4px 10px",
                        borderRadius: 999,
                        cursor: "pointer",
                        border: `1px solid ${!isRecurring ? "var(--color-accent)" : "var(--color-divider)"}`,
                        background: !isRecurring ? "color-mix(in srgb, var(--color-accent) 10%, transparent)" : "transparent",
                        color: !isRecurring ? "var(--color-accent-700)" : "color-mix(in srgb, var(--color-text) 60%, transparent)",
                      }}
                    >
                      One-time goal
                    </button>
                    <button
                      type="button"
                      onClick={() => switchGoalType(g, "recurring")}
                      style={{
                        fontSize: 12,
                        padding: "4px 10px",
                        borderRadius: 999,
                        cursor: "pointer",
                        border: `1px solid ${isRecurring ? "var(--color-accent)" : "var(--color-divider)"}`,
                        background: isRecurring ? "color-mix(in srgb, var(--color-accent) 10%, transparent)" : "transparent",
                        color: isRecurring ? "var(--color-accent-700)" : "color-mix(in srgb, var(--color-text) 60%, transparent)",
                      }}
                    >
                      Recurring cost
                    </button>
                  </div>

                  {isRecurring ? (
                    <div className="flex gap-4 flex-wrap mb-2">
                      <label className="text-xs flex flex-col gap-1" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                        Monthly amount $
                        <input
                          type="number"
                          onFocus={(e) => e.target.select()}
                          min={0}
                          step={50}
                          value={g.monthlyAmount ?? 0}
                          onChange={(e) => updateGoal(g.id, { monthlyAmount: Math.max(0, Number(e.target.value) || 0) })}
                          style={bloomInputStyle({ width: 110, fontFamily: "var(--font-heading)", fontSize: 15 })}
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="flex gap-4 flex-wrap mb-2">
                      <label className="text-xs flex flex-col gap-1" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                        Target $
                        <input
                          type="number"
                          onFocus={(e) => e.target.select()}
                          min={0}
                          step={100}
                          value={g.target}
                          onChange={(e) => updateGoal(g.id, { target: Math.max(0, Number(e.target.value) || 0) })}
                          style={bloomInputStyle({ width: 100, fontFamily: "var(--font-heading)", fontSize: 15 })}
                        />
                      </label>
                      <label className="text-xs flex flex-col gap-1" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                        By
                        <input
                          type="month"
                          value={g.date}
                          onChange={(e) => updateGoal(g.id, { date: e.target.value })}
                          style={bloomInputStyle({ fontSize: 13 })}
                        />
                      </label>
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, margin: "0 0 10px" }}>
                    <div style={{ background: "var(--color-neutral-100)", borderRadius: "var(--radius-sm)", padding: "10px 8px", textAlign: "center" }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 800 }}>{isRecurring ? "—" : months}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "color-mix(in srgb, var(--color-text) 55%, transparent)", marginTop: 2 }}>
                        {isRecurring ? "recurring" : "months away"}
                      </div>
                    </div>
                    <div style={{ background: "var(--color-neutral-100)", borderRadius: "var(--radius-sm)", padding: "10px 8px", textAlign: "center" }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 800 }}>{currency(monthlyNeeded)}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "color-mix(in srgb, var(--color-text) 55%, transparent)", marginTop: 2 }}>
                        needed / mo
                      </div>
                    </div>
                    <div style={{ background: "var(--color-neutral-100)", borderRadius: "var(--radius-sm)", padding: "10px 8px", textAlign: "center" }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 800 }}>{Math.round(pctOfIncome * 10) / 10}%</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "color-mix(in srgb, var(--color-text) 55%, transparent)", marginTop: 2 }}>
                        of income
                      </div>
                    </div>
                  </div>
                  <p
                    className="text-xs mt-1.5"
                    style={{
                      fontWeight: 600,
                      borderRadius: "var(--radius-sm)",
                      padding: "10px 12px",
                      color: fits ? "#22684C" : "#9C3B22",
                      background: fits ? "color-mix(in srgb, #22684C 10%, transparent)" : "color-mix(in srgb, #9C3B22 8%, transparent)",
                    }}
                  >
                    {fits
                      ? `Fits with ${remainingPct}% of income to spare. Add it as a category to lock it in.`
                      : isRecurring
                      ? `Short by ${Math.round((pctOfIncome - remainingPct) * 10) / 10}%. Lower the monthly amount, raise income, or free up room.`
                      : `Short by ${Math.round((pctOfIncome - remainingPct) * 10) / 10}%. Extend the date, raise income, or free up room.`}
                  </p>
                  {fits && (
                    <PrimaryButton onClick={() => addGoalToSplit(g)} className="mt-2.5">
                      Add This Category to My Split <Plus size={14} />
                    </PrimaryButton>
                  )}
                </Card>
              );
            })}
          </div>
          <button
            onClick={addGoal}
            className="mt-3"
            style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: 0, padding: 0, color: "var(--color-accent-700)", fontSize: 13.5, cursor: "pointer" }}
          >
            <Plus size={14} /> Add another goal
          </button>
        </div>
      </div>

      <Card style={bloomAccentCardStyle({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", padding: "18px 22px" })}>
        <p className="text-sm m-0" style={{ color: "color-mix(in srgb, var(--color-accent-800) 76%, transparent)" }}>
          {secondaryCtaHelp}
        </p>
        <PrimaryButton onClick={setUpReal} style={{ borderRadius: "var(--radius-pill)" }}>
          {secondaryCtaLabel} <ArrowRight size={14} />
        </PrimaryButton>
      </Card>
    </div>
  );
}
