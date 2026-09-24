"use client";

import { useState } from "react";
import { Plus, Trash2, AlertTriangle, Pencil, Link2 } from "lucide-react";
import AccountSelect from "./AccountSelect";
import PlaidLinkButton from "./PlaidLinkButton";
import CreateSubAccountFlow from "./CreateSubAccountFlow";
import RetirementNote from "./RetirementNote";
import EmployerCheckEmailModal from "./EmployerCheckEmailModal";
import { percentSections, groupPctTotal, connectSavingsOnly, retirementGroupSubtext, isCoreRow, isEmployerRetirementRow, roundPct, currency, computeStartingBalanceRoom } from "@/lib/allocations";
import { bloomWarningCardStyle } from "@/lib/bloomTheme";

// Purple ramp used for each row's colour dot in the Bloom-styled ("ledger"
// theme prop) editor -- replaces the old per-row hex values from
// CATEGORY_COLORS (still used unchanged by lib/allocations.js and any
// not-yet-restyled surface) with a fixed purple progression assigned by a
// row's position, so restyling this component never has to touch that
// shared data file.
const BLOOM_DOT_COLORS = ["#D9C9FF", "#C4A9FA", "#9A72F0", "#6D3BE0", "#4E22B8", "#3B1C7A", "#2A1550"];

