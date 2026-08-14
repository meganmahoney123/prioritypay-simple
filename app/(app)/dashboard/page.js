"use client";

import { useEffect, useMemo, useState } from "react";
import AccountBalances from "@/components/AccountBalances";
import CloseoutNudge from "@/components/CloseoutNudge";
import MoneyDistributionChart from "@/components/MoneyDistributionChart";
import { allRules, DEFAULT_SPLIT_RULES } from "@/lib/allocations";
import { Card } from "@/components/ui";

export default function DashboardPage() {
  const [splitRules, setSplitRules] = useState(DEFAULT_SPLIT_RULES);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    const [rulesRes, accountsRes] = await Promise.all([
      fetch("/api/split-rules").then((r) => r.json()),
      fetch("/api/accounts").then((r) => r.json()),
    ]);
    if (rulesRes.splitRules) setSplitRules(rulesRes.splitRules);
    if (accountsRes.accounts) setAccounts(accountsRes.accounts);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const rules = useMemo(() => allRules(splitRules), [splitRules]);

  if (loading) return <p className="text-sm text-neutral-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <AccountBalances accounts={accounts} splitRules={splitRules} />

      <CloseoutNudge />

      {accounts.length === 0 && (
        <Card className="p-4 text-sm text-neutral-600">
          No bank account linked yet. Head to <a href="/accounts" className="text-emerald-700 font-semibold">Accounts</a> to connect one via Plaid before running a real split.
        </Card>
      )}

      <MoneyDistributionChart rules={rules} />
    </div>
  );
}
