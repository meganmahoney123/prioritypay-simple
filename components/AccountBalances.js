"use client";

import { useMemo } from "react";
import { Card, currency } from "./ui";
import { bloomAccentCardStyle } from "@/lib/bloomTheme";
import { percentSections } from "@/lib/allocations";
import CategoryDistributionSection from "./CategoryDistributionSection";

// Plain account-balance card, no split-category info -- used for accounts
// that aren't assigned as the destination of any split-rule category at
// all (most commonly the checking/deposit account a paycheck actually
// lands in, which is a *source* for splits, not a destination). Without
// this box, an account like that never appeared anywhere on the
// dashboard even though its balance is tracked correctly -- see
// UnassignedAccountsBox below.
function PlainAccountCard({ acc }) {
  return (
    <div style={{ border: "1px solid var(--color-divider)", borderRadius: "var(--radius-md)", background: "var(--color-neutral-100)", padding: "18px 20px" }}>
      <div className="flex items-baseline gap-2.5 flex-wrap mb-1">
        <span style={{ fontFamily: "var(--font-heading)", fontSize: 18 }}>{acc.institution_name} {acc.account_name}</span>
        <span className="text-xs" style={{ color: "var(--color-neutral-700)" }}>•••• {acc.mask}</span>
      </div>
      <div className="font-mono" style={{ fontFamily: "var(--font-heading)", fontSize: 30, margin: "12px 0 0" }}>
        {acc.current_balance === null || acc.current_balance === undefined ? "—" : currency(acc.current_balance)}
      </div>
    </div>
  );
}

// Every connected account is assigned to at least one split-rule category
// EXCEPT the account a deposit actually lands in, which is usually left
// unassigned on purpose (it's the source, not a destination). Those
// accounts don't appear in OtherAccountsBox below (which only renders
// accounts referenced by a split-rule row) -- so without this box, a
// connected account with zero category assignments was invisible on the
// dashboard even though its balance was tracked correctly. (The old
// Retirement/Investments account-boxes section was removed per request --
// that detail now lives on the Accounts tab instead.)
function UnassignedAccountsBox({ accounts, assignedAccountIds }) {
  const unassigned = accounts.filter((a) => !assignedAccountIds.has(a.id));
  if (!unassigned.length) return null;
  return (
    <Card className="p-6">
      <div
        style={{
          fontFamily: "var(--font-heading)", fontSize: 13, letterSpacing: "0.2em", textTransform: "uppercase",
          color: "var(--color-neutral-700)", paddingBottom: 20,
          borderBottom: "1px solid var(--color-divider)", marginBottom: 20,
        }}
      >
        Checking &amp; other accounts
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {unassigned.map((acc) => <PlainAccountCard key={acc.id} acc={acc} />)}
      </div>
    </Card>
  );
}

