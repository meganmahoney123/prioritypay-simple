"use client";

import { useEffect, useMemo, useState } from "react";
import AccountBalances from "@/components/AccountBalances";
import CloseoutNudge from "@/components/CloseoutNudge";
import MoneyDistributionChart from "@/components/MoneyDistributionChart";
import { allRules, DEFAULT_SPLIT_RULES, groupPctTotal, RETIREMENT_SETUP_LINKS, INVESTMENT_SETUP_LINKS } from "@/lib/allocations";
import { Card } from "@/components/ui";
import { ledgerNoticeCardStyle, ledgerWarningCardStyle } from "@/lib/ledgerTheme";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

function currentPeriod() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function startOfYearIso() {
  return new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1)).toISOString();
}

function trialDaysLeft(trialEndsAt) {
  if (!trialEndsAt) return null;
  return Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000));
}

function toByLabel(categories) {
  const map = {};
  (categories || []).forEach((c) => { map[c.label] = c.amount; });
  return map;
}

export default function DashboardPage() {
  const [splitRules, setSplitRules] = useState(DEFAULT_SPLIT_RULES);
  const [accounts, setAccounts] = useState([]);
  const [mtdByLabel, setMtdByLabel] = useState({});
  const [ytdByLabel, setYtdByLabel] = useState({});
  const [allTimeTotal, setAllTimeTotal] = useState(0);
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    const [rulesRes, accountsRes, mtdRes, ytdRes, allTimeRes, profileRes] = await Promise.all([
      fetch("/api/split-rules").then((r) => r.json()),
      fetch("/api/accounts").then((r) => r.json()),
      fetch(`/api/allocations/history/${currentPeriod()}?categoryType=percent`).then((r) => r.json()),
      fetch(`/api/allocations/history/range?since=${startOfYearIso()}&categoryType=percent`).then((r) => r.json()),
      fetch(`/api/allocations/history/range?all=true`).then((r) => r.json()),
      fetch("/api/profile").then((r) => r.json()),
    ]);
    if (rulesRes.splitRules) setSplitRules(rulesRes.splitRules);
    if (accountsRes.accounts) setAccounts(accountsRes.accounts);
    setMtdByLabel(toByLabel(mtdRes.categories));
    setYtdByLabel(toByLabel(ytdRes.categories));
    setAllTimeTotal(allTimeRes.total || 0);
    setBilling(profileRes.profile?.billing || null);
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

  // Persistent (non-dismissible, by design -- Megan doesn't want these
  // closeable) call-outs when someone has fully zeroed out Retirement or
  // Investments in Split Rules. A 0% row is a valid, deliberate choice
  // (some people genuinely can't afford either yet), but it's exactly the
  // kind of thing that's easy to set once during onboarding and forget --
  // this is the dashboard actively surfacing it every time, not just once.
  const retirementPct = useMemo(
    () => groupPctTotal((splitRules?.percent || []).filter((r) => r.group === "Retirement")),
    [splitRules]
  );
  const investmentsPct = useMemo(
    () => groupPctTotal((splitRules?.percent || []).filter((r) => r.group === "Investments")),
    [splitRules]
  );

  if (loading) return <p className="text-sm text-neutral-500">Loading…</p>;

  const trialRemaining = billing ? trialDaysLeft(billing.trialEndsAt) : null;

  return (
    <div className="space-y-6">
      {billing?.readOnly && (
        <Card className="p-4 text-sm flex items-start gap-2" style={ledgerWarningCardStyle()}>
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>
            <span style={{ fontWeight: 600 }}>Your free trial has ended.</span> You can still see your split rules
            and history, but connecting new accounts and moving money are paused until you subscribe.{" "}
            <Link href="/settings" style={{ fontWeight: 600, textDecoration: "underline" }}>Subscribe -- $19/month</Link>
          </span>
        </Card>
      )}

      {billing && !billing.readOnly && billing.subscriptionStatus !== "active" && trialRemaining !== null && trialRemaining <= 5 && (
        <Card className="p-4 text-sm" style={ledgerNoticeCardStyle()}>
          <span style={{ fontWeight: 600 }}>
            {trialRemaining === 0 ? "Your free trial ends today." : `${trialRemaining} day${trialRemaining === 1 ? "" : "s"} left in your free trial.`}
          </span>{" "}
          $19/month after that.{" "}
          <Link href="/settings" style={{ fontWeight: 600, textDecoration: "underline" }}>Subscribe now</Link>
        </Card>
      )}

      <AccountBalances
        accounts={accounts}
        splitRules={splitRules}
        mtdByLabel={mtdByLabel}
        ytdByLabel={ytdByLabel}
        allTimeTotal={allTimeTotal}
      />

      <CloseoutNudge />

      {accounts.length === 0 && (
        <Card className="p-4 text-sm" style={{ color: "var(--color-text)" }}>
          No bank account linked yet. Head to{" "}
          <a href="/accounts" style={{ color: "var(--color-accent-700)", fontWeight: 600 }}>Accounts</a> to connect
          one via Plaid before running a real split.
        </Card>
      )}

      {accounts.length > 0 && unconnected.length > 0 && (
        <Card className="p-4 text-sm" style={ledgerNoticeCardStyle()}>
          <span style={{ fontWeight: 600 }}>
            {unconnected.length} categor{unconnected.length === 1 ? "y needs" : "ies need"} an account before money can move:
          </span>{" "}
          {unconnected.map((r) => r.label).join(", ")}. Head to{" "}
          <Link href="/splits" style={{ fontWeight: 600, textDecoration: "underline" }}>Split Rules</Link> to connect or create
          one for each -- until then, that percentage just stays wherever a deposit lands.
        </Card>
      )}

      {retirementPct === 0 && (
        <Card className="p-4 text-sm flex items-start gap-2" style={ledgerWarningCardStyle()}>
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>
            <span style={{ fontWeight: 600 }}>Warning:</span> You currently aren&apos;t contributing to retirement.
            We highly recommend that you set up a Solo 401k and/or SEP IRA to start contributing to retirement.{" "}
            <a
              href={RETIREMENT_SETUP_LINKS.sep_ira}
              target="_blank"
              rel="noreferrer"
              style={{ fontWeight: 600, textDecoration: "underline" }}
            >
              Need help?
            </a>
          </span>
        </Card>
      )}

      {investmentsPct === 0 && (
        <Card className="p-4 text-sm flex items-start gap-2" style={ledgerWarningCardStyle()}>
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>
            <span style={{ fontWeight: 600 }}>Warning:</span> You currently aren&apos;t investing any money. This
            means you&apos;re missing out on compounding growth. We highly recommend that you set up investment
            accounts.{" "}
            <a
              href={INVESTMENT_SETUP_LINKS.brokerage}
              target="_blank"
              rel="noreferrer"
              style={{ fontWeight: 600, textDecoration: "underline" }}
            >
              Need help?
            </a>
          </span>
        </Card>
      )}

      <MoneyDistributionChart rules={rules} />
    </div>
  );
}
