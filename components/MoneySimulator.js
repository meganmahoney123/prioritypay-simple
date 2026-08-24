"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, ArrowRight } from "lucide-react";
import { Card, PrimaryButton, GhostButton, currency } from "@/components/ui";
import { ledgerInputStyle } from "@/lib/ledgerTheme";
import { CATEGORY_COLORS } from "@/lib/allocations";

// Shared by both places the Money Simulator lives:
//   - app/(app)/simulator/page.js -- the dashboard tab, seeded from a
//     signed-in person's REAL split rules and last month's confirmed net
//     income (see that file for the fetch/mapping)
//   - app/calculators/moneysimulator/MoneySimulatorPublicClient.js -- the
//     public, logged-out-friendly version under Resources, seeded from
//     PriorityPay Simple's generic suggested categories
// This file only knows about the math and the UI -- it has no idea which
// context it's in. The two callbacks (onStartSavingForGoal/onSetUpReal)
// are how each caller decides what "make this real" actually does: the
// public version sends someone to /signup, the dashboard version sends
// them to their real /splits.

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
  const [income, setIncome] = useState(initialIncome);
  const [rows, setRows] = useState(initialRows);
  const [goals, setGoals] = useState(initialGoals);

  const totalPct = useMemo(() => rows.reduce((s, r) => s + (Number(r.pct) || 0), 0), [rows]);
  const remainingPct = Math.round((100 - totalPct) * 10) / 10;

  const updateRow = (id, patch) => setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  // Neither field is allowed to push the total past 100% -- a row's max
  // is whatever's left once every OTHER row's percentage is accounted
  // for, so raising one number never silently overdraws the rest of the
  // split.
  const maxPctForRow = (id) => {
    const otherTotal = rows.filter((r) => r.id !== id).reduce((s, r) => s + (Number(r.pct) || 0), 0);
    return Math.max(0, Math.round((100 - otherTotal) * 100) / 100);
  };
  const updatePct = (id, rawValue) => {
    const requested = Math.max(0, Number(rawValue) || 0);
    updateRow(id, { pct: Math.min(requested, maxPctForRow(id)) });
  };
  // Dollar amount is always derived from income * pct -- pct stays the
  // single source of truth in state (that's what actually gets saved to
  // real split rules). Editing the dollar field just back-solves for the
  // pct that produces it, so typing a target amount and typing a
  // percentage land on the same number either way, and both respect the
  // same 100%-total ceiling.
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
  // Switching a goal's type also renames it IF it's still sitting on a
  // generic/example name nobody typed themselves -- otherwise the "Wedding"
  // demo goal could get flipped to a recurring cost and stay labeled
  // "Wedding," which reads as a mismatch. A name someone actually typed in
  // is always left alone.
  const GENERIC_GOAL_NAMES = new Set(["New goal", "Wedding", "Mortgage"]);
  const switchGoalType = (goal, type) => {
    const patch = { type };
    if (GENERIC_GOAL_NAMES.has(goal.name)) patch.name = type === "recurring" ? "Mortgage" : "New goal";
    updateGoal(goal.id, patch);
  };

  const monthlyNeededFor = (goal) =>
    goal.type === "recurring" ? Number(goal.monthlyAmount || 0) : goal.target / monthsUntil(goal.date);

  // "Add This Category to My Split" is purely local -- it folds the goal
  // into "Your split" below so someone can see how it fits alongside
  // everything else. Nothing becomes real (no write to actual split
  // rules, no navigation) until the separate bottom CTA is used.
  const addGoalToSplit = (goal) => {
    const monthlyNeeded = monthlyNeededFor(goal);
    const pct = income > 0 ? Math.round((monthlyNeeded / income) * 1000) / 10 : 0;
    const goalRow = { id: `custom_${Date.now()}`, label: goal.name, pct, fixed: false, color: "#b68235", custom: true };
    setRows((prev) => [...prev, goalRow]);
  };

  const setUpReal = () => onSetUpReal?.(rows);

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
            style={ledgerInputStyle({ width: 130, fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 600 })}
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
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 18 }}>Your split</span>
            <span className="text-sm" style={{ color: remainingPct < 0 ? "#7a2f2a" : "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
              {totalPct}% allocated &middot; {remainingPct}% unallocated
            </span>
          </div>
          <div className="space-y-2.5">
            {rows.map((r) => (
              <Card key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: r.color, flex: "none" }} />
                {r.custom ? (
                  <input
                    value={r.label}
                    onChange={(e) => updateRow(r.id, { label: e.target.value })}
                    style={ledgerInputStyle({ flex: 1, minWidth: 0, fontSize: 15 })}
                  />
                ) : (
                  <span style={{ flex: 1, minWidth: 0, fontSize: 15 }}>
                    {r.label}
                    {r.fixed && (
                      <span style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-accent-700)", marginLeft: 8 }}>
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
                  style={ledgerInputStyle({ width: 56, textAlign: "right", fontFamily: "var(--font-heading)", fontSize: 16 })}
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
                  style={ledgerInputStyle({ width: 84, textAlign: "right", fontFamily: "var(--font-heading)", fontSize: 16 })}
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
                      style={ledgerInputStyle({ fontFamily: "var(--font-heading)", fontSize: 16, fontWeight: 600, maxWidth: 140 })}
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
                          style={ledgerInputStyle({ width: 110, fontFamily: "var(--font-heading)", fontSize: 15 })}
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
                          style={ledgerInputStyle({ width: 100, fontFamily: "var(--font-heading)", fontSize: 15 })}
                        />
                      </label>
                      <label className="text-xs flex flex-col gap-1" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                        By
                        <input
                          type="month"
                          value={g.date}
                          onChange={(e) => updateGoal(g.id, { date: e.target.value })}
                          style={ledgerInputStyle({ fontSize: 13 })}
                        />
                      </label>
                    </div>
                  )}

                  <ul style={{ fontSize: 13.5, lineHeight: 1.8, margin: "0 0 2px", paddingLeft: 18 }}>
                    {isRecurring ? (
                      <li>Recurring monthly cost</li>
                    ) : (
                      <li>{months} months away</li>
                    )}
                    <li>
                      <strong style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}>{currency(monthlyNeeded)}</strong>/mo{!isRecurring && " needed"}
                    </li>
                    <li>{Math.round(pctOfIncome * 10) / 10}% of total income</li>
                  </ul>
                  <p className="text-xs mt-1.5" style={{ color: fits ? "color-mix(in srgb, var(--color-text) 55%, transparent)" : "#7a2f2a" }}>
                    {fits
                      ? `Fits within your ${remainingPct}% unallocated.`
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

      <Card style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", padding: "18px 22px" }}>
        <p className="text-sm m-0" style={{ color: "color-mix(in srgb, var(--color-text) 76%, transparent)" }}>
          {secondaryCtaHelp}
        </p>
        <GhostButton onClick={setUpReal}>
          {secondaryCtaLabel} <ArrowRight size={14} />
        </GhostButton>
      </Card>
    </div>
  );
}