// Account-centric (not category-centric) -- one card per physical account
// that isn't already shown in the Retirement or Investments boxes above,
// listing every category that lands there (a Tax Reserve and a Savings
// row can share one account) alongside each category's own YTD/MTD.
function OtherAccountsBox({ accounts, flatRows, ytdByLabel, mtdByLabel }) {
  const byAccount = useMemo(() => {
    const map = {};
    flatRows.forEach((r) => {
      if (!r.accountId) return;
      (map[r.accountId] ||= []).push(r);
    });
    return map;
  }, [flatRows]);

  const usedAccounts = accounts.filter((a) => byAccount[a.id]?.length);

  return (
    <Card className="p-6">
      <div
        style={{
          fontFamily: "var(--font-heading)", fontSize: 13, letterSpacing: "0.2em", textTransform: "uppercase",
          color: "var(--color-neutral-700)", paddingBottom: 20,
          borderBottom: "1px solid var(--color-divider)", marginBottom: usedAccounts.length ? 20 : 0,
        }}
      >
        Other connected accounts
      </div>
      {!usedAccounts.length && (
        <p className="text-sm" style={{ color: "var(--color-neutral-700)", paddingTop: 16, margin: 0 }}>
          Any account connected for a category like Business Expenses (OPEX) or Savings will show up here, with its
          balance and how much has landed there this year.
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {usedAccounts.map((acc) => (
          <div key={acc.id} style={{ border: "1px solid var(--color-divider)", borderRadius: "var(--radius-md)", background: "var(--color-neutral-100)", padding: "18px 20px" }}>
            <div className="flex items-baseline gap-2.5 flex-wrap mb-1">
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 18 }}>{acc.institution_name} {acc.account_name}</span>
              <span className="text-xs" style={{ color: "var(--color-neutral-700)" }}>•••• {acc.mask}</span>
            </div>
            <div className="font-mono" style={{ fontFamily: "var(--font-heading)", fontSize: 30, margin: "12px 0 16px" }}>
              {acc.current_balance === null || acc.current_balance === undefined ? "—" : currency(acc.current_balance)}
            </div>
            <div className="space-y-1" style={{ borderTop: "1px solid var(--color-divider)", paddingTop: 12 }}>
              {byAccount[acc.id].map((r) => (
                <div key={r.id} className="flex justify-between gap-2 text-xs" style={{ color: "var(--color-neutral-700)" }}>
                  <span className="truncate">{r.label}</span>
                  <span className="font-mono shrink-0" style={{ color: "var(--color-accent-700)" }}>{currency(ytdByLabel[r.label] || 0)} this year</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// Replaces the old flat account grid -- groups every percent-split
// category the same way the Investments/Retirement editor does (see
// PercentSplitEditor + percentSections), so the Dashboard reads as "here's
// what's actually happened with my money" rather than a raw account list.
// `mtdByLabel`/`ytdByLabel`/`allTimeTotal` are fetched by the Dashboard
// page (see app/(app)/dashboard/page.js) from the allocations history API
// and passed down -- this component stays purely presentational.
export default function AccountBalances({ accounts, splitRules, mtdByLabel = {}, ytdByLabel = {}, allTimeTotal = 0, rules = [], belowDistribution = null }) {
  const accountsById = useMemo(() => Object.fromEntries((accounts || []).map((a) => [a.id, a])), [accounts]);

  const sections = useMemo(() => percentSections(splitRules?.percent || []), [splitRules]);
  const retirementRows = sections.find((s) => s.type === "group" && s.group === "Retirement")?.rows || [];
  const investmentRows = sections.find((s) => s.type === "group" && s.group === "Investments")?.rows || [];
  const flatRows = sections.filter((s) => s.type === "row").map((s) => s.row);

  // Union of every account referenced by ANY split-rule row (retirement,
  // investment, or flat/other) -- anything not in this set has no split
  // category pointed at it (typically the checking account a deposit
  // lands in) and needs UnassignedAccountsBox below to be visible at all.
  const assignedAccountIds = useMemo(() => {
    const ids = new Set();
    [...retirementRows, ...investmentRows, ...flatRows].forEach((r) => {
      if (r.accountId) ids.add(r.accountId);
    });
    return ids;
  }, [retirementRows, investmentRows, flatRows]);

  // Dashboard preview: even with nothing connected yet, render every box
  // with its normal layout and "Not connected yet" / placeholder rows
  // (each row already handles a missing account -- see CategoryRow below)
  // instead of hiding the whole section, so people can see what the
  // dashboard will look like once accounts are linked and deposits split.
  return (
    <div className="space-y-6">
      <Card
        style={bloomAccentCardStyle({
          padding: "clamp(26px, 3.5vw, 40px)",
          borderRadius: "var(--radius-lg)",
          background: "var(--color-accent-800)",
          border: "none",
          color: "#fff",
        })}
      >
        <div
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: 12,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--color-accent-400)",
            marginBottom: 14,
          }}
        >
          Total saved since joining PriorityPay
        </div>
        <div
          className="font-mono"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(40px, 6vw, 68px)",
            lineHeight: 1,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "#fff",
          }}
        >
          {currency(allTimeTotal)}
        </div>
        <div style={{ fontFamily: "var(--font-heading)", fontSize: 17, fontStyle: "italic", color: "#fff", opacity: 0.85, marginTop: 16 }}>
          Every dollar PriorityPay has calculated and confirmed out of a deposit, ever.
        </div>
      </Card>

      <CategoryDistributionSection />

      {belowDistribution}
    </div>
  );
}
