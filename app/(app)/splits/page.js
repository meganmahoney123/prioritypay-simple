"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Save, RotateCcw } from "lucide-react";
import { PrimaryButton, GhostButton } from "@/components/ui";
import PercentSplitEditor from "@/components/PercentSplitEditor";
import { DEFAULT_SPLIT_RULES, SUGGESTED_EXTRA_CATEGORIES, CATEGORY_COLORS, pctTotal, newSubAccountRow, clampPctToRemaining } from "@/lib/allocations";

// Split Rules is the exact same editor as onboarding's Percentage Splits
// step (see components/PercentSplitEditor.js) -- same grouped
// Investments/Retirement sub-accounts, same per-row connect-or-create
// account controls, same copy voice. The only things this page adds on
// top are things a one-time wizard step doesn't need: an explicit Save
// (onboarding submits everything at once at the end), "add your own
// category" / suggestion chips, and a reset to PriorityPay Simple's
// defaults. Live month-to-date/year-to-date dollar amounts per category
// now live on the Dashboard instead of here, so there's exactly one place
// that shows "how much have I actually put where" instead of two
// slightly-different copies of the same numbers. No Monthly Cap $ field
// here anymore -- removed per product decision, one less thing to
// configure.
export default function SplitRulesPage() {
  const [percent, setPercent] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState({});
  const [connecting, setConnecting] = useState({});

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

  const totalPct = useMemo(() => pctTotal(percent), [percent]);
  const remainingPct = Math.max(0, 100 - totalPct);

  const updatePercent = (id, patch) => {
    setSaved(false);
    setPercent((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, ...patch, ...(patch.pct !== undefined ? { pct: clampPctToRemaining(prev, id, patch.pct) } : {}) }
          : r
      )
    );
  };
  const addSubAccount = (group) => {
    setSaved(false);
    setPercent((prev) => [...prev, newSubAccountRow(group, prev.length)]);
  };
  const removeSubAccount = (group, id) => {
    setSaved(false);
    setPercent((prev) => (prev.filter((r) => r.group === group).length <= 1 ? prev : prev.filter((r) => r.id !== id)));
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
  const resetPercent = () => {
    setPercent(DEFAULT_SPLIT_RULES.percent);
    setSaved(false);
  };

  const usedLabels = useMemo(() => new Set(percent.map((r) => r.label)), [percent]);
  const availableSuggestions = useMemo(
    () => SUGGESTED_EXTRA_CATEGORIES.filter((s) => !usedLabels.has(s.label)),
    [usedLabels]
  );

  const handleSave = async () => {
    await fetch("/api/split-rules", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ percent }),
    });
    setSaved(true);
  };

  if (loading) return <p className="text-sm text-neutral-500">Loading…</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-bold mb-1">Split every deposit by percentage</h2>
        <p className="text-sm text-neutral-500">
          Investments and Retirement can each hold multiple accounts (rename, add, or delete them freely);
          every row's total is just whatever its accounts add up to. Connect or create an account for anywhere
          you want the money to land, or leave it disconnected for now -- the dashboard will nudge you before
          any money actually moves. Doesn&apos;t need to add to 100%: whatever&apos;s left stays wherever a
          deposit lands, so it&apos;s there to cover rent, food, and everything else.
        </p>
      </div>

      <PercentSplitEditor
        percent={percent}
        accounts={accounts}
        onUpdatePercent={updatePercent}
        onAddSubAccount={addSubAccount}
        onRemoveSubAccount={removeSubAccount}
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
        <GhostButton onClick={resetPercent}>
          <RotateCcw size={16} /> Reset to default categories
        </GhostButton>
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
    </div>
  );
}
