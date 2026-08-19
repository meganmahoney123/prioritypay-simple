"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2, Loader2, Send, Plus, Calculator, Briefcase, Calendar, CreditCard } from "lucide-react";
import { Card, PrimaryButton, GhostButton, currency } from "@/components/ui";
import PlaidLinkButton from "@/components/PlaidLinkButton";
import { LEDGER_TOKENS } from "@/lib/ledgerTheme";
import AccountSelect from "@/components/AccountSelect";
import RetirementConnectRow from "@/components/RetirementConnectRow";
import ContributionCalculatorModal from "@/components/ContributionCalculatorModal";
import { RETIREMENT_LABELS, estimateTaxReserve, overallDCLimit, electiveDeferralLimit } from "@/lib/allocations";

function defaultPeriod() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
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

// "YYYY-MM" strings compare correctly with plain string comparison. Used
// to gate the current (and any future) month out of close-out entirely --
// closing out a month that hasn't finished yet means working from an
// incomplete transaction list, so recommendations would just be wrong.
function currentPeriod() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}
function isLastDayOfCurrentMonthUTC() {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return tomorrow.getUTCDate() === 1;
}

const CATS = [
  { value: "income", label: "Income" },
  { value: "w2_income", label: "W2 Income" },
  { value: "expense", label: "Expense" },
  { value: "exclude", label: "Exclude" },
];

