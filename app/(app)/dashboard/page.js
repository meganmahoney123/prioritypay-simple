"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import AccountBalances from "@/components/AccountBalances";
import PendingTransfers from "@/components/PendingTransfers";
import CloseoutNudge from "@/components/CloseoutNudge";
import { useDashboardHeaderSlots } from "@/components/AppShell";
import { allRules, DEFAULT_SPLIT_RULES, groupPctTotal, RETIREMENT_SETUP_LINKS, INVESTMENT_SETUP_LINKS, isW2NoSideHustle, isW2WithSideHustle } from "@/lib/allocations";
import { Card } from "@/components/ui";
import { bloomNoticeCardStyle, bloomWarningCardStyle } from "@/lib/bloomTheme";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

function currentPeriod() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function shiftPeriod(period, delta) {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function periodLabel(period) {
  const [y, m] = period.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

// "Good morning/afternoon/evening" -- purely a local-clock read, nothing
// stored. Paired with the real display_name field people can set in
// Settings (see supabase/migrations/20260926_profile_display_name.sql);
// nameFromEmail below is only the fallback for whoever hasn't set one --
// the part of the login email before the @ and before any ./_/-
// separator is a reasonable guess in the meantime.
function timeOfDayGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
function nameFromEmail(email) {
  if (!email) return null;
  const local = email.split("@")[0];
  const first = local.split(/[._-]/)[0];
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : null;
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
  const [notifications, setNotifications] = useState(null);
  const [email, setEmail] = useState(null);
  const [displayName, setDisplayName] = useState(null);

  // Owns the This Month/This Year toggle (and the year stepper) up here
  // now, instead of inside CategoryDistributionSection, so it can be
  // portaled into AppShell's own sticky header alongside the greeting --
  // see useDashboardHeaderSlots below and the two createPortal calls in
  // the return. CategoryDistributionSection still does the actual
  // fetching/clamping against the real earliest period; it reports that
  // back up via onEarliestPeriod so the year stepper here can clamp
  // against it too.
  const maxPeriod = useMemo(() => currentPeriod(), []);
  const currentYear = Number(maxPeriod.slice(0, 4));
  const [mode, setMode] = useState("month");
  const [monthPeriod, setMonthPeriod] = useState(maxPeriod);
  const [year, setYear] = useState(currentYear);
  const [earliestPeriod, setEarliestPeriod] = useState(null);
  const handleEarliestPeriod = useCallback((p) => setEarliestPeriod(p), []);
  const period = mode === "year" ? String(year) : monthPeriod;

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
    setNotifications(profileRes.profile?.notifications || null);
    setEmail(profileRes.profile?.email || null);
    setDisplayName(profileRes.profile?.displayName || null);
    setPendingTransfers(pendingRes.allocations || []);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  // DOM nodes AppShell exposes inside its own sticky header, one where the
  // page title normally sits and one where the "Sandbox mode" badge sits
  // (empty/null on every other page -- see components/AppShell.js). Portal
  // the greeting and the toggle into them below instead of rendering a
  // second sticky bar of our own.
  const { titleSlot, actionsSlot } = useDashboardHeaderSlots();

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

  const earliestYear = earliestPeriod ? Number(earliestPeriod.slice(0, 4)) : currentYear;
  const atEarliestMonth = earliestPeriod ? monthPeriod <= earliestPeriod : false;
  const atLatestMonth = monthPeriod >= maxPeriod;
  const atEarliestYear = year <= earliestYear;
  const atLatestYear = year >= currentYear;
  // Real "Your name" from Settings wins when set; otherwise fall back to
  // guessing a first name from the login email (see nameFromEmail above).
  const greetingName = displayName || nameFromEmail(email);

  return (
    <div className="space-y-6">
      {/* Greeting portals into AppShell's header in place of the plain
          "Dashboard" title -- see components/AppShell.js's titleSlot. */}
      {titleSlot && createPortal(
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(24px, 3vw, 34px)", fontWeight: 800, margin: 0, letterSpacing: "-0.03em" }}>
          {timeOfDayGreeting()}{greetingName ? `, ${greetingName}` : ""}
        </h1>,
        titleSlot
      )}

      {/* This Month/This Year toggle portals into AppShell's header in
          place of the "Sandbox mode" badge, once that badge is gone -- see
          components/AppShell.js's actionsSlot (null while isSandbox). */}
      {actionsSlot && createPortal(
        <div>
          <div className="flex" style={{ background: "var(--color-accent-200)", borderRadius: 999, padding: 4 }}>
            <button
              onClick={() => setMode("month")}
              style={{
                padding: "7px 16px", fontSize: 13, fontWeight: 700, borderRadius: 999, border: "none", cursor: "pointer",
                background: mode === "month" ? "#FFFFFF" : "transparent",
                color: mode === "month" ? "var(--color-accent-700)" : "var(--color-neutral-700)",
              }}
            >
              This Month
            </button>
            <button
              onClick={() => setMode("year")}
              style={{
                padding: "7px 16px", fontSize: 13, fontWeight: 700, borderRadius: 999, border: "none", cursor: "pointer",
                background: mode === "year" ? "#FFFFFF" : "transparent",
                color: mode === "year" ? "var(--color-accent-700)" : "var(--color-neutral-700)",
              }}
            >
              This Year
            </button>
          </div>
          {mode === "month" ? (
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <button
                onClick={() => !atEarliestMonth && setMonthPeriod((p) => shiftPeriod(p, -1))}
                disabled={atEarliestMonth}
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 26, height: 26, borderRadius: "50%", background: "transparent",
                  border: "1px solid var(--color-divider)", color: "var(--color-text)",
                  cursor: atEarliestMonth ? "not-allowed" : "pointer", opacity: atEarliestMonth ? 0.3 : 1,
                }}
              >
                <ChevronLeft size={13} />
              </button>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 12.5, fontWeight: 800, color: "var(--color-accent-700)", width: 130, textAlign: "center" }}>{periodLabel(monthPeriod)}</span>
              <button
                onClick={() => !atLatestMonth && setMonthPeriod((p) => shiftPeriod(p, 1))}
                disabled={atLatestMonth}
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 26, height: 26, borderRadius: "50%", background: "transparent",
                  border: "1px solid var(--color-divider)", color: "var(--color-text)",
                  cursor: atLatestMonth ? "not-allowed" : "pointer", opacity: atLatestMonth ? 0.3 : 1,
                }}
              >
                <ChevronRight size={13} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2.5 mt-2">
              <button
                onClick={() => !atEarliestYear && setYear((y) => Math.max(earliestYear, y - 1))}
                disabled={atEarliestYear}
                style={{
                  width: 26, height: 26, borderRadius: "50%", border: "1px solid var(--color-accent-300)", background: "#FFFFFF",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  cursor: atEarliestYear ? "not-allowed" : "pointer", opacity: atEarliestYear ? 0.3 : 1,
                }}
              >
                <ChevronLeft size={12} color="var(--color-accent-700)" />
              </button>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 12.5, fontWeight: 800, color: "var(--color-accent-700)" }}>{year}</span>
              <button
                onClick={() => !atLatestYear && setYear((y) => Math.min(currentYear, y + 1))}
                disabled={atLatestYear}
                style={{
                  width: 26, height: 26, borderRadius: "50%", border: "1px solid var(--color-accent-300)", background: "#FFFFFF",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  cursor: atLatestYear ? "not-allowed" : "pointer", opacity: atLatestYear ? 0.3 : 1,
                }}
              >
                <ChevronRight size={12} color="var(--color-accent-700)" />
              </button>
            </div>
          )}
        </div>,
        actionsSlot
      )}

      <PendingTransfers allocations={pendingTransfers} accounts={accounts} onConfirmed={loadAll} />

      {billing?.readOnly && (
        <Card className="p-4 text-sm flex items-start gap-2" style={bloomWarningCardStyle()}>
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>
            <span style={{ fontWeight: 600 }}>Your free trial has ended.</span> You can still see your split rules
            and history, but connecting new accounts and moving money are paused until you subscribe.{" "}
            <Link href="/settings" style={{ fontWeight: 600, textDecoration: "underline" }}>Subscribe, $12/month</Link>
          </span>
        </Card>
      )}

      {billing && !billing.readOnly && billing.subscriptionStatus !== "active" && trialRemaining !== null && trialRemaining <= 5 && (
        <Card className="p-4 text-sm" style={bloomNoticeCardStyle()}>
          <span style={{ fontWeight: 600 }}>
            {trialRemaining === 0 ? "Your free trial ends today." : `${trialRemaining} day${trialRemaining === 1 ? "" : "s"} left in your free trial.`}
          </span>{" "}
          $12/month after that.{" "}
          <Link href="/settings" style={{ fontWeight: 600, textDecoration: "underline" }}>Subscribe now</Link>
        </Card>
      )}

      {/* Persistent (non-dismissible, same as the retirement/investments
          0% call-outs below) nudge toward turning on SMS deposit alerts --
          shows every time someone lands on the dashboard until they've both
          opted in AND saved a phone number in Settings (sms_notifications_
          enabled + phone_number, see app/api/profile/route.js). Off by
          default is required for Telnyx's opt-in rules (see PHASE W,
          supabase/schema.sql) -- this banner is how someone who skipped it
          during onboarding is reminded it's available, without the
          checkbox itself ever being pre-checked anywhere. */}
      {notifications && !(notifications.smsEnabled && notifications.phoneNumber) && (
        <Card className="p-4 text-sm flex items-start gap-2" style={bloomNoticeCardStyle()}>
          <span>
            <span style={{ fontWeight: 600 }}>Get a text the moment a deposit lands.</span>{" "}
            Turn on SMS deposit alerts in Settings so you never have to remember to check.{" "}
            <Link href="/settings" style={{ fontWeight: 600, textDecoration: "underline" }}>Turn on text alerts</Link>
          </span>
        </Card>
      )}

      {/* The forward-looking Investment & Retirement Projections card that
          used to render here (as AccountBalances' belowDistribution slot)
          moved to its own tab -- app/(app)/projections/page.js -- by
          request, since the Dashboard was getting crowded. Unchanged
          otherwise: same accounts/splitRules/mtd/ytd data feeding the two
          backward-looking pie charts below. */}
      <AccountBalances
        accounts={accounts}
        splitRules={splitRules}
        mtdByLabel={mtdByLabel}
        ytdByLabel={ytdByLabel}
        allTimeTotal={allTimeTotal}
        rules={rules}
        hasPendingTransfers={pendingTransfers.length > 0}
        mode={mode}
        period={period}
        onEarliestPeriod={handleEarliestPeriod}
      />

      {/* "Your Accounts" quick-links -- matches the approved
          MainDesktop.dc.html mockup's preview strip at the bottom of the
          money section. Credit cards excluded, same as the mockup (which
          only lists depository/business accounts here); the full picture,
          including cards, lives on the Accounts page this links to. */}
      {accounts.filter((a) => a.account_type !== "credit").length > 0 && (
        <div>
          <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 13, fontWeight: 800, color: "var(--color-neutral-700)", marginBottom: 10 }}>
            Your Accounts
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {accounts
              .filter((a) => a.account_type !== "credit")
              .map((a) => (
                <Link
                  key={a.id}
                  href="/accounts"
                  className="flex items-center justify-between"
                  style={{
                    padding: "16px 20px", border: "1px solid var(--color-divider)", borderRadius: "var(--radius-md)",
                    background: "var(--color-surface)", textDecoration: "none", color: "var(--color-text)",
                  }}
                >
                  <span style={{ fontSize: 14.5, fontWeight: 700 }}>{a.institution_name}</span>
                  <span className="flex items-center gap-1.5" style={{ color: "var(--color-accent-700)", fontSize: 13, fontWeight: 700 }}>
                    View Balance <ChevronRight size={14} />
                  </span>
                </Link>
              ))}
          </div>
        </div>
      )}

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
          one for each, until then, that percentage just stays wherever a deposit lands.
        </Card>
      )}

      {retirementPct === 0 && (
        <Card className="p-4 text-sm flex items-start gap-2" style={bloomWarningCardStyle()}>
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>
            <span style={{ fontWeight: 600 }}>Warning:</span> You currently aren&apos;t contributing to retirement.
            {isW2NoSideHustle(persona)
              ? " Consider setting up a 401k, IRA, or HSA to start contributing to retirement, check with your employer first, since many already route money there through payroll."
              : isW2WithSideHustle(persona)
              ? " Consider setting up a 401k, IRA, or HSA for your job (check with your employer first, many already contribute through payroll) and/or a Solo 401k for your side income."
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
