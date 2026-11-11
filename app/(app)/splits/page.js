"use client";

import { drawNote, splitUnit } from "@/lib/entityCopy";
import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PrimaryButton } from "@/components/ui";
import PercentSplitEditor from "@/components/PercentSplitEditor";
import SplitPercentPieChart from "@/components/SplitPercentPieChart";
import { DEFAULT_SPLIT_RULES, getDefaultSplitRules, SUGGESTED_EXTRA_CATEGORIES, CATEGORY_COLORS, pickUniqueColor, pctTotal, roundPct, newSubAccountRow, clampPctToRemaining, maxAllowedPct, settleCaps, computeStartingBalanceRoom } from "@/lib/allocations";
import { decodeSim } from "@/lib/simSharing";
import AddCategoryCard from "@/components/AddCategoryCard";

// Split Rules is the exact same editor as onboarding's Percentage Splits
// step (see components/PercentSplitEditor.js) -- same grouped
// Investments/Retirement sub-accounts, same per-row connect-or-create
// account controls, same copy voice. Connecting an account on any row
// saves immediately (see updatePercent below) so that never depends on
// someone remembering to hit Save. Now every edit saves itself about a
// second after the last change, with an Undo and a "Reset to how it was when
// you opened this page" button in the bottom bar. No Monthly Cap $ field here
// anymore -- removed per product decision, one less thing to configure.
function SplitRulesPageInner() {
  const searchParams = useSearchParams();
  const [percent, setPercent] = useState([]);
  // Auto-save + undo bookkeeping.
  // baselineRef: the rules as they were when this page opened (Reset target).
  // committedRef: the last settled version (what Undo steps back from).
  // undoStack: older settled versions, newest last.
  const baselineRef = useRef(null);
  const committedRef = useRef(null);
  const undoStack = useRef([]);
  const [undoCount, setUndoCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [blockedMsg, setBlockedMsg] = useState(null);
  const [lastError, setLastError] = useState(null);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const [accounts, setAccounts] = useState([]);
  const [saved, setSaved] = useState(false);
  // True from the first edit until a successful save; drives the bottom save bar.
  const [dirty, setDirty] = useState(false);
  const markDirty = () => { setSaved(false); setDirty(true); };
  const [entityType, setEntityType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState({});
  const [connecting, setConnecting] = useState({});
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
      const startRules = savedPercent && savedPercent.length ? savedPercent : getDefaultSplitRules(userPersona).percent;
      setPercent(simmed || startRules);
      // What "Reset" goes back to, and the starting point for Undo. A split
      // carried over from the simulator counts as the first edit, so Reset
      // returns to what was saved before it.
      baselineRef.current = startRules;
      committedRef.current = startRules;
      setAccounts(accountsRes.accounts || []);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setSaving(true);
    try {
      const res = await fetch("/api/split-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ percent: settleCaps(nextPercent) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error(data.error || "Couldn't save, please try again.");
      setLastError(null);
      setSaved(true);
      setDirty(false);
    } catch (e) {
      const msg = e?.message || "Couldn't save, please try again.";
      setSaveError(msg);
      // Stays on screen in the bar until a save works, unlike the card above.
      setLastError(msg);
      setSaved(false);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  // Why the current rules can't be saved yet, or null if they can.
  const blockReason = (rules) => {
    if (computeStartingBalanceRoom(rules, accounts).anyOver) {
      return "Not saved yet: a starting balance is more than the account holds.";
    }
    return null;
  };

  // Save these rules if they are valid; otherwise say what is missing.
  const trySave = async (rules) => {
    const reason = blockReason(rules);
    setBlockedMsg(reason);
    if (reason) return;
    await saveNow(rules);
  };

  // Auto-save: about two seconds after the last edit, settle it (remember the
  // version before it for Undo) and save.
  const pendingRef = useRef(null);
  useEffect(() => {
    if (loading || committedRef.current === null) return;
    if (same(percent, committedRef.current)) {
      // Edited and then changed back to what was already saved: nothing is
      // waiting any more, so stop showing "Unsaved changes".
      pendingRef.current = null;
      setDirty(false);
      return;
    }
    markDirty();
    pendingRef.current = percent;
    // Two seconds after the last keystroke: put the cursor away so the box
    // shows its new number, then save.
    const t = setTimeout(() => {
      try {
        const el = document.activeElement;
        if (el && el.tagName === "INPUT" && el.closest("[data-rule-id]")) el.blur();
      } catch {}
      undoStack.current.push(committedRef.current);
      if (undoStack.current.length > 50) undoStack.current.shift();
      committedRef.current = percent;
      pendingRef.current = null;
      setUndoCount(undoStack.current.length);
      trySave(percent);
    }, 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [percent, loading]);

  // Closing the tab or switching away right after an edit should not lose it.
  useEffect(() => {
    const flush = () => {
      const pending = pendingRef.current;
      if (!pending || blockReason(pending)) return;
      fetch("/api/split-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ percent: settleCaps(pending) }),
        keepalive: true,
      }).catch(() => {});
    };
    const onHide = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts]);

  // Undo: throw away an edit still waiting to save, otherwise step back one
  // settled change. Either way the result is saved.
  const undo = () => {
    let target;
    if (pendingRef.current) {
      target = committedRef.current;
    } else if (undoStack.current.length) {
      target = undoStack.current.pop();
      setUndoCount(undoStack.current.length);
    } else {
      return;
    }
    pendingRef.current = null;
    committedRef.current = target;
    setPercent(target);
    trySave(target);
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
    setPercent((prev) => prev.filter((r) => r.id !== id));
  };
  const onAccountLinked = (account) => account && setAccounts((prev) => (prev.some((a) => a.id === account.id) ? prev : [...prev, account]));

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

  // Categories that get a share of every deposit but have no bank account
  // to send it to (typical right after adding one from the Savings Planner).
  const needAccount = useMemo(
    () => percent.filter((r) => (Number(r.pct) || 0) > 0 && !r.accountId),
    [percent]
  );
  const scrollToFirstUnconnected = () => {
    const r = needAccount[0];
    if (!r) return;
    const el = document.querySelector(`[data-rule-id="${String(r.id).replace(/"/g, '\\"')}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  // Arriving from the Savings Planner (?connect=1): jump straight to the
  // first category that still needs an account.
  useEffect(() => {
    if (loading || !searchParams.get("connect")) return;
    const t = setTimeout(scrollToFirstUnconnected, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

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

      {needAccount.length > 0 && (
        <div
          role="alert"
          style={{
            background: "#FBEEEA",
            border: "2px solid #E9B8AA",
            borderRadius: 20,
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 800, color: "#7A2C18" }}>
            Connect a bank account to finish setting up {needAccount.length === 1 ? "this category" : "these categories"}
          </div>
          <div style={{ fontSize: 15, lineHeight: 1.5, color: "#7A2C18" }}>
            {needAccount.map((r) => r.label).join(", ")} {needAccount.length === 1 ? "has" : "have"} a percentage but nowhere to send it.
            Until you pick an account, that money just stays where your deposit lands.
          </div>
          {accounts.length === 0 ? (
            <a href="/accounts" style={{ alignSelf: "flex-start", background: "#4E22B8", color: "#fff", borderRadius: 14, padding: "10px 18px", fontWeight: 800, fontSize: 15 }}>
              Connect a bank account first
            </a>
          ) : (
            <button
              type="button"
              onClick={scrollToFirstUnconnected}
              style={{ alignSelf: "flex-start", background: "#4E22B8", color: "#fff", borderRadius: 14, padding: "10px 18px", fontWeight: 800, fontSize: 15 }}
            >
              Choose an account for {needAccount[0].label}
            </button>
          )}
        </div>
      )}

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

      <AddCategoryCard suggestions={availableSuggestions} onAddSuggested={addSuggested} onAddOwn={addPercent} />

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

      {/* Auto-save bar: pinned to the bottom. Every edit saves itself about a
          second after the last change; Undo steps back one change and Reset
          returns to how things were when the page opened. */}
      <div
        style={{
          position: "sticky",
          bottom: 0,
          zIndex: 20,
          margin: 0, borderRadius: "20px 20px 0 0",
          padding: "8px 16px calc(8px + env(safe-area-inset-bottom, 0px))",
          background: "#fff",
          borderTop: "1.5px solid #D9C9FF",
          boxShadow: "0 -8px 24px rgba(78,34,184,0.10)",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {(() => {
          const problem = !saving && !dirty ? blockedMsg || lastError : null;
          const state = saving ? "saving" : dirty ? "pending" : problem ? "problem" : saved ? "saved" : "idle";
          const color = { problem: "#9C3B22", saving: "#4E22B8", pending: "#8A4B00", saved: "#4E22B8", idle: "#4A3F63" }[state];
          const dot = { problem: "#C2452B", saving: "#9A72F0", pending: "#E07A1F", saved: "#4E22B8", idle: "#CBB8F5" }[state];
          const text = state === "problem" ? problem : saving ? "Saving…" : dirty ? "Unsaved changes" : saved ? "All changes saved" : "Changes save automatically.";
          return (
            <div role="status" style={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 8, fontSize: 14, fontWeight: 700, color, textAlign: "center" }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: dot, display: "inline-block", flex: "none" }} />
              {text}
              {state === "problem" && lastError && (
                <button type="button" onClick={() => trySave(percent)} style={{ textDecoration: "underline", fontWeight: 800, color: "#4E22B8" }}>
                  Try again
                </button>
              )}
              <span aria-hidden="true" style={{ color: "#CBB8F5" }}>·</span>
              <button
                type="button"
                onClick={undo}
                disabled={undoCount === 0 && !dirty}
                title={undoCount === 0 && !dirty ? "Nothing to undo yet" : "Undo your last change"}
                style={{
                  textDecoration: "underline",
                  fontWeight: 800,
                  color: "#4E22B8",
                  opacity: undoCount === 0 && !dirty ? 0.4 : 1,
                  cursor: undoCount === 0 && !dirty ? "default" : "pointer",
                  minHeight: 32,
                  padding: "0 4px",
                }}
              >
                Undo change
              </button>
            </div>
          );
        })()}
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
