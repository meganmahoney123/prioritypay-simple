"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import Link from "next/link";
import { currency } from "@/components/ui";
import { bloomWarningCardStyle, bloomGhostButtonStyle, bloomNoticeCardStyle } from "@/lib/bloomTheme";
import { colorForLabel } from "@/lib/allocations";

// Matches the approved AccountsADesktop.dc.html mockup's Unallocated
// slice exactly (#E8E8EC) -- this used to be a tan/beige (#D9D3C7) that
// didn't match the mockup's cool light gray at all.
const UNALLOCATED_COLOR = "#E8E8EC";

// Shown inline under an overdrawn category (rawBalance < 0 -- a withdrawal
// spent more than that category had). Per spec, the pie/line item already
// clamp that category to $0 / 0%; this is where the person answers "where
// did the extra money come from" -- either another category (from ANY
// connected account, not just this one -- money moving between categories
// doesn't require they share a bank account, debited by the same amount
// via POST /api/allocations/category-transfer) or unallocated cash
// already sitting in THIS account (which actually moves too -- it credits
// the category and Unallocated visibly shrinks by the same amount on the
// next fetch, since Unallocated is just accountBalance minus whatever's
// categorized).
function FundingSourcePrompt({ category, otherCategories, onResolved }) {
  const [source, setSource] = useState("unallocated");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/allocations/category-transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toLabel: category.label,
        fromLabel: source === "unallocated" ? null : source,
        amount: category.overdrawnBy,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok || data.error) {
      setError(data.error || "Couldn't save that.");
      return;
    }
    onResolved();
  };

  // Group by account so it's clear which bank account each option would
  // actually pull from -- money can move across accounts, but the person
  // should know that's what's happening, not assume it's staying local.
  const byAccount = {};
  otherCategories.forEach((c) => {
    const key = c.accountLabel || "Not linked to an account";
    (byAccount[key] ||= []).push(c);
  });

  return (
    <div className="mt-2 p-2.5" style={{ ...bloomWarningCardStyle(), borderRadius: "var(--radius-sm)" }}>
      <p className="text-xs font-semibold mb-1.5">
        {category.label} is overdrawn by {currency(category.overdrawnBy)}. Where did the extra money come from?
      </p>
      <select
        value={source}
        onChange={(e) => setSource(e.target.value)}
        className="text-xs w-full mb-1.5"
        style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--color-divider)", padding: "6px 8px", background: "#fff", color: "var(--color-text)" }}
      >
        <option value="unallocated">Unallocated cash in this account</option>
        {Object.entries(byAccount).map(([accountLabel, cats]) => (
          <optgroup key={accountLabel} label={accountLabel}>
            {cats.map((c) => (
              <option key={c.label} value={c.label}>{c.label}</option>
            ))}
          </optgroup>
        ))}
      </select>
      {error && <p className="text-xs mb-1.5" style={{ color: "#9C3B22" }}>{error}</p>}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="text-xs"
          style={bloomGhostButtonStyle({ padding: "6px 12px", fontSize: 12, opacity: saving ? 0.6 : 1 })}
        >
          {saving ? "Saving…" : "Confirm"}
        </button>
        <span className="text-[11px]" style={{ color: "var(--color-neutral-700)" }}>
          Money came from an account you haven&apos;t connected yet?{" "}
          <a href="#connect" style={{ color: "var(--color-accent-700)", fontWeight: 600 }}>Connect it above</a> first,
          then come back to this.
        </span>
      </div>
    </div>
  );
}

