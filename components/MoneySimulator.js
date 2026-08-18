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
  onStartSavingForGoal,
  onSetUpReal,
}) {
  const [income, setIncome] = useState(initialIncome);
  const [rows, setRows] = useState(initialRows);
  const [goals, setGoals] = useState(initialGoals);

  const totalPct = useMemo(() => rows.reduce((s, r) => s + (Number(r.pct) || 0), 0), [rows]);
  const fixedPct = useMemo(() => rows.filter((r) => r.fixed).reduce((s, r) => s + (Number(r.pct) || 0), 0), [rows]);
  const remainingPct = Math.round((100 - totalPct) * 10) / 10;

  const updateRow = (id, patch) => setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeRow = (id) => setRows((prev) => prev.filter((r) => r.id !== id));
  const addRow = () =>
    setRows((prev) => [
      ...prev,
      { id: `custom_${Date.now()}`, label: "New category", pct: 0, fixed: false, color: CATEGORY_COLORS[prev.length % CATEGORY_COLORS.length], custom: true },
    ]);

  const addGoal = () => setGoals((prev) => [...prev, { id: `goal_${Date.now()}`, name: "New goal", target: 5000, date: defaultGoalDate() }]);
  const updateGoal = (id, patch) => setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  const removeGoal = (id) => setGoals((prev) => prev.filter((g) => g.id !== id));

  const startSavingForGoal = (goal) => {
    const months = monthsUntil(goal.date);
    const monthlyNeeded = goal.target / months;
    const pct = income > 0 ? Math.round((monthlyNeeded / income) * 1000) / 10 : 0;
    const goalRow = { id: `custom_${Date.now()}`, label: goal.name, pct, fixed: false, color: "#b68235", custom: true };
    onStartSavingForGoal?.([...rows, goalRow]);
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
            min={0}
            step={100}
            value={income}
            onChange={(e) => setIncome(Math.max(0, Number(e.target.value) || 0))}
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

      <div className="grid gap-6" style={{ gridTemplateColumns: "minmax(0,1.5fr) minmax(0,1fr)" }}>
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
                  min={0}
                  max={100}
                  value={r.pct}
                  onChange={(e) => updateRow(r.id, { pct: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                  style={ledgerInputStyle({ width: 56, textAlign: "right", fontFamily: "var(--font-heading)", fontSize: 16 })}
                />
                <span className="text-sm" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>%</span>
                <span style={{ fontFamily: "var(--font-heading)", fontSize: 16, minWidth: 84, textAlign: "right" }}>
                  {currency((income * (r.pct || 0)) / 100)}
                </span>
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
              Add a goal -- a wedding, a down payment, anything with a target date -- and see what it takes each
              month to get there.
            </p>
          )}
          <div className="space-y-3">
            {goals.map((g) => {
              const months = monthsUntil(g.date);
              const monthlyNeeded = g.target / months;
              const pctOfIncome = income > 0 ? (monthlyNeeded / income) * 100 : 0;
              const discretionary = income * (1 - fixedPct / 100);
              const pctOfDiscretionary = discretionary > 0 ? (monthlyNeeded / discretionary) * 100 : 0;
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
                  <div className="flex gap-4 flex-wrap mb-2">
                    <label className="text-xs flex flex-col gap-1" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                      Target $
                      <input
                        type="number"
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
                  <p className="text-sm" style={{ lineHeight: 1.7, margin: 0 }}>
                    {months} months away &middot; <strong style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}>{currency(monthlyNeeded)}</strong>/mo needed
                    <br />
                    {Math.round(pctOfIncome * 10) / 10}% of total income &middot; {Math.round(pctOfDiscretionary * 10) / 10}% of income after fixed costs
                  </p>
                  <p className="text-xs mt-1.5" style={{ color: fits ? "color-mix(in srgb, var(--color-text) 55%, transparent)" : "#7a2f2a" }}>
                    {fits
                      ? `Fits within your ${remainingPct}% unallocated.`
                      : `Short by ${Math.round((pctOfIncome - remainingPct) * 10) / 10}% -- extend the date, raise income, or free up room.`}
                  </p>
                  {fits && (
                    <PrimaryButton onClick={() => startSavingForGoal(g)} className="mt-2.5">
                      Start saving for this <ArrowRight size={14} />
                    </PrimaryButton>
                  )}
                </Card>
              );
            })}
          </div>
          <GhostButton onClick={addGoal} className="mt-3">
            <Plus size={15} /> Add a goal
          </GhostButton>
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
