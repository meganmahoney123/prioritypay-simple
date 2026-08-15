"use client";

import { useEffect, useMemo, useState } from "react";
import AccountBalances from "@/components/AccountBalances";
import CloseoutNudge from "@/components/CloseoutNudge";
import MoneyDistributionChart from "@/components/MoneyDistributionChart";
import { allRules, DEFAULT_SPLIT_RULES } from "@/lib/allocations";
import { Card } from "@/components/ui";
import Link from "next/link";

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

  // Onboarding lets every percentage category be set up with no account
  // connected at all -- skippable on purpose, so setup isn't blocked on
  // Plaid. This is the enforcement point instead: any category that's
  // actually claiming a percentage (>0%) but has nowhere to send that
  // money yet gets called out here, since that's the last stop before a
  // real deposit would actually try to move money.
  const unconnected = useMemo(
    () => (splitRules?.percent || []).filter((r) => (Number(r.pct) || 0) > 0 && !r.accountId),
    [splitRules]
  );

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

      {accounts.length > 0 && unconnected.length > 0 && (
        <Card className="p-4 text-sm text-amber-900 bg-amber-50 border-amber-200">
          <span className="font-semibold">
            {unconnected.length} categor{unconnected.length === 1 ? "y needs" : "ies need"} an account before money can move:
          </span>{" "}
          {unconnected.map((r) => r.label).join(", ")}. Head to{" "}
          <Link href="/splits" className="text-emerald-700 font-semibold">Split Rules</Link> to connect or create
          one for each -- until then, that percentage just stays wherever a deposit lands.
        </Card>
      )}

      <MoneyDistributionChart rules={rules} />
    </div>
  );
}
