"use client";

import { useEffect, useMemo, useState } from "react";
import AccountBalances from "@/components/AccountBalances";
import InvestmentGrowthProjection from "@/components/InvestmentGrowthProjection";
import PendingTransfers from "@/components/PendingTransfers";
import CloseoutNudge from "@/components/CloseoutNudge";
import { allRules, DEFAULT_SPLIT_RULES, groupPctTotal, RETIREMENT_SETUP_LINKS, INVESTMENT_SETUP_LINKS, isW2NoSideHustle, isW2WithSideHustle } from "@/lib/allocations";
import { Card } from "@/components/ui";
import { bloomNoticeCardStyle, bloomWarningCardStyle } from "@/lib/bloomTheme";
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
  const [pendingTransfers, setPendingTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [persona, setPersona] = useState(null);

  const loadAll = async () => {
    const [rulesRes, accountsRes, mtdRes, ytdRes, allTimeRes, profileRes, pendingRes] = await Promise.all([
      fetch("/api/split-rules").then((r) => r.json()),
      fetch("/api/accounts").then((r) => r.json()),
      fetch(`/api/allocations/history/${currentPeriod()}?categoryType=percent`).then((r) => r.json()),
      fetch(`/api/allocations/history/range?since=${startOfYearIso()}&categoryType=percent`).then((r) => r.json()),
      fetch(`/api/allocations/history/range?all=true`).then((r) => r.json()),
      fetch("/api/profile").then((r) => r.json()),
      fetch("/api/transfers/pending").then((r) => r.json()),
    ]);
    if (rulesRes.splitRules) setSplitRules(rulesRes.splitRules);
    if (accountsRes.accounts) setAccounts(accountsRes.accounts);
    setMtdByLabel(toByLabel(mtdRes.categories));
    setYtdByLabel(toByLabel(ytdRes.categories));
    setAllTimeTotal(allTimeRes.total || 0);
    setBilling(profileRes.profile?.billing || null);
    setPersona(profileRes.profile?.persona || null);
    setPendingTransfers(pendingRes.transfers || []);
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
    // Includes "Retirement (Side Income)" too -- W2 (With Side Hustle/
    // Business) splits its retirement contributions across two groups (see
    // GROUPED_BUCKETS, lib/allocations.js), and this warning should only
    // fire if BOTH are at 0%, not just the workplace one.
    () => groupPctTotal((splitRules?.percent || []).filter((r) => r.group === "Retirement" || r.group === "Retirement (Side Income)")),
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
      <PendingTransfers transfers={pendingTransfers} accounts={accounts} onConfirmed={loadAll} />

      {billing?.readOnly && (
        <Card className="p-4 text-sm flex items-start gap-2" style={bloomWarningCardStyle()}>
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>
            <span style={{ fontWeight: 600 }}>Your free trial has ended.</span> You can still see your split rules
            and history, but connecting new accounts and moving money are paused until you subscribe.{" "}
            <Link href="/settings" style={{ fontWeight: 600, textDecoration: "underline" }}>Subscribe — $7/month</Link>
          </span>
        </Card>
      )}

      {billing && !billing.readOnly && billing.subscriptionStatus !== "active" && trialRemaining !== null && trialRemaining <= 5 && (
        <Card className="p-4 text-sm" style={bloomNoticeCardStyle()}>
          <span style={{ fontWeight: 600 }}>
            {trialRemaining === 0 ? "Your free trial ends today." : `${trialRemaining} day${trialRemaining === 1 ? "" : "s"} left in your free trial.`}
          </span>{" "}
          $7/month after that.{" "}
          <Link href="/settings" style={{ fontWeight: 600, textDecoration: "underline" }}>Subscribe now</Link>
        </Card>
      )}

      <AccountBalances
        accounts={accounts}
        splitRules={splitRules}
        mtdByLabel={mtdByLabel}
        ytdByLabel={ytdByLabel}
        allTimeTotal={allTimeTotal}
        rules={rules}
        belowDistribution={
          <InvestmentGrowthProjection
            title="Your Investment & Retirement Projections"
            taxNote
            blocks={
              isW2NoSideHustle(persona)
                ? [
                    {
                      group: "Investments",
                      startingLabel: "Investment",
                      subHeading: "Investments",
                      emptyStateText: "Once you're contributing to Investments, we'll show you where that could grow.",
                    },
                    {
                      group: "Retirement",
                      retirementType: "traditional_401k",
                      startingLabel: "401k",
                      subHeading: "401k",
                      emptyStateText: "Once you're contributing to your 401k, we'll show you where that could grow.",
                    },
                    {
                      group: "Retirement",
                      retirementType: "traditional_ira",
                      startingLabel: "IRA",
                      subHeading: "IRA",
                      emptyStateText: "Once you're contributing to your IRA, we'll show you where that could grow.",
                    },
                  ]
                : isW2WithSideHustle(persona)
                ? [
                    {
                      group: "Investments",
                      startingLabel: "Investment",
                      subHeading: "Investments",
                      emptyStateText: "Once you're contributing to Investments, we'll show you where that could grow.",
                    },
                    {
                      group: "Retirement",
                      retirementType: "traditional_401k",
                      startingLabel: "401k",
                      subHeading: "401k (Job)",
                      emptyStateText: "Once you're contributing to your 401k, we'll show you where that could grow.",
                    },
                    {
                      group: "Retirement",
                      retirementType: "traditional_ira",
                      startingLabel: "IRA",
                      subHeading: "IRA (Job)",
                      emptyStateText: "Once you're contributing to your IRA, we'll show you where that could grow.",
                    },
                    {
                      group: "Retirement (Side Income)",
                      retirementType: "solo_401k",
                      startingLabel: "Solo 401k",
                      subHeading: "Solo 401k (Side Income)",
                      emptyStateText: "Once you're contributing to your Solo 401k, we'll show you where that could grow.",
                    },
                  ]
                : [
                    {
                      group: "Investments",
                      startingLabel: "Investment",
                      subHeading: "Investments",
                      emptyStateText: "Once you're contributing to Investments, we'll show you where that could grow.",
                    },
                    {
                      group: "Retirement",
                      retirementType: "solo_401k",
                      startingLabel: "Solo 401k",
                      subHeading: "Solo 401k",
                      emptyStateText: "Once you're contributing to your Solo 401k, we'll show you where that could grow.",
                    },
                  ]
            }
          />
        }
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
        <Card className="p-4 text-sm" style={bloomNoticeCardStyle()}>
          <span style={{ fontWeight: 600 }}>
            {unconnected.length} categor{unconnected.length === 1 ? "y needs" : "ies need"} an account before money can move:
          </span>{" "}
          {unconnected.map((r) => r.label).join(", ")}. Head to{" "}
          <Link href="/splits" style={{ fontWeight: 600, textDecoration: "underline" }}>Income Split Rules</Link> to connect or create
          one for each — until then, that percentage just stays wherever a deposit lands.
        </Card>
      )}

      {retirementPct === 0 && (
        <Card className="p-4 text-sm flex items-start gap-2" style={bloomWarningCardStyle()}>
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>
            <span style={{ fontWeight: 600 }}>Warning:</span> You currently aren&apos;t contributing to retirement.
            {isW2NoSideHustle(persona)
              ? " Consider setting up a 401k, IRA, or HSA to start contributing to retirement -- check with your employer first, since many already route money there through payroll."
              : isW2WithSideHustle(persona)
              ? " Consider setting up a 401k, IRA, or HSA for your job (check with your employer first -- many already contribute through payroll) and/or a Solo 401k for your side income."
              : " Consider setting up a Solo 401k to start contributing to retirement."}{" "}
            <a
              href={isW2NoSideHustle(persona) || isW2WithSideHustle(persona) ? RETIREMENT_SETUP_LINKS.traditional_401k : RETIREMENT_SETUP_LINKS.solo_401k}
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
        <Card className="p-4 text-sm flex items-start gap-2" style={bloomWarningCardStyle()}>
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>
            <span style={{ fontWeight: 600 }}>Warning:</span> You currently aren&apos;t investing any money. This
            means you&apos;re missing out on compounding growth. Consider setting up investment
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
    </div>
  );
}
