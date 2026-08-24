"use client";

import { Plus, Trash2, AlertTriangle, Pencil, Link2 } from "lucide-react";
import AccountSelect from "./AccountSelect";
import PlaidLinkButton from "./PlaidLinkButton";
import CreateSubAccountFlow from "./CreateSubAccountFlow";
import RetirementNote from "./RetirementNote";
import { percentSections, groupPctTotal, connectSavingsOnly, RETIREMENT_GROUP_SUBTEXT, isCoreRow, roundPct } from "@/lib/allocations";

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
function PercentRow({ rule, accounts, onUpdate, onRemove, creating, setCreating, connecting, setConnecting, onAccountLinked, showRowWarnings, overflowMessage, theme }) {
  const locked = isCoreRow(rule);
  // Cap $ (a monthly dollar cap -- see computeAllocations in
  // lib/allocations.js) only applies to flat categories (Tax Reserve,
  // Emergency Fund, OPEX, Savings, anything a person adds themselves).
  // Investments/Retirement sub-accounts don't get one: those buckets are
  // meant to keep receiving their full percentage indefinitely, not stop
  // once some dollar figure is hit.
  const isGrouped = rule.group === "Investments" || rule.group === "Retirement";

  if (theme === "ledger") {
    return (
      <div style={{ border: "1px solid var(--color-divider)", borderRadius: "var(--radius-md)", background: "var(--color-bg)", padding: "18px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
          {locked ? (
            <span style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: "var(--font-heading)", fontSize: 19 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--color-accent)", flexShrink: 0 }} />
              {rule.label}
            </span>
          ) : (
            <span style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--color-accent)", flexShrink: 0 }} />
              <input
                value={rule.label}
                onChange={(e) => onUpdate(rule.id, { label: e.target.value })}
                placeholder="Name this category"
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontFamily: "var(--font-heading)",
                  fontSize: 19,
                  color: "var(--color-text)",
                  background: "transparent",
                  border: 0,
                  borderBottom: "1px solid var(--color-divider)",
                  borderRadius: 0,
                  padding: "3px 2px",
                }}
              />
            </span>
          )}
          <span style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <input
              type="number"
              onFocus={(e) => e.target.select()}
              min={0}
              max={100}
              value={rule.pct}
              onChange={(e) => onUpdate(rule.id, { pct: Number(e.target.value) })}
              style={{
                width: 62,
                textAlign: "right",
                fontFamily: "var(--font-heading)",
                fontSize: 19,
                color: "var(--color-text)",
                background: "transparent",
                border: 0,
                borderBottom: "1px solid var(--color-divider)",
                padding: "4px 4px",
              }}
            />
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 15, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>%</span>
            {!locked && (
              <button
                onClick={() => onRemove(rule.id)}
                title="Delete category"
                style={{ display: "inline-flex", background: "transparent", border: 0, cursor: "pointer", color: "color-mix(in srgb, var(--color-text) 45%, transparent)", padding: 4 }}
              >
                <Trash2 size={15} />
              </button>
            )}
          </span>
        </div>
        {overflowMessage && (
          <p style={{ fontSize: 13, lineHeight: 1.6, color: "#b3261e", margin: "8px 0 0" }}>{overflowMessage}</p>
        )}
        {(rule.retirementType || rule.group === "Retirement") && <RetirementNote label={rule.label} theme="ledger" />}
        {!isGrouped && (
          <>
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
          </>
        )}
        {showRowWarnings && Number(rule.pct) > 0 && !rule.accountId && (
          <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--color-accent-700)", margin: "10px 0 0" }}>
            No account connected yet. Until you connect one, there&apos;s nowhere to send this {rule.pct}% on your
            checklist.
          </p>
        )}
        <div style={{ marginTop: 12 }}>
          <span style={{ display: "block", fontSize: 12.5, color: "color-mix(in srgb, var(--color-text) 55%, transparent)", marginBottom: 6 }}>
            I want to route my money to this account:
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AccountSelect
              value={rule.accountId}
              onChange={(v) => onUpdate(rule.id, { accountId: v })}
              accounts={accounts}
              onCreateNew={() => setCreating((prev) => ({ ...prev, [rule.id]: true }))}
              onConnectAnother={() => setConnecting((prev) => ({ ...prev, [rule.id]: true }))}
              recommendCreate={false}
              excludeSubtypes={rule.group === "Investments" ? ["checking"] : undefined}
              theme="ledger"
            />
          </div>
        </div>
        {connecting[rule.id] && (
          <div style={{ marginTop: 10 }}>
            <PlaidLinkButton
              label="Connect another account"
              savingsOnly={connectSavingsOnly(rule)}
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
                borderRadius: "var(--radius-md)",
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
          onChange={(e) => onUpdate(rule.id, { pct: Number(e.target.value) })}
          className="w-14 text-sm border border-neutral-200 rounded-lg px-2 py-1 font-mono text-center"
        />
        <span className="text-xs text-neutral-500">%</span>
        {!locked && (
          <button onClick={() => onRemove(rule.id)} className="text-neutral-400 hover:text-red-600 shrink-0" title="Delete category">
            <Trash2 size={14} />
          </button>
        )}
      </div>
      {overflowMessage && <p className="text-xs text-red-700 mt-1">{overflowMessage}</p>}
      {rule.retirementType || rule.group === "Retirement" ? <RetirementNote label={rule.label} /> : null}
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
      <div className="mt-2">
        <span className="block text-xs text-neutral-500 mb-1">I want to route my money to this account:</span>
        <AccountSelect
          value={rule.accountId}
          onChange={(v) => onUpdate(rule.id, { accountId: v })}
          accounts={accounts}
          onCreateNew={() => setCreating((prev) => ({ ...prev, [rule.id]: true }))}
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
            savingsOnly={connectSavingsOnly(rule)}
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
}) {
  const overflowMessageFor = (id) => (pctOverflow && pctOverflow.id === id ? pctOverflow.message : null);

  if (theme === "ledger") {
    return (
      <div style={{ display: "grid", gap: 18 }}>
        <details
          className="pp-cap-details"
          style={{
            fontFamily: "var(--font-heading)",
            color: "color-mix(in srgb, var(--color-text) 66%, transparent)",
            borderLeft: "1px solid var(--color-accent-300)",
            paddingLeft: 16,
            margin: 0,
            maxWidth: "40em",
          }}
        >
          <summary
            style={{
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span className="pp-cap-chevron" style={{ display: "inline-block", transition: "transform 0.15s ease" }}>
              &#9656;
            </span>
            What&apos;s a cap?
          </summary>
          <p style={{ fontSize: 14, lineHeight: 1.7, margin: "8px 0 0" }}>
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
        {typeof totalPct === "number" && (
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 20 }}>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
              Allocated
            </span>
            <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 36, color: "var(--color-accent-700)", fontVariantNumeric: "lining-nums tabular-nums" }}>
              {totalPct}%
            </span>
          </div>
        )}
        {percentSections(percent).map((section) =>
          section.type === "group" ? (
            <div
              key={section.group}
              style={{ border: "1px solid var(--color-accent-300)", borderRadius: "var(--radius-lg)", background: "color-mix(in srgb, var(--color-accent) 4%, transparent)", overflow: "hidden" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 20,
                  padding: "16px 22px",
                  borderBottom: "1px solid var(--color-accent-300)",
                  background: "color-mix(in srgb, var(--color-accent) 7%, transparent)",
                }}
              >
                <span style={{ fontFamily: "var(--font-heading)", fontSize: 14, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>
                  {section.group}
                </span>
                <span style={{ fontFamily: "var(--font-heading)", fontSize: 14, letterSpacing: "0.06em", color: "var(--color-accent-700)", fontVariantNumeric: "lining-nums tabular-nums" }}>
                  {groupPctTotal(section.rows)}% total
                </span>
              </div>
              <div style={{ padding: "18px 22px 22px" }}>
                {section.group === "Retirement" && (
                  <p style={{ fontSize: 14, lineHeight: 1.7, color: "color-mix(in srgb, var(--color-text) 62%, transparent)", margin: "0 0 18px", maxWidth: "40em" }}>
                    {RETIREMENT_GROUP_SUBTEXT}
                  </p>
                )}
                <div style={{ display: "grid", gap: 14 }}>
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
                      overflowMessage={overflowMessageFor(rule.id)}
                      theme="ledger"
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
                    border: "1px dashed var(--color-accent-300)",
                    borderRadius: "var(--radius-md)",
                    padding: "11px 16px",
                    cursor: "pointer",
                    fontFamily: "var(--font-heading)",
                    fontSize: 14,
                    letterSpacing: "0.04em",
                    color: "var(--color-accent-700)",
                    whiteSpace: "nowrap",
                  }}
                >
                  + &nbsp;Add {section.group === "Retirement" ? "a retirement account" : "an investment account"}
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
              overflowMessage={overflowMessageFor(section.row.id)}
              theme="ledger"
            />
          )
        )}
        <style jsx>{`
          .pp-ledger-add:hover {
            border-color: var(--color-accent);
            background: color-mix(in srgb, var(--color-accent) 6%, transparent);
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
            transform: rotate(90deg);
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
            {section.group === "Retirement" && (
              <p className="text-[11px] text-neutral-500 leading-snug mb-2 px-0.5">{RETIREMENT_GROUP_SUBTEXT}</p>
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
                  overflowMessage={overflowMessageFor(rule.id)}
                />
              ))}
            </div>
            <button
              onClick={() => onAddSubAccount(section.group)}
              className="mt-2 w-full text-xs font-medium text-emerald-700 border border-dashed border-emerald-300 rounded-lg py-1.5 flex items-center justify-center gap-1"
            >
              <Plus size={12} /> Add {section.group === "Retirement" ? "a retirement account" : "an investment account"}
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
            overflowMessage={overflowMessageFor(section.row.id)}
          />
        )
      )}
    </div>
  );
}
