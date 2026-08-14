"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2, Loader2, Send, Plus, Calculator } from "lucide-react";
import { Card, PrimaryButton, GhostButton, currency } from "@/components/ui";
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

const CATS = [
  { value: "income", label: "Income" },
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

  const load = async (p) => {
    setLoading(true);
    setRecommendations(null);
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

  const accountsById = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a])), [accounts]);
  const realByType = useMemo(() => Object.fromEntries(realAccounts.map((r) => [r.retirementType, r])), [realAccounts]);

  const setCategory = async (txnId, category) => {
    setTransactions((prev) => prev.map((t) => (t.id === txnId ? { ...t, confirmed_category: category } : t)));
    await fetch(`/api/closeout/transactions/${txnId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmedCategory: category }),
    });
  };

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

  const isConfirmed = closeout?.status === "confirmed";
  const displayNetIncome = isConfirmed ? Number(closeout?.net_income) || 0 : netIncomePreview;
  const liveTaxEstimate = estimateTaxReserve(displayNetIncome, taxRatePct);
  const annualNetIncomeValue = annualNetIncome === "" ? displayNetIncome * 12 : Number(annualNetIncome) || 0;
  const annualTaxEstimate = estimateTaxReserve(annualNetIncomeValue, annualTaxRatePct);

  return (
    <div className="max-w-2xl space-y-6">
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
          <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
            <CheckCircle2 size={14} /> Confirmed
          </span>
        )}
      </div>

      <Card className="p-6">
        <h2 className="text-sm font-semibold mb-1">Step 1: Confirm Net Income</h2>
        <p className="text-xs text-neutral-500 mb-4">
          PriorityPay pulled every transaction across your linked accounts for {periodLabel(period)} and made a
          best guess at what&apos;s real income, a real expense, or an internal transfer that shouldn&apos;t count
          as either (like PriorityPay&apos;s own splits moving between your accounts).
        </p>
        {transactions.length === 0 ? (
          <p className="text-sm text-neutral-400">No transactions found for this month.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {transactions.map((t) => {
              const cat = t.confirmed_category || t.suggested_category;
              const acc = accountsById[t.account_id];
              return (
                <div key={t.id} className="flex items-center justify-between gap-3 border-b border-neutral-100 pb-2">
                  <div className="min-w-0">
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
                    <div className="flex gap-1">
                      {CATS.map((c) => (
                        <button
                          key={c.value}
                          onClick={() => !isConfirmed && setCategory(t.id, c.value)}
                          disabled={isConfirmed}
                          className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
                            cat === c.value ? "bg-emerald-600 text-white" : "bg-neutral-100 text-neutral-500"
                          } disabled:opacity-60`}
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
                            className="w-24 text-sm border border-neutral-200 rounded-lg px-2 py-1 font-mono"
                          />
                          <span className="text-xs text-neutral-500">from</span>
                          <div className="w-48">
                            <AccountSelect
                              value={contributeFrom[r.retirementType] ?? r.holdingAccountId}
                              onChange={(v) => setContributeFrom((prev) => ({ ...prev, [r.retirementType]: v }))}
                              accounts={accounts}
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
                  className="w-16 text-sm border border-neutral-200 rounded-lg px-2 py-1 font-mono"
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
                  className="w-28 text-sm border border-neutral-200 rounded-lg px-2 py-1 font-mono ml-auto"
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
                  className="w-16 text-sm border border-neutral-200 rounded-lg px-2 py-1 font-mono"
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
              All of this stays in whichever account you already chose for Tax Reserve on the Minimums page --
              this is just a number to compare against what&apos;s already there. Want to add more?
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
                />
                <label className="block text-xs text-neutral-500">To</label>
                <AccountSelect
                  value={topUp.toAccountId}
                  onChange={(v) => setTopUp((prev) => ({ ...prev, toAccountId: v }))}
                  accounts={accounts}
                />
                <label className="block text-xs text-neutral-500">Amount</label>
                <input
                  type="number"
                  min={0}
                  value={topUp.amount}
                  onChange={(e) => setTopUp((prev) => ({ ...prev, amount: e.target.value }))}
                  className="w-32 text-sm border border-neutral-200 rounded-lg px-2 py-1 font-mono"
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

      {calculatorPlanType && (
        <ContributionCalculatorModal planType={calculatorPlanType} onClose={() => setCalculatorPlanType(null)} />
      )}
    </div>
  );
}