// Small "what's inside this account" pie chart, rendered inside each
// account's existing Card on the Accounts page (app/(app)/accounts/
// page.js) -- one chart per connected account, breaking that account's
// REAL current balance down by every split-rule category linked to it
// (see simple_split_rules_percent.account_id), plus an "Unallocated"
// slice for whatever's sitting in the account that no category has
// claimed. Two accounts can each hold several categories (a savings
// account with both a Maintenance fund and a Wedding fund) -- all of them
// show up here as separate slices/line items, each with its own $ amount
// and % of the account. A category spent past zero still appears, but
// clamped to $0 / 0% (see account-balances route), with a prompt below it
// to record where the extra money came from.
//
// Data for every account is fetched ONCE at the page level from
// /api/allocations/account-balances and passed down per-account as
// `data`, rather than each instance of this component fetching for
// itself -- avoids N duplicate requests for N accounts. Renders nothing
// if this account has no linked categories (data is undefined/null), same
// as the parent already handles.
export default function AccountCategoryBreakdown({ accountId, data, allCategories = [], onChanged }) {
  const [resolvingLabel, setResolvingLabel] = useState(null);
  
  if (!data) return null;

  const {
    categories: rawCategories,
    totalBalance,
    uncategorizedCount,
    unallocated,
    unallocatedPct,
    accountBalance,
    overCategorizedBy,
    overCategorizedByInTransit = 0,
    overCategorizedByUnexplained = overCategorizedBy,
    isMarketBased,
  } = data;
  const categories = rawCategories || [];

  // Always derive from the label (see lib/allocations.js's colorForLabel),
  // never c.color -- that DB column can hold a color assigned before the
  // all-purple ("Bloom") redesign, which would otherwise still win and
  // show up as a stray gray/teal/orange slice here. Hashing the label
  // (rather than this account's own local index) also keeps a category's
  // color identical to how it's shown on the Dashboard's pie, which
  // fetches from a different endpoint with no guaranteed shared ordering.
  const pieData = categories.map((c) => ({
    name: c.label,
    value: c.balance,
    pct: c.pct,
    color: colorForLabel(c.label),
  }));
  if (unallocated > 0) {
    pieData.push({ name: "Unallocated", value: unallocated, pct: unallocatedPct, color: UNALLOCATED_COLOR });
  }
  // An account with zero linked categories and a $0 (or null) real balance
  // would otherwise leave pieData empty -- always show a full "Unallocated"
  // ring instead of rendering nothing, per spec: no account should ever be
  // chartless.
  if (pieData.length === 0) {
    pieData.push({ name: "Unallocated", value: 1, pct: 100, color: UNALLOCATED_COLOR });
  }

  return (
    <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--color-divider)" }}>
      {/* Pie + legend side by side at every width, not just sm: and up --
          per the approved mobile mockup's "Chase Checking" card, the
          legend sits beside the donut on phones too, not stacked below
          it. The warning/discrepancy banner below this grid is unaffected
          and still spans full width underneath either way. */}
      <div className="grid grid-cols-2 gap-3 items-center">
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              {/* Animation off to match MoneyDistributionChart/
                  SpendDistributionChart -- avoids the same class of
                  enter-animation/re-render race those charts already
                  work around. */}
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius={32}
                outerRadius={52}
                paddingAngle={2}
                isAnimationActive={false}
                // Percentage right on the slice (not just the legend) --
                // skip labeling slivers under 6% so text doesn't overlap
                // itself on a crowded chart.
                label={({ pct }) => (pct >= 6 ? `${pct}%` : "")}
                labelLine={false}
                fontSize={9}
                fontWeight={700}
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              {/* Opaque background -- Recharts' default tooltip is
                  semi-transparent, which is hard to read over a busy
                  donut. Same fix as CategoryDistributionSection's pie. */}
              <Tooltip
                formatter={(v, n, p) => [`${currency(v)} (${p.payload.pct}%)`, n]}
                contentStyle={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-divider)",
                  borderRadius: "var(--radius-sm)",
                  opacity: 1,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5 pb-1.5 border-b" style={{ borderColor: "var(--color-divider)" }}>
            <span className="font-semibold" style={{ color: "var(--color-neutral-700)" }}>
              {accountBalance === null ? "Categorized here" : "Account balance"}
            </span>
            <span className="font-bold font-mono">{currency(accountBalance === null ? totalBalance : accountBalance)}</span>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
            {pieData.map((c) => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="truncate" style={{ color: "var(--color-neutral-700)" }}>{c.name}</span>
                </div>
                <span className="font-semibold shrink-0 font-mono">
                  {currency(c.value)}
                  <span className="text-neutral-400 font-normal ml-1">({c.pct}%)</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {overCategorizedBy > 0 && isMarketBased && (
        // Investment/retirement accounts fluctuate with the market, so
        // "categorized more than the real balance" here almost always
        // means real performance (or a withdrawal made outside
        // PrioritySave), not a bookkeeping mistake -- there's nothing to
        // "find," so this skips the Find the discrepancy breakdown
        // entirely and just explains what the two numbers mean.
        <div className="text-xs mt-2 p-2" style={bloomWarningCardStyle()}>
          Investment accounts may show a higher contribution amount than total balance due to market fluctuations.
        </div>
      )}

      {/* Split into two cases so a routine ACH lag doesn't read like a
          bookkeeping problem: if the whole gap is explained by a transfer
          that's already confirmed but hasn't posted to the real account
          yet, that's expected and temporary -- a calm note, no "find the
          discrepancy" prompt (there's nothing to find, it's just in
          transit). Only the leftover, unexplained amount gets the
          original alarming treatment. */}
      {overCategorizedByUnexplained <= 0 && overCategorizedByInTransit > 0 && !isMarketBased && (
        <div className="text-xs mt-2 p-2" style={bloomNoticeCardStyle()}>
          Still catching up: {currency(overCategorizedByInTransit)} of what&apos;s categorized here is a transfer
          you&apos;ve already sent that hasn&apos;t posted to the bank yet. Nothing to do, this clears itself up
          once it lands (usually 1-3 business days).
        </div>
      )}

      {overCategorizedByUnexplained > 0 && !isMarketBased && (
        // Deliberately calm (purple notice, one sentence, one link). The
        // usual cause is a starting balance typed in too high, so that's
        // where the link goes.
        <div className="text-xs mt-2 p-3" style={{ ...bloomNoticeCardStyle(), lineHeight: 1.55 }}>
          Your category totals ({currency(totalBalance)}) are {currency(overCategorizedByUnexplained)} higher than
          what&apos;s in this account ({currency(accountBalance)}). That&apos;s usually a starting balance that&apos;s a
          little high, or money spent that hasn&apos;t been recorded.{" "}
          <Link href="/splits" className="underline font-semibold">Review starting balances</Link>
        </div>
      )}

      {categories
        .filter((c) => c.overdrawnBy > 0 && resolvingLabel !== c.label)
        .map((c) => (
          <div key={c.label} className="text-xs mt-2 p-2 flex items-center justify-between gap-2" style={bloomWarningCardStyle()}>
            <span>
              <span style={{ fontWeight: 600 }}>{c.label}</span> is overdrawn by {currency(c.overdrawnBy)}.
            </span>
            <button
              type="button"
              onClick={() => setResolvingLabel(c.label)}
              className="text-xs underline shrink-0"
              style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}
            >
              Where additional money came from
            </button>
          </div>
        ))}

      {categories
        .filter((c) => c.label === resolvingLabel)
        .map((c) => (
          <FundingSourcePrompt
            key={c.label}
            category={c}
            otherCategories={allCategories.filter((o) => o.label !== c.label)}
            onResolved={() => {
              setResolvingLabel(null);
              if (onChanged) onChanged();
            }}
          />
        ))}

      {uncategorizedCount > 0 && (
        <Link href="/closeout" className="block text-xs mt-2 p-2" style={bloomWarningCardStyle()}>
          <span style={{ fontWeight: 600 }}>Warning:</span> {uncategorizedCount} transaction{uncategorizedCount === 1 ? "" : "s"} from
          this account haven&apos;t been categorized yet in Close Out, this chart may be out of date.
        </Link>
      )}
    </div>
  );
}
