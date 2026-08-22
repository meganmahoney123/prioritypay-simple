"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Save } from "lucide-react";
import { PrimaryButton } from "@/components/ui";
import PercentSplitEditor from "@/components/PercentSplitEditor";
import { LEDGER_TOKENS } from "@/lib/ledgerTheme";
import { SUGGESTED_EXTRA_CATEGORIES, CATEGORY_COLORS, pctTotal, roundPct, newSubAccountRow, clampPctToRemaining } from "@/lib/allocations";
import { decodeSim } from "@/lib/simSharing";

// Split Rules is the exact same editor as onboarding's Percentage Splits
// step (see components/PercentSplitEditor.js) -- same grouped
// Investments/Retirement sub-accounts, same per-row connect-or-create
// account controls, same copy voice. Connecting an account on any row
// saves immediately (see updatePercent below) so that never depends on
// someone remembering to hit Save; the Save button covers percentage/name
// edits, which are lower-stakes to lose. No Monthly Cap $ field here
// anymore -- removed per product decision, one less thing to configure.
function SplitRulesPageInner() {
  const searchParams = useSearchParams();
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
      // A person arriving from the Money Simulator (dashboard tab or the
      // public one under Resources -> via signup+onboarding first) via
      // "Update my real split rules" carries their simulated split in
      // ?sim= -- that takes priority over whatever's already saved, since
      // it's the whole reason they clicked through. Still requires
      // pressing Save below before it's actually persisted.
      const simmed = decodeSim(searchParams.get("sim"));
      setPercent(simmed || rulesRes.splitRules?.percent || []);
      if (simmed) setSaved(false);
      setAccounts(accountsRes.accounts || []);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!lastDeleted) return;
    const t = setTimeout(() => setLastDeleted(null), 8000);
    return () => clearTimeout(t);
  }, [lastDeleted]);

  const totalPct = useMemo(() => pctTotal(percent), [percent]);
  const remainingPct = roundPct(Math.max(0, 100 - totalPct));

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
      { id: `new_${Date.now()}`, label: "New category", group: null, pct: 0, max: null, balanceCap: null, color: CATEGORY_COLORS[prev.length % CATEGORY_COLORS.length], accountId: null },
    ]);
  };
  const addSuggested = (suggestion) => {
    setSaved(false);
    setPercent((prev) => [
      ...prev,
      { id: `new_${Date.now()}`, label: suggestion.label, group: null, pct: 0, max: null, balanceCap: null, color: suggestion.color, accountId: null },
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
    <div className="max-w-2xl space-y-6" style={LEDGER_TOKENS}>
      <div>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(26px, 3.4vw, 34px)", fontWeight: 400, margin: "0 0 8px" }}>
          Split every deposit by percentage
        </h2>
        <div style={{ height: 1, background: "var(--color-divider)", margin: "0 0 24px" }} />
        <p className="text-sm mb-2" style={{ color: "color-mix(in srgb, var(--color-text) 76%, transparent)" }}>
          Each deposit you receive will be split by percentage into the following accounts, and you&apos;ll get a
          checklist to confirm and send each transfer yourself. Here, set the percentages you want sent to each
          account.
        </p>
        <p className="text-sm mb-2" style={{ color: "color-mix(in srgb, var(--color-text) 76%, transparent)" }}>
          For example, if you select &quot;10%&quot; for savings, and PriorityPay detects a $100 deposit, it&apos;ll
          tell you to send $10 to the savings account connected.
        </p>
        <p className="text-sm mb-2" style={{ color: "color-mix(in srgb, var(--color-text) 76%, transparent)" }}>
          If you don&apos;t have one of these accounts, you can set the percentage to &quot;0%&quot; and no money
          will be set aside for that account.
        </p>
        <p
          className="text-sm"
          style={{
            fontStyle: "italic",
            fontFamily: "var(--font-heading)",
            color: "color-mix(in srgb, var(--color-text) 66%, transparent)",
            borderLeft: "1px solid var(--color-accent-300)",
            paddingLeft: 16,
          }}
        >
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
        theme="ledger"
      />

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={addPercent}
          className="flex-1 min-w-[200px] flex items-center justify-center gap-2 py-2.5"
          style={{
            background: "transparent",
            border: "1px dashed var(--color-accent-300)",
            borderRadius: "var(--radius-md)",
            fontFamily: "var(--font-heading)",
            fontSize: 14,
            letterSpacing: "0.04em",
            color: "var(--color-accent-700)",
            cursor: "pointer",
          }}
        >
          <Plus size={15} /> Add your own category
        </button>
      </div>

      {availableSuggestions.length > 0 && (
        <div>
          <p
            className="mb-2"
            style={{ fontFamily: "var(--font-heading)", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}
          >
            Suggestions -- click to add, starts at 0%:
          </p>
          <div className="flex flex-wrap gap-2">
            {availableSuggestions.map((s) => (
              <button
                key={s.label}
                onClick={() => addSuggested(s)}
                className="flex items-center gap-1"
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 14,
                  color: "color-mix(in srgb, var(--color-text) 72%, transparent)",
                  background: "transparent",
                  border: "1px solid var(--color-divider)",
                  borderRadius: 999,
                  padding: "8px 16px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <Plus size={12} /> {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-baseline justify-between" style={{ borderTop: "1px solid var(--color-divider)", paddingTop: 20 }}>
        <span style={{ fontFamily: "var(--font-heading)", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
          Allocated
        </span>
        <span style={{ fontFamily: "var(--font-heading)", fontSize: 17 }}>
          {totalPct}% allocated{remainingPct > 0 ? ` and ${remainingPct}% remains where it was deposited.` : "."}
        </span>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <PrimaryButton onClick={handleSave}>
          <Save size={16} /> Save split rules
        </PrimaryButton>
        {saved && <span className="text-sm font-medium" style={{ color: "var(--color-accent-700)", fontFamily: "var(--font-heading)", fontStyle: "italic" }}>Saved.</span>}
      </div>

      {lastDeleted && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 text-sm pl-4 pr-2 py-2.5 flex items-center gap-3 z-50"
          style={{ background: "#171614", color: "#f3f2f2", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-lg)" }}
        >
          <span>&quot;{lastDeleted.row.label}&quot; removed.</span>
          <button onClick={undoDelete} className="px-2 py-1" style={{ fontWeight: 700, color: "var(--color-accent-300)" }}>
            Undo
          </button>
        </div>
      )}
    </div>
  );
}

export default function SplitRulesPage() {
  return (
    <Suspense fallback={null}>
      <SplitRulesPageInner />
    </Suspense>
  );
}
