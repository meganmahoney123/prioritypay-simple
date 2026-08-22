"use client";

import { useMemo } from "react";
import { Card, currency } from "./ui";
import { ledgerAccentCardStyle } from "@/lib/ledgerTheme";
import { percentSections } from "@/lib/allocations";

function accountLabel(acc) {
  if (!acc) return null;
  return `${acc.institution_name} ${acc.account_name} •••• ${acc.mask}`;
}

// One row inside a Retirement/Investments group box -- a single
// sub-account's connected account, live balance, and how much has landed
// there this year / this month. `ytd`/`mtd` are dollars already allocated
// to this row's label (see lib/allocations.js `group` + the Dashboard's
// range-query fetches), not a balance -- a connected account's balance can
// differ from what PriorityPay has tracked if money moves in/out of it
// outside of PriorityPay's own splits.
function CategoryRow({ label, account, ytd, mtd }) {
  return (
    <div className="flex items-center justify-between py-3 gap-3" style={{ borderBottom: "1px solid color-mix(in srgb, var(--color-text) 8%, transparent)" }}>
      <div className="min-w-0">
        <div className="truncate" style={{ fontFamily: "var(--font-heading)", fontSize: 18 }}>{label}</div>
        <div className="text-xs truncate" style={{ color: "color-mix(in srgb, var(--color-text) 52%, transparent)" }}>
          {account ? accountLabel(account) : "Not connected yet"}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="font-mono" style={{ fontFamily: "var(--font-heading)", fontSize: 20 }}>
          {account ? (account.current_balance === null || account.current_balance === undefined ? "—" : currency(account.current_balance)) : "—"}
        </div>
        <div className="text-[11px]" style={{ color: "color-mix(in srgb, var(--color-text) 52%, transparent)" }}>
          {currency(ytd)} this year · {currency(mtd)} this month
        </div>
      </div>
    </div>
  );
}

function GroupBox({ title, rows, accountsById, ytdByLabel, mtdByLabel }) {
  if (!rows.length) return null;
  return (
    <Card className="p-6">
      <div
        style={{
          fontFamily: "var(--font-heading)", fontSize: 13, letterSpacing: "0.2em", textTransform: "uppercase",
          color: "color-mix(in srgb, var(--color-text) 58%, transparent)", paddingBottom: 16,
          borderBottom: "1px solid var(--color-divider)",
        }}
      >
        {title}
      </div>
      <div>
        {rows.map((r) => (
          <CategoryRow
            key={r.id}
            label={r.label}
            account={r.accountId ? accountsById[r.accountId] : null}
            ytd={ytdByLabel[r.label] || 0}
            mtd={mtdByLabel[r.label] || 0}
          />
        ))}
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
          color: "color-mix(in srgb, var(--color-text) 58%, transparent)", paddingBottom: 20,
          borderBottom: "1px solid var(--color-divider)", marginBottom: usedAccounts.length ? 20 : 0,
        }}
      >
        Other connected accounts
      </div>
      {!usedAccounts.length && (
        <p className="text-sm" style={{ color: "color-mix(in srgb, var(--color-text) 52%, transparent)", paddingTop: 16, margin: 0 }}>
          Any account connected for a category like Business Expenses (OPEX) or Savings will show up here, with its
          balance and how much has landed there this year.
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {usedAccounts.map((acc) => (
          <div key={acc.id} style={{ border: "1px solid var(--color-divider)", borderRadius: "var(--radius-md)", background: "var(--color-bg)", padding: "18px 20px" }}>
            <div className="flex items-baseline gap-2.5 flex-wrap mb-1">
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 18 }}>{acc.institution_name} {acc.account_name}</span>
              <span className="text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 48%, transparent)" }}>•••• {acc.mask}</span>
            </div>
            <div className="font-mono" style={{ fontFamily: "var(--font-heading)", fontSize: 30, margin: "12px 0 16px" }}>
              {acc.current_balance === null || acc.current_balance === undefined ? "—" : currency(acc.current_balance)}
            </div>
            <div className="space-y-1" style={{ borderTop: "1px solid var(--color-divider)", paddingTop: 12 }}>
              {byAccount[acc.id].map((r) => (
                <div key={r.id} className="flex justify-between gap-2 text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 60%, transparent)" }}>
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
export default function AccountBalances({ accounts, splitRules, mtdByLabel = {}, ytdByLabel = {}, allTimeTotal = 0 }) {
  const accountsById = useMemo(() => Object.fromEntries((accounts || []).map((a) => [a.id, a])), [accounts]);

  const sections = useMemo(() => percentSections(splitRules?.percent || []), [splitRules]);
  const retirementRows = sections.find((s) => s.type === "group" && s.group === "Retirement")?.rows || [];
  const investmentRows = sections.find((s) => s.type === "group" && s.group === "Investments")?.rows || [];
  const flatRows = sections.filter((s) => s.type === "row").map((s) => s.row);

  // Dashboard preview: even with nothing connected yet, render every box
  // with its normal layout and "Not connected yet" / placeholder rows
  // (each row already handles a missing account -- see CategoryRow below)
  // instead of hiding the whole section, so people can see what the
  // dashboard will look like once accounts are linked and deposits split.
  return (
    <div className="space-y-6">
      <Card style={ledgerAccentCardStyle({ padding: "clamp(26px, 3.5vw, 40px)" })}>
        <div
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: 12,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--color-accent-700)",
            marginBottom: 14,
          }}
        >
          Total saved since joining PriorityPay
        </div>
        <div
          className="font-mono"
          style={{
            fontSize: "clamp(38px, 6vw, 64px)",
            lineHeight: 1,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "var(--color-text)",
          }}
        >
          {currency(allTimeTotal)}
        </div>
        <div style={{ fontFamily: "var(--font-heading)", fontSize: 16, fontStyle: "italic", color: "color-mix(in srgb, var(--color-text) 62%, transparent)", marginTop: 16 }}>
          Every dollar PriorityPay has calculated and confirmed out of a deposit, ever.
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GroupBox title="Retirement" rows={retirementRows} accountsById={accountsById} ytdByLabel={ytdByLabel} mtdByLabel={mtdByLabel} />
        <GroupBox title="Investments" rows={investmentRows} accountsById={accountsById} ytdByLabel={ytdByLabel} mtdByLabel={mtdByLabel} />
      </div>

      <OtherAccountsBox accounts={accounts} flatRows={flatRows} ytdByLabel={ytdByLabel} mtdByLabel={mtdByLabel} />
    </div>
  );
}
