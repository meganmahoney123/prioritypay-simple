"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2, Loader2, Send, Plus, Calculator, Briefcase, Calendar, CreditCard, AlertTriangle } from "lucide-react";
import { Card, PrimaryButton, GhostButton, currency } from "@/components/ui";
import PlaidLinkButton from "@/components/PlaidLinkButton";
import { BLOOM_TOKENS, bloomBadgeStyle, bloomNoticeCardStyle, bloomWarningCardStyle, bloomAccentCardStyle } from "@/lib/bloomTheme";
import AccountSelect from "@/components/AccountSelect";
import RetirementConnectRow from "@/components/RetirementConnectRow";
import ContributionCalculatorModal from "@/components/ContributionCalculatorModal";
import WithdrawalAllocator from "@/components/WithdrawalAllocator";
import { Paperclip } from "lucide-react";
import Link from "next/link";
import { RETIREMENT_LABELS, RETIREMENT_SETUP_LINKS, estimateTaxReserve, overallDCLimit, electiveDeferralLimit, CATEGORY_COLORS } from "@/lib/allocations";

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
  const [w2PopupStep, setW2PopupStep] = useState("ask");
  // Whether "W2 Income" should be offered as a category option on the
  // transaction rows below. Defaults true (matches the always-shown
  // behavior before this existed) so nothing changes until the popup is
  // actually answered "No" -- at that point there's no reason to keep
  // showing a category the person just said doesn't apply this month, so
  // it's dropped from `cats`. Like `w2PopupStep`, this is plain client
  // state that resets to true on every load/period change rather than
  // being persisted server-side (there's no has_w2_income column on
  // closeout) -- consistent with the popup itself re-asking every visit.
  const [hasW2Income, setHasW2Income] = useState(true);
  const [editingConfirmed, setEditingConfirmed] = useState(false);
  const [persona, setPersona] = useState(null);
  const [defaultEmployeePayroll, setDefaultEmployeePayroll] = useState(null);
  const isBusinessOwnerWithEmployees = persona === "Business Owner (With Employees)";
  const baseCats = hasW2Income ? CATS : CATS.filter((c) => c.value !== "w2_income");
  const cats = isBusinessOwnerWithEmployees ? [...baseCats, { value: "business", label: "Business" }] : baseCats;
  const [splitRulesPercent, setSplitRulesPercent] = useState([]);
  const [savingObligations, setSavingObligations] = useState(false);
  const [editingObligations, setEditingObligations] = useState(false);
  const [obligationsForm, setObligationsForm] = useState({ pct: "", cap: "", accountId: null });
  const TEAM_OBLIGATIONS_LABEL = "Team & Plan Obligations";
  const teamObligationsRow = splitRulesPercent.find((r) => r.label === TEAM_OBLIGATIONS_LABEL);

  // Real, netted per-category balances (starting_balance + transfer
  // allocations - category-sourced withdrawal allocations -- see
  // app/api/allocations/balances/route.js) -- fetched once and used by the
  // Expense categorization panel below to know whether a category can
  // cover the whole amount or needs the shortfall cascade
  // (components/WithdrawalAllocator.js).
  const [categoryBalances, setCategoryBalances] = useState({});
  // Per-transaction-id state for the "which category did this Expense
  // actually come out of" panel opened by clicking the Expense pill (see
  // cats.map below) -- { open, categoryLabel ('Other' or a tracked
  // label), mileageMiles, mileagePurpose, mealPurpose, mealAttendees,
  // receiptFile, receiptUrl, uploading, allocations, allocationsComplete,
  // saving }. Not persisted anywhere until "Save expense" actually
  // succeeds -- a transaction only ever gets confirmed_category='expense'
  // once this whole panel is complete (see saveExpense below), which is
  // what enforces "no Expense without a category."
  const [expensePanels, setExpensePanels] = useState({});

  const load = async (p) => {
    setLoading(true);
    setRecommendations(null);
    setEditingConfirmed(false);
    if (persona === null) {
      fetch("/api/profile")
        .then((r) => r.json())
        .then((d) => {
          setPersona(d.profile?.persona || null);
          const est = d.profile?.retirementProfile?.estimatedEmployeePayroll;
          if (est !== null && est !== undefined) setDefaultEmployeePayroll(est);
        })
        .catch(() => {});
      fetch("/api/split-rules")
        .then((r) => r.json())
        .then((d) => setSplitRulesPercent(d.splitRules?.percent || []))
        .catch(() => {});
      fetch("/api/allocations/balances")
        .then((r) => r.json())
        .then((d) => setCategoryBalances(d.balances || {}))
        .catch(() => {});
    }
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
  const businessPreview = useMemo(
    () =>
      transactions.reduce((sum, t) => {
        const cat = t.confirmed_category || t.suggested_category;
        return cat === "business" ? sum + (Number(t.amount) || 0) : sum;
      }, 0),
    [transactions]
  );
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
  const splitEligibleAccounts = useMemo(() => accounts.filter((a) => a.account_type !== "business"), [accounts]);
  const businessAccounts = useMemo(() => accounts.filter((a) => a.account_type === "business"), [accounts]);
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
      setTransactions((prev) => prev.map((t) => (t.id === txnId ? { ...t, confirmed_category: previous ?? null } : t)));
      alert("Couldn't save that category — please try again.");
      return;
    }
    if (isConfirmed) handleConfirm();
  };

  // Label-matching heuristic -- this app has no dedicated "Mileage"/"Meals"
  // categories pre-seeded anywhere (checked DEFAULT_SPLIT_RULES and
  // SUGGESTED_EXTRA_CATEGORIES in lib/allocations.js), so a category only
  // triggers the extra structured tax fields if the user happens to have
  // named one that way -- case-insensitive substring match, same pattern
  // used elsewhere in this app for best-effort label matching (see
  // institutionLoginUrl in lib/allocations.js).
  const isMileageLabel = (label) => (label || "").toLowerCase().includes("mileage");
  const isMealsLabel = (label) => (label || "").toLowerCase().includes("meal");

  const openExpensePanel = (txnId) => {
    setExpensePanels((prev) => ({
      ...prev,
      [txnId]: prev[txnId] || {
        open: true,
        categoryLabel: null,
        mileageMiles: "",
        mileagePurpose: "",
        mealPurpose: "",
        mealAttendees: "",
        receiptFile: null,
        receiptUrl: null,
        uploading: false,
        allocations: [],
        allocationsComplete: false,
        saving: false,
        error: null,
      },
    }));
  };
  const updateExpensePanel = (txnId, patch) => {
    setExpensePanels((prev) => ({ ...prev, [txnId]: { ...prev[txnId], ...patch } }));
  };
  const closeExpensePanel = (txnId) => {
    setExpensePanels((prev) => {
      const next = { ...prev };
      delete next[txnId];
      return next;
    });
  };
  // Backs the inline "categorize" column added at the end of each Expense
  // row (see the transactions.map render below) -- lets someone pick the
  // category straight from the row instead of having to open/scroll to
  // the full panel first. It's the same categoryLabel the full panel's own
  // "What category did this come out of?" select writes to (opening/
  // reusing the panel, not a separate piece of state), so mileage/meals/
  // the withdrawal allocator/Save button below still work exactly the
  // same either way -- this is just a faster way to set categoryLabel.
  const setExpenseCategoryInline = (txnId, categoryLabel) => {
    setExpensePanels((prev) => ({
      ...prev,
      [txnId]: {
        ...(prev[txnId] || {
          open: true,
          categoryLabel: null,
          mileageMiles: "",
          mileagePurpose: "",
          mealPurpose: "",
          mealAttendees: "",
          receiptFile: null,
          receiptUrl: null,
          uploading: false,
          allocations: [],
          allocationsComplete: false,
          saving: false,
          error: null,
        }),
        open: true,
        categoryLabel: categoryLabel || null,
      },
    }));
  };

  // Backs the inline "who was this from" column added at the end of each
  // Income row -- a free-text note (simple_closeout_transactions.income_source),
  // saved on blur only if it actually changed, mirroring setCategory's
  // optimistic-update-with-rollback pattern above.
  const saveIncomeSource = async (txnId, value) => {
    const previous = transactions.find((t) => t.id === txnId)?.income_source ?? null;
    const trimmed = value.trim();
    if (trimmed === (previous || "")) return;
    setTransactions((prev) => prev.map((t) => (t.id === txnId ? { ...t, income_source: trimmed || null } : t)));
    const res = await fetch(`/api/closeout/transactions/${txnId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ incomeSource: trimmed || null }),
    });
    if (!res.ok) {
      setTransactions((prev) => prev.map((t) => (t.id === txnId ? { ...t, income_source: previous } : t)));
      alert("Couldn't save that — please try again.");
    }
  };

  const uploadReceipt = async (txnId, file) => {
    updateExpensePanel(txnId, { uploading: true, error: null });
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/withdrawals/receipt", { method: "POST", body: fd }).then((r) => r.json());
    if (res.error) {
      updateExpensePanel(txnId, { uploading: false, error: res.error });
      return;
    }
    updateExpensePanel(txnId, { uploading: false, receiptFile: file, receiptUrl: res.url });
  };

  const saveExpense = async (txn) => {
    const panel = expensePanels[txn.id];
    if (!panel || !panel.categoryLabel) {
      updateExpensePanel(txn.id, { error: "Pick a category (or Other) before saving." });
      return;
    }
    if (!panel.allocationsComplete) {
      updateExpensePanel(txn.id, { error: "Finish accounting for the full amount before saving." });
      return;
    }
    const mileage = isMileageLabel(panel.categoryLabel);
    const meals = isMealsLabel(panel.categoryLabel);
    updateExpensePanel(txn.id, { saving: true, error: null });
    const res = await fetch("/api/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(txn.amount) || 0,
        description: txn.name,
        occurredAt: txn.txn_date,
        categoryLabel: panel.categoryLabel,
        receiptUrl: panel.receiptUrl,
        mileageMiles: mileage ? panel.mileageMiles : null,
        mileagePurpose: mileage ? panel.mileagePurpose : null,
        mealPurpose: meals ? panel.mealPurpose : null,
        mealAttendees: meals ? panel.mealAttendees : null,
        allocations: panel.allocations,
      }),
    }).then((r) => r.json());
    if (res.error) {
      updateExpensePanel(txn.id, { saving: false, error: res.error });
      return;
    }
    // Refresh balances -- this withdrawal just debited one or more
    // categories, and the panel/allocator for the NEXT expense should see
    // the updated room, not stale pre-withdrawal numbers.
    fetch("/api/allocations/balances")
      .then((r) => r.json())
      .then((d) => setCategoryBalances(d.balances || {}))
      .catch(() => {});
    closeExpensePanel(txn.id);
    await setCategory(txn.id, "expense");
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

  const saveTeamObligations = async () => {
    setSavingObligations(true);
    const pctInput = obligationsForm.pct !== "" ? Number(obligationsForm.pct) : Number(teamObligationsRow?.pct ?? 0);
    const capInput = obligationsForm.cap !== "" ? Number(obligationsForm.cap) : teamObligationsRow?.max ?? null;
    const accountId = obligationsForm.accountId ?? teamObligationsRow?.accountId ?? null;
    const others = splitRulesPercent.filter((r) => r.label !== TEAM_OBLIGATIONS_LABEL);
    const remaining = Math.max(0, 100 - others.reduce((s, r) => s + (Number(r.pct) || 0), 0));
    const nextRow = {
      label: TEAM_OBLIGATIONS_LABEL,
      group: TEAM_OBLIGATIONS_LABEL,
      pct: Math.max(0, Math.min(pctInput || 0, remaining)),
      max: capInput,
      balanceCap: teamObligationsRow?.balanceCap ?? null,
      color: teamObligationsRow?.color || CATEGORY_COLORS[splitRulesPercent.length % CATEGORY_COLORS.length],
      accountId,
      retirementType: null,
      investmentType: null,
    };
    const nextPercent = [...others, nextRow];
    const res = await fetch("/api/split-rules", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ percent: nextPercent }),
    });
    setSavingObligations(false);
    if (!res.ok) {
      alert("Couldn't save this reserve — please try again.");
      return;
    }
    setSplitRulesPercent(nextPercent);
    setObligationsForm({ pct: "", cap: "", accountId: null });
    setEditingObligations(false);
  };

  if (loading) return <p className="text-sm text-[var(--color-neutral-700)]">Loading…</p>;

  const isTooEarlyToClose = period >= currentPeriod() && !(period === currentPeriod() && isLastDayOfCurrentMonthUTC());
  const isConfirmed = closeout?.status === "confirmed";
  const displayNetIncome = isConfirmed ? Number(closeout?.net_income) || 0 : netIncomePreview;
  const displayW2Income = recommendations?.w2Income ?? w2IncomePreview;
  const displayBusiness = recommendations?.business ?? businessPreview;
  const liveTaxEstimate = estimateTaxReserve(displayNetIncome, taxRatePct);
  const annualNetIncomeValue = annualNetIncome === "" ? displayNetIncome * 12 : Number(annualNetIncome) || 0;
  const annualTaxEstimate = estimateTaxReserve(annualNetIncomeValue, annualTaxRatePct);

  return (
    <div className="max-w-2xl space-y-6" style={BLOOM_TOKENS}>
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
          <span
            className="flex items-center gap-1"
            style={bloomBadgeStyle({ color: "var(--color-neutral-800)", background: "var(--color-neutral-200)" })}
          >
            <CheckCircle2 size={14} /> Confirmed
          </span>
        )}
      </div>

      {isTooEarlyToClose ? (
        <Card className="p-8 text-center">
          <Calendar size={28} className="mx-auto text-[var(--color-neutral-400)] mb-3" />
          <p className="text-sm font-semibold text-[var(--color-text)] mb-1">
            {periodLabel(period)} isn&apos;t finished yet.
          </p>
          <p className="text-sm text-[var(--color-neutral-700)]">Check back on the last day of the month.</p>
        </Card>
      ) : (
      <>
      {!accounts.some((a) => a.account_type === "credit") && (
        <Card className="p-5 flex items-start gap-3">
          <div className="w-9 h-9 rounded-[20px] bg-[var(--color-neutral-200)] flex items-center justify-center shrink-0">
            <CreditCard size={16} className="text-[var(--color-neutral-800)]" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold mb-1">Connect your credit cards</p>
            <p className="text-xs text-[var(--color-neutral-700)] mb-3">
              If you spend on a credit card, close-out is only seeing part of the picture. Add your cards here for a
              complete monthly expense total. They&apos;re never used for splits or transfers, just tracked for
              close-out.
            </p>
            <PlaidLinkButton
              label="Add a credit card"
              creditCard
              onLinked={() => load(period)}
              className="text-xs px-4 py-2"
              style={{ backgroundColor: "var(--color-neutral-800)", borderColor: "var(--color-neutral-800)" }}
            />
          </div>
        </Card>
      )}
      <Card className="p-6">
        <h2 className="text-sm font-semibold mb-1">Step 1: Confirm Net Income</h2>
        <p className="text-xs text-[var(--color-neutral-700)] mb-4">
          PriorityPay pulled every transaction across your linked accounts for {periodLabel(period)} and made a
          best guess at what&apos;s real income, a real expense, or an internal transfer that shouldn&apos;t count
          as either (like PriorityPay&apos;s own splits moving between your accounts).
        </p>
        {isConfirmed && (
          <div
            className="mb-4 flex items-start gap-2 px-3 py-2.5 text-xs"
            style={bloomNoticeCardStyle({ padding: "10px 12px" })}
          >
            <CheckCircle2 size={14} style={{ color: "var(--color-accent-800)" }} className="shrink-0 mt-0.5" />
            <span className="flex-1">
              This month was confirmed
              {closeout?.confirmed_at
                ? ` on ${new Date(closeout.confirmed_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
                : ""}
              . Categories are locked by default to avoid accidental changes
              {editingConfirmed
                ? " — you're editing now. Retirement room, tax reserve, and Tax Summary all recalculate the moment you change a category. Money already sent isn't undone, only what's left to send adjusts."
                : ". Made a mistake? You can still fix it."}
            </span>
            <GhostButton onClick={() => setEditingConfirmed((v) => !v)} className="text-[11px] px-2.5 py-1 shrink-0">
              {editingConfirmed ? "Done editing" : "Edit categories"}
            </GhostButton>
          </div>
        )}
        {transactions.length === 0 ? (
          <p className="text-sm text-[var(--color-neutral-700)]">No transactions found for this month.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {transactions.map((t) => {
              const cat = t.confirmed_category || t.suggested_category;
              const acc = accountsById[t.account_id];
              const panel = expensePanels[t.id];
              const canEdit = !isConfirmed || editingConfirmed;
              const mileage = panel && isMileageLabel(panel.categoryLabel);
              const meals = panel && isMealsLabel(panel.categoryLabel);
              return (
                <div key={t.id} className="border-b border-[var(--color-divider)] pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                    <div className="min-w-[110px] flex-1">
                      <div className="text-sm font-medium truncate">{t.name}</div>
                      <div className="text-xs text-[var(--color-neutral-700)]">
                        {t.txn_date} {acc ? `• ${acc.institution_name} •••• ${acc.mask}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-mono text-[var(--color-neutral-700)]">
                        {t.direction === "in" ? "+" : "-"}
                        {currency(t.amount)}
                      </span>
                      <div className="flex gap-1 flex-wrap justify-end">
                        {cats.map((c) => (
                          <button
                            key={c.value}
                            onClick={() => {
                              if (!canEdit) return;
                              // "Expense" always opens (or re-opens) the
                              // categorization panel below instead of
                              // saving right away -- an Expense transaction
                              // isn't allowed to save without picking a
                              // tracked category or "Other" first (see
                              // saveExpense above). Every other category
                              // (Income, W2 Income, Exclude, Business)
                              // saves immediately, same as before.
                              if (c.value === "expense") openExpensePanel(t.id);
                              else {
                                closeExpensePanel(t.id);
                                setCategory(t.id, c.value);
                              }
                            }}
                            disabled={!canEdit}
                            className="text-[10px] font-semibold px-2 py-1 rounded-full disabled:opacity-60"
                            style={{
                              fontFamily: "var(--font-heading)",
                              letterSpacing: "0.08em",
                              // "Expense" doesn't get confirmed_category='expense'
                              // until saveExpense succeeds (see comment above) --
                              // while the categorization panel is open, treat it
                              // as the active/highlighted pill anyway so opening
                              // it doesn't leave a stale category (e.g. "Income")
                              // looking selected underneath it.
                              border: `1px solid ${
                                cat === c.value || (c.value === "expense" && panel?.open) ? "var(--color-accent)" : "transparent"
                              }`,
                              color:
                                cat === c.value || (c.value === "expense" && panel?.open)
                                  ? "var(--color-accent-700)"
                                  : "color-mix(in srgb, var(--color-text) 45%, transparent)",
                              background:
                                cat === c.value || (c.value === "expense" && panel?.open)
                                  ? "color-mix(in srgb, var(--color-accent) 8%, transparent)"
                                  : "transparent",
                            }}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                      {/* Rightmost inline column -- only shown once this row
                          is actually labeled Expense or Income, so it never
                          crowds a row that doesn't need it yet. Expense gets
                          a quick categorize dropdown (still opens/feeds the
                          full panel below for mileage/meals/receipt/the
                          withdrawal allocator and Save button); Income gets
                          a free-text "who was this from" note. */}
                      {cat === "expense" && (
                        <select
                          value={panel?.categoryLabel || ""}
                          onChange={(e) => setExpenseCategoryInline(t.id, e.target.value || null)}
                          disabled={!canEdit}
                          className="text-[11px] border border-neutral-200 rounded-lg px-2 py-1 disabled:opacity-60"
                        >
                          <option value="">Categorize…</option>
                          {splitRulesPercent.map((r) => (
                            <option key={r.id} value={r.label}>{r.label}</option>
                          ))}
                          <option value="Other">Other (not tracked)</option>
                        </select>
                      )}
                      {cat === "income" && (
                        <input
                          type="text"
                          placeholder="Who was this from?"
                          defaultValue={t.income_source || ""}
                          onBlur={(e) => saveIncomeSource(t.id, e.target.value)}
                          disabled={!canEdit}
                          className="text-[11px] border border-neutral-200 rounded-lg px-2 py-1 w-32 disabled:opacity-60"
                        />
                      )}
                    </div>
                  </div>
                  {panel?.open && (
                    <div
                      className="mt-2 p-3 space-y-2.5"
                      style={{ background: "var(--color-neutral-100)", border: "1px solid var(--color-divider)", borderRadius: "var(--radius-md)" }}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold">What category did this come out of?</span>
                        <select
                          value={panel.categoryLabel || ""}
                          onChange={(e) => updateExpensePanel(t.id, { categoryLabel: e.target.value || null })}
                          className="text-xs border border-neutral-200 rounded-lg px-2 py-1"
                        >
                          <option value="">Select…</option>
                          {splitRulesPercent.map((r) => (
                            <option key={r.id} value={r.label}>{r.label}</option>
                          ))}
                          <option value="Other">Other (not tracked)</option>
                        </select>
                      </div>

                      {mileage && (
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          <label className="flex items-center gap-1">
                            Miles driven
                            <input
                              type="number"
                              min={0}
                              value={panel.mileageMiles}
                              onChange={(e) => updateExpensePanel(t.id, { mileageMiles: e.target.value })}
                              className="w-20 border border-neutral-200 rounded-lg px-2 py-1 font-mono text-center"
                            />
                          </label>
                          <label className="flex items-center gap-1 flex-1 min-w-[160px]">
                            Business purpose
                            <input
                              type="text"
                              value={panel.mileagePurpose}
                              onChange={(e) => updateExpensePanel(t.id, { mileagePurpose: e.target.value })}
                              className="flex-1 border border-neutral-200 rounded-lg px-2 py-1"
                            />
                          </label>
                        </div>
                      )}
                      {meals && (
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          <label className="flex items-center gap-1 flex-1 min-w-[160px]">
                            Business purpose
                            <input
                              type="text"
                              value={panel.mealPurpose}
                              onChange={(e) => updateExpensePanel(t.id, { mealPurpose: e.target.value })}
                              className="flex-1 border border-neutral-200 rounded-lg px-2 py-1"
                            />
                          </label>
                          <label className="flex items-center gap-1 flex-1 min-w-[160px]">
                            Who attended
                            <input
                              type="text"
                              value={panel.mealAttendees}
                              onChange={(e) => updateExpensePanel(t.id, { mealAttendees: e.target.value })}
                              className="flex-1 border border-neutral-200 rounded-lg px-2 py-1"
                            />
                          </label>
                        </div>
                      )}

                      {panel.categoryLabel && (
                        <WithdrawalAllocator
                          totalAmount={t.amount}
                          primaryLabel={panel.categoryLabel === "Other" ? null : panel.categoryLabel}
                          balances={categoryBalances}
                          trackedLabels={splitRulesPercent.map((r) => r.label)}
                          onChange={(allocations, complete) => updateExpensePanel(t.id, { allocations, allocationsComplete: complete })}
                        />
                      )}

                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <label className="flex items-center gap-1.5 cursor-pointer" style={{ color: "var(--color-accent-700)", fontWeight: 600 }}>
                          <Paperclip size={13} />
                          {panel.uploading ? "Uploading…" : panel.receiptUrl ? "Receipt attached — replace" : "Attach receipt"}
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && uploadReceipt(t.id, e.target.files[0])}
                          />
                        </label>
                      </div>

                      {panel.error && <p className="text-xs" style={{ color: "#9C3B22" }}>{panel.error}</p>}

                      <div className="flex items-center gap-2">
                        <PrimaryButton onClick={() => saveExpense(t)} disabled={panel.saving} className="text-xs px-3 py-1.5">
                          {panel.saving ? "Saving…" : "Save expense"}
                        </PrimaryButton>
                        <GhostButton onClick={() => closeExpensePanel(t.id)} className="text-xs px-3 py-1.5">
                          Cancel
                        </GhostButton>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div className="pt-4 mt-4 border-t border-[var(--color-divider)] flex items-center justify-between">
          <span className="text-sm font-semibold">Net income {isConfirmed ? "(confirmed)" : "(preview)"}</span>
          <span className="text-sm font-mono font-bold">{currency(displayNetIncome)}</span>
        </div>
        {displayW2Income > 0 && (
          <div className="flex items-center justify-between text-xs text-[var(--color-neutral-700)] mt-1">
            <span>W2 income this month (excluded from retirement &amp; tax below)</span>
            <span className="font-mono">{currency(displayW2Income)}</span>
          </div>
        )}
        {displayBusiness > 0 && (
          <div className="flex items-center justify-between text-xs text-[var(--color-neutral-700)] mt-1">
            <span>Flagged as business this month (excluded — belongs to the business side, see Tax Summary)</span>
            <span className="font-mono">{currency(displayBusiness)}</span>
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
            <p className="text-xs text-[var(--color-neutral-700)] mb-4">
              A solo 401(k) is a specialized retirement savings plan built for self-employed individuals and
              business owners who have no employees, other than a spouse. For 2026, the combined annual limit is{" "}
              {currency(overallDCLimit(recommendations.ageBracket))}, including up to{" "}
              {currency(electiveDeferralLimit(recommendations.ageBracket))} as your own employee-style deferral.
            </p>
            {recommendations.retirement.length === 0 ? (
              <div className="space-y-5">
                <p className="text-sm text-[var(--color-neutral-700)]">
                  You haven&apos;t added a Solo 401k category to your Income Split Rules yet. You can still
                  calculate what you&apos;d be able to contribute below, and see how to open one, before deciding
                  what to route toward retirement.
                </p>

                {!isBusinessOwnerWithEmployees && (
                  <div className="border border-[var(--color-divider)] rounded-[20px] p-4">
                    <div className="text-sm font-semibold mb-1">Solo 401k</div>
                    <p className="text-xs text-[var(--color-neutral-700)] mb-3">
                      A specialized retirement plan for self-employed individuals and business owners with no
                      employees other than a spouse.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <GhostButton onClick={() => setCalculatorPlanType("solo_401k")} className="text-xs px-3 py-1.5">
                        <Calculator size={14} /> Calculate Your Contribution Amount
                      </GhostButton>
                      <a
                        href={RETIREMENT_SETUP_LINKS.solo_401k}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs px-3 py-1.5 inline-flex items-center"
                        style={{ color: "var(--color-accent-700)", fontWeight: 600 }}
                      >
                        How do I open one?
                      </a>
                    </div>
                  </div>
                )}

                {/* SEP IRA is no longer pushed as a default option here (see
                    the same removal in lib/allocations.js's
                    DEFAULT_SPLIT_RULES) -- Solo 401k alone covers the
                    common case. Someone who specifically wants a SEP IRA
                    (or another retirement account entirely) can still add
                    it themselves via Split Rules -- existing SEP IRA rows
                    for people who already had one before this change are
                    untouched and still render normally in the
                    `recommendations.retirement.length > 0` branch below. */}
                <p className="text-xs text-[var(--color-neutral-700)]">
                  Want a SEP IRA or another retirement account instead?{" "}
                  <Link href="/splits" style={{ color: "var(--color-accent-700)", fontWeight: 600 }}>Connect another retirement account</Link> in
                  Income Split Rules so a share of every deposit gets set aside for it automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {recommendations.retirement.map((r) => {
                  const real = realByType[r.retirementType];
                  if (isBusinessOwnerWithEmployees && r.retirementType === "solo_401k") {
                    return (
                      <div key={r.retirementType} className="border border-[#F0C9C0] bg-[#FBEEEA] rounded-[20px] p-4 flex gap-3">
                        <AlertTriangle size={18} className="text-[#9C3B22] shrink-0 mt-0.5" />
                        <div>
                          <div className="text-sm font-semibold text-[#9C3B22] mb-1">Solo 401k isn&apos;t available to you</div>
                          <p className="text-xs text-[#9C3B22]">
                            Solo 401k plans only cover a business owner and their spouse — with other employees on
                            payroll, the business isn&apos;t eligible for this specific plan, no exceptions. A SEP
                            IRA (below, if set up) or a standard employer 401(k) are the options to look into
                            instead — worth a conversation with a tax professional about which fits.
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={r.retirementType} className="border border-[var(--color-divider)] rounded-[20px] p-4">
                      <div className="text-sm font-semibold mb-1">{RETIREMENT_LABELS[r.retirementType] || r.label}</div>
                      {r.retirementType === "sep_ira" ? (
                        <p className="text-xs text-[var(--color-neutral-700)] mb-2">
                          A Simplified Employee Pension (SEP) IRA is a retirement plan that allows business owners
                          and self-employed individuals to make tax-deductible contributions for themselves and
                          their eligible employees.
                        </p>
                      ) : (
                        <p className="text-xs text-[var(--color-neutral-700)] mb-2">
                          {currency(r.room)} of room left this year ({currency(r.ytdContributed)} sent through
                          PriorityPay so far this year — doesn&apos;t include anything contributed outside
                          PriorityPay). Holding in {r.holdingAccountLabel || "no account set"}
                          {r.holdingAccountBalance !== null ? ` (${currency(r.holdingAccountBalance)} available)` : ""}.
                        </p>
                      )}
                      {isBusinessOwnerWithEmployees && r.retirementType === "sep_ira" && (
                        <p className="text-xs text-[#9C3B22] bg-[#FBEEEA] border border-[#F0C9C0] rounded-[14px] px-3 py-2 mb-2">
                          You have employees, so contributing here commits you to the same percentage of
                          compensation for every eligible employee too. Use the calculator below for the real
                          total cost before sending anything.
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
                        accounts={splitEligibleAccounts}
                        onLinked={() => load(period)}
                      />
                      {real?.accountId && r.room > 0 && (
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          <span className="text-xs text-[var(--color-neutral-700)]">Send $</span>
                          <input
                            type="number"
                            onFocus={(e) => e.target.select()}
                            min={0}
                            value={contributeAmounts[r.retirementType] ?? Math.min(r.room, r.holdingAccountBalance ?? r.room)}
                            onChange={(e) => setContributeAmounts((prev) => ({ ...prev, [r.retirementType]: e.target.value }))}
                            className="text-sm font-mono"
                  style={{ width: 96, fontFamily: "var(--font-heading)", fontSize: 15, color: "var(--color-text)", background: "transparent", border: 0, borderBottom: "1px solid var(--color-divider)", borderRadius: 0, padding: "4px 2px" }}
                          />
                          <span className="text-xs text-[var(--color-neutral-700)]">from</span>
                          <div style={{ width: 176, minWidth: 0 }}>
                            <AccountSelect
                              value={contributeFrom[r.retirementType] ?? r.holdingAccountId}
                              onChange={(v) => setContributeFrom((prev) => ({ ...prev, [r.retirementType]: v }))}
                              accounts={splitEligibleAccounts}
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
            <div
              className="mb-4"
              style={bloomAccentCardStyle({
                padding: "20px 24px",
                background: "var(--color-accent-800)",
                border: "none",
                color: "#fff",
              })}
            >
              <div
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: 11,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--color-accent-400)",
                  marginBottom: 6,
                }}
              >
                Current Contribution to Tax Reserve For {periodLabel(period)}:
              </div>
              <div className="font-mono font-bold" style={{ fontFamily: "var(--font-mono)", fontSize: 30, color: "#fff" }}>
                {currency(recommendations.tax.setAsideThisMonth)}
              </div>
            </div>

            <div className="border border-[var(--color-divider)] rounded-[20px] p-4 mb-3">
              <div className="text-sm font-semibold mb-2">Monthly calculator</div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[var(--color-neutral-700)]">Net Monthly Income</span>
                <span className="text-sm font-mono font-semibold">{currency(displayNetIncome)}</span>
              </div>
              <p className="text-[11px] text-[var(--color-neutral-700)] mb-2">
                Pulled from Step 1&apos;s {isConfirmed ? "confirmed" : "preview"} net income for {periodLabel(period)}.
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--color-neutral-700)]">Rate</span>
                <input
                  type="number"
                  onFocus={(e) => e.target.select()}
                  min={0}
                  max={100}
                  value={taxRatePct}
                  onChange={(e) => setTaxRatePct(Number(e.target.value))}
                  className="text-sm font-mono"
                  style={{ width: 64, fontFamily: "var(--font-heading)", fontSize: 15, color: "var(--color-text)", background: "transparent", border: 0, borderBottom: "1px solid var(--color-divider)", borderRadius: 0, padding: "4px 2px" }}
                />
                <span className="text-xs text-[var(--color-neutral-700)]">%</span>
                <span className="text-sm font-mono font-bold ml-auto">{currency(liveTaxEstimate)}</span>
              </div>
            </div>

            <div className="border border-[var(--color-divider)] rounded-[20px] p-4 mb-4">
              <div className="text-sm font-semibold mb-2">Annual calculator</div>
              <p className="text-[11px] text-[var(--color-neutral-700)] mb-2">
                Some people haven&apos;t set aside anything for taxes yet this year — use this to see roughly what
                the whole year&apos;s target should be, not just this month&apos;s.
              </p>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-[var(--color-neutral-700)]">Estimated annual net income</span>
                <input
                  type="number"
                  onFocus={(e) => e.target.select()}
                  min={0}
                  value={annualNetIncome}
                  onChange={(e) => setAnnualNetIncome(e.target.value)}
                  className="text-sm font-mono ml-auto"
                  style={{ width: 112, fontFamily: "var(--font-heading)", fontSize: 15, color: "var(--color-text)", background: "transparent", border: 0, borderBottom: "1px solid var(--color-divider)", borderRadius: 0, padding: "4px 2px" }}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--color-neutral-700)]">Rate</span>
                <input
                  type="number"
                  onFocus={(e) => e.target.select()}
                  min={0}
                  max={100}
                  value={annualTaxRatePct}
                  onChange={(e) => setAnnualTaxRatePct(Number(e.target.value))}
                  className="text-sm font-mono"
                  style={{ width: 64, fontFamily: "var(--font-heading)", fontSize: 15, color: "var(--color-text)", background: "transparent", border: 0, borderBottom: "1px solid var(--color-divider)", borderRadius: 0, padding: "4px 2px" }}
                />
                <span className="text-xs text-[var(--color-neutral-700)]">%</span>
                <span className="text-sm font-mono font-bold ml-auto">{currency(annualTaxEstimate)}</span>
              </div>
            </div>

            <p className="text-xs text-[var(--color-neutral-700)] mb-4">
              This calculator is designed to help you get a very rough estimate of how much to set aside for taxes,
              but actual tax rates and amounts vary. PriorityPay isn&apos;t responsible for this number being
              accurate, and it&apos;s not tax advice. Talk to a tax professional about your real effective rate.
            </p>
            <p className="text-xs text-[var(--color-neutral-700)] mb-3">
              All of this stays in whichever account you already chose for Tax Reserve on Income Split Rules — this is
              just a number to compare against what&apos;s already there. Want to add more?
            </p>
            {!topUp.open ? (
              <GhostButton onClick={() => setTopUp((prev) => ({ ...prev, open: true }))} className="text-xs px-3 py-1.5">
                <Plus size={14} /> Add Money to Your Tax Reserve
              </GhostButton>
            ) : (
              <div className="border border-[var(--color-divider)] rounded-[20px] p-3 space-y-2">
                <label className="block text-xs text-[var(--color-neutral-700)]">From</label>
                <AccountSelect
                  value={topUp.fromAccountId}
                  onChange={(v) => setTopUp((prev) => ({ ...prev, fromAccountId: v }))}
                  accounts={splitEligibleAccounts}
                  theme="ledger"
                />
                <label className="block text-xs text-[var(--color-neutral-700)]">To</label>
                <AccountSelect
                  value={topUp.toAccountId}
                  onChange={(v) => setTopUp((prev) => ({ ...prev, toAccountId: v }))}
                  accounts={splitEligibleAccounts}
                  theme="ledger"
                />
                <label className="block text-xs text-[var(--color-neutral-700)]">Amount</label>
                <input
                  type="number"
                  onFocus={(e) => e.target.select()}
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

          {isBusinessOwnerWithEmployees && (
            <Card className="p-6">
              <h2 className="text-sm font-semibold mb-1">Team & Plan Obligations</h2>
              <p className="text-xs text-[var(--color-neutral-700)] mb-4">
                For employer payroll tax, unemployment insurance, workers&apos; comp, or a standard 401(k) match --
                anything your accountant or plan administrator calculates a number for. This routes money toward it
                automatically, same as everything else above, but it&apos;s money staged and ready, not the actual
                contribution or filing itself — that still goes through your payroll provider or TPA when it&apos;s
                due.
              </p>

              {teamObligationsRow && !editingObligations ? (
                <div className="border border-[var(--color-divider)] rounded-[20px] p-4">
                  <div className="flex items-baseline justify-between text-sm mb-1">
                    <span className="text-[var(--color-neutral-800)]">Routing</span>
                    <span className="font-mono font-semibold">{teamObligationsRow.pct}% of every deposit</span>
                  </div>
                  {teamObligationsRow.max !== null && (
                    <div className="flex items-baseline justify-between text-sm mb-1">
                      <span className="text-[var(--color-neutral-800)]">Monthly target</span>
                      <span className="font-mono font-semibold">{currency(teamObligationsRow.max)}</span>
                    </div>
                  )}
                  <div className="flex items-baseline justify-between text-sm mb-3">
                    <span className="text-[var(--color-neutral-800)]">Holding account</span>
                    <span className="font-mono font-semibold">
                      {accountsById[teamObligationsRow.accountId]
                        ? `${accountsById[teamObligationsRow.accountId].institution_name} •••• ${accountsById[teamObligationsRow.accountId].mask}`
                        : "Not connected"}
                    </span>
                  </div>
                  <GhostButton onClick={() => setEditingObligations(true)} className="text-xs px-3 py-1.5">
                    Edit
                  </GhostButton>
                </div>
              ) : (
                <div className="border border-[var(--color-divider)] rounded-[20px] p-4 space-y-3">
                  <div>
                    <label className="block text-xs text-[var(--color-neutral-700)] mb-1">
                      % of every deposit to route here
                    </label>
                    <input
                      type="number"
                      onFocus={(e) => e.target.select()}
                      min={0}
                      max={100}
                      value={obligationsForm.pct !== "" ? obligationsForm.pct : teamObligationsRow?.pct ?? ""}
                      onChange={(e) => setObligationsForm((prev) => ({ ...prev, pct: e.target.value }))}
                      className="w-full text-sm border border-[var(--color-divider)] rounded-[14px] px-3 py-2 font-mono"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--color-neutral-700)] mb-1">
                      Monthly target (what your accountant/administrator told you to set aside)
                    </label>
                    <input
                      type="number"
                      onFocus={(e) => e.target.select()}
                      min={0}
                      value={obligationsForm.cap !== "" ? obligationsForm.cap : teamObligationsRow?.max ?? ""}
                      onChange={(e) => setObligationsForm((prev) => ({ ...prev, cap: e.target.value }))}
                      className="w-full text-sm border border-[var(--color-divider)] rounded-[14px] px-3 py-2 font-mono"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--color-neutral-700)] mb-1">Holding account</label>
                    <AccountSelect
                      value={obligationsForm.accountId ?? teamObligationsRow?.accountId ?? null}
                      onChange={(v) => setObligationsForm((prev) => ({ ...prev, accountId: v }))}
                      accounts={splitEligibleAccounts}
                      theme="ledger"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <PrimaryButton onClick={saveTeamObligations} disabled={savingObligations} className="text-xs px-3 py-1.5">
                      {savingObligations ? <Loader2 size={14} className="animate-spin" /> : null}
                      {teamObligationsRow ? "Save changes" : "Set up this reserve"}
                    </PrimaryButton>
                    {teamObligationsRow && (
                      <GhostButton
                        onClick={() => {
                          setEditingObligations(false);
                          setObligationsForm({ pct: "", cap: "", accountId: null });
                        }}
                        className="text-xs px-3 py-1.5"
                      >
                        Cancel
                      </GhostButton>
                    )}
                  </div>
                </div>
              )}
            </Card>
          )}

          {isBusinessOwnerWithEmployees && (
            <Card className="p-6">
              <h2 className="text-sm font-semibold mb-1">Business Account</h2>
              <p className="text-xs text-[var(--color-neutral-700)] mb-4">
                Link your business checking or savings account to see its balance right here, next to what&apos;s
                staged in Team & Plan Obligations above — a quick gut check that there&apos;s actually enough
                sitting there before you send anything. Read-only: never used for splits or transfers, and never
                pulled into close-out&apos;s income/expense review.
              </p>
              {businessAccounts.length > 0 && (
                <div className="space-y-2 mb-3">
                  {businessAccounts.map((acc) => (
                    <div key={acc.id} className="border border-[var(--color-divider)] rounded-[20px] p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Briefcase size={16} className="text-[var(--color-neutral-700)]" />
                        <div>
                          <div className="text-sm font-medium">{acc.institution_name}</div>
                          <div className="text-xs text-[var(--color-neutral-700)]">{acc.account_name} •••• {acc.mask}</div>
                        </div>
                      </div>
                      <span className="font-mono font-semibold text-sm">{currency(acc.current_balance ?? 0)}</span>
                    </div>
                  ))}
                </div>
              )}
              <PlaidLinkButton
                label={businessAccounts.length ? "Link another business account" : "Link a business account"}
                businessAccount
                onLinked={() => load(period)}
                className="text-xs px-4 py-2"
                style={{ backgroundColor: "var(--color-neutral-800)", borderColor: "var(--color-neutral-800)" }}
              />
            </Card>
          )}
        </>
      )}
      </>
      )}

      {calculatorPlanType && (
        <ContributionCalculatorModal
          planType={calculatorPlanType}
          defaultEmployeePayroll={defaultEmployeePayroll}
          onClose={() => setCalculatorPlanType(null)}
        />
      )}

      {w2PopupStep !== "closed" && !loading && !isTooEarlyToClose && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ ...BLOOM_TOKENS, background: "color-mix(in srgb, #241634 55%, transparent)" }}>
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
                <p className="text-sm text-[var(--color-neutral-700)] mb-6">
                  If any deposit this month was a W2 paycheck (as opposed to business or side-hustle income),
                  flag it so PriorityPay can leave it out of your retirement contribution room and tax reserve
                  estimate below. This impacts how much you can contribute to your Solo 401k, SEP IRA, and how
                  much you should set aside for taxes.
                </p>
                <div className="flex gap-3">
                  <GhostButton
                    onClick={() => {
                      setHasW2Income(false);
                      setW2PopupStep("closed");
                    }}
                    className="flex-1 justify-center"
                  >
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
                <p className="text-xs text-[var(--color-neutral-700)] mb-4">
                  Toggle on anything that&apos;s a W2 paycheck for {periodLabel(period)}. Everything else stays
                  counted as regular business income. You can always change this later in Step 1 below.
                </p>
                {incomeTransactions.length === 0 ? (
                  <p className="text-sm text-[var(--color-neutral-700)] mb-4">
                    No income transactions found for {periodLabel(period)} yet — nothing to flag right now.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto mb-4">
                    {incomeTransactions.map((t) => {
                      const cat = t.confirmed_category || t.suggested_category;
                      const isW2 = cat === "w2_income";
                      return (
                        <div
                          key={t.id}
                          className="flex items-center justify-between gap-3 border border-[var(--color-divider)] rounded-[14px] px-3 py-2"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{t.name}</div>
                            <div className="text-xs text-[var(--color-neutral-700)]">
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
