"use client";

import { drawNote, splitUnit } from "@/lib/entityCopy";
import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Save } from "lucide-react";
import { PrimaryButton } from "@/components/ui";
import PercentSplitEditor from "@/components/PercentSplitEditor";
import SplitPercentPieChart from "@/components/SplitPercentPieChart";
import { DEFAULT_SPLIT_RULES, getDefaultSplitRules, SUGGESTED_EXTRA_CATEGORIES, CATEGORY_COLORS, pickUniqueColor, pctTotal, roundPct, newSubAccountRow, clampPctToRemaining, maxAllowedPct, settleCaps, computeStartingBalanceRoom } from "@/lib/allocations";
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
  // True from the first edit until a successful save; drives the bottom save bar.
  const [dirty, setDirty] = useState(false);
  const markDirty = () => { setSaved(false); setDirty(true); };
  const [entityType, setEntityType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState({});
  const [connecting, setConnecting] = useState({});
  // { row, index } of the most recently deleted category/sub-account, so
  // "Undo" can put it back exactly where it was. Cleared automatically
  // after a few seconds or as soon as it's used.
  const [lastDeleted, setLastDeleted] = useState(null);
  // Persona (see lib/allocations.js's PERSONA_* constants) -- only changes
  // which Retirement default this page falls back to for someone who
  // never finished onboarding (see savedPercent fallback below), and
  // which rows/copy PercentSplitEditor locks as core vs. treats as a
  // normal deletable row.
  const [persona, setPersona] = useState(null);

  useEffect(() => {
    (async () => {
      const [rulesRes, accountsRes, profileRes] = await Promise.all([
        fetch("/api/split-rules").then((r) => r.json()),
        fetch("/api/accounts").then((r) => r.json()),
        fetch("/api/profile").then((r) => r.json()).catch(() => null),
      ]);
      const userPersona = profileRes?.profile?.persona || null;
      setPersona(userPersona);
      setEntityType(profileRes?.profile?.entityType || null);
      // A person arriving from the Money Simulator (dashboard tab or the
      // public one under Resources -> via signup+onboarding first) via
      // "Update my real split rules" carries their simulated split in
      // ?sim=, that takes priority over whatever's already saved, since
      // it's the whole reason they clicked through. Still requires
      // pressing Save below before it's actually persisted.
      const simmed = decodeSim(searchParams.get("sim"));
      const savedPercent = rulesRes.splitRules?.percent;
      // Nobody has an empty split -- either they saved real rows, or they
      // never finished onboarding (dropped off before Step 5, or connected
      // zero accounts along the way) and simple_split_rules_percent has
      // nothing for them yet. Falling back to the same seven starting
      // categories onboarding shows means Split Rules always has something
      // to look at and build from, instead of a blank page that gives no
      // hint what to set up. These aren't saved until the user hits Save
      // or connects an account on a row, exactly like a fresh onboarding.
      setPercent(simmed || (savedPercent && savedPercent.length ? savedPercent : getDefaultSplitRules(userPersona).percent));
      if (simmed) markDirty();
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
  // Same over-budget check PercentSplitEditor uses for its own inline
  // warning card (components/PercentSplitEditor.js /
  // computeStartingBalanceRoom in lib/allocations.js) -- surfaced here
  // too so Save itself can be blocked client-side, matching onboarding's
  // own disabled={startingBalanceOverBudget} precedent, rather than
  // relying only on the server rejecting the request after the fact.
  const startingBalanceOverBudget = useMemo(
    () => computeStartingBalanceRoom(percent, accounts).anyOver,
    [percent, accounts]
  );

  // Same one-row-at-a-time "over 100%" warning as onboarding's Percentage
  // Splits step (see app/onboarding/page.js) -- surfaced here too since
  // this is the exact same editor/clamping behavior, just reached after
  // onboarding instead of during it.
  const [pctOverflow, setPctOverflow] = useState(null);
  useEffect(() => {
    if (!pctOverflow) return;
    const t = setTimeout(() => setPctOverflow(null), 5000);
    return () => clearTimeout(t);
  }, [pctOverflow]);

  // Surfaces the server's validation error (e.g. a starting balance that
  // would put an account's categories over what it actually holds -- see
  // app/api/split-rules/route.js's PUT) instead of silently pretending the
  // save succeeded. Auto-cleared like pctOverflow above, but given longer
  // to read since this message is usually more involved.
  const [saveError, setSaveError] = useState(null);
  useEffect(() => {
    if (!saveError) return;
    const t = setTimeout(() => setSaveError(null), 12000);
    return () => clearTimeout(t);
  }, [saveError]);

  const saveNow = async (nextPercent) => {
    setSaveError(null);
    const res = await fetch("/api/split-rules", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ percent: settleCaps(nextPercent) }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) {
      setSaveError(data.error || "Couldn't save, please try again.");
      markDirty();
      return;
    }
    setSaved(true);
    setDirty(false);
  };

  const updatePercent = (id, patch) => {
    markDirty();
    setPercent((prev) => {
      if (patch.pct !== undefined) {
        const roomLeft = maxAllowedPct(prev, id);
        const requested = Math.max(0, Number(patch.pct) || 0);
        setPctOverflow(
          requested > roomLeft
            ? { id, message: `This would put your deposit allocation over 100%. Select no more than ${roomLeft}% or adjust some of the other percentages.` }
            : null
        );
      }
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
    markDirty();
    setPercent((prev) => [...prev, newSubAccountRow(group, prev.map((r) => r.color))]);
  };
  const removeRow = (id) => {
    markDirty();
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
    markDirty();
    setPercent((prev) => [
      ...prev,
      { id: `new_${Date.now()}`, label: "New category", group: null, pct: 0, max: null, balanceCap: null, color: pickUniqueColor(prev.map((r) => r.color)), accountId: null, startingBalance: null },
    ]);
  };
  const addSuggested = (suggestion) => {
    markDirty();
    // Suggestions carry a static `color` for their own preview swatch, but
    // that color can already be in use by one of this person's other rows
    // (or by a previous suggestion) -- always re-pick a free one at the
    // moment it's actually added, rather than trusting the static value.
    setPercent((prev) => [
      ...prev,
      { id: `new_${Date.now()}`, label: suggestion.label, group: null, pct: 0, max: null, balanceCap: null, color: pickUniqueColor(prev.map((r) => r.color)), accountId: null, startingBalance: null },
    ]);
  };

  const usedLabels = useMemo(() => new Set(percent.map((r) => r.label)), [percent]);
  const availableSuggestions = useMemo(
    () => SUGGESTED_EXTRA_CATEGORIES.filter((s) => !usedLabels.has(s.label)),
    [usedLabels]
  );

  const handleSave = async () => {
    // A category that gets a share of every deposit has to be connected to
    // a bank account, otherwise there's nowhere to send that money. Block
    // the save (rather than just warning) and name the categories to fix.
    const unconnected = percent.filter((r) => Number(r.pct) > 0 && !r.accountId);
    if (unconnected.length > 0) {
      const names = unconnected.map((r) => r.label).join(", ");
      markDirty();
      setSaveError(
        `Connect a bank account to ${names} before saving. Every category with a percentage needs an account to send money to.`
      );
      // The Save button in the sticky bar can be clicked from anywhere on
      // the page, so bring the message into view.
      setTimeout(() => document.getElementById("split-save-error")?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
      return;
    }
    await saveNow(percent);
  };

  // AppShell's own header (components/AppShell.js) isn't a fixed height --
  // its title uses a responsive clamp() font-size, so the header runs
  // anywhere from ~78px to ~96px+ tall depending on viewport width. This
  // bar used to hardcode `top: 78` as a rough guess, which left it a
  // visible ~18px too high (clipped under the real header) at wider
  // widths. Measuring the actual header on mount and on resize keeps this
  // bar pinned exactly below it regardless of viewport size, instead of
  // drifting out of alignment again the next time that header's height
  // changes.
  const [stickyTop, setStickyTop] = useState(84);
  useEffect(() => {
    const measure = () => {
      const header = document.querySelector("header");
      if (header) setStickyTop(header.getBoundingClientRect().height);
    };
    measure();
    window.addEventListener("resize", measure);
    // The heading font can still be swapping in when `measure` first runs
    // (a web font finishing its download after this component mounts),
    // which grows the header's height with no `resize` event to catch it
    // -- this bar would then stay pinned at the old, too-small offset and
    // visibly sit under/over the real header. Re-measuring once fonts are
    // done loading closes that gap without waiting on a real resize.
    if (typeof document !== "undefined" && document.fonts && document.fonts.ready) {
      document.fonts.ready.then(measure);
    }
    return () => window.removeEventListener("resize", measure);
  }, []);

  if (loading) return <p className="text-sm text-neutral-500">Loading…</p>;

  return (
    <div className="space-y-6" style={{ maxWidth: 780 }}>
      <div>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(28px, 3.4vw, 36px)", fontWeight: 800, margin: "0 0 8px" }}>
          Split every {splitUnit(entityType)} by percentage
        </h2>
        <div style={{ height: 1, background: "var(--color-divider)", margin: "0 0 24px" }} />
        <p style={{ fontSize: 17, lineHeight: 1.7, color: "#574A68", margin: 0 }}>
          Each {splitUnit(entityType)} you receive will be split by percentage into the following accounts, and you&apos;ll get a
          checklist to confirm and send each transfer yourself. Here, set the percentages you want sent to each
          account.
        </p>
        {drawNote(entityType) && (
          <p style={{ fontSize: 15, lineHeight: 1.7, color: "#574A68", margin: "12px 0 0" }}>{drawNote(entityType)}</p>
        )}
      </div>

      <SplitPercentPieChart percent={percent} remainingPct={remainingPct} />

      <div>
        <p style={{ fontSize: 17, lineHeight: 1.7, color: "#574A68", margin: "0 0 12px" }}>
          For example, if you select &quot;10%&quot; for savings, and PrioritySave detects a $100 {splitUnit(entityType)}, it&apos;ll
          tell you to send $10 to the savings account connected.
        </p>
        <p style={{ fontSize: 17, lineHeight: 1.7, color: "#574A68", margin: 0 }}>
          If you don&apos;t have one of these accounts, you can set the percentage to &quot;0%&quot; and no money
          will be set aside for that account.
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
        persona={persona}
        totalPct={totalPct}
        pctOverflow={pctOverflow}
        theme="ledger"
        hideSoloRetirementNote
      />

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={addPercent}
          className="flex-1 min-w-[200px] flex items-center justify-center gap-2 py-2.5"
          style={{
            background: "transparent",
            border: "1px dashed #C4A9FA",
            borderRadius: 18,
            fontFamily: "var(--font-heading)",
            fontSize: 15,
            fontWeight: 600,
            color: "#4E22B8",
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
            Suggestions, click to add, starts at 0%:
          </p>
          <div className="flex flex-wrap gap-2">
            {availableSuggestions.map((s) => (
              <button
                key={s.label}
                onClick={() => addSuggested(s)}
                className="flex items-center gap-1"
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 16,
                  fontWeight: 600,
                  color: "var(--color-text)",
                  background: "#FFFFFF",
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
        <span style={{ fontFamily: "var(--font-body)", fontSize: 16, color: "var(--color-text)" }}>
          {totalPct}% allocated{remainingPct > 0 ? ` and ${remainingPct}% remains where it was deposited.` : "."}
        </span>
      </div>

      {startingBalanceOverBudget && (
        <p className="text-sm" style={{ color: "#9C3B22", fontFamily: "var(--font-heading)", fontWeight: 600, margin: 0 }}>
          Fix the over-allocated starting balance above before saving.
        </p>
      )}

      {saveError && (
        <div
          id="split-save-error"
          className="text-sm"
          style={{
            color: "#9C3B22",
            background: "#FBEEEA",
            border: "1px solid #F0C9C0",
            borderRadius: "var(--radius-md)",
            padding: "12px 16px",
            lineHeight: 1.5,
          }}
        >
          {saveError}
        </div>
      )}

      {lastDeleted && (
        <div
          className="fixed bottom-32 left-1/2 -translate-x-1/2 text-sm pl-4 pr-2 py-2.5 flex items-center gap-3 z-50"
          style={{ background: "#241634", color: "#FFFFFF", borderRadius: 999, boxShadow: "var(--shadow-lg)" }}
        >
          <span>&quot;{lastDeleted.row.label}&quot; removed.</span>
          <button onClick={undoDelete} className="px-2 py-1" style={{ fontWeight: 700, color: "#C4A9FA" }}>
            Undo
          </button>
        </div>
      )}

      {/* Save bar: always pinned to the bottom of the screen, so Save is never
          out of reach. The status line above the button says whether there is
          anything unsaved. */}
      <div
        style={{
          position: "sticky",
          bottom: 0,
          zIndex: 20,
          margin: 0, borderRadius: "20px 20px 0 0",
          padding: "12px 16px calc(16px + env(safe-area-inset-bottom, 0px))",
          background: "#fff",
          borderTop: "1.5px solid #D9C9FF",
          boxShadow: "0 -8px 24px rgba(78,34,184,0.10)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div
          role="status"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            fontSize: 14,
            fontWeight: 700,
            color: dirty ? "#8A4B00" : saved ? "#4E22B8" : "#4A3F63",
          }}
        >
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: dirty ? "#E07A1F" : saved ? "#4E22B8" : "#CBB8F5", display: "inline-block" }} />
          {dirty ? "Unsaved changes" : saved ? "All changes saved" : "Nothing below is saved until you hit Save."}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={startingBalanceOverBudget}
          style={{
            width: "100%",
            minHeight: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            background: "#4E22B8",
            color: "#fff",
            borderRadius: 16,
            fontSize: 18,
            fontWeight: 800,
            opacity: startingBalanceOverBudget ? 0.45 : 1,
            cursor: startingBalanceOverBudget ? "not-allowed" : "pointer",
          }}
        >
          <Save size={18} /> Save split rules
        </button>
      </div>
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
