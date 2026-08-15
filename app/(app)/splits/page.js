"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Save } from "lucide-react";
import { PrimaryButton } from "@/components/ui";
import PercentSplitEditor from "@/components/PercentSplitEditor";
import { SUGGESTED_EXTRA_CATEGORIES, CATEGORY_COLORS, pctTotal, newSubAccountRow, clampPctToRemaining } from "@/lib/allocations";

// Split Rules is the exact same editor as onboarding's Percentage Splits
// step (see components/PercentSplitEditor.js) -- same grouped
// Investments/Retirement sub-accounts, same per-row connect-or-create
// account controls, same copy voice. Connecting an account on any row
// saves immediately (see updatePercent below) so that never depends on
// someone remembering to hit Save; the Save button covers percentage/name
// edits, which are lower-stakes to lose. No Monthly Cap $ field here
// anymore -- removed per product decision, one less thing to configure.
export default function SplitRulesPage() {
  const [percent, setPercent] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState({});
  const [connecting, setConnecting] = useState({});
  // { row, index } of the most recently deleted category/sub-account, so
  // "Undo" can put it back exactly where it was. Cleared automatically
  // after a few seconds or as soon as it's used.
  const [lastDeleted, setLastDeleted] = useState(null);

  useEffect(() => {
    (async () => {
      const [rulesRes, accountsRes] = await Promise.all([
        fetch("/api/split-rules").then((r) => r.json()),
        fetch("/api/accounts").then((r) => r.json()),
      ]);
      setPercent(rulesRes.splitRules?.percent || []);
      setAccounts(accountsRes.accounts || []);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!lastDeleted) return;
    const t = setTimeout(() => setLastDeleted(null), 8000);
    return () => clearTimeout(t);
  }, [lastDeleted]);

  const totalPct = useMemo(() => pctTotal(percent), [percent]);
  const remainingPct = Math.max(0, 100 - totalPct);

  const saveNow = async (nextPercent) => {
    await fetch("/api/split-rules", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ percent: nextPercent }),
    });
    setSaved(true);
  };

  const updatePercent = (id, patch) => {
    setSaved(false);
    setPercent((prev) => {
      const next = prev.map((r) =>
        r.id === id
          ? { ...r, ...patch, ...(patch.pct !== undefined ? { pct: clampPctToRemaining(prev, id, patch.pct) } : {}) }
          : r
      );
      // Connecting (or switching) an account is the one edit that auto-
      // saves immediately -- losing a just-made connection because someone
      // navigated away before clicking Save would be a bad, silent way to
      // lose real linked-account state.
      if (patch.accountId !== undefined) saveNow(next);
      return next;
    });
  };
  const addSubAccount = (group) => {
    setSaved(false);
    setPercent((prev) => [...prev, newSubAccountRow(group, prev.length)]);
  };
  const removeRow = (id) => {
    setSaved(false);
    setPercent((prev) => {
      const index = prev.findIndex((r) => r.id === id);
      if (index === -1) return prev;
      setLastDeleted({ row: prev[index], index });
      return prev.filter((r) => r.id !== id);
    });
  };
  const undoDelete = () => {
    if (!lastDeleted) return;
    setPercent((prev) => {
      const copy = [...prev];
      copy.splice(Math.min(lastDeleted.index, copy.length), 0, lastDeleted.row);
      return copy;
    });
    setLastDeleted(null);
  };
  const onAccountLinked = (account) => account && setAccounts((prev) => [...prev, account]);

  const addPercent = () => {
    setSaved(false);
    setPercent((prev) => [
      ...prev,
      { id: `new_${Date.now()}`, label: "New category", group: null, pct: 0, max: null, color: CATEGORY_COLORS[prev.length % CATEGORY_COLORS.length], accountId: null },
    ]);
  };
  const addSuggested = (suggestion) => {
    setSaved(false);
    setPercent((prev) => [
      ...prev,
      { id: `new_${Date.now()}`, label: suggestion.label, group: null, pct: 0, max: null, color: suggestion.color, accountId: null },
    ]);
  };

  const usedLabels = useMemo(() => new Set(percent.map((r) => r.label)), [percent]);
  const availableSuggestions = useMemo(
    () => SUGGESTED_EXTRA_CATEGORIES.filter((s) => !usedLabels.has(s.label)),
    [usedLabels]
  );

  const handleSave = async () => {
    await saveNow(percent);
  };

  if (loading) return <p className="text-sm text-neutral-500">Loading…</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-bold mb-1">Split every deposit by percentage</h2>
        <p className="text-sm text-neutral-500 mb-2">
          Each deposit you receive will be split and automatically sent to the following accounts. Here, set the
          percentages you want sent to each account.
        </p>
        <p className="text-sm text-neutral-500 mb-2">
          For example, if you select &quot;10%&quot; for savings, and PriorityPay detects a $100 deposit, $10 will
          be automatically routed to the savings account connected.
        </p>
        <p className="text-sm text-neutral-500 mb-2">
          If you don&apos;t have one of these accounts, you can set the percentage to &quot;0%&quot; and no money
          will be routed to that account.
        </p>
        <p className="text-sm text-neutral-500">
          Note: Any money not routed to one of the accounts below will remain where it was deposited.
        </p>
      </div>

      <PercentSplitEditor
        percent={percent}
        accounts={accounts}
        onUpdatePercent={updatePercent}
        onAddSubAccount={addSubAccount}
        onRemoveRow={removeRow}
        onAccountLinked={onAccountLinked}
        creating={creating}
        setCreating={setCreating}
        connecting={connecting}
        setConnecting={setConnecting}
      />

      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={addPercent} className="flex-1 min-w-[200px] flex items-center justify-center gap-2 text-sm font-medium text-emerald-700 border border-dashed border-emerald-300 rounded-xl py-2.5">
          <Plus size={15} /> Add your own category
        </button>
      </div>

      {availableSuggestions.length > 0 && (
        <div>
          <p className="text-xs text-neutral-500 mb-2">Suggestions -- click to add, starts at 0%:</p>
          <div className="flex flex-wrap gap-2">
            {availableSuggestions.map((s) => (
              <button
                key={s.label}
                onClick={() => addSuggested(s)}
                className="text-xs font-semibold px-3 py-1.5 rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200 flex items-center gap-1"
              >
                <Plus size={12} /> {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="text-center text-xs">
        <span className="font-semibold text-neutral-500">
          {totalPct}% allocated{remainingPct > 0 ? ` and ${remainingPct}% remains where it was deposited.` : "."}
        </span>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <PrimaryButton onClick={handleSave}>
          <Save size={16} /> Save split rules
        </PrimaryButton>
        {saved && <span className="text-sm text-emerald-700 font-medium">Saved</span>}
      </div>

      {lastDeleted && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-sm rounded-xl pl-4 pr-2 py-2.5 flex items-center gap-3 shadow-lg z-50">
          <span>&quot;{lastDeleted.row.label}&quot; removed.</span>
          <button onClick={undoDelete} className="font-bold text-emerald-300 hover:text-emerald-200 px-2 py-1">
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