// A single optional dollar cap control -- rendered twice per flat row (see
// PercentRow below), once for the monthly cap and once for the account-
// balance cap (see computeAllocations in lib/allocations.js for how each
// actually behaves once set). The dropdown is the only way to clear a cap
// back to "None". Picking "Set a limit" starts the number field EMPTY
// (rather than pre-filled with a "1" someone has to notice and delete
// before they can type their own number) -- the field only ever accepts
// numbers greater than 0 while typing, and settles back to the $1 floor
// on blur if it's left empty, so whatever actually gets saved is still
// always either exactly `null` (no cap) or a real positive dollar amount
// (see settleCaps in lib/allocations.js, which enforces this one more
// time right before anything is sent to the server, in case a value is
// still mid-edit at that moment).
function CapField({ label, hint, value, onChange, theme }) {
  const isSet = value !== null && value !== undefined;
  const clamp = (raw) => {
    if (raw === "") return "";
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 1;
  };
  const settle = (raw) => {
    if (raw === "") return 1;
    const n = Number(raw);
    return !raw || !Number.isFinite(n) || n <= 0 ? 1 : n;
  };

  if (theme === "ledger") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
          {label} <span style={{ fontStyle: "italic" }}>({hint})</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <select
            value={isSet ? "set" : "none"}
            onChange={(e) => onChange(e.target.value === "none" ? null : "")}
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 13,
              color: "var(--color-text)",
              background: "transparent",
              border: 0,
              borderBottom: "1px solid var(--color-divider)",
              borderRadius: 0,
              padding: "3px 4px",
            }}
          >
            <option value="none">None</option>
            <option value="set">Set a limit</option>
          </select>
          {isSet && (
            <span style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 15, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>$</span>
              <input
                type="number"
                onFocus={(e) => e.target.select()}
                min={1}
                step={1}
                value={value}
                onChange={(e) => onChange(clamp(e.target.value))}
                onBlur={(e) => onChange(settle(e.target.value))}
                style={{
                  width: 84,
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
          )}
        </span>
      </div>
    );
  }

  return (
    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
      <span className="text-xs text-neutral-500">{label} ({hint})</span>
      <select
        value={isSet ? "set" : "none"}
        onChange={(e) => onChange(e.target.value === "none" ? null : "")}
        className="text-xs border border-neutral-200 rounded-lg px-1.5 py-1 ml-auto"
      >
        <option value="none">None</option>
        <option value="set">Set a limit</option>
      </select>
      {isSet && (
        <span className="flex items-center gap-1">
          <span className="text-xs text-neutral-500">$</span>
          <input
            type="number"
            onFocus={(e) => e.target.select()}
            min={1}
            step={1}
            value={value}
            onChange={(e) => onChange(clamp(e.target.value))}
            onBlur={(e) => onChange(settle(e.target.value))}
            className="w-20 text-sm border border-neutral-200 rounded-lg px-2 py-1 font-mono text-center"
          />
        </span>
      )}
    </div>
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
function PercentRow({ rule, accounts, onUpdate, onRemove, creating, setCreating, connecting, setConnecting, onAccountLinked, showRowWarnings, overflowMessage, theme, dotColor, forceShowStartingBalance, hideStartingBalance, persona, startingBalanceRoomInfo }) {
  const locked = isCoreRow(rule, persona);
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
  const isGrouped = rule.group === "Investments" || (rule.group || "").startsWith("Retirement");
  // Collapsed by default (Onboarding Pass 2, Aug 2026 handoff) -- caps are
  // an edge case most people never touch, so hiding them behind a toggle
  // is the main density fix for this step. Local to each row's own render
  // rather than lifted to the parent, since nothing outside this row ever
  // needs to know whether its caps panel happens to be open.
  const [showLimits, setShowLimits] = useState(false);
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
      <div style={{ border: "1px solid var(--color-divider)", borderRadius: 22, background: "var(--color-surface)", padding: "18px 20px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "8px 20px" }}>
          {locked ? (
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
            </span>
          ) : (
            <span style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor || "var(--color-accent)", flexShrink: 0 }} />
              <input
                value={rule.label}
                onChange={(e) => onUpdate(rule.id, { label: e.target.value })}
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
                onChange={(e) => onUpdate(rule.id, { pct: Number(e.target.value) })}
                style={{
                  width: 40,
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
            {!locked && (
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
        {overflowMessage && (
          <p style={{ fontSize: 13, lineHeight: 1.6, color: "#9C3B22", margin: "8px 0 0" }}>{overflowMessage}</p>
        )}
        {(rule.retirementType || (rule.group || "").startsWith("Retirement")) && (
          <RetirementNote label={rule.label} theme="ledger" isEmployer={isEmployerRetirementRow(rule)} />
        )}
        {isEmployerRetirementRow(rule) && (
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
        {isEmployerRetirementRow(rule) && (
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
        {showRowWarnings && Number(rule.pct) > 0 && !rule.accountId && (
          <p
            style={{
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
            No account connected yet. Until you connect one, there&apos;s nowhere to send this {rule.pct}% on your
            checklist.
          </p>
        )}
        <div style={{ marginTop: 12, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 12.5, color: "color-mix(in srgb, var(--color-text) 55%, transparent)", marginBottom: 6 }}>
            I want to route my money to this account:
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <AccountSelect
              value={rule.accountId}
              onChange={(v) => onUpdate(rule.id, { accountId: v })}
              accounts={accounts}
              onCreateNew={isEmployerRetirementRow(rule) ? undefined : () => setCreating((prev) => ({ ...prev, [rule.id]: true }))}
              onConnectAnother={() => setConnecting((prev) => ({ ...prev, [rule.id]: true }))}
              recommendCreate={false}
              excludeSubtypes={rule.group === "Investments" ? ["checking"] : undefined}
              theme="ledger"
            />
          </div>
        </div>
        {!isGrouped && (
          <div style={{ marginTop: 4 }}>
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
              {showLimits ? "Hide limits" : "Add monthly or total limits"}
            </button>
            {showLimits && (
              <div style={{ marginTop: 8, background: "#FAF7FD", borderRadius: "var(--radius-sm)", padding: "12px 14px" }}>
                <CapField
                  label="Monthly Cap $"
                  hint="resets automatically each month"
                  value={rule.max}
                  onChange={(v) => onUpdate(rule.id, { max: v })}
                  theme="ledger"
                />
                <CapField
                  label="Account Total Cap $"
                  hint="based on the connected account's balance"
                  value={rule.balanceCap}
                  onChange={(v) => onUpdate(rule.id, { balanceCap: v })}
                  theme="ledger"
                />
              </div>
            )}
          </div>
        )}
        {!hideStartingBalance && (
        <div style={{ marginTop: 4 }}>
          {showStartingBalance ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginTop: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                {forceShowStartingBalance
                  ? "Starting balance for this category (enter 0 if none):"
                  : startingBalanceAccountLabel
                  ? `Already have money saved in ${startingBalanceAccountLabel} for this? Add a Starting Balance:`
                  : "Already have money saved for this? Add a Starting Balance (connect an account below first):"}
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
          {showStartingBalance && startingBalanceRoomInfo?.isOver && (
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
    );
  }

  return (
    <div className="border border-neutral-200 rounded-xl p-3">
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
      {rule.retirementType || (rule.group || "").startsWith("Retirement") ? (
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
          <CapField
            label="Monthly Cap $"
            hint="resets automatically each month"
            value={rule.max}
            onChange={(v) => onUpdate(rule.id, { max: v })}
          />
          <CapField
            label="Account Total Cap $"
            hint="based on the connected account's balance"
            value={rule.balanceCap}
            onChange={(v) => onUpdate(rule.id, { balanceCap: v })}
          />
        </>
      )}
      {!hideStartingBalance && (
      <div className="mt-2">
        {showStartingBalance ? (
          <label className="flex items-center gap-1.5 text-xs text-neutral-500">
            {forceShowStartingBalance
              ? "Starting balance for this category (enter 0 if none):"
              : "Already have money saved for this? Add a Starting Balance:"}
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
      {showRowWarnings && Number(rule.pct) > 0 && !rule.accountId && (
        <div className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
          <AlertTriangle size={12} className="shrink-0 mt-0.5" />
          <span>
            No account connected yet. Until you connect one, there&apos;s nowhere to send this {rule.pct}% on your
            checklist, so it stays wherever the deposit landed.
          </span>
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
          <p style={{ fontSize: 16, lineHeight: 1.7, margin: "12px 0 0" }}>
            Any category below other than Investments or Retirement can have up to two optional caps. A{" "}
            <strong>Monthly Cap</strong> limits how many dollars a category can receive from your deposits in a
            given calendar month. Once it&apos;s hit, that category drops to 0% for the rest of the month and
            resets automatically on the 1st. An <strong>Account Total Cap</strong> instead watches the
            connected account&apos;s own balance. Once that balance reaches the cap, the category drops to 0%
            and stays there until the balance falls back below it (say, from a withdrawal), with no automatic
            monthly reset. Either way, whatever a capped category doesn&apos;t take rises proportionally
            across your other categories instead of going unused.
          </p>
        </details>
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
        {percentSections(percent).map((section) =>
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
                {section.group.startsWith("Retirement") && (
                  <p style={{ fontSize: 14, lineHeight: 1.7, color: "color-mix(in srgb, var(--color-text) 62%, transparent)", margin: "0 0 18px", maxWidth: "40em" }}>
                    {retirementGroupSubtext(persona, section.group)}
                  </p>
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
                      hideStartingBalance={hideStartingBalance}
                      overflowMessage={overflowMessageFor(rule.id)}
                      theme="ledger"
                      dotColor={dotColorFor(rule.id)}
                      persona={persona}
                      startingBalanceRoomInfo={startingBalanceRoomById[rule.id]}
                    />
                  ))}
                </div>
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
              hideStartingBalance={hideStartingBalance}
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
        <p className="mt-2">
          Any category below other than Investments or Retirement can have up to two optional caps. A Monthly
          Cap limits how many dollars a category can receive from your deposits in a given calendar month. Once
          it&apos;s hit, that category drops to 0% for the rest of the month and resets automatically on the
          1st. An Account Total Cap instead watches the connected account&apos;s own balance. Once that balance
          reaches the cap, the category drops to 0% and stays there until the balance falls back below it, with
          no automatic monthly reset. Either way, whatever a capped category doesn&apos;t take rises
          proportionally across your other categories instead of going unused.
        </p>
      </details>
      {typeof totalPct === "number" && (
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Allocated</span>
          <span className="text-3xl font-bold text-emerald-700 font-mono">{totalPct}%</span>
        </div>
      )}
      {percentSections(percent).map((section) =>
        section.type === "group" ? (
          <div key={section.group} className="border border-neutral-200 rounded-xl p-3 bg-neutral-50">
            <div className="flex items-center justify-between mb-2 px-0.5">
              <span className="text-sm font-semibold">{section.group}</span>
              <span className="text-xs font-mono text-neutral-500">{groupPctTotal(section.rows)}% total</span>
            </div>
            {section.group.startsWith("Retirement") && (
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
                  hideStartingBalance={hideStartingBalance}
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
            hideStartingBalance={hideStartingBalance}
            overflowMessage={overflowMessageFor(section.row.id)}
            persona={persona}
          />
        )
      )}
    </div>
  );
}
