"use client";

import { Plus, Trash2, AlertTriangle } from "lucide-react";
import AccountSelect from "./AccountSelect";
import PlaidLinkButton from "./PlaidLinkButton";
import CreateSubAccountFlow from "./CreateSubAccountFlow";
import RetirementNote from "./RetirementNote";
import { percentSections, groupPctTotal, connectSavingsOnly, RETIREMENT_GROUP_SUBTEXT } from "@/lib/allocations";

// One row of the percent-split editor -- a flat category (Tax Reserve,
// Emergency Fund, OPEX, Savings, anything a person adds) or a sub-account
// inside a group (Investments, Retirement). `canRemove` is only passed
// true for group sub-accounts -- flat rows have no delete control here.
function PercentRow({ rule, accounts, onUpdate, onRemove, canRemove, creating, setCreating, connecting, setConnecting, onAccountLinked, showRowWarnings }) {
  return (
    <div className="border border-neutral-200 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: rule.color }} />
        <input
          value={rule.label}
          onChange={(e) => onUpdate(rule.id, { label: e.target.value })}
          className="text-sm font-medium flex-1 min-w-0 bg-transparent border-none focus:outline-none focus:underline"
        />
        <input
          type="number"
          min={0}
          max={100}
          value={rule.pct}
          onChange={(e) => onUpdate(rule.id, { pct: Number(e.target.value) })}
          className="w-14 text-sm border border-neutral-200 rounded-lg px-2 py-1 font-mono text-center"
        />
        <span className="text-xs text-neutral-500">%</span>
        {canRemove && (
          <button onClick={() => onRemove(rule.id)} className="text-neutral-400 hover:text-red-600 shrink-0">
            <Trash2 size={14} />
          </button>
        )}
      </div>
      {rule.retirementType || rule.group === "Retirement" ? <RetirementNote label={rule.label} /> : null}
      <div className="mt-2">
        <AccountSelect
          value={rule.accountId}
          onChange={(v) => onUpdate(rule.id, { accountId: v })}
          accounts={accounts}
          onCreateNew={() => setCreating((prev) => ({ ...prev, [rule.id]: true }))}
          onConnectAnother={() => setConnecting((prev) => ({ ...prev, [rule.id]: true }))}
          recommendCreate={false}
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
            No account connected yet -- until you connect one, this {rule.pct}% won&apos;t be routed anywhere and
            stays wherever the deposit landed.
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
export default function PercentSplitEditor({
  percent,
  accounts,
  onUpdatePercent,
  onAddSubAccount,
  onRemoveSubAccount,
  onAccountLinked,
  creating,
  setCreating,
  connecting,
  setConnecting,
  showRowWarnings = true,
}) {
  return (
    <div className="space-y-3">
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
                  onRemove={(id) => onRemoveSubAccount(section.group, id)}
                  canRemove={section.rows.length > 1}
                  creating={creating}
                  setCreating={setCreating}
                  connecting={connecting}
                  setConnecting={setConnecting}
                  onAccountLinked={onAccountLinked}
                  showRowWarnings={showRowWarnings}
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
            canRemove={false}
            creating={creating}
            setCreating={setCreating}
            connecting={connecting}
            setConnecting={setConnecting}
            onAccountLinked={onAccountLinked}
            showRowWarnings={showRowWarnings}
          />
        )
      )}
    </div>
  );
}
