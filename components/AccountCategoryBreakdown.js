"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import Link from "next/link";
import { currency } from "@/components/ui";
import { bloomWarningCardStyle, bloomGhostButtonStyle } from "@/lib/bloomTheme";

// Same fallback palette family as MoneyDistributionChart/
// SpendDistributionChart, kept as its own copy on purpose (see those
// files) so this chart can diverge visually later without affecting them.
const FALLBACK_PALETTE = ["#2E8B78", "#1F5F4F", "#164536", "#5FB59F", "#A6D9CB"];
const UNALLOCATED_COLOR = "#D9D3C7";

function formatCloseoutDate(iso) {
  if (!iso) return "not yet closed out";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function formatShortDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// The two ingredients that can push a category's ledger balance ahead of
// what's really in the bank: a starting balance entered too high when the
// category was created, and a one-time manual contribution/transfer not
// backed by a real ACH move (see lib/categoryRoom.js -- both are guarded
// against NEW writes now, but a category set up before that guard existed
// can still be carrying old drift). Real transfer_allocations dollars are
// excluded from this score since those are tied to an actual settled
// Dwolla transfer and can't be the cause. Used only to rank which
// category to point at first in the discrepancy breakdown below.
function likelyCauseScore(breakdown) {
  if (!breakdown) return 0;
  return Math.max(0, breakdown.startingBalance || 0) + Math.max(0, breakdown.manualContributions || 0);
}

// Expandable, per-category breakdown of WHY an account's categorized
// total exceeds its real balance -- shown when the person clicks "Find
// the discrepancy" under the warning banner below. Categories are ranked
// by likelyCauseScore so the most probable culprit (usually a starting
// balance set too high, or an untethered one-time contribution) surfaces
// first instead of making the person scan every category themselves.
function DiscrepancyBreakdown({ categories }) {
  const ranked = [...categories]
    .filter((c) => c.breakdown)
    .sort((a, b) => likelyCauseScore(b.breakdown) - likelyCauseScore(a.breakdown));

  return (
    <div className="mt-2 space-y-2">
      {ranked.map((c, i) => {
        const b = c.breakdown;
        const isTopSuspect = i === 0 && likelyCauseScore(b) > 0;
        return (
          <div
            key={c.label}
            className="p-2.5 text-xs"
            style={{
              background: "#fff",
              borderRadius: "var(--radius-sm)",
              border: isTopSuspect ? "1px solid #C9713F" : "1px solid var(--color-divider)",
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold">{c.label}</span>
              {isTopSuspect && (
                <span style={{ color: "#9C3B22", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Most likely
                </span>
              )}
            </div>
            <div className="flex justify-between" style={{ color: "var(--color-neutral-700)" }}>
              <span>Starting balance (entered by hand)</span>
              <span className="font-mono">{currency(b.startingBalance)}</span>
            </div>
            <div className="flex justify-between" style={{ color: "var(--color-neutral-700)" }}>
              <span>Real transfers in (settled ACH)</span>
              <span className="font-mono">{currency(b.transferAllocations)}</span>
            </div>
            <div className="flex justify-between" style={{ color: "var(--color-neutral-700)" }}>
              <span>One-time contributions / transfers</span>
              <span className="font-mono">{currency(b.manualContributions)}</span>
            </div>
            <div className="flex justify-between" style={{ color: "var(--color-neutral-700)" }}>
              <span>Withdrawals recorded</span>
              <span className="font-mono">-{currency(b.withdrawals)}</span>
            </div>
            {b.recentManual?.length > 0 && (
              <div className="mt-1.5 pt-1.5" style={{ borderTop: "1px solid var(--color-divider)", color: "var(--color-neutral-700)" }}>
                Recent one-time entries:{" "}
                {b.recentManual
                  .map((m) => `${currency(m.amount)} on ${formatShortDate(m.occurredAt)}${m.note ? ` (${m.note})` : ""}`)
                  .join(", ")}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

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
  const [showDiscrepancy, setShowDiscrepancy] = useState(false);

  if (!data) return null;

  const { categories: rawCategories, totalBalance, lastCloseoutAt, uncategorizedCount, unallocated, unallocatedPct, accountBalance, overCategorizedBy, isMarketBased } = data;
  const categories = rawCategories || [];

  const pieData = categories.map((c, i) => ({
    name: c.label,
    value: c.balance,
    pct: c.pct,
    color: FALLBACK_PALETTE[i % FALLBACK_PALETTE.length],
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
        <div className="h-32">
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
                innerRadius={28}
                outerRadius={44}
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
              <Tooltip formatter={(v, n, p) => [`${currency(v)} (${p.payload.pct}%)`, n]} />
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
        // PriorityPay), not a bookkeeping mistake -- there's nothing to
        // "find," so this skips the Find the discrepancy breakdown
        // entirely and just explains what the two numbers mean.
        <div className="text-xs mt-2 p-2" style={bloomWarningCardStyle()}>
          Investment accounts may show a higher contribution amount than total balance due to market fluctuations.
        </div>
      )}

      {overCategorizedBy > 0 && !isMarketBased && (
        <div className="text-xs mt-2 p-2" style={bloomWarningCardStyle()}>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span>
              Categories here add up to {currency(overCategorizedBy)} more than this account&apos;s real balance
              ({currency(accountBalance)}) -- percentages above are shown against the categorized total instead so
              nothing reads over 100%, but a category balance is out of sync with the bank.
            </span>
            <button
              type="button"
              onClick={() => setShowDiscrepancy((v) => !v)}
              className="underline shrink-0"
              style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontWeight: 600 }}
            >
              {showDiscrepancy ? "Hide breakdown" : "Find the discrepancy"}
            </button>
          </div>
          {showDiscrepancy && <DiscrepancyBreakdown categories={categories} />}
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

      <p className="text-xs mt-2" style={{ color: "var(--color-neutral-700)" }}>
        As of your last close-out ({formatCloseoutDate(lastCloseoutAt)}).
      </p>
      {uncategorizedCount > 0 && (
        <Link href="/closeout" className="block text-xs mt-2 p-2" style={bloomWarningCardStyle()}>
          <span style={{ fontWeight: 600 }}>Warning:</span> {uncategorizedCount} transaction{uncategorizedCount === 1 ? "" : "s"} from
          this account haven&apos;t been categorized yet in Close Out — this chart may be out of date.
        </Link>
      )}
    </div>
  );
}
