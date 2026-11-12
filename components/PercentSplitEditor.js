"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, AlertTriangle, Pencil, Link2, X } from "lucide-react";
import AccountSelect from "./AccountSelect";
import PlaidLinkButton from "./PlaidLinkButton";
import CreateSubAccountFlow from "./CreateSubAccountFlow";
import RetirementNote from "./RetirementNote";
import ChipCheckboxes from "./ChipCheckboxes";
import EmployerCheckEmailModal from "./EmployerCheckEmailModal";
import SplitPreviewPie from "./SplitPreviewPie";
import { CapExplainer } from "@/components/OnboardingLimits";
import { percentSections, groupPctTotal, connectSavingsOnly, retirementGroupSubtext, RETIREMENT_GROUP_SUBTEXT, isCoreRow, isEmployerRetirementRow, roundPct, currency, computeStartingBalanceRoom, tierOf } from "@/lib/allocations";
import { TIER_CSS } from "./TierCards";
import { bloomWarningCardStyle } from "@/lib/bloomTheme";

// Purple ramp used for each row's colour dot in the Bloom-styled ("ledger"
// theme prop) editor -- replaces the old per-row hex values from
// CATEGORY_COLORS (still used unchanged by lib/allocations.js and any
// not-yet-restyled surface) with a fixed purple progression assigned by a
// row's position, so restyling this component never has to touch that
// shared data file.
const BLOOM_DOT_COLORS = ["#D9C9FF", "#C4A9FA", "#9A72F0", "#6D3BE0", "#4E22B8", "#3B1C7A", "#2A1550"];

// Monthly and Total category limits: two side-by-side cards, each with an
// on/off switch, a one-line explanation and a dollar box. Same values as the
// old "Set a limit" dropdowns: null = no limit, "" = switched on but still
// empty (settles to the $1 floor on blur, and settleCaps in
// lib/allocations.js enforces it again before saving).
// Progress under a limit: how much of it is already used. `used` is
// undefined until the numbers load (or for a category that isn't saved yet),
// in which case nothing is drawn.
function CapProgress({ used, limit, unit }) {
  const lim = Number(limit);
  if (used === undefined || !Number.isFinite(lim) || lim <= 0) return null;
  const pct = Math.min(100, Math.round((used / lim) * 100));
  const full = used >= lim;
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ height: 8, borderRadius: 999, background: "#EDE6FF", overflow: "hidden" }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: full ? "#B58900" : "#6D3BE0" }} />
      </div>
      <div style={{ marginTop: 5, fontSize: 13, fontWeight: 700, color: full ? "#8A6A00" : "var(--color-text-muted, #4A3F63)", fontVariantNumeric: "tabular-nums" }}>
        {currency(used)} of {currency(lim)} {unit}
        {full ? " · limit reached" : ""}
      </div>
      {used > lim && (
        <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.4, color: "#8A6A00" }}>
          Already above this limit, so no new money will go to this category. Raise it or turn it off to keep sending here.
        </div>
      )}
    </div>
  );
}

// One shared fetch (cached for a few seconds) so a page full of categories
// doesn't ask the server once per row.
let usageCache = { at: 0, promise: null };
function loadCapUsage() {
  if (!usageCache.promise || Date.now() - usageCache.at > 15000) {
    usageCache = {
      at: Date.now(),
      promise: fetch("/api/split-rules/cap-usage")
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => j?.usage || null)
        .catch(() => null),
    };
  }
  return usageCache.promise;
}

function CapCard({ title, sub, value, onChange, used, unit }) {
  const isSet = value !== null && value !== undefined;
  const clamp = (raw) => {
    if (raw === "") return "";
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 1;
  };
  // Clicking away from an empty (or zero) box turns the limit back off. It
  // used to snap to $1, which silently blocked the whole category.
  const settle = (raw) => {
    const n = Number(raw);
    return !raw || !Number.isFinite(n) || n <= 0 ? null : n;
  };
  return (
    <div
      style={{
        flex: "1 1 220px",
        minWidth: 0,
        border: `2px solid ${isSet ? "#9A72F0" : "#D9C9FF"}`,
        borderRadius: 18,
        padding: "14px 16px",
        background: isSet ? "var(--color-surface, #fff)" : "#FBF9FF",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-text)" }}>{title}</div>
        <button
          type="button"
          role="switch"
          aria-checked={isSet}
          aria-label={`${isSet ? "Turn off" : "Turn on"} ${title.toLowerCase()}`}
          onClick={() => onChange(isSet ? null : "")}
          style={{
            width: 46,
            height: 26,
            borderRadius: 999,
            border: 0,
            padding: 3,
            cursor: "pointer",
            flex: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: isSet ? "flex-end" : "flex-start",
            background: isSet ? "#6D3BE0" : "#CFC3EA",
          }}
        >
          <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", display: "block" }} />
        </button>
      </div>
      <div style={{ fontSize: 13.5, lineHeight: 1.4, color: "var(--color-text-muted, #4A3F63)", margin: "4px 0 10px", minHeight: 38 }}>{sub}</div>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          border: `2px solid ${isSet ? "#6D3BE0" : "#D9C9FF"}`,
          borderRadius: 14,
          padding: "8px 12px",
          background: "var(--color-surface, #fff)",
          maxWidth: 190,
          opacity: isSet ? 1 : 0.55,
        }}
      >
        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-text-muted, #4A3F63)" }}>$</span>
        <input
          type="number"
          aria-label={`${title} amount in dollars`}
          disabled={!isSet}
          placeholder={isSet ? "" : "No limit"}
          onFocus={(e) => e.target.select()}
          min={1}
          step={1}
          value={isSet ? value : ""}
          onChange={(e) => onChange(clamp(e.target.value))}
          onBlur={(e) => onChange(settle(e.target.value))}
          style={{ width: "100%", minWidth: 0, border: 0, outline: "none", background: "transparent", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 17, color: "var(--color-text)" }}
        />
      </label>
      {isSet && <CapProgress used={used} limit={value} unit={unit} />}
    </div>
  );
}

function CapCards({ rule, onUpdate }) {
  const [usage, setUsage] = useState(null);
  useEffect(() => {
    let live = true;
    loadCapUsage().then((u) => { if (live) setUsage(u); });
    return () => { live = false; };
  }, []);
  const mine = usage && rule.label ? usage[rule.label] : undefined;
  return (
    <>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <CapCard title="Monthly limit" sub="Resets on the 1st of every month." value={rule.max} onChange={(v) => onUpdate(rule.id, { max: v })} used={mine?.month} unit="this month" />
        <CapCard
          title="Total limit"
          sub="Starting balance plus everything PrioritySave has seen you send here."
          value={rule.categoryCap}
          onChange={(v) => onUpdate(rule.id, { categoryCap: v })}
          used={mine?.total}
          unit="so far"
        />
      </div>
      <p style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.5, color: "var(--color-text-muted, #4A3F63)" }}>
        Using both? Whichever limit is reached first stops new money for this category.
      </p>
    </>
  );
}

