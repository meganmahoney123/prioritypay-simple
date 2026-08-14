"use client";

import { useMemo } from "react";
import { Card, currency } from "./ui";

// Shared "Account Balances" card -- shown on both the Dashboard and Split
// Rules pages. PriorityPay Simple has no fixed minimums, so there's no
// "target balance" to compare against -- this just shows each account's
// live Plaid balance and which percentage categories are set to land there.
export default function AccountBalances({ accounts, splitRules }) {
  const accountBreakdown = useMemo(() => {
    const map = {};
    const forAccount = (id) => (map[id] ||= { percentItems: [] });
    (splitRules?.percent || []).forEach((r) => {
      if (!r.accountId) return;
      forAccount(r.accountId).percentItems.push({ label: r.label, pct: Number(r.pct) || 0 });
    });
    return map;
  }, [splitRules]);

  if (!accounts || accounts.length === 0) return null;

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold mb-1">Account Balances</h2>
      <p className="text-xs text-neutral-500 mb-4">Live from Plaid.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((acc) => {
          const breakdown = accountBreakdown[acc.id] || { percentItems: [] };
          const balance = Number(acc.current_balance) || 0;
          return (
            <div key={acc.id} className="border border-neutral-100 rounded-xl p-4">
              <div className="text-sm font-medium truncate mb-2">
                {acc.institution_name} {acc.account_name} •• {acc.mask}
              </div>
              <div className="mb-2">
                <div className="text-[10px] uppercase tracking-wide text-neutral-400 font-semibold">
                  Current balance
                </div>
                <div className="text-base font-bold font-mono text-neutral-900">{currency(balance)}</div>
              </div>
              {breakdown.percentItems.length > 0 ? (
                <div className="text-xs text-neutral-400 pt-1.5 border-t border-neutral-100">
                  Receives: {breakdown.percentItems.map((p) => `${p.label} (${p.pct}%)`).join(", ")}
                </div>
              ) : (
                <div className="text-xs text-neutral-400">No categories routing here yet</div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