// PHASE B: the monthly ritual that replaces the old auto-cap guesswork --
// review every transaction PriorityPay saw across every linked account
// this month, confirm which is real income vs. a real expense vs. an
// internal transfer that shouldn't count as either, and only THEN does
// PriorityPay tell you how much retirement/tax room you actually have,
// based on a real confirmed number instead of raw deposit totals (which
// could include business-expense reimbursements that aren't real income).
export default function CloseoutPage() {
  const [period, setPeriod] = useState(defaultPeriod);
  const [closeout, setCloseout] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [realAccounts, setRealAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState(null);
  const [taxRatePct, setTaxRatePct] = useState(25);
  const [confirming, setConfirming] = useState(false);
  const [contributeAmounts, setContributeAmounts] = useState({});
  const [contributeFrom, setContributeFrom] = useState({});
  const [sending, setSending] = useState({});
  const [topUp, setTopUp] = useState({ open: false, fromAccountId: null, toAccountId: null, amount: "" });
  const [toppingUp, setToppingUp] = useState(false);
  const [calculatorPlanType, setCalculatorPlanType] = useState(null);
  const [annualNetIncome, setAnnualNetIncome] = useState("");
  const [annualTaxRatePct, setAnnualTaxRatePct] = useState(25);
  // Gate on first landing on this tab: "Do you have W2 income this month?"
  // -- Yes forces flagging every W2 paycheck before touching anything else
  // on the page (see the w2_income category and how it's excluded from
  // netIncome in the confirm route), No just dismisses it. Deliberately
  // NOT reset by the period useEffect below -- switching months with the
  // prev/next arrows shouldn't re-ask, only navigating to this tab fresh
  // (a fresh mount of this component) does.
  const [w2PopupStep, setW2PopupStep] = useState("ask");
  // Lets someone deliberately reopen a confirmed month for corrections --
  // categories were never actually locked server-side (PATCH .../transactions/[id]
  // has no status check, and POST .../confirm can always recompute from
  // scratch), so this is purely a UI guardrail against *accidental* edits.
  // Resets to locked every time the person switches months.
  const [editingConfirmed, setEditingConfirmed] = useState(false);

  const load = async (p) => {
    setLoading(true);
    setRecommendations(null);
    setEditingConfirmed(false);
    const [closeoutRes, accountsRes, realRes] = await Promise.all([
      fetch(`/api/closeout/${p}`).then((r) => r.json()),
      fetch("/api/accounts").then((r) => r.json()),
      fetch("/api/retirement/real-accounts").then((r) => r.json()),
    ]);
    setCloseout(closeoutRes.closeout);
    setTransactions(closeoutRes.transactions || []);
    setAccounts(accountsRes.accounts || []);
    setRealAccounts(realRes.realAccounts || []);
    const rate = closeoutRes.closeout?.tax_rate_pct ? Number(closeoutRes.closeout.tax_rate_pct) : 25;
    setTaxRatePct(rate);
    setLoading(false);

    if (closeoutRes.closeout?.status === "confirmed") {
      const rec = await fetch(`/api/closeout/${p}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taxRatePct: rate }),
      }).then((r) => r.json());
      setRecommendations(rec);
    }
  };

  useEffect(() => {
    load(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  // Give the annual tax calculator a sensible starting guess (this period's
  // net income, annualized) the first time recommendations load -- still
  // freely editable afterward, this only fills it in while it's untouched.
  useEffect(() => {
    if (recommendations && annualNetIncome === "") {
      setAnnualNetIncome(Math.round((Number(recommendations.netIncome) || 0) * 12));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recommendations]);

  const netIncomePreview = useMemo(() => {
    let income = 0;
    let expense = 0;
    transactions.forEach((t) => {
      const cat = t.confirmed_category || t.suggested_category;
      const amt = Number(t.amount) || 0;
      if (cat === "income") income += amt;
      if (cat === "expense") expense += amt;
    });
    return income - expense;
  }, [transactions]);
  const w2IncomePreview = useMemo(
    () =>
      transactions.reduce((sum, t) => {
        const cat = t.confirmed_category || t.suggested_category;
        return cat === "w2_income" ? sum + (Number(t.amount) || 0) : sum;
      }, 0),
    [transactions]
  );
  // Only real income candidates are relevant to the W2 popup -- no reason
  // to ask someone to flag an expense, or a transfer already excluded as
  // PriorityPay's own money moving between their own accounts, as a
  // paycheck.
  const incomeTransactions = useMemo(
    () =>
      transactions.filter((t) => {
        if (t.direction !== "in") return false;
        const cat = t.confirmed_category || t.suggested_category;
        return cat === "income" || cat === "w2_income";
      }),
    [transactions]
  );

  const accountsById = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a])), [accounts]);
  const realByType = useMemo(() => Object.fromEntries(realAccounts.map((r) => [r.retirementType, r])), [realAccounts]);

  const handleConfirm = async () => {
    setConfirming(true);
    const rec = await fetch(`/api/closeout/${period}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taxRatePct }),
    }).then((r) => r.json());
    setRecommendations(rec);
    setCloseout(rec.closeout);
    setConfirming(false);
  };

  const setCategory = async (txnId, category) => {
    const previous = transactions.find((t) => t.id === txnId)?.confirmed_category;
    setTransactions((prev) => prev.map((t) => (t.id === txnId ? { ...t, confirmed_category: category } : t)));
    const res = await fetch(`/api/closeout/transactions/${txnId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmedCategory: category }),
    });
    if (!res.ok) {
      // Revert the optimistic update instead of leaving the UI showing a
      // category that never actually saved -- found during QA when the
      // API's category whitelist didn't yet include "w2_income": clicking
      // that button looked like it worked (this state update ran
      // immediately) but silently 400'd underneath, so the real value in
      // the database never changed.
      setTransactions((prev) => prev.map((t) => (t.id === txnId ? { ...t, confirmed_category: previous ?? null } : t)));
      alert("Couldn't save that category -- please try again.");
      return;
    }
    // Editing a category on an already-confirmed month: re-run the same
    // confirm call used the first time around, which always recomputes
    // net income, retirement room, and the tax reserve estimate from
    // scratch off the current categories (see the comment on POST
    // .../confirm) -- so correcting a mistake here immediately ripples
    // through Step 2/3 below and into Tax Summary's next load, without a
    // second manual "confirm" click. Money already sent for a prior
    // (wrong) room/reserve number isn't reversed -- only what's left to
    // send adjusts.
    if (isConfirmed) handleConfirm();
  };

  const handleContribute = async (retirementType, room, holdingAccountId) => {
    const amount = Number(contributeAmounts[retirementType] ?? room);
    const fromAccountId = contributeFrom[retirementType] || holdingAccountId;
    if (!amount || amount <= 0 || !fromAccountId) return;
    setSending((prev) => ({ ...prev, [retirementType]: true }));
    const res = await fetch(`/api/closeout/${period}/contribute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ retirementType, amount, fromAccountId }),
    }).then((r) => r.json());
    setSending((prev) => ({ ...prev, [retirementType]: false }));
    if (res.error) {
      alert(res.error);
      return;
    }
    await load(period);
  };

  const handleTopUp = async () => {
    if (!topUp.fromAccountId || !topUp.toAccountId || !topUp.amount) return;
    setToppingUp(true);
    const res = await fetch(`/api/closeout/${period}/transfer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromAccountId: topUp.fromAccountId,
        toAccountId: topUp.toAccountId,
        amount: Number(topUp.amount),
        label: "Tax Reserve top-up",
      }),
    }).then((r) => r.json());
    setToppingUp(false);
    if (res.error) {
      alert(res.error);
      return;
    }
    setTopUp({ open: false, fromAccountId: null, toAccountId: null, amount: "" });
    await load(period);
  };

  if (loading) return <p className="text-sm text-neutral-500">Loading…</p>;

  // Current month (or, in principle, any month that hasn't happened yet)
  // stays locked until its last day -- the one exception is the current
  // month ON its last day, which is a real close-out day.
  const isTooEarlyToClose = period >= currentPeriod() && !(period === currentPeriod() && isLastDayOfCurrentMonthUTC());
  const isConfirmed = closeout?.status === "confirmed";
  const displayNetIncome = isConfirmed ? Number(closeout?.net_income) || 0 : netIncomePreview;
  // recommendations.w2Income (from the confirm response) is the source of
  // truth once available; w2IncomePreview covers the brief window before
  // it loads and the normal not-yet-confirmed preview state -- both derive
  // from the same per-transaction category, so they agree once loaded.
  const displayW2Income = recommendations?.w2Income ?? w2IncomePreview;
  const liveTaxEstimate = estimateTaxReserve(displayNetIncome, taxRatePct);
  const annualNetIncomeValue = annualNetIncome === "" ? displayNetIncome * 12 : Number(annualNetIncome) || 0;
  const annualTaxEstimate = estimateTaxReserve(annualNetIncomeValue, annualTaxRatePct);

  return (
    <div className="max-w-2xl space-y-6" style={LEDGER_TOKENS}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GhostButton onClick={() => setPeriod((p) => shiftPeriod(p, -1))} className="px-2 py-1.5">
            <ChevronLeft size={16} />
          </GhostButton>
          <span className="text-sm font-semibold w-40 text-center">{periodLabel(period)}</span>
          <GhostButton onClick={() => setPeriod((p) => shiftPeriod(p, 1))} className="px-2 py-1.5">
            <ChevronRight size={16} />
          </GhostButton>
        </div>
        {isConfirmed && (
          <span className="text-xs font-semibold flex items-center gap-1" style={{ color: "var(--color-accent-700)" }}>
            <CheckCircle2 size={14} /> Confirmed
          </span>
        )}
      </div>

      {isTooEarlyToClose ? (
        <Card className="p-8 text-center">
          <Calendar size={28} className="mx-auto text-neutral-300 mb-3" />
          <p className="text-sm font-semibold text-neutral-700 mb-1">
            {periodLabel(period)} isn&apos;t finished yet.
          </p>
          <p className="text-sm text-neutral-500">Check back on the last day of the month.</p>
        </Card>
      ) : (
      <>
      {!accounts.some((a) => a.account_type === "credit") && (
        <Card className="p-5 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0">
            <CreditCard size={16} className="text-neutral-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold mb-1">Connect your credit cards</p>
            <p className="text-xs text-neutral-500 mb-3">
              If you spend on a credit card, close-out is only seeing part of the picture. Add your cards here for a
              complete monthly expense total. They&apos;re never used for splits or transfers, just tracked for
              close-out.
            </p>
            <PlaidLinkButton
              label="Add a credit card"
              creditCard
              onLinked={() => load(period)}
              className="text-xs px-4 py-2"
              style={{ backgroundColor: "#525252" }}
            />
          </div>
        </Card>
      )}
      <Card className="p-6">
        <h2 className="text-sm font-semibold mb-1">Step 1: Confirm Net Income</h2>
        <p className="text-xs text-neutral-500 mb-4">
          PriorityPay pulled every transaction across your linked accounts for {periodLabel(period)} and made a
          best guess at what&apos;s real income, a real expense, or an internal transfer that shouldn&apos;t count
          as either (like PriorityPay&apos;s own splits moving between your accounts).
        </p>
        {isConfirmed && (
          <div className="mb-4 flex items-start gap-2 bg-neutral-100 border border-neutral-200 rounded-lg px-3 py-2.5 text-xs text-neutral-600">
            <CheckCircle2 size={14} style={{ color: "var(--color-accent-700)" }} className="shrink-0 mt-0.5" />
            <span className="flex-1">
              This month was confirmed
              {closeout?.confirmed_at
                ? ` on ${new Date(closeout.confirmed_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
                : ""}
              . Categories are locked by default to avoid accidental changes
              {editingConfirmed
                ? " -- you're editing now. Retirement room, tax reserve, and Tax Summary all recalculate the moment you change a category. Money already sent isn't undone, only what's left to send adjusts."
                : ". Made a mistake? You can still fix it."}
            </span>
            <GhostButton onClick={() => setEditingConfirmed((v) => !v)} className="text-[11px] px-2.5 py-1 shrink-0">
              {editingConfirmed ? "Done editing" : "Edit categories"}
            </GhostButton>
          </div>
        )}
        {transactions.length === 0 ? (
          <p className="text-sm text-neutral-400">No transactions found for this month.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {transactions.map((t) => {
              const cat = t.confirmed_category || t.suggested_category;
              const acc = accountsById[t.account_id];
              return (
                <div key={t.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-b border-neutral-100 pb-2">
                  <div className="min-w-[110px] flex-1">
                    <div className="text-sm font-medium truncate">{t.name}</div>
                    <div className="text-xs text-neutral-400">
                      {t.txn_date} {acc ? `• ${acc.institution_name} •••• ${acc.mask}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono text-neutral-500">
                      {t.direction === "in" ? "+" : "-"}
                      {currency(t.amount)}
                    </span>
                    <div className="flex gap-1 flex-wrap justify-end">
                      {CATS.map((c) => (
                        <button
                          key={c.value}
                          onClick={() => (!isConfirmed || editingConfirmed) && setCategory(t.id, c.value)}
                          disabled={isConfirmed && !editingConfirmed}
                          className="text-[10px] font-semibold px-2 py-1 rounded-full disabled:opacity-60"
                          style={{
                            fontFamily: "var(--font-heading)",
                            letterSpacing: "0.08em",
                            border: `1px solid ${cat === c.value ? "var(--color-accent)" : "transparent"}`,
                            color: cat === c.value ? "var(--color-accent-700)" : "color-mix(in srgb, var(--color-text) 45%, transparent)",
                            background: cat === c.value ? "color-mix(in srgb, var(--color-accent) 8%, transparent)" : "transparent",
                          }}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="pt-4 mt-4 border-t border-neutral-100 flex items-center justify-between">
          <span className="text-sm font-semibold">Net income {isConfirmed ? "(confirmed)" : "(preview)"}</span>
          <span className="text-sm font-mono font-bold">{currency(displayNetIncome)}</span>
        </div>
        {displayW2Income > 0 && (
          <div className="flex items-center justify-between text-xs text-neutral-400 mt-1">
            <span>W2 income this month (excluded from retirement &amp; tax below)</span>
            <span className="font-mono">{currency(displayW2Income)}</span>
          </div>
        )}
        {!isConfirmed && (
          <PrimaryButton onClick={handleConfirm} disabled={confirming} className="w-full mt-4">
            {confirming ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            {confirming ? "Confirming…" : "Confirm and see recommendations"}
          </PrimaryButton>
        )}
      </Card>

      {recommendations && (
        <>
          <Card className="p-6">
            <h2 className="text-sm font-semibold mb-1">Step 2: Contribute to Retirement</h2>
            <p className="text-xs text-neutral-500 mb-4">
              A solo 401(k) is a specialized retirement savings plan built for self-employed individuals and
              business owners who have no employees, other than a spouse. For 2026, the combined annual limit is{" "}
              {currency(overallDCLimit(recommendations.ageBracket))}, including up to{" "}
              {currency(electiveDeferralLimit(recommendations.ageBracket))} as your own employee-style deferral.
            </p>
            {recommendations.retirement.length === 0 ? (
              <p className="text-sm text-neutral-400">No Solo 401k/SEP IRA category set up yet.</p>
            ) : (
              <div className="space-y-5">
                {recommendations.retirement.map((r) => {
                  const real = realByType[r.retirementType];
                  return (
                    <div key={r.retirementType} className="border border-neutral-200 rounded-xl p-4">
                      <div className="text-sm font-semibold mb-1">{RETIREMENT_LABELS[r.retirementType] || r.label}</div>
                      {r.retirementType === "sep_ira" ? (
                        <p className="text-xs text-neutral-500 mb-2">
                          A Simplified Employee Pension (SEP) IRA is a retirement plan that allows business owners
                          and self-employed individuals to make tax-deductible contributions for themselves and
                          their eligible employees.
                        </p>
                      ) : (
                        <p className="text-xs text-neutral-500 mb-2">
                          {currency(r.room)} of room left this year ({currency(r.ytdContributed)} sent through
                          PriorityPay so far this year -- doesn&apos;t include anything contributed outside
                          PriorityPay). Holding in {r.holdingAccountLabel || "no account set"}
                          {r.holdingAccountBalance !== null ? ` (${currency(r.holdingAccountBalance)} available)` : ""}.
                        </p>
                      )}
                      <GhostButton
                        onClick={() => setCalculatorPlanType(r.retirementType)}
                        className="text-xs px-3 py-1.5 mb-3"
                      >
                        <Calculator size={14} /> Calculate Your Contribution Amount
                      </GhostButton>
                      <RetirementConnectRow
                        retirementType={r.retirementType}
                        accountId={real?.accountId}
                        accounts={accounts}
                        onLinked={() => load(period)}
                      />
                      {real?.accountId && r.room > 0 && (
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          <span className="text-xs text-neutral-500">Send $</span>
                          <input
                            type="number"
                            min={0}
                            value={contributeAmounts[r.retirementType] ?? Math.min(r.room, r.holdingAccountBalance ?? r.room)}
                            onChange={(e) => setContributeAmounts((prev) => ({ ...prev, [r.retirementType]: e.target.value }))}
                            className="text-sm font-mono"
                  style={{ width: 96, fontFamily: "var(--font-heading)", fontSize: 15, color: "var(--color-text)", background: "transparent", border: 0, borderBottom: "1px solid var(--color-divider)", borderRadius: 0, padding: "4px 2px" }}
                          />
                          <span className="text-xs text-neutral-500">from</span>
                          <div style={{ width: 176, minWidth: 0 }}>
                            <AccountSelect
                              value={contributeFrom[r.retirementType] ?? r.holdingAccountId}
                              onChange={(v) => setContributeFrom((prev) => ({ ...prev, [r.retirementType]: v }))}
                              accounts={accounts}
                              theme="ledger"
                            />
                          </div>
                          <PrimaryButton
                            onClick={() => handleContribute(r.retirementType, r.room, r.holdingAccountId)}
                            disabled={sending[r.retirementType]}
                            className="text-xs px-3 py-1.5"
                          >
                            {sending[r.retirementType] ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                            Send
                          </PrimaryButton>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-sm font-semibold mb-1">Step 3: Estimated Tax Reserve</h2>
            <p className="text-xs text-neutral-500 mb-4">
              Current Contribution to Tax Reserve For {periodLabel(period)}:{" "}
              <span className="font-mono font-semibold text-neutral-700">
                {currency(recommendations.tax.setAsideThisMonth)}
              </span>
            </p>

            <div className="border border-neutral-200 rounded-xl p-4 mb-3">
              <div className="text-sm font-semibold mb-2">Monthly calculator</div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-neutral-500">Net Monthly Income</span>
                <span className="text-sm font-mono font-semibold">{currency(displayNetIncome)}</span>
              </div>
              <p className="text-[11px] text-neutral-400 mb-2">
                Pulled from Step 1&apos;s {isConfirmed ? "confirmed" : "preview"} net income for {periodLabel(period)}.
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-500">Rate</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={taxRatePct}
                  onChange={(e) => setTaxRatePct(Number(e.target.value))}
                  className="text-sm font-mono"
                  style={{ width: 64, fontFamily: "var(--font-heading)", fontSize: 15, color: "var(--color-text)", background: "transparent", border: 0, borderBottom: "1px solid var(--color-divider)", borderRadius: 0, padding: "4px 2px" }}
                />
                <span className="text-xs text-neutral-500">%</span>
                <span className="text-sm font-mono font-bold ml-auto">{currency(liveTaxEstimate)}</span>
              </div>
            </div>

            <div className="border border-neutral-200 rounded-xl p-4 mb-4">
              <div className="text-sm font-semibold mb-2">Annual calculator</div>
              <p className="text-[11px] text-neutral-400 mb-2">
                Some people haven&apos;t set aside anything for taxes yet this year -- use this to see roughly what
                the whole year&apos;s target should be, not just this month&apos;s.
              </p>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-neutral-500">Estimated annual net income</span>
                <input
                  type="number"
                  min={0}
                  value={annualNetIncome}
                  onChange={(e) => setAnnualNetIncome(e.target.value)}
                  className="text-sm font-mono ml-auto"
                  style={{ width: 112, fontFamily: "var(--font-heading)", fontSize: 15, color: "var(--color-text)", background: "transparent", border: 0, borderBottom: "1px solid var(--color-divider)", borderRadius: 0, padding: "4px 2px" }}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-500">Rate</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={annualTaxRatePct}
                  onChange={(e) => setAnnualTaxRatePct(Number(e.target.value))}
                  className="text-sm font-mono"
                  style={{ width: 64, fontFamily: "var(--font-heading)", fontSize: 15, color: "var(--color-text)", background: "transparent", border: 0, borderBottom: "1px solid var(--color-divider)", borderRadius: 0, padding: "4px 2px" }}
                />
                <span className="text-xs text-neutral-500">%</span>
                <span className="text-sm font-mono font-bold ml-auto">{currency(annualTaxEstimate)}</span>
              </div>
            </div>

            <p className="text-xs text-neutral-500 mb-4">
              This calculator is designed to help you get a very rough estimate of how much to set aside for taxes,
              but actual tax rates and amounts vary. PriorityPay isn&apos;t responsible for this number being
              accurate, and it&apos;s not tax advice. Talk to a tax professional about your real effective rate.
            </p>
            <p className="text-xs text-neutral-400 mb-3">
              All of this stays in whichever account you already chose for Tax Reserve on Split Rules -- this is
              just a number to compare against what&apos;s already there. Want to add more?
            </p>
            {!topUp.open ? (
              <GhostButton onClick={() => setTopUp((prev) => ({ ...prev, open: true }))} className="text-xs px-3 py-1.5">
                <Plus size={14} /> Add money to an account
              </GhostButton>
            ) : (
              <div className="border border-neutral-200 rounded-xl p-3 space-y-2">
                <label className="block text-xs text-neutral-500">From</label>
                <AccountSelect
                  value={topUp.fromAccountId}
                  onChange={(v) => setTopUp((prev) => ({ ...prev, fromAccountId: v }))}
                  accounts={accounts}
                  theme="ledger"
                />
                <label className="block text-xs text-neutral-500">To</label>
                <AccountSelect
                  value={topUp.toAccountId}
                  onChange={(v) => setTopUp((prev) => ({ ...prev, toAccountId: v }))}
                  accounts={accounts}
                  theme="ledger"
                />
                <label className="block text-xs text-neutral-500">Amount</label>
                <input
                  type="number"
                  min={0}
                  value={topUp.amount}
                  onChange={(e) => setTopUp((prev) => ({ ...prev, amount: e.target.value }))}
                  className="text-sm font-mono"
                  style={{ width: 128, fontFamily: "var(--font-heading)", fontSize: 15, color: "var(--color-text)", background: "transparent", border: 0, borderBottom: "1px solid var(--color-divider)", borderRadius: 0, padding: "4px 2px" }}
                />
                <div className="flex gap-2 pt-1">
                  <PrimaryButton onClick={handleTopUp} disabled={toppingUp} className="text-xs px-3 py-1.5">
                    {toppingUp ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send
                  </PrimaryButton>
                  <GhostButton onClick={() => setTopUp({ open: false, fromAccountId: null, toAccountId: null, amount: "" })} className="text-xs px-3 py-1.5">
                    Cancel
                  </GhostButton>
                </div>
              </div>
            )}
          </Card>
        </>
      )}
      </>
      )}

      {calculatorPlanType && (
        <ContributionCalculatorModal planType={calculatorPlanType} onClose={() => setCalculatorPlanType(null)} />
      )}

      {w2PopupStep !== "closed" && !loading && !isTooEarlyToClose && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ ...LEDGER_TOKENS, background: "color-mix(in srgb, #171614 55%, transparent)" }}>
          <div
            className="max-w-lg w-full max-h-[90vh] overflow-y-auto p-6"
            style={{ background: "var(--color-bg)", border: "1px solid var(--color-divider)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)" }}
          >
            {w2PopupStep === "ask" && (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <Briefcase size={18} style={{ color: "var(--color-accent-700)" }} />
                  <span className="text-base font-bold">Do you have W2 income this month?</span>
                </div>
                <p className="text-sm text-neutral-500 mb-6">
                  If any deposit this month was a W2 paycheck (as opposed to business or side-hustle income),
                  flag it so PriorityPay can leave it out of your retirement contribution room and tax reserve
                  estimate below. This impacts how much you can contribute to your Solo 401k, SEP IRA, and how
                  much you should set aside for taxes.
                </p>
                <div className="flex gap-3">
                  <GhostButton onClick={() => setW2PopupStep("closed")} className="flex-1 justify-center">
                    No
                  </GhostButton>
                  <PrimaryButton onClick={() => setW2PopupStep("flagging")} className="flex-1 justify-center">
                    Yes
                  </PrimaryButton>
                </div>
              </>
            )}
            {w2PopupStep === "flagging" && (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <Briefcase size={18} style={{ color: "var(--color-accent-700)" }} />
                  <span className="text-base font-bold">Flag your W2 paychecks</span>
                </div>
                <p className="text-xs text-neutral-500 mb-4">
                  Toggle on anything that&apos;s a W2 paycheck for {periodLabel(period)}. Everything else stays
                  counted as regular business income. You can always change this later in Step 1 below.
                </p>
                {incomeTransactions.length === 0 ? (
                  <p className="text-sm text-neutral-400 mb-4">
                    No income transactions found for {periodLabel(period)} yet -- nothing to flag right now.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto mb-4">
                    {incomeTransactions.map((t) => {
                      const cat = t.confirmed_category || t.suggested_category;
                      const isW2 = cat === "w2_income";
                      return (
                        <div
                          key={t.id}
                          className="flex items-center justify-between gap-3 border border-neutral-200 rounded-lg px-3 py-2"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{t.name}</div>
                            <div className="text-xs text-neutral-400">
                              {t.txn_date} • {currency(t.amount)}
                            </div>
                          </div>
                          <button
                            onClick={() => setCategory(t.id, isW2 ? "income" : "w2_income")}
                            className="text-[11px] font-semibold px-3 py-1.5 rounded-full shrink-0"
                            style={{
                              fontFamily: "var(--font-heading)",
                              border: `1px solid ${isW2 ? "var(--color-accent)" : "transparent"}`,
                              color: isW2 ? "var(--color-accent-700)" : "color-mix(in srgb, var(--color-text) 45%, transparent)",
                              background: isW2 ? "color-mix(in srgb, var(--color-accent) 8%, transparent)" : "transparent",
                            }}
                          >
                            {isW2 ? "W2 income" : "Mark as W2"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <PrimaryButton onClick={() => setW2PopupStep("closed")} className="w-full justify-center">
                  Continue
                </PrimaryButton>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