// Self-employed retirement rows (Solo 401k, SEP IRA, custom) are plain
// categories, not a grouped "Retirement" card. Only groups that contain the W2
// workplace lineup (payroll-funded 401k/IRA/HSA) stay grouped.
function flattenSelfEmployedRetirement(sections) {
  return sections.flatMap((x) =>
    x.type === "group" && x.group.startsWith("Retirement") && !x.rows.some((r) => isEmployerRetirementRow(r)) ? x.rows.map((row) => ({ type: "row", row })) : [x]
  );
}

// One row of the percent-split editor -- a flat category (Tax Reserve,
// Emergency Fund, OPEX, Savings, anything a person adds) or a sub-account
// inside a group (Investments, Retirement). `locked` rows are one of the
// seven categories every account starts with (see isCoreRow in
// lib/allocations.js): their name is fixed and they can't be deleted.
// Everything else -- a custom flat category, or an extra Investment/
// Retirement sub-account someone added themselves -- gets a visibly
// editable name field and a delete control.
//
// `theme="ledger"` is purely visual (see LEDGER_TOKENS) -- every prop,
// handler, and validation rule below behaves identically regardless of
// theme, so passing no theme (as the standalone Split Rules page does)
// renders exactly as before.
function PercentRow({ rule, accounts, onUpdate, onRemove, creating, setCreating, connecting, setConnecting, onAccountLinked, showRowWarnings, overflowMessage, theme, dotColor, forceShowStartingBalance, hideStartingBalance, hideAccountPicker, hideCreateNew, readOnly, lockLabel, persona, startingBalanceRoomInfo, tierStyle }) {
  const locked = isCoreRow(rule, persona) || !!lockLabel || !!readOnly;
  // A starting balance only ever counts as money already sitting in THIS
  // row's own connected account (see the PUT /api/split-rules validation
  // that enforces this) -- two categories named the same thing on two
  // different accounts are tracked completely separately, each against
  // its own account's real balance. Naming the account right in the
  // label is what makes that explicit instead of implicit, so nobody
  // assumes "Tax Reserves" means one shared pot across every account it
  // might be connected to.
  const startingBalanceAccount = rule.accountId ? (accounts || []).find((a) => a.id === rule.accountId) : null;
  const startingBalanceAccountLabel = startingBalanceAccount
    ? `${startingBalanceAccount.institution_name} •••• ${startingBalanceAccount.mask}`
    : null;
  // Cap $ (a monthly dollar cap -- see computeAllocations in
  // lib/allocations.js) only applies to flat categories (Tax Reserve,
  // Emergency Fund, OPEX, Savings, anything a person adds themselves).
  // Investments/Retirement sub-accounts don't get one: those buckets are
  // meant to keep receiving their full percentage indefinitely, not stop
  // once some dollar figure is hit.
  // Solo 401k, SEP IRA and any other self-employed retirement row are plain
  // categories now (caps, starting balance, delete, like any other). Only the
  // W2 workplace lineup (401k/IRA/HSA funded by payroll) stays in its group.
  const isGrouped = rule.group === "Investments" || ((rule.group || "").startsWith("Retirement") && isEmployerRetirementRow(rule));
  // Collapsed by default (Onboarding Pass 2, Aug 2026 handoff) -- caps are
  // an edge case most people never touch, so hiding them behind a toggle
  // is the main density fix for this step. Local to each row's own render
  // rather than lifted to the parent, since nothing outside this row ever
  // needs to know whether its caps panel happens to be open.
  const [showLimits, setShowLimits] = useState(!!tierStyle);
  // Deposit Splits (tier style): the extras live behind "See more".
  const [tierOpen, setTierOpen] = useState(false);
  // Every row shows its name the same way once added (like "Savings"); a
  // brand-new unnamed row starts in edit mode, and the pencil renames any
  // custom row later.
  const [editingName, setEditingName] = useState(!rule.label || rule.label === "New category");
  const canRename = !isCoreRow(rule, persona) && !lockLabel && !readOnly;
  const canDelete = !lockLabel && !readOnly;
  const [showLimitsHelp, setShowLimitsHelp] = useState(false);
  // The "No account connected yet" note can be closed; it comes back on reload.
  const [noAccountDismissed, setNoAccountDismissed] = useState(false);
  // Collapsed by default, same reasoning as showLimits above -- most
  // people creating a category are starting from $0, so this stays out
  // of the way until someone clicks "$X saved already" / "Already have
  // money saved?" to reveal it. Onboarding passes forceShowStartingBalance
  // to skip the toggle entirely and always show the input -- per product
  // decision, onboarding should explicitly ask for a starting balance on
  // every category (even a $0 one is an answer), not leave it as an
  // easy-to-miss optional reveal the way the Splits page (editing an
  // existing category later) still does.
  const [showStartingBalance, setShowStartingBalance] = useState(
    forceShowStartingBalance || (rule.startingBalance !== null && rule.startingBalance !== undefined && rule.startingBalance !== "")
  );
  // "Not sure" link under the employer-contribution checkbox -- opens
  // EmployerCheckEmailModal so someone who genuinely doesn't know can
  // draft an email to HR/payroll instead of guessing at the checkbox.
  const [showEmployerCheckModal, setShowEmployerCheckModal] = useState(false);
  // Collapsed by default, same pattern as the Transfer page's own
  // "Learn more" toggle for its shortfall pie chart (see
  // app/(app)/transfers/page.js) -- most categories never go over, so the
  // breakdown stays out of the way until someone actually needs to see
  // where an over-allocated account's starting balances are coming from.
  const [showStartingBalanceLearnMore, setShowStartingBalanceLearnMore] = useState(false);

  if (theme === "ledger") {
    return (
      <div data-rule-id={rule.id} style={tierStyle ? { borderTop: "1.5px solid #E7DEFA", padding: "13px 0" } : { border: "1px solid var(--color-divider)", borderRadius: 22, background: "var(--color-surface)", padding: "18px 20px" }}>
        {tierStyle ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span className="pp-tier-dot" />
              {canRename ? (
                <input
                  className="pp-tier-name"
                  aria-label="Category name"
                  value={rule.label}
                  placeholder="Name this category"
                  onChange={(e) => onUpdate(rule.id, { label: e.target.value })}
                  onFocus={(e) => e.target.select()}
                />
              ) : (
                <span className="pp-tier-namefixed">{rule.label}</span>
              )}
              <span className="pp-tier-pill">
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  step="any"
                  aria-label={`${rule.label} percent`}
                  value={rule.pct === 0 || rule.pct === "0" ? 0 : rule.pct ?? ""}
                  disabled={isEmployerRetirementRow(rule) && rule.employerHandles}
                  readOnly={!!readOnly}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => onUpdate(rule.id, { pct: e.target.value })}
                />
                %
              </span>
              <button type="button" className="pp-tier-more" aria-expanded={tierOpen} onClick={() => setTierOpen((v) => !v)}>
                {tierOpen ? "See less ▴" : "See more ▾"}
              </button>
              {canDelete && (
                <button type="button" className="pp-tier-x" aria-label={`Remove ${rule.label}`} onClick={() => onRemove(rule.id)}>✕</button>
              )}
            </div>
            {overflowMessage && <p style={{ fontSize: 13, lineHeight: 1.5, color: "#B42318", margin: "6px 0 0" }}>{overflowMessage}</p>}
          </>
        ) : (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "8px 20px" }}>
          {!(canRename && editingName) ? (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flex: 1,
                minWidth: 0,
                fontFamily: "var(--font-heading)",
                fontSize: 19,
                fontWeight: 700,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor || "var(--color-accent)", flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rule.label}</span>
              {canRename && (
                <button
                  type="button"
                  onClick={() => setEditingName(true)}
                  title="Rename category"
                  style={{ background: "transparent", border: 0, cursor: "pointer", color: "color-mix(in srgb, var(--color-text) 45%, transparent)", padding: 4, flexShrink: 0 }}
                >
                  <Pencil size={14} />
                </button>
              )}
            </span>
          ) : (
            <span style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor || "var(--color-accent)", flexShrink: 0 }} />
              <input
                value={rule.label}
                onChange={(e) => onUpdate(rule.id, { label: e.target.value })}
                onBlur={() => { if (rule.label && rule.label.trim()) setEditingName(false); }}
                onKeyDown={(e) => { if (e.key === "Enter" && rule.label && rule.label.trim()) setEditingName(false); }}
                autoFocus={editingName && !!rule.label}
                placeholder="Name this category"
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontFamily: "var(--font-body)",
                  fontSize: 16,
                  color: "var(--color-text)",
                  background: "var(--color-neutral-100)",
                  border: "1px solid var(--color-neutral-300)",
                  borderRadius: "var(--radius-sm)",
                  padding: "9px 12px",
                }}
              />
            </span>
          )}
          <span style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 2,
                background: "#F4EEFF",
                borderRadius: "var(--radius-pill)",
                padding: "6px 6px 6px 14px",
              }}
            >
              <input
                type="number"
                onFocus={(e) => e.target.select()}
                min={0}
                max={100}
                value={rule.pct}
                disabled={isEmployerRetirementRow(rule) && rule.employerHandles}
                readOnly={!!readOnly}
                tabIndex={readOnly ? -1 : undefined}
                onChange={(e) => onUpdate(rule.id, { pct: Number(e.target.value) })}
                style={{
                  // Grows with the number so "100" and "13.7" both fit.
                  width: `calc(${Math.max(3, String(rule.pct ?? "").length) + 1}ch + 4px)`,
                  minWidth: 40,
                  textAlign: "right",
                  fontFamily: "var(--font-mono)",
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#4E22B8",
                  background: "transparent",
                  border: 0,
                  padding: "4px 2px",
                  opacity: isEmployerRetirementRow(rule) && rule.employerHandles ? 0.5 : 1,
                }}
              />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: "#4E22B8" }}>%</span>
            </span>
            {canDelete && (
              <button
                onClick={() => onRemove(rule.id)}
                title="Delete category"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "var(--color-neutral-100)",
                  border: "1px solid var(--color-divider)",
                  cursor: "pointer",
                  color: "var(--color-neutral-700)",
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                <Trash2 size={16} />
              </button>
            )}
          </span>
        </div>
        )}
        {(!tierStyle || tierOpen) && (
        <div className={tierStyle ? "pp-tier-details" : undefined} style={tierStyle ? { paddingTop: 4 } : undefined}>
        {!tierStyle && overflowMessage && (
          <p style={{ fontSize: 13, lineHeight: 1.6, color: "#9C3B22", margin: "8px 0 0" }}>{overflowMessage}</p>
        )}
        {!hideAccountPicker && isEmployerRetirementRow(rule) && (
          <RetirementNote label={rule.label} theme="ledger" isEmployer={isEmployerRetirementRow(rule)} />
        )}
        {!hideAccountPicker && !readOnly && isEmployerRetirementRow(rule) && (
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 13, color: "color-mix(in srgb, var(--color-text) 65%, transparent)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={!!rule.employerHandles}
              onChange={(e) => {
                const checked = e.target.checked;
                onUpdate(rule.id, checked ? { employerHandles: true, pct: 0 } : { employerHandles: false });
              }}
              style={{ width: 15, height: 15 }}
            />
            My employer already pulls money from my paycheck for this
          </label>
        )}
        {!hideAccountPicker && !readOnly && isEmployerRetirementRow(rule) && (
          <button
            type="button"
            onClick={() => setShowEmployerCheckModal(true)}
            style={{
              display: "block",
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              fontSize: 13,
              color: "var(--color-accent)",
              background: "transparent",
              border: 0,
              padding: "6px 0 0 23px",
              cursor: "pointer",
            }}
          >
            Not sure?
          </button>
        )}
        {showEmployerCheckModal && (
          <EmployerCheckEmailModal label={rule.label} onClose={() => setShowEmployerCheckModal(false)} />
        )}
        {showRowWarnings && Number(rule.pct) > 0 && !rule.accountId && !noAccountDismissed && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              fontSize: 13,
              lineHeight: 1.6,
              color: "#9C3B22",
              background: "#FBEEEA",
              border: "1px solid #F0C9C0",
              borderRadius: "var(--radius-sm)",
              padding: "10px 12px",
              margin: "10px 0 0",
            }}
          >
            <span style={{ flex: 1, minWidth: 0 }}>
              No account connected yet. Until you connect one, there&apos;s nowhere to send this {rule.pct}% on your
              checklist.
            </span>
            <button
              type="button"
              onClick={() => setNoAccountDismissed(true)}
              aria-label="Dismiss this message"
              title="Dismiss"
              style={{ flex: "none", width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 999, color: "#9C3B22" }}
            >
              <X size={16} />
            </button>
          </div>
        )}
        {!hideAccountPicker && (
        <div style={{ marginTop: 12, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 12.5, color: "color-mix(in srgb, var(--color-text) 55%, transparent)", marginBottom: 6 }}>
            I want to route my money to this account:
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <AccountSelect
              value={rule.accountId}
              onChange={(v) => onUpdate(rule.id, { accountId: v })}
              accounts={accounts}
              onCreateNew={isEmployerRetirementRow(rule) || hideCreateNew ? undefined : () => setCreating((prev) => ({ ...prev, [rule.id]: true }))}
              onConnectAnother={() => setConnecting((prev) => ({ ...prev, [rule.id]: true }))}
              recommendCreate={false}
              excludeSubtypes={rule.group === "Investments" ? ["checking"] : undefined}
              theme="ledger"
            />
          </div>
        </div>
        )}
        {!readOnly && (!isGrouped || !hideStartingBalance) && (
          <div style={{ marginTop: 4 }}>
            {!tierStyle && (
            <button
              type="button"
              onClick={() => setShowLimits((v) => !v)}
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 600,
                fontSize: 13,
                color: "var(--color-accent)",
                background: "transparent",
                border: 0,
                padding: "10px 0 0",
                cursor: "pointer",
              }}
            >
              {showLimits
                ? "Hide"
                : !isGrouped && !hideStartingBalance
                ? "Add monthly or total limits and starting balance"
                : !isGrouped
                ? "Add monthly or total limits"
                : "Add a starting balance"}
            </button>
            )}
            <div>
              <button
                type="button"
                onClick={() => setShowLimitsHelp((v) => !v)}
                style={{ fontSize: 13, color: "color-mix(in srgb, var(--color-text) 60%, transparent)", background: "transparent", border: 0, padding: "6px 0 0", cursor: "pointer", textDecoration: "underline" }}
              >
                What&apos;s this?
              </button>
            </div>
            {showLimitsHelp && (
              <div style={{ marginTop: 8, background: "#FAF7FD", borderRadius: "var(--radius-sm)", padding: "12px 14px", fontSize: 13.5, lineHeight: 1.65, color: "color-mix(in srgb, var(--color-text) 72%, transparent)", display: "grid", gap: 8 }}>
                {!isGrouped && (
                  <p style={{ margin: 0 }}>
                    <strong style={{ color: "var(--color-text)" }}>Monthly Category Cap:</strong> the most this category can
                    receive in a calendar month. Once it&apos;s hit, it drops to 0% until the 1st, and the extra goes
                    to your other categories.
                  </p>
                )}
                {!isGrouped && (
                  <p style={{ margin: 0 }}>
                    <strong style={{ color: "var(--color-text)" }}>Total Category Cap:</strong> the most you want saved
                    toward this category overall. It goes by PrioritySave&apos;s own tally: your starting balance plus
                    everything PrioritySave has seen you send here, minus withdrawals you log. It stops sending money
                    here once the tally hits this amount, and starts again if withdrawals bring it back below.
                  </p>
                )}
                {!hideStartingBalance && (
                  <p style={{ margin: 0 }}>
                    <strong style={{ color: "var(--color-text)" }}>Starting balance:</strong> money you already have set
                    aside for this category in its account, so it starts at the right amount instead of $0.
                  </p>
                )}
              </div>
            )}
            {showLimits && !isGrouped && (
              <div style={{ marginTop: 8, background: "#FAF7FD", borderRadius: "var(--radius-sm)", padding: "12px 14px" }}>
                <CapCards rule={rule} onUpdate={onUpdate} />
              </div>
            )}
          </div>
        )}
        {!hideStartingBalance && !readOnly && (showLimits || showStartingBalance) && (
        <div style={{ marginTop: 4 }}>
          {true ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginTop: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                {forceShowStartingBalance ? "Starting balance for this category (enter 0 if none):" : "Starting Balance:"}
              </span>
              <span style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontFamily: "var(--font-heading)", fontSize: 15, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>$</span>
                <input
                  type="number"
                  onFocus={(e) => e.target.select()}
                  min={0}
                  step={1}
                  placeholder="0"
                  value={rule.startingBalance ?? ""}
                  onChange={(e) => onUpdate(rule.id, { startingBalance: e.target.value.replace(/^0+(?=\d)/, "") })}
                  style={{
                    width: 90,
                    textAlign: "right",
                    fontFamily: "var(--font-heading)",
                    fontSize: 15,
                    color: "var(--color-text)",
                    background: "transparent",
                    border: 0,
                    borderBottom: "1px solid var(--color-divider)",
                    padding: "3px 2px",
                  }}
                />
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowStartingBalance(true)}
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 600,
                fontSize: 13,
                color: "var(--color-accent)",
                background: "transparent",
                border: 0,
                padding: "10px 0 0",
                cursor: "pointer",
              }}
            >
              Already have money saved for this? Add your starting balance
            </button>
          )}
          {/* A starting balance is a claim about real money already sitting
              in this row's connected account -- so the moment the SUM of
              every category's starting balance on that same account passes
              what the account actually holds, at least one of those claims
              has to be wrong. This mirrors the exact check PUT
              /api/split-rules runs server-side right before saving (see
              that route's own comment on refreshing the live balance
              first), just computed locally so it shows up the moment
              someone types a number instead of only after they hit Save. */}
          {startingBalanceRoomInfo?.isOver && (
            <div className="text-xs mt-2 p-3 space-y-2" style={bloomWarningCardStyle({ padding: "10px 12px" })}>
              <p className="font-semibold">
                That's more than {startingBalanceRoomInfo.accountLabel || "this account"} actually has
              </p>
              <p>
                {startingBalanceRoomInfo.otherLabels && startingBalanceRoomInfo.otherLabels.length ? (
                  <>
                    Starting balances across {startingBalanceRoomInfo.accountLabel}
                    {" "}({[rule.label, ...startingBalanceRoomInfo.otherLabels].filter(Boolean).join(", ")}) add up to{" "}
                    {currency(startingBalanceRoomInfo.total)}, but the account only holds{" "}
                    {currency(startingBalanceRoomInfo.accountBalance)}. A starting balance can only ever be money
                    that's actually sitting in that one connected account -- if another category (like a separate
                    Tax Reserves elsewhere) is on a different account, it doesn't share this pool.
                  </>
                ) : (
                  <>
                    This starting balance ({currency(rule.startingBalance)}) is more than{" "}
                    {startingBalanceRoomInfo.accountLabel || "the connected account"} actually holds (
                    {currency(startingBalanceRoomInfo.accountBalance)}).
                  </>
                )}
              </p>
              <button
                type="button"
                onClick={() => setShowStartingBalanceLearnMore((v) => !v)}
                className="text-xs font-semibold underline"
                style={{ color: "#9C3B22" }}
              >
                {showStartingBalanceLearnMore ? "Hide details" : "Learn more"}
              </button>
              {showStartingBalanceLearnMore && (() => {
                const PIE_COLORS = ["#6D3BE0", "#9A72F0", "#C4A9FA", "#D9C9FF", "#4E22B8", "#8B7CB8"];
                const rows = startingBalanceRoomInfo.rows || [];
                const balance = startingBalanceRoomInfo.accountBalance || 0;
                const total = startingBalanceRoomInfo.total || 0;
                // Whichever is bigger decides the ring: normally the real
                // balance (unclaimed money still fits inside it), but once
                // total claims exceed it, the ring has to grow to fit
                // everything claimed or the over-claimed slice would have
                // nowhere to go.
                const ringTotal = Math.max(balance, total) || 1;
                let acc = 0;
                const stops = rows.map((r, i) => {
                  const from = (acc / ringTotal) * 100;
                  acc += Math.max(0, r.startingBalance);
                  const to = (acc / ringTotal) * 100;
                  return { label: r.label, amount: r.startingBalance, color: PIE_COLORS[i % PIE_COLORS.length], from, to };
                });
                const remaining = balance - total;
                if (remaining >= 0.005) {
                  const from = (acc / ringTotal) * 100;
                  stops.push({ label: "Unclaimed", amount: remaining, color: "#F2ECFC", from, to: 100 });
                } else if (total - balance >= 0.005) {
                  const from = (balance / ringTotal) * 100;
                  stops.push({ label: "Over budget", amount: total - balance, color: "#E8534E", from, to: 100 });
                }
                const gradient = `conic-gradient(${stops.map((s) => `${s.color} ${s.from}% ${s.to}%`).join(", ")})`;
                return (
                  <div className="p-3 space-y-3" style={{ border: "1px solid var(--color-divider)", borderRadius: "var(--radius-md)", background: "var(--color-surface)" }}>
                    <p className="text-xs font-semibold">
                      How {startingBalanceRoomInfo.accountLabel || "this account"} is allocated right now
                    </p>
                    <div className="flex items-center gap-4">
                      <div className="relative shrink-0" style={{ width: 96, height: 96 }}>
                        <div style={{ width: 96, height: 96, borderRadius: "50%", background: gradient }} />
                        <div
                          className="absolute flex flex-col items-center justify-center text-center"
                          style={{ inset: 14, borderRadius: "50%", background: "var(--color-surface)" }}
                        >
                          <span className="font-mono text-[11px] font-semibold">{currency(balance)}</span>
                          <span className="text-[9px]" style={{ color: "var(--color-neutral-700)" }}>real balance</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 text-xs flex-grow">
                        {stops.map((s) => (
                          <div key={s.label} className="flex items-center gap-2">
                            <span className="shrink-0" style={{ width: 9, height: 9, borderRadius: 3, background: s.color }} />
                            <span className="flex-grow truncate">{s.label}</span>
                            <span className="font-mono" style={{ color: "var(--color-neutral-700)" }}>{currency(s.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
        )}
        {connecting[rule.id] && (
          <div style={{ marginTop: 10 }}>
            <PlaidLinkButton
              label="Connect another account"
              savingsOnly={!isEmployerRetirementRow(rule) && connectSavingsOnly(rule)}
              retirementType={isEmployerRetirementRow(rule) ? rule.retirementType : undefined}
              onLinked={(account) => {
                if (account) {
                  onAccountLinked(account);
                  onUpdate(rule.id, { accountId: account.id });
                }
                setConnecting((prev) => ({ ...prev, [rule.id]: false }));
              }}
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 600,
                fontSize: 13,
                color: "var(--color-accent)",
                background: "transparent",
                border: "1px solid var(--color-accent)",
                borderRadius: "var(--radius-pill)",
                padding: "9px 18px",
              }}
            />
          </div>
        )}
        {creating[rule.id] && (
          <CreateSubAccountFlow
            costLabel={rule.label}
            accounts={accounts}
            savingsOnly={connectSavingsOnly(rule)}
            onAccountLinked={onAccountLinked}
            onConfirmed={(accountId) => {
              onUpdate(rule.id, { accountId });
              setCreating((prev) => ({ ...prev, [rule.id]: false }));
            }}
            theme="ledger"
          />
        )}
        </div>
        )}
      </div>
    );
  }

  return (
    <div data-rule-id={rule.id} className="border border-neutral-200 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: rule.color }} />
        {locked ? (
          <span className="text-sm font-medium flex-1 min-w-0 text-neutral-800">{rule.label}</span>
        ) : (
          <div className="relative flex-1 min-w-0">
            <Pencil size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <input
              value={rule.label}
              onChange={(e) => onUpdate(rule.id, { label: e.target.value })}
              placeholder="Name this category"
              className="text-sm font-medium w-full min-w-0 bg-white border border-neutral-300 rounded-lg pl-6 pr-2 py-1 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        )}
        <input
          type="number"
          onFocus={(e) => e.target.select()}
          min={0}
          max={100}
          value={rule.pct}
          disabled={isEmployerRetirementRow(rule) && rule.employerHandles}
          onChange={(e) => onUpdate(rule.id, { pct: Number(e.target.value) })}
          className="w-14 text-sm border border-neutral-200 rounded-lg px-2 py-1 font-mono text-center disabled:opacity-50"
        />
        <span className="text-xs text-neutral-500">%</span>
        {!locked && (
          <button onClick={() => onRemove(rule.id)} className="text-neutral-400 hover:text-red-600 shrink-0" title="Delete category">
            <Trash2 size={14} />
          </button>
        )}
      </div>
      {overflowMessage && <p className="text-xs text-red-700 mt-1">{overflowMessage}</p>}
      {isEmployerRetirementRow(rule) ? (
        <RetirementNote label={rule.label} isEmployer={isEmployerRetirementRow(rule)} />
      ) : null}
      {isEmployerRetirementRow(rule) && (
        <label className="flex items-center gap-2 mt-2 text-xs text-neutral-600 cursor-pointer">
          <input
            type="checkbox"
            checked={!!rule.employerHandles}
            onChange={(e) => {
              const checked = e.target.checked;
              onUpdate(rule.id, checked ? { employerHandles: true, pct: 0 } : { employerHandles: false });
            }}
            className="w-3.5 h-3.5"
          />
          My employer already pulls money from my paycheck for this
        </label>
      )}
      {isEmployerRetirementRow(rule) && (
        <button
          type="button"
          onClick={() => setShowEmployerCheckModal(true)}
          className="block text-xs font-medium text-emerald-700 mt-1 ml-5"
        >
          Not sure?
        </button>
      )}
      {showEmployerCheckModal && (
        <EmployerCheckEmailModal label={rule.label} onClose={() => setShowEmployerCheckModal(false)} />
      )}
      {!isGrouped && (
        <>
          <CapCards rule={rule} onUpdate={onUpdate} />
        </>
      )}
      {!hideStartingBalance && (
      <div className="mt-2">
        {showStartingBalance ? (
          <label className="flex items-center gap-1.5 text-xs text-neutral-500">
            {forceShowStartingBalance
              ? "Starting balance for this category (enter 0 if none):"
              : "Starting Balance:"}
            <span className="flex items-center gap-0.5">
              $
              <input
                type="number"
                onFocus={(e) => e.target.select()}
                min={0}
                step={1}
                placeholder="0"
                value={rule.startingBalance ?? ""}
                onChange={(e) => onUpdate(rule.id, { startingBalance: e.target.value })}
                className="w-20 text-sm border border-neutral-200 rounded-lg px-2 py-1 font-mono text-center"
              />
            </span>
          </label>
        ) : (
          <button
            type="button"
            onClick={() => setShowStartingBalance(true)}
            className="text-xs font-medium text-emerald-700"
          >
            Already have money saved for this? Add your starting balance
          </button>
        )}
      </div>
      )}
      <div className="mt-2">
        <span className="block text-xs text-neutral-500 mb-1">I want to route my money to this account:</span>
        <AccountSelect
          value={rule.accountId}
          onChange={(v) => onUpdate(rule.id, { accountId: v })}
          accounts={accounts}
          onCreateNew={isEmployerRetirementRow(rule) ? undefined : () => setCreating((prev) => ({ ...prev, [rule.id]: true }))}
          onConnectAnother={() => setConnecting((prev) => ({ ...prev, [rule.id]: true }))}
          recommendCreate={false}
          // Investments should never point at a plain checking account --
          // same principle as the savings-only restriction Plaid Link
          // already applies when connecting a brand-new account for this
          // row (see connectSavingsOnly below), just also enforced against
          // accounts that were already connected for some other category.
          excludeSubtypes={rule.group === "Investments" ? ["checking"] : undefined}
        />
      </div>
      {connecting[rule.id] && (
        <div className="mt-2">
          <PlaidLinkButton
            label="Connect another account"
            savingsOnly={!isEmployerRetirementRow(rule) && connectSavingsOnly(rule)}
            retirementType={isEmployerRetirementRow(rule) ? rule.retirementType : undefined}
            onLinked={(account) => {
              if (account) {
                onAccountLinked(account);
                onUpdate(rule.id, { accountId: account.id });
              }
              setConnecting((prev) => ({ ...prev, [rule.id]: false }));
            }}
            className="text-xs px-4 py-2"
          />
        </div>
      )}
      {creating[rule.id] && (
        <CreateSubAccountFlow
          costLabel={rule.label}
          accounts={accounts}
          savingsOnly={connectSavingsOnly(rule)}
          onAccountLinked={onAccountLinked}
          onConfirmed={(accountId) => {
            onUpdate(rule.id, { accountId });
            setCreating((prev) => ({ ...prev, [rule.id]: false }));
          }}
        />
      )}
      {showRowWarnings && Number(rule.pct) > 0 && !rule.accountId && !noAccountDismissed && (
        <div className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
          <AlertTriangle size={12} className="shrink-0 mt-0.5" />
          <span className="flex-1 min-w-0">
            No account connected yet. Until you connect one, there&apos;s nowhere to send this {rule.pct}% on your
            checklist, so it stays wherever the deposit landed.
          </span>
          <button type="button" onClick={() => setNoAccountDismissed(true)} aria-label="Dismiss this message" title="Dismiss" className="shrink-0">
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

// Shared percent-split editor -- identical UI in onboarding's Percentage
// Splits step and the standalone Split Rules page, per design decision to
// keep the two in lockstep instead of drifting into two slightly-different
// interfaces. Investments and Retirement render as groups of sub-accounts
// with an auto-summed subtotal (see percentSections/groupPctTotal in
// lib/allocations.js); everything else renders as a single flat row.
// `onRemoveRow(id)` is the one delete handler for every row, core or not
// (PercentRow itself only ever calls it for non-core rows) -- callers are
// expected to snapshot the removed row so it can be restored on "Undo"
// (see the lastDeleted/undo pattern in Split Rules and onboarding).
//
// `theme="ledger"` opts a caller into the new visual system without
// changing this component's behavior -- see the module comment above.
// Deposit Splits' last tier: the same compact card as tiers 1 and 2, one row per
// category. "See more" on a row opens its bank account, monthly / total cap and
// starting balance (the same controls as before).
export function LastTierEditor({ percent, accounts, onUpdatePercent, onRemoveRow, onAccountLinked, creating, setCreating, connecting, setConnecting, pctOverflow, persona, children , title = "Everything else" }) {
  const rows = (percent || []).filter((r) => tierOf(r) === 0);
  const total = roundPct(rows.reduce((n, r) => n + (Number(r.pct) || 0), 0));
  const stays = roundPct(Math.max(0, 100 - total));
  const { byRuleId: roomById } = computeStartingBalanceRoom(percent, accounts);
  return (
    <div className="pp-tier-card">
      <style>{TIER_CSS}</style>
      <div className="pp-tier-head">
        <div className="pp-tier-title">{title}</div>
        <span style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 700, fontSize: 14, color: total > 100.0001 ? "#B3261E" : "#4E22B8", whiteSpace: "nowrap" }}>{total}%</span>
      </div>
      <p className="pp-tier-sub">
        This is the final tier. The percentages below do NOT need to add up to 100% of your deposit. For example, you could schedule just 75% of each deposit to be split among the categories below.
      </p>
      {rows.map((rule) => (
        <PercentRow
          key={rule.id}
          rule={rule}
          accounts={accounts}
          onUpdate={onUpdatePercent}
          onRemove={onRemoveRow}
          creating={creating}
          setCreating={setCreating}
          connecting={connecting}
          setConnecting={setConnecting}
          onAccountLinked={onAccountLinked}
          overflowMessage={pctOverflow && pctOverflow.id === rule.id ? pctOverflow.message : null}
          theme="ledger"
          tierStyle
          persona={persona}
          startingBalanceRoomInfo={roomById[rule.id]}
        />
      ))}
      {children}
    </div>
  );
}

export default function PercentSplitEditor({
  percent,
  accounts,
  onUpdatePercent,
  onAddSubAccount,
  onRemoveRow,
  onAccountLinked,
  creating,
  setCreating,
  connecting,
  setConnecting,
  showRowWarnings = true,
  // Optional -- when passed, renders a bold "Allocated" total right under
  // "What's a cap?" in addition to the detailed summary at the bottom of
  // the editor (see app/onboarding/page.js and app/(app)/splits/page.js,
  // which both already compute this same number). Omitted entirely if the
  // caller doesn't pass it, rather than recomputing it here, so this stays
  // in sync with whatever `percent` state the caller is authoritative for.
  totalPct,
  // Optional -- { id, message } for the one row currently showing an
  // "over 100%" warning (see updatePercent in app/onboarding/page.js and
  // app/(app)/splits/page.js, which set this the moment a typed
  // percentage would have been clamped).
  pctOverflow,
  theme,
  // Optional -- persona string (see lib/allocations.js's PERSONA_*
  // constants). Only changes behavior for W2 (No Side Hustle/Business):
  // its Retirement group locks 401k/IRA/HSA instead of
  // Solo 401k (isCoreRow) and swaps the group's explainer copy
  // (retirementGroupSubtext). Omitted entirely == the original
  // self-employed/business-owner behavior, unchanged.
  persona,
  // Onboarding Pass 2 (Aug 2026 handoff) folds this same cap explanation
  // into a page-level "How splits work" panel above the whole editor, so
  // the caller can suppress this component's own copy of it here rather
  // than showing the same explanation twice. Defaults to false so Split
  // Rules (which has no such page-level panel) keeps this disclosure.
  hideCapDetails = false,
  // Passed through to every PercentRow -- see the forceShowStartingBalance
  // comment on PercentRow itself. Defaults to false so Split Rules keeps
  // the existing optional-toggle behavior; onboarding passes true.
  forceShowStartingBalance = false,
  // Fully suppresses the starting-balance field/toggle on every row,
  // regardless of forceShowStartingBalance or whether a row already has a
  // value -- onboarding passes this once starting balances moved to their
  // own dedicated step (grouped by account, with live-balance validation)
  // instead of being asked per-category here. Defaults to false so Split
  // Rules and the old onboarding behavior are unaffected.
  hideStartingBalance = false,
  // Hides each row's "route my money to this account" picker, so a step can be
  // about percentages only (onboarding sets accounts later).
  hideAccountPicker = false,
  // Hides the "create a new savings account" choice in each account picker.
  hideCreateNew = false,
  // Rows show their percentage and account picker only (no renaming, deleting,
  // percentage edits, limits or add buttons).
  readOnly = false,
  // Investments is one plain row instead of a group with an add button.
  flattenInvestments = false,
  // Drops the explainer line under the Retirement heading.
  hideGroupSubtext = false,
  // Split Rules only (Nov 2026): hides just the self-employed Solo 401k
  // explainer (RETIREMENT_GROUP_SUBTEXT, "Solo 401ks are retirement accounts
  // for self-employed..."), which belongs in onboarding where people first
  // choose categories. The W2 versions of the note still show.
  hideSoloRetirementNote = false,
  // { options: [{value,label}], selected: [value], onToggle(value) } -- onboarding's
  // "which retirement accounts do you have" picker; replaces the per-group
  // notes and the add button for Retirement.
  retirementPicker = null,
  // Shows the live "Sample: $10,000 deposit" donut + dollar list above the rows.
  samplePie = false,
}) {
  const overflowMessageFor = (id) => (pctOverflow && pctOverflow.id === id ? pctOverflow.message : null);

  if (theme === "ledger") {
    // Global row order (across every group and flat row) so each row's
    // colour dot can be assigned a purple-ramp shade by position -- see
    // BLOOM_DOT_COLORS above. Purely presentational; doesn't affect which
    // row is which.
    const orderedRowIds = percentSections(percent).flatMap((s) => (s.type === "group" ? s.rows.map((r) => r.id) : [s.row.id]));
    const dotColorFor = (id) => BLOOM_DOT_COLORS[Math.max(0, orderedRowIds.indexOf(id)) % BLOOM_DOT_COLORS.length];

    // Starting-balance room, computed once across the WHOLE rule set (not
    // just one row at a time) -- a starting balance can only ever be as
    // large as what the connected account's real balance can cover once
    // every OTHER category sharing that same account is counted too (see
    // PUT /api/split-rules, which enforces this exact limit server-side
    // -- this mirrors that math client-side so someone sees the problem
    // the moment they type it, not after a rejected Save). Keyed by rule
    // id so each row can show its own room/warning without needing to
    // know about its siblings directly.
    const { byRuleId: startingBalanceRoomById } = computeStartingBalanceRoom(percent, accounts);
    // With the retirement picker, every Retirement* group is shown as one
    // "Retirement" card (even with no rows yet), placed after Investments.
    let sections = percentSections(percent);
    if (retirementPicker) {
      const isRet = (x) => x.type === "group" && x.group.startsWith("Retirement");
      const retRows = sections.filter(isRet).flatMap((x) => x.rows);
      const firstIdx = sections.findIndex(isRet);
      const rest = sections.filter((x) => !isRet(x));
      const merged = { type: "group", group: "Retirement", rows: retRows };
      let at = firstIdx;
      if (at < 0) {
        const inv = rest.findIndex((x) => x.type === "group" && x.group === "Investments");
        at = inv >= 0 ? inv + 1 : Math.min(2, rest.length);
      }
      rest.splice(at, 0, merged);
      sections = rest;
    }
    // Solo 401k / SEP IRA / other self-employed retirement rows are ordinary
    // categories, not a "Retirement" box with its own add button and note.
    // The W2 workplace lineup (payroll-funded 401k/IRA/HSA) and the retirement
    // picker keep the grouped card.
    if (!retirementPicker) sections = flattenSelfEmployedRetirement(sections);
    // Percentage-only step: Investments is one plain row (extra accounts can be
    // added later as their own categories), not a group with an add button.
    if (hideAccountPicker || flattenInvestments) {
      sections = sections.flatMap((x) =>
        x.type === "group" && x.group === "Investments" ? x.rows.map((row) => ({ type: "row", row })) : [x]
      );
    }
    return (
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 18 }}>
        {!hideCapDetails && (
        <details
          className="pp-cap-details"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--color-text)",
            background: "var(--color-surface)",
            border: "1px solid var(--color-divider)",
            borderRadius: "var(--radius-md)",
            padding: "16px 20px",
            margin: 0,
          }}
        >
          <summary
            style={{
              fontSize: 16,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 6,
            }}
          >
            What&apos;s a cap?
            <span className="pp-cap-chevron" style={{ display: "inline-block", transition: "transform 0.15s ease", fontWeight: 400 }}>
              +
            </span>
          </summary>
          <p style={{ fontSize: 16, lineHeight: 1.7, margin: "12px 0 16px" }}>
            Once you reach your savings goal for a particular category, it might not make sense to continue adding money to that category.
            That&apos;s why you can set limits. Once a category reaches a limit, PrioritySave resets that category to 0%. Other categories automatically increase accordingly to absorb the percentage that was allocated to that category. For a Monthly
            Category Cap, it resets each month. For a Total Category Cap, the split only turns back on if a withdrawal causes the category
            to dip below its cap.
          </p>
          <CapExplainer />
        </details>
        )}
        {samplePie && (
          <SplitPreviewPie
            rows={percentSections(percent).flatMap((x) => (x.type === "group" ? x.rows : [x.row]))}
            colorFor={dotColorFor}
          />
        )}
        {typeof totalPct === "number" && (
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 20 }}>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
              Allocated
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: 30, color: "#4E22B8", fontVariantNumeric: "lining-nums tabular-nums" }}>
              {totalPct}%
            </span>
          </div>
        )}
        {sections.map((section) =>
          section.type === "group" ? (
            <div
              key={section.group}
              style={{ border: "1px solid #D9C9FF", borderRadius: 24, background: "#F7F3FF", overflow: "hidden" }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: "4px 20px",
                  padding: "16px 22px",
                  borderBottom: "1px solid #D9C9FF",
                  background: "#EDE6FF",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: 14,
                    fontWeight: 800,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "#4E22B8",
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {section.group}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 14,
                    color: "#4E22B8",
                    fontVariantNumeric: "lining-nums tabular-nums",
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  {groupPctTotal(section.rows)}% total
                </span>
              </div>
              <div style={{ padding: "18px 22px 22px" }}>
                {section.group.startsWith("Retirement") && !retirementPicker && !hideGroupSubtext &&
                  !(hideSoloRetirementNote && retirementGroupSubtext(persona, section.group) === RETIREMENT_GROUP_SUBTEXT) && (
                  <p style={{ fontSize: 14, lineHeight: 1.7, color: "color-mix(in srgb, var(--color-text) 62%, transparent)", margin: "0 0 18px", maxWidth: "40em" }}>
                    {retirementGroupSubtext(persona, section.group)}
                  </p>
                )}
                {retirementPicker && section.group === "Retirement" && (
                  <div style={{ margin: "0 0 18px" }}>
                    <p style={{ fontSize: 14, lineHeight: 1.7, color: "color-mix(in srgb, var(--color-text) 62%, transparent)", margin: "0 0 12px", maxWidth: "40em" }}>
                      Which of these do you have open right now? Select all that apply. If none, set a percentage anyway. The money builds up until you open one.
                    </p>
                    <ChipCheckboxes options={retirementPicker.options} selected={retirementPicker.selected} onToggle={retirementPicker.onToggle} />
                    {retirementPicker.selected.includes("other") && (
                      <button
                        type="button"
                        onClick={() => retirementPicker.onToggle("add-other")}
                        style={{ marginTop: 12, background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 14, color: "#4E22B8" }}
                      >
                        + Add another account
                      </button>
                    )}
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 14 }}>
                  {section.rows.map((rule) => (
                    <PercentRow
                      key={rule.id}
                      rule={rule}
                      accounts={accounts}
                      onUpdate={onUpdatePercent}
                      onRemove={onRemoveRow}
                      creating={creating}
                      setCreating={setCreating}
                      connecting={connecting}
                      setConnecting={setConnecting}
                      onAccountLinked={onAccountLinked}
                      showRowWarnings={showRowWarnings}
                      forceShowStartingBalance={forceShowStartingBalance}
                      hideStartingBalance={hideStartingBalance} hideAccountPicker={hideAccountPicker} hideCreateNew={hideCreateNew} readOnly={readOnly}
                      lockLabel={!!retirementPicker && !!(rule.retirementType || rule.id === "retirement_savings")}
                      overflowMessage={overflowMessageFor(rule.id)}
                      theme="ledger"
                      dotColor={dotColorFor(rule.id)}
                      persona={persona}
                      startingBalanceRoomInfo={startingBalanceRoomById[rule.id]}
                    />
                  ))}
                </div>
                {!hideAccountPicker && !readOnly && !(retirementPicker && section.group.startsWith("Retirement")) && (
                <button
                  onClick={() => onAddSubAccount(section.group)}
                  className="pp-ledger-add"
                  style={{
                    width: "100%",
                    marginTop: 16,
                    background: "transparent",
                    border: "1px dashed #C4A9FA",
                    borderRadius: 18,
                    padding: "11px 16px",
                    cursor: "pointer",
                    fontFamily: "var(--font-heading)",
                    fontSize: 15,
                    fontWeight: 600,
                    color: "#4E22B8",
                    whiteSpace: "nowrap",
                  }}
                >
                  + &nbsp;Add {section.group.startsWith("Retirement") ? "a retirement account" : "an investment account"}
                </button>
                )}
              </div>
            </div>
          ) : (
            <PercentRow
              key={section.row.id}
              rule={section.row}
              accounts={accounts}
              onUpdate={onUpdatePercent}
              onRemove={onRemoveRow}
              creating={creating}
              setCreating={setCreating}
              connecting={connecting}
              setConnecting={setConnecting}
              onAccountLinked={onAccountLinked}
              showRowWarnings={showRowWarnings}
              forceShowStartingBalance={forceShowStartingBalance}
              hideStartingBalance={hideStartingBalance} hideAccountPicker={hideAccountPicker} hideCreateNew={hideCreateNew} readOnly={readOnly}
              overflowMessage={overflowMessageFor(section.row.id)}
              theme="ledger"
              dotColor={dotColorFor(section.row.id)}
              persona={persona}
              startingBalanceRoomInfo={startingBalanceRoomById[section.row.id]}
            />
          )
        )}
        <style jsx>{`
          .pp-ledger-add:hover {
            border-color: #4E22B8;
            background: #F4EEFF;
          }
          .pp-cap-details summary {
            list-style: none;
            cursor: pointer;
          }
          .pp-cap-details summary::-webkit-details-marker {
            display: none;
          }
          .pp-cap-details summary::marker {
            content: "";
          }
          .pp-cap-details[open] .pp-cap-chevron {
            transform: rotate(45deg);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <details className="text-xs text-neutral-500 leading-relaxed">
        <summary className="cursor-pointer font-medium text-neutral-600">What&apos;s a cap?</summary>
        <p className="mt-2 mb-3">
          Once a category reaches a limit, PrioritySave resets that category to 0%. Other categories automatically increase accordingly to absorb the percentage that was allocated to that category. A Monthly Category Cap resets each month. A Total
          Category Cap only turns the split back on if a withdrawal brings the category below its cap.
        </p>
        <CapExplainer />
      </details>
      {samplePie && (
        <SplitPreviewPie
          rows={percentSections(percent).flatMap((x) => (x.type === "group" ? x.rows : [x.row]))}
          colorFor={(id) => {
            const ids = percentSections(percent).flatMap((x) => (x.type === "group" ? x.rows.map((r) => r.id) : [x.row.id]));
            return BLOOM_DOT_COLORS[Math.max(0, ids.indexOf(id)) % BLOOM_DOT_COLORS.length];
          }}
        />
      )}
      {typeof totalPct === "number" && (
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Allocated</span>
          <span className="text-3xl font-bold text-emerald-700 font-mono">{totalPct}%</span>
        </div>
      )}
      {flattenSelfEmployedRetirement(percentSections(percent)).map((section) =>
        section.type === "group" ? (
          <div key={section.group} className="border border-neutral-200 rounded-xl p-3 bg-neutral-50">
            <div className="flex items-center justify-between mb-2 px-0.5">
              <span className="text-sm font-semibold">{section.group}</span>
              <span className="text-xs font-mono text-neutral-500">{groupPctTotal(section.rows)}% total</span>
            </div>
            {section.group.startsWith("Retirement") &&
              !(hideSoloRetirementNote && retirementGroupSubtext(persona, section.group) === RETIREMENT_GROUP_SUBTEXT) && (
              <p className="text-[11px] text-neutral-500 leading-snug mb-2 px-0.5">{retirementGroupSubtext(persona, section.group)}</p>
            )}
            <div className="space-y-2">
              {section.rows.map((rule) => (
                <PercentRow
                  key={rule.id}
                  rule={rule}
                  accounts={accounts}
                  onUpdate={onUpdatePercent}
                  onRemove={onRemoveRow}
                  creating={creating}
                  setCreating={setCreating}
                  connecting={connecting}
                  setConnecting={setConnecting}
                  onAccountLinked={onAccountLinked}
                  showRowWarnings={showRowWarnings}
                  forceShowStartingBalance={forceShowStartingBalance}
                  hideStartingBalance={hideStartingBalance} hideAccountPicker={hideAccountPicker} hideCreateNew={hideCreateNew} readOnly={readOnly}
                  overflowMessage={overflowMessageFor(rule.id)}
                  persona={persona}
                />
              ))}
            </div>
            <button
              onClick={() => onAddSubAccount(section.group)}
              className="mt-2 w-full text-xs font-medium text-emerald-700 border border-dashed border-emerald-300 rounded-lg py-1.5 flex items-center justify-center gap-1"
            >
              <Plus size={12} /> Add {section.group.startsWith("Retirement") ? "a retirement account" : "an investment account"}
            </button>
          </div>
        ) : (
          <PercentRow
            key={section.row.id}
            rule={section.row}
            accounts={accounts}
            onUpdate={onUpdatePercent}
            onRemove={onRemoveRow}
            creating={creating}
            setCreating={setCreating}
            connecting={connecting}
            setConnecting={setConnecting}
            onAccountLinked={onAccountLinked}
            showRowWarnings={showRowWarnings}
            forceShowStartingBalance={forceShowStartingBalance}
            hideStartingBalance={hideStartingBalance} hideAccountPicker={hideAccountPicker} hideCreateNew={hideCreateNew} readOnly={readOnly}
            overflowMessage={overflowMessageFor(section.row.id)}
            persona={persona}
          />
        )
      )}
    </div>
  );
}
