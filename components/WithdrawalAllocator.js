"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { currency } from "@/components/ui";

// Shortfall cascade: when a Close-Out expense's chosen category doesn't
// have enough real balance (see app/api/allocations/balances/route.js) to
// cover the whole withdrawal amount, this caps that category's own
// contribution at whatever it can actually cover and asks where the rest
// came from -- another tracked category, or "From outside savings"
// (source_type='external', not tied to any category). Mirrors the layout
// spirit of components/SplitPercentPieChart.js / PercentSplitEditor's row
// list, just for a small ad-hoc allocation instead of a full split-rules
// editor. The caller (Close Out) is responsible for blocking save until
// `onChange`'s reported `complete` is true -- this component only ever
// reports state, it doesn't gate anything itself.
export default function WithdrawalAllocator({ totalAmount, primaryLabel, balances = {}, trackedLabels = [], onChange }) {
  const total = Number(totalAmount) || 0;
  const primaryBalance = primaryLabel ? Number(balances[primaryLabel]) || 0 : 0;
  const primaryAmount = primaryLabel ? Math.min(total, Math.max(0, primaryBalance)) : 0;
  const initialShortfall = Math.max(0, total - primaryAmount);

  // Extra rows beyond the primary category -- each { label: string|null,
  // sourceType: 'category'|'external', amount: number }.
  const [extraRows, setExtraRows] = useState(() =>
    initialShortfall > 0 ? [{ label: null, sourceType: "external", amount: initialShortfall }] : []
  );

  // If the underlying amount/primary category changes (e.g. user picks a
  // different category), reset the cascade rather than trying to patch it
  // -- a stale partial allocation against a since-changed amount would be
  // more confusing than starting over.
  useEffect(() => {
    setExtraRows(initialShortfall > 0 ? [{ label: null, sourceType: "external", amount: initialShortfall }] : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryLabel, total]);

  const extraSum = extraRows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const allocatedSum = primaryAmount + extraSum;
  const remaining = Math.round((total - allocatedSum) * 100) / 100;
  const complete = Math.abs(remaining) < 0.01 && total > 0;

  useEffect(() => {
    const allocations = [];
    if (primaryLabel && primaryAmount > 0) {
      allocations.push({ label: primaryLabel, amount: primaryAmount, sourceType: "category" });
    } else if (!primaryLabel && total > 0 && extraRows.length === 0) {
      // "Other" (no tracked category, no balance impact) -- single
      // external row for the full amount, label kept for display only.
      allocations.push({ label: "Other", amount: total, sourceType: "external" });
    }
    extraRows.forEach((r) => {
      if (Number(r.amount) > 0) {
        allocations.push({ label: r.sourceType === "category" ? r.label : null, amount: Number(r.amount), sourceType: r.sourceType });
      }
    });
    onChange?.(allocations, complete || (!primaryLabel && total > 0 && extraRows.length === 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryLabel, primaryAmount, JSON.stringify(extraRows), total]);

  const otherTrackedLabels = trackedLabels.filter((l) => l !== primaryLabel);

  const addRow = () => {
    setExtraRows((prev) => [...prev, { label: null, sourceType: "external", amount: Math.max(0, remaining) }]);
  };
  const removeRow = (idx) => {
    setExtraRows((prev) => prev.filter((_, i) => i !== idx));
  };
  const updateRow = (idx, patch) => {
    setExtraRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  if (!primaryLabel && total > 0) {
    // "Other" — untracked spending, no balance impact, nothing to cascade.
    return (
      <p className="text-xs" style={{ color: "var(--color-neutral-700)" }}>
        Categorized as untracked spending — no category balance is affected.
      </p>
    );
  }

  if (initialShortfall <= 0 && extraRows.length === 0) {
    return (
      <p className="text-xs" style={{ color: "var(--color-neutral-700)" }}>
        {primaryLabel} has enough balance ({currency(primaryBalance)}) to cover the full {currency(total)}.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs" style={{ color: "#9C3B22" }}>
        {primaryLabel} only has {currency(primaryBalance)} available — {currency(initialShortfall)} more needs a
        source below.
      </p>
      {extraRows.map((row, idx) => (
        <div key={idx} className="flex items-center gap-2 flex-wrap text-xs">
          <select
            value={row.sourceType === "category" ? row.label || "" : "external"}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "external") updateRow(idx, { sourceType: "external", label: null });
              else updateRow(idx, { sourceType: "category", label: v });
            }}
            className="border border-neutral-200 rounded-lg px-2 py-1"
          >
            <option value="external">From outside savings</option>
            {otherTrackedLabels.map((l) => (
              <option key={l} value={l}>
                {l} (available {currency(balances[l] || 0)})
              </option>
            ))}
          </select>
          <span className="flex items-center gap-1">
            $
            <input
              type="number"
              min={0}
              step={1}
              value={row.amount}
              onFocus={(e) => e.target.select()}
              onChange={(e) => updateRow(idx, { amount: e.target.value })}
              className="w-20 border border-neutral-200 rounded-lg px-2 py-1 font-mono text-center"
            />
          </span>
          <button type="button" onClick={() => removeRow(idx)} className="text-neutral-400 hover:text-red-600" title="Remove">
            <Trash2 size={13} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className="flex items-center gap-1 text-xs font-medium"
        style={{ color: "var(--color-accent-700)" }}
      >
        <Plus size={12} /> Add another source
      </button>
      <p className="text-xs" style={{ color: complete ? "var(--color-accent-700)" : "#9C3B22" }}>
        {complete ? "Fully accounted for." : `${currency(Math.max(0, remaining))} still needs a source.`}
      </p>
    </div>
  );
}
