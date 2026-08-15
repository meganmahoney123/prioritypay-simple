"use client";

import { useMemo } from "react";
import { Landmark } from "lucide-react";
import { Card, currency } from "./ui";
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
    <div className="flex items-center justify-between py-2.5 border-b border-neutral-100 last:border-0 gap-3">
      <div className="min-w-0">
        <div className="text-sm font-medium truncate">{label}</div>
        <div className="text-xs text-neutral-400 truncate">
          {account ? accountLabel(account) : "Not connected yet"}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-mono font-semibold">
          {account ? (account.current_balance === null || account.current_balance === undefined ? "—" : currency(account.current_balance)) : "—"}
        </div>
        <div className="text-[10px] text-neutral-400">
          {currency(ytd)} YTD · {currency(mtd)} this month
        </div>
      </div>
    </div>
  );
}

function GroupBox({ title, rows, accountsById, ytdByLabel, mtdByLabel }) {
  if (!rows.length) return null;
  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold mb-1">{title}</h3>
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
  if (!usedAccounts.length) return null;

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold mb-1">Other connected accounts</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
        {usedAccounts.map((acc) => (
          <div key={acc.id} className="border border-neutral-100 rounded-xl p-4">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
                <Landmark size={14} className="text-neutral-600" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{acc.institution_name} {acc.account_name}</div>
                <div className="text-xs text-neutral-400">•••• {acc.mask}</div>
              </div>
            </div>
            <div className="text-lg font-mono font-bold mb-2">
              {acc.current_balance === null || acc.current_balance === undefined ? "—" : currency(acc.current_balance)}
            </div>
            <div className="text-xs text-neutral-400 pt-2 border-t border-neutral-100 space-y-1">
              {byAccount[acc.id].map((r) => (
                <div key={r.id} className="flex justify-between gap-2">
                  <span className="truncate">{r.label}</span>
                  <span className="font-mono shrink-0">{currency(ytdByLabel[r.label] || 0)} YTD</span>
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

  if (!accounts || accounts.length === 0) return null;

  return (
    <div className="space-y-6">
      <Card className="p-5 bg-emerald-50 border-emerald-100">
        <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1">Total saved since joining PriorityPay</div>
        <div className="text-3xl font-mono font-extrabold text-emerald-900">{currency(allTimeTotal)}</div>
        <p className="text-xs text-emerald-700 mt-1">Every dollar PriorityPay has automatically routed out of a deposit, ever.</p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GroupBox title="Retirement" rows={retirementRows} accountsById={accountsById} ytdByLabel={ytdByLabel} mtdByLabel={mtdByLabel} />
        <GroupBox title="Investments" rows={investmentRows} accountsById={accountsById} ytdByLabel={ytdByLabel} mtdByLabel={mtdByLabel} />
      </div>

      <OtherAccountsBox accounts={accounts} flatRows={flatRows} ytdByLabel={ytdByLabel} mtdByLabel={mtdByLabel} />
    </div>
  );
}
