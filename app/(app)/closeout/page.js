"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2, Loader2, Send, Plus, Calculator, Briefcase, Calendar, CreditCard, AlertTriangle } from "lucide-react";
import SpendByCategory from "@/components/SpendByCategory";
import { Card, PrimaryButton, GhostButton, currency } from "@/components/ui";
import PlaidLinkButton from "@/components/PlaidLinkButton";
import { BLOOM_TOKENS, bloomBadgeStyle, bloomNoticeCardStyle, bloomWarningCardStyle, bloomAccentCardStyle } from "@/lib/bloomTheme";
import AccountSelect from "@/components/AccountSelect";
import RetirementConnectRow from "@/components/RetirementConnectRow";
import ContributionCalculatorModal from "@/components/ContributionCalculatorModal";
import WithdrawalAllocator from "@/components/WithdrawalAllocator";
import TaxExportCard from "@/components/TaxExportCard";
import { Paperclip } from "lucide-react";
import Link from "next/link";
import { paysByDraw } from "@/lib/entityCopy";
import { RETIREMENT_LABELS, RETIREMENT_SETUP_LINKS, estimateTaxReserve, overallDCLimit, electiveDeferralLimit, CATEGORY_COLORS, pickUniqueColor, isW2NoSideHustle, isW2WithSideHustle } from "@/lib/allocations";
import { notify } from "@/lib/notify";

const PS_INK = "#241337";
const PS_MUTED = "#4A3F63";
const PS_ACCENT = "#4E22B8";
const MONTHS_ABBR = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function psRowCard(highlight) {
  return {
    background: highlight ? "#F3EEFF" : "#fff",
    border: `2px ${highlight ? "dashed" : "solid"} ${highlight ? "#9A72F0" : "#D9C9FF"}`,
    borderRadius: 18,
    padding: "14px 16px",
  };
}

// Date chip + merchant + account line + amount: the top line of every transaction card.
function PsRowTop({ t, acc, sign }) {
  const [, m, d] = String(t.txn_date || "").split("-");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 52, height: 48, borderRadius: 12, background: "#EDE6FF", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: PS_ACCENT, letterSpacing: "0.06em", lineHeight: 1 }}>{MONTHS_ABBR[(Number(m) || 1) - 1]}</span>
        <span style={{ fontSize: 20, fontWeight: 800, color: PS_INK, lineHeight: 1.1 }}>{Number(d) || ""}</span>
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: PS_INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
        <div style={{ fontSize: 14, color: PS_MUTED }}>{acc ? `${acc.institution_name}${acc.mask ? ` •••• ${acc.mask}` : ""}` : ""}</div>
      </div>
      <span style={{ fontFamily: '"IBM Plex Mono", ui-monospace, monospace', fontSize: 18, fontWeight: 700, color: PS_INK, flexShrink: 0 }}>
        {sign}{currency(t.amount)}
      </span>
    </div>
  );
}

// Segmented toggle: the selected option is solid purple with white text.
function PsSegmented({ options, isSelected, onPick, disabled }) {
  return (
    <div style={{ display: "flex", border: "2px solid #CBB8F5", borderRadius: 14, overflow: "hidden", background: "#fff" }}>
      {options.map((c, i) => {
        const on = isSelected(c);
        return (
          <button
            key={c.value}
            onClick={() => onPick(c)}
            disabled={disabled}
            className="disabled:opacity-60"
            style={{
              flex: 1,
              minHeight: 44,
              fontSize: 15,
              fontWeight: 800,
              background: on ? PS_ACCENT : "#fff",
              color: on ? "#fff" : PS_ACCENT,
              borderLeft: i === 0 ? "none" : "2px solid #CBB8F5",
            }}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

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

// Split into two lists instead of one shared set -- Deposits (money in)
// only ever needs an income-side classification, Charges (money out) only
// ever needs an expense-side one, and mixing them into one pill row per
// transaction (the old layout) was the actual source of confusion this
// redesign fixes: a still-"income"-suggested row could show its Charges-
// only "who was this from" input at the same time an Expense panel was
// open underneath it, because the two concepts were tracked independently
// but rendered together. Now a transaction only ever sees the set that
// applies to its own direction.
const DEPOSIT_CATS = [
  { value: "income", label: "Biz Income/Owners Draw" },
  { value: "w2_income", label: "W2 Income" },
  { value: "investment_income", label: "Investment Income" },
  { value: "misc_income", label: "Miscellaneous" },
  { value: "exclude", label: "Exclude" },
];
const CHARGE_CATS = [
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
  const [w2PopupStep, setW2PopupStep] = useState("closed");
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
  // How the business is set up. The tax set-aside and retirement steps are
  // worked out from net income, which only means something for sole
  // proprietors. LLC, partnership and corporation owners (anyone paid by
  // draw, distribution or salary) should base taxes on their business's
  // profit with their CPA, so those steps are replaced by a short note.
  const [entityType, setEntityType] = useState(null);
  const showTaxGuidance = !paysByDraw(entityType);
  const [defaultEmployeePayroll, setDefaultEmployeePayroll] = useState(null);
  const isBusinessOwnerWithEmployees = persona === "Business Owner (With Employees)";
  // No self-employment income for this persona, so Solo 401k/SEP IRA
  // pitches don't apply here (see the retirement recommendation cards
  // below) -- they get 401k/IRA/HSA copy instead.
  const isW2NoSideHustlePersona = isW2NoSideHustle(persona);

  // The "Do you have W2 income this month?" popup only makes sense for
  // someone whose persona actually involves a W2 paycheck -- for every
  // other persona (self-employed, business owner, etc.) there's no W2
  // income to ask about, so it should never appear. Decided once persona
  // finishes loading (it starts null -- see the `load()` fetch above --
  // so this effect fires exactly once per page load, right when the real
  // value arrives) rather than defaulting open, which used to pop this up
  // for every persona regardless of relevance.
  useEffect(() => {
    if (persona === null) return;
    // W2-only users already told us they only have W2 income, so asking again
    // is redundant -- the popup is only for W2 + side hustle/business.
    setW2PopupStep(isW2WithSideHustle(persona) ? "ask" : "closed");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persona]);
  const baseDepositCats = hasW2Income ? DEPOSIT_CATS : DEPOSIT_CATS.filter((c) => c.value !== "w2_income");
  const depositCats = isBusinessOwnerWithEmployees ? [...baseDepositCats, { value: "business", label: "Business" }] : baseDepositCats;
  const chargeCats = isBusinessOwnerWithEmployees ? [...CHARGE_CATS, { value: "business", label: "Business" }] : CHARGE_CATS;
  const [splitRulesPercent, setSplitRulesPercent] = useState([]);
  // Transactions already recorded from the Withdrawals tab (see
  // app/(app)/withdrawals/page.js) as a matched credit-card charge --
  // keyed by simple_closeout_transactions.id. Those rows render read-only
  // below (see the transactions.map render) instead of the normal pills,
  // since categorizing them again here would just create a second,
  // conflicting record of the same real expense.
  const [linkedWithdrawalsByTxnId, setLinkedWithdrawalsByTxnId] = useState({});
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
  // Saved businesses (Settings, Your profile). Income and business expenses
  // are attributed to one of them, which is what profit by business adds up.
  const [businesses, setBusinesses] = useState([]);
  const [cashBizExpenses, setCashBizExpenses] = useState([]);
  const [showHandled, setShowHandled] = useState(false);

  const load = async (p) => {
    setLoading(true);
    setRecommendations(null);
    setEditingConfirmed(false);
    if (persona === null) {
      fetch("/api/profile")
        .then((r) => r.json())
        .then((d) => {
          setPersona(d.profile?.persona || null);
          setEntityType(d.profile?.entityType || null);
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
    const [closeoutRes, accountsRes, realRes, withdrawalsRes] = await Promise.all([
      fetch(`/api/closeout/${p}`).then((r) => r.json()),
      fetch("/api/accounts").then((r) => r.json()),
      fetch("/api/retirement/real-accounts").then((r) => r.json()),
      fetch("/api/withdrawals").then((r) => r.json()),
    ]);
    const linkedMap = {};
    (withdrawalsRes.withdrawals || []).forEach((w) => {
      if (w.closeoutTransactionId) linkedMap[w.closeoutTransactionId] = w;
    });
    setLinkedWithdrawalsByTxnId(linkedMap);
    setBusinesses(closeoutRes.businesses || []);
    setCashBizExpenses(
      (withdrawalsRes.withdrawals || []).filter(
        (w) => w.businessId && !w.closeoutTransactionId && w.sourceType === "cash" && String(w.occurredAt || "").slice(0, 7) === p
      )
    );
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
      notify("Couldn't save that category, please try again.");
      return;
    }
    if (category === "income" && businesses.length === 1) {
      const txn = transactions.find((t) => t.id === txnId);
      if (txn && !txn.business_id) setBusiness(txnId, businesses[0].id);
    }
    if (isConfirmed) handleConfirm();
  };

  // Attributes one deposit or expense to a business. Profit by business
  // updates right away.
  const setBusiness = async (txnId, businessId) => {
    const previous = transactions.find((t) => t.id === txnId)?.business_id ?? null;
    setTransactions((prev) => prev.map((t) => (t.id === txnId ? { ...t, business_id: businessId || null } : t)));
    const res = await fetch(`/api/closeout/transactions/${txnId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId: businessId || null }),
    });
    if (!res.ok) {
      setTransactions((prev) => prev.map((t) => (t.id === txnId ? { ...t, business_id: previous } : t)));
      notify("Couldn't save that business, please try again.");
    }
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
  const isOpexLabel = (label) => /^Business Expenses/i.test(label || "");

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

  // The Charges column's category dropdown calls this directly (see the
  // transactions render below). Two outcomes:
  //   - The chosen category's own balance covers the full amount (the
  //     common case) -- saves immediately with a single-category
  //     allocation, no separate button, no shortfall UI. This is what
  //     makes picking a category feel like "select it and the dashboard
  //     updates," per explicit feedback that a whole extra panel/button
  //     for the common case was more friction than needed.
  //   - It doesn't cover the full amount -- falls back to the existing
  //     panel (WithdrawalAllocator + explicit Save button) so the person
  //     can say where the rest came from, same as before.
  const selectExpenseCategory = (t, label) => {
    setExpenseCategoryInline(t.id, label);
    if (!label) return;
    // Business expenses are attributed to one business first (it saves as
    // soon as one is picked; with a single business it is picked for them).
    if (isOpexLabel(label)) {
      if (businesses.length === 1) selectExpenseBusiness(t, businesses[0].id, label);
      return;
    }
    const amt = Number(t.amount) || 0;
    const balance = label === "Other" ? Infinity : Number(categoryBalances[label]) || 0;
    if (balance >= amt) {
      const allocations =
        label === "Other" ? [{ label: "Other", amount: amt, sourceType: "external" }] : [{ label, amount: amt, sourceType: "category" }];
      updateExpensePanel(t.id, { allocations, allocationsComplete: true });
      saveExpense(t, allocations);
    }
  };

  const selectExpenseBusiness = (t, businessId, labelOverride) => {
    updateExpensePanel(t.id, { businessId: businessId || null });
    if (!businessId) return;
    const label = labelOverride || expensePanels[t.id]?.categoryLabel;
    const amt = Number(t.amount) || 0;
    const balance = Number(categoryBalances[label]) || 0;
    if (label && balance >= amt) {
      const allocations = [{ label, amount: amt, sourceType: "category" }];
      updateExpensePanel(t.id, { allocations, allocationsComplete: true });
      saveExpense(t, allocations, businessId, label);
    }
  };

  // Backs the "Paid by" / "For" columns added on each Deposit row -- two
  // free-text notes folded into one string in
  // simple_closeout_transactions.income_source ("Acme Corp, Website
  // redesign"), saved on blur only if it actually changed, mirroring
  // setCategory's optimistic-update-with-rollback pattern above.
  const [incomeSourceDrafts, setIncomeSourceDrafts] = useState({});
  const saveIncomeSource = async (txnId, payer, purpose) => {
    const previous = transactions.find((t) => t.id === txnId)?.income_source ?? null;
    const next = [payer.trim(), purpose.trim()].filter(Boolean).join(", ") || null;
    if (next === previous) return;
    setTransactions((prev) => prev.map((t) => (t.id === txnId ? { ...t, income_source: next } : t)));
    const res = await fetch(`/api/closeout/transactions/${txnId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ incomeSource: next }),
    });
    if (!res.ok) {
      setTransactions((prev) => prev.map((t) => (t.id === txnId ? { ...t, income_source: previous } : t)));
      notify("Couldn't save that, please try again.");
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

  // `overrideAllocations`, when passed, skips the "did WithdrawalAllocator
  // report complete" check entirely -- used by selectExpenseCategory below
  // for the common case where the chosen category's own balance covers
  // the whole amount, so the person never has to see the allocator or
  // click a separate Save at all; picking the category IS the save. The
  // shortfall-cascade path (category can't cover it) still goes through
  // the allocator + explicit Save button exactly as before, with
  // overrideAllocations left undefined.
  const saveExpense = async (txn, overrideAllocations, businessIdOverride, labelOverride) => {
    const panel = expensePanels[txn.id] || {};
    const categoryLabel = labelOverride || panel.categoryLabel;
    if (!categoryLabel) {
      updateExpensePanel(txn.id, { error: "Pick a category (or Other) before saving." });
      return;
    }
    const expenseBusinessId = businessIdOverride || panel.businessId || null;
    if (isOpexLabel(categoryLabel) && !expenseBusinessId) {
      updateExpensePanel(txn.id, { error: "Pick which business this expense was for." });
      return;
    }
    if (!overrideAllocations && !panel.allocationsComplete) {
      updateExpensePanel(txn.id, { error: "Finish accounting for the full amount before saving." });
      return;
    }
    const allocations = overrideAllocations || panel.allocations;
    const mileage = isMileageLabel(categoryLabel);
    const meals = isMealsLabel(categoryLabel);
    updateExpensePanel(txn.id, { saving: true, error: null });
    const res = await fetch("/api/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(txn.amount) || 0,
        description: txn.name,
        occurredAt: txn.txn_date,
        categoryLabel,
        receiptUrl: panel.receiptUrl,
        mileageMiles: mileage ? panel.mileageMiles : null,
        mileagePurpose: mileage ? panel.mileagePurpose : null,
        mealPurpose: meals ? panel.mealPurpose : null,
        mealAttendees: meals ? panel.mealAttendees : null,
        allocations,
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
    if (expenseBusinessId) await setBusiness(txn.id, expenseBusinessId);
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
      notify(res.error);
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
      notify(res.error);
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
      color: teamObligationsRow?.color || pickUniqueColor(others.map((r) => r.color)),
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
      notify("Couldn't save this reserve, please try again.");
      return;
    }
    setSplitRulesPercent(nextPercent);
    setObligationsForm({ pct: "", cap: "", accountId: null });
    setEditingObligations(false);
  };

  // Declared here (not just below the loading-gate return) because
  // canEditNow and the render* functions right below reference it --
  // `const` bindings are in their temporal dead zone until the line that
  // declares them runs, so this MUST come before any use, not after (a
  // duplicate `const isConfirmed` used to also exist further down, past
  // the loading-gate return, which threw "Cannot access before
  // initialization" on every render since JS evaluates this whole
  // function body top-to-bottom regardless of the `if (loading) return`
  // in between two of its statements).
  const isConfirmed = closeout?.status === "confirmed";
  const canEditNow = !isConfirmed || editingConfirmed;
  const depositTxns = transactions.filter((t) => t.direction === "in");
  const chargeTxns = transactions.filter((t) => t.direction === "out");
  const catOf = (t) => t.confirmed_category || t.suggested_category;
  const moneyInTotal = depositTxns.filter((t) => catOf(t) === "income").reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const moneyOutTotal = chargeTxns.filter((t) => catOf(t) === "expense").reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  // What is left to handle: a deposit or charge the person (or Split My
  // Deposits / Withdrawals) has already answered is "handled". Biz income
  // only counts as handled once it has a business.
  const isHandled = (t) => {
    if (linkedWithdrawalsByTxnId[t.id]) return true;
    const c = t.confirmed_category;
    if (!c) return false;
    if (t.direction === "in" && c === "income") return Boolean(t.business_id);
    return true;
  };
  const attentionDeposits = depositTxns.filter((t) => !isHandled(t));
  const attentionCharges = chargeTxns.filter((t) => !isHandled(t));
  const handledDeposits = depositTxns.filter(isHandled);
  const handledCharges = chargeTxns.filter(isHandled);
  const attentionCount = attentionDeposits.length + attentionCharges.length;

  // Profit by business: income and expenses attributed to each saved business.
  const profitRows = businesses.filter((b) => !paysByDraw(b.entityType)).map((b) => {
    const income = depositTxns.filter((t) => catOf(t) === "income" && t.business_id === b.id).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const cardExpenses = chargeTxns.filter((t) => catOf(t) === "expense" && t.business_id === b.id).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const cashExpenses = cashBizExpenses.filter((w) => w.businessId === b.id).reduce((sum, w) => sum + (Number(w.amount) || 0), 0);
    const expenses = cardExpenses + cashExpenses;
    return { ...b, income, expenses, profit: income - expenses };
  });
  const profitTotals = profitRows.reduce((a, r) => ({ income: a.income + r.income, expenses: a.expenses + r.expenses, profit: a.profit + r.profit }), { income: 0, expenses: 0, profit: 0 });
  const unassignedIncome = depositTxns.filter((t) => catOf(t) === "income" && !t.business_id).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  // Income this month by where it came from. Business income tagged to an
  // LLC (or any entity that pays by draw) is an owner's draw; the rest of
  // Biz income is the sole proprietor business. Excluded deposits are not income.
  const businessById = Object.fromEntries(businesses.map((b) => [b.id, b]));
  const sumOf = (list) => list.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const isDrawDeposit = (t) => catOf(t) === "income" && t.business_id && paysByDraw(businessById[t.business_id]?.entityType);
  const bizIncomeDeposits = depositTxns.filter((t) => catOf(t) === "income" && !isDrawDeposit(t));
  const drawDeposits = depositTxns.filter(isDrawDeposit);
  const w2Deposits = depositTxns.filter((t) => catOf(t) === "w2_income");
  const investmentDeposits = depositTxns.filter((t) => catOf(t) === "investment_income");
  const miscDeposits = depositTxns.filter((t) => catOf(t) === "misc_income");
  const namesOf = (list) => [...new Set(list.map((t) => businessById[t.business_id]?.name).filter(Boolean))].join(", ");
  const hasSoleProp = businesses.some((b) => !paysByDraw(b.entityType));
  const incomeSources = [
    { key: "biz", label: hasSoleProp || businesses.length === 0 ? "Sole proprietor business" : "Business income", list: bizIncomeDeposits, detail: namesOf(bizIncomeDeposits), color: "#6D3BE0" },
    { key: "draw", label: "Owner's draw", list: drawDeposits, detail: namesOf(drawDeposits), color: "#9A72F0" },
    { key: "w2", label: "W-2 paycheck", list: w2Deposits, detail: "", color: "#C9B8F5" },
    { key: "inv", label: "Investment income", list: investmentDeposits, detail: "", color: "#2A1550" },
    { key: "misc", label: "Miscellaneous", list: miscDeposits, detail: "", color: "#8B84A0" },
  ].map((r) => ({ ...r, amount: sumOf(r.list) })).filter((r) => r.list.length > 0);
  const incomeGrandTotal = incomeSources.reduce((sum, r) => sum + r.amount, 0);

  // Compact rows for what still needs sorting: one line per transaction.
  const [openDetails, setOpenDetails] = useState({});
  const chargeChoice = (t) => {
    const c = catOf(t);
    if (c === "expense") return t.business_id || (t.confirmed_category ? "__biz" : "");
    if (c === "exclude" && t.confirmed_category) return "__personal";
    return "";
  };
  const pickChargeChoice = async (t, v) => {
    if (!canEditNow || !v) return;
    if (v === "__personal") {
      closeExpensePanel(t.id);
      await setCategory(t.id, "exclude");
      return;
    }
    await setCategory(t.id, "expense");
    if (v !== "__biz") await setBusiness(t.id, v);
  };
  const compactTop = (t, acc, sign, hint) => {
    const [, m, d] = String(t.txn_date || "").split("-");
    return (
      <>
        <div style={{ textAlign: "center", lineHeight: 1.1 }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.08em", color: PS_ACCENT }}>{MONTHS_ABBR[(Number(m) || 1) - 1]}</div>
          <div style={{ fontSize: 19, fontWeight: 800, color: PS_INK }}>{Number(d) || ""}</div>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: PS_INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
          <div style={{ fontSize: 13, color: PS_MUTED }}>{acc ? `${acc.institution_name}${acc.mask ? ` •••• ${acc.mask}` : ""}` : ""}{hint ? ` · ${hint}` : ""}</div>
        </div>
        <span style={{ fontFamily: '"IBM Plex Mono", ui-monospace, monospace', fontSize: 16, fontWeight: 600, color: PS_INK, textAlign: "right" }}>{sign}{currency(t.amount)}</span>
      </>
    );
  };
  const compactSelect = { border: "2px solid #9A72F0", borderRadius: 12, background: "#fff", color: PS_INK, fontWeight: 700, fontSize: 14.5, padding: "9px 12px", width: "100%", minWidth: 0 };
  const compactRowStyle = (i) => ({ borderTop: i ? "1.5px solid #E7DEFA" : "none", padding: "11px 0" });
  const compactGrid = { display: "grid", gridTemplateColumns: "54px minmax(0, 1fr) 90px minmax(0, 230px)", gap: 14, alignItems: "center" };

  const renderCompactDeposit = (t, i) => {
    const acc = accountsById[t.account_id];
    const cat = t.confirmed_category || "";
    const [defaultPayer, defaultPurpose] = (t.income_source || "").split(", ");
    const suggestion = depositCats.find((c) => c.value === t.suggested_category);
    return (
      <div key={t.id} style={compactRowStyle(i)}>
        <div className="co-grid" style={compactGrid}>
          {compactTop(t, acc, "+", !cat && suggestion ? `looks like ${suggestion.label.toLowerCase()}` : "")}
          <select value={cat} onChange={(e) => canEditNow && e.target.value && setCategory(t.id, e.target.value)} disabled={!canEditNow} aria-label={`Type for ${t.name}`} style={compactSelect}>
            {!cat && <option value="">Choose a type</option>}
            {depositCats.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        {cat === "income" && (
          <div className="flex items-center gap-3 flex-wrap" style={{ marginTop: 8, paddingLeft: 68 }}>
            {businesses.length === 0 ? (
              <span style={{ fontSize: 13, color: PS_MUTED }}>
                No businesses added yet. <a href="/settings" style={{ color: PS_ACCENT, fontWeight: 800 }}>Add them in Settings</a>
              </span>
            ) : (
              <select value={t.business_id || ""} onChange={(e) => setBusiness(t.id, e.target.value)} disabled={!canEditNow} aria-label="Which business" style={{ ...compactSelect, width: 260, border: `2px solid ${t.business_id ? "#9A72F0" : "#B3261E"}` }}>
                {!t.business_id && <option value="">Which business?</option>}
                {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}{b.entityType ? ` · ${entityLabel(b.entityType)}` : ""}</option>)}
              </select>
            )}
            <input
              type="text"
              placeholder="Paid by (optional)"
              defaultValue={defaultPayer || ""}
              onChange={(e) => setIncomeSourceDrafts((prev) => ({ ...prev, [t.id]: { ...prev[t.id], payer: e.target.value } }))}
              onBlur={(e) => saveIncomeSource(t.id, e.target.value, defaultPurpose || "")}
              disabled={!canEditNow}
              style={{ ...compactSelect, width: 200 }}
            />
          </div>
        )}
      </div>
    );
  };

  const renderCompactCharge = (t, i) => {
    const acc = accountsById[t.account_id];
    const choice = chargeChoice(t);
    return (
      <div key={t.id} style={compactRowStyle(i)}>
        <div className="co-grid" style={compactGrid}>
          {compactTop(t, acc, "-", "")}
          <select value={choice} onChange={(e) => pickChargeChoice(t, e.target.value)} disabled={!canEditNow} aria-label={`Business or personal for ${t.name}`} style={compactSelect}>
            {!choice && <option value="">Business or personal?</option>}
            {businesses.length === 0 && <option value="__biz">Business expense</option>}
            {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            <option value="__personal">Personal (leave out)</option>
          </select>
        </div>
        {choice && choice !== "__personal" && (
          <div style={{ marginTop: 6, paddingLeft: 68 }}>
            <button type="button" onClick={() => setOpenDetails((p) => ({ ...p, [t.id]: !p[t.id] }))} style={{ background: "none", border: 0, cursor: "pointer", fontSize: 13, fontWeight: 800, color: PS_ACCENT }}>
              {openDetails[t.id] ? "Hide details" : "Details: category, receipt"}
            </button>
          </div>
        )}
        {openDetails[t.id] && <div style={{ marginTop: 8 }}>{renderChargeRow(t)}</div>}
      </div>
    );
  };
  const entityLabel = (v) => (v === "Sole proprietor / freelancer" ? "Sole proprietor" : v || "");

  // Shared by both Deposits and Charges: a transaction already recorded
  // from the Withdrawals tab as a matched card charge renders read-only
  // instead of the normal pills/panel, so it never gets a second,
  // conflicting category assigned to it here. Edit it from Withdrawals.
  const renderLinkedRow = (t, acc, linked) => (
    <div key={t.id} style={psRowCard(false)}>
      <PsRowTop t={t} acc={acc} sign={t.direction === "in" ? "+" : "-"} />
      <Link
        href="/withdrawals"
        className="inline-block mt-3"
        style={{ fontSize: 14, fontWeight: 800, color: PS_ACCENT, background: "#EDE6FF", border: "2px solid #CBB8F5", borderRadius: 999, padding: "6px 14px" }}
      >
        Logged: {linked.allocations.length ? linked.allocations.map((a) => a.label || "Other").join(" + ") : linked.categoryLabel || "Other"}
      </Link>
    </div>
  );

  const renderDepositRow = (t) => {
    const acc = accountsById[t.account_id];
    const linked = linkedWithdrawalsByTxnId[t.id];
    if (linked) return renderLinkedRow(t, acc, linked);
    const cat = t.confirmed_category || t.suggested_category;
    const [defaultPayer, defaultPurpose] = (t.income_source || "").split(", ");
    return (
      <div key={t.id} style={psRowCard(cat === "exclude")}>
        <PsRowTop t={t} acc={acc} sign="+" />
        <div className="mt-3">
          <PsSegmented
            options={depositCats}
            isSelected={(c) => cat === c.value}
            onPick={(c) => canEditNow && setCategory(t.id, c.value)}
            disabled={!canEditNow}
          />
        </div>
        {cat === "income" && (
          <div className="mt-3">
            {businesses.length === 0 ? (
              <div className="p-3 text-xs" style={bloomNoticeCardStyle()}>
                <b>No businesses added yet.</b> Add each business in Settings and pick its type (sole proprietor, LLC, S corp and more), then come back to pick one.{" "}
                <a href="/settings" style={{ color: PS_ACCENT, fontWeight: 800 }}>Open Settings</a>
              </div>
            ) : (
              <div className="flex items-end gap-3 flex-wrap">
                <label className="text-xs" style={{ color: PS_MUTED, fontWeight: 800 }}>
                  Which business? <span style={{ color: "#B3261E" }}>*</span>
                  <select
                    value={t.business_id || ""}
                    onChange={(e) => setBusiness(t.id, e.target.value)}
                    disabled={!canEditNow}
                    className="block mt-1 text-sm rounded-xl px-3 py-2.5 disabled:opacity-60"
                    style={{ border: `2px solid ${t.business_id ? "#9A72F0" : "#B3261E"}`, background: "#fff", color: PS_INK, fontWeight: 700, minWidth: 240 }}
                  >
                    {!t.business_id && <option value="">Choose a business</option>}
                    {businesses.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}{b.entityType ? ` · ${entityLabel(b.entityType)}` : ""}</option>
                    ))}
                  </select>
                </label>
                <input
                  type="text"
                  placeholder="Paid by (optional)"
                  defaultValue={defaultPayer || ""}
                  onChange={(e) => setIncomeSourceDrafts((prev) => ({ ...prev, [t.id]: { ...prev[t.id], payer: e.target.value } }))}
                  onBlur={(e) => saveIncomeSource(t.id, e.target.value, defaultPurpose || "")}
                  disabled={!canEditNow}
                  className="text-sm rounded-xl px-3 py-2.5 w-48 disabled:opacity-60"
                  style={{ border: "2px solid #9A72F0", background: "#fff" }}
                />
              </div>
            )}
            {businesses.length > 0 && !t.business_id && (
              <div style={{ fontSize: 13, color: "#B3261E", fontWeight: 700, marginTop: 6 }}>Pick a business so this counts toward its profit.</div>
            )}
            {t.from_deposit && t.business_id && (
              <div style={{ fontSize: 13, color: PS_MUTED, marginTop: 6 }}>Set on Split My Deposits. Change it here if anything looks off.</div>
            )}
          </div>
        )}
        {cat === "w2_income" && (
          <div className="flex items-center gap-2 flex-wrap mt-3">
            <input
              type="text"
              placeholder="Paid by (optional)"
              defaultValue={defaultPayer || ""}
              onChange={(e) => setIncomeSourceDrafts((prev) => ({ ...prev, [t.id]: { ...prev[t.id], payer: e.target.value } }))}
              onBlur={(e) => saveIncomeSource(t.id, e.target.value, defaultPurpose || "")}
              disabled={!canEditNow}
              className="text-sm rounded-xl px-3 py-2.5 w-48 disabled:opacity-60"
              style={{ border: "2px solid #9A72F0", background: "#fff" }}
            />
          </div>
        )}
        {cat === "exclude" && (
          <div style={{ fontSize: 13.5, color: PS_MUTED, marginTop: 8 }}>
            Use Exclude for miscellaneous payments that have nothing to do with a side hustle or business income.
          </div>
        )}
      </div>
    );
  };

  const renderChargeRow = (t) => {
    const acc = accountsById[t.account_id];
    const linked = linkedWithdrawalsByTxnId[t.id];
    if (linked) return renderLinkedRow(t, acc, linked);
    const cat = t.confirmed_category || t.suggested_category;
    const panel = expensePanels[t.id];
    const mileage = panel && isMileageLabel(panel.categoryLabel);
    const meals = panel && isMealsLabel(panel.categoryLabel);
    return (
      <div key={t.id} style={psRowCard(cat === "exclude")}>
        <PsRowTop t={t} acc={acc} sign="-" />
        <div className="mt-3">
          <PsSegmented
            options={chargeCats}
            isSelected={(c) => cat === c.value || (c.value === "expense" && panel?.open)}
            onPick={(c) => {
              if (!canEditNow) return;
              if (c.value === "expense") openExpensePanel(t.id);
              else {
                closeExpensePanel(t.id);
                setCategory(t.id, c.value);
              }
            }}
            disabled={!canEditNow}
          />
        </div>
        {cat === "expense" && (
          <div className="flex items-center gap-2 flex-wrap mt-3">
            <select
              value={panel?.categoryLabel || ""}
              onChange={(e) => selectExpenseCategory(t, e.target.value || null)}
              disabled={!canEditNow}
              className="text-sm border border-neutral-200 rounded-lg px-2 py-1 disabled:opacity-60"
            >
              <option value="">Categorize…</option>
              {splitRulesPercent.map((r) => (
                <option key={r.id} value={r.label}>{r.label}</option>
              ))}
              <option value="Other">Other (not tracked)</option>
            </select>
            <label className="flex items-center gap-1.5 cursor-pointer" style={{ color: PS_ACCENT, fontWeight: 800, fontSize: 14, border: "2px solid #CBB8F5", borderRadius: 14, padding: "10px 14px", minHeight: 48 }}>
              <Paperclip size={15} />
              {panel?.uploading ? "Uploading…" : panel?.receiptUrl ? "Receipt attached" : "Attach receipt for taxes"}
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadReceipt(t.id, e.target.files[0])}
              />
            </label>
          </div>
        )}
        {(isOpexLabel(panel?.categoryLabel) || (cat === "expense" && t.business_id)) && (
          <div className="mt-3">
            {businesses.length === 0 ? (
              <div className="p-3 text-xs" style={bloomNoticeCardStyle()}>
                <b>No businesses added yet.</b> Add each business in Settings, then come back to attribute this expense.{" "}
                <a href="/settings" style={{ color: PS_ACCENT, fontWeight: 800 }}>Open Settings</a>
              </div>
            ) : (
              <label className="text-xs" style={{ color: PS_MUTED, fontWeight: 800 }}>
                Which business? <span style={{ color: "#B3261E" }}>*</span>
                <select
                  value={panel?.businessId || t.business_id || ""}
                  onChange={(e) => (panel ? selectExpenseBusiness(t, e.target.value) : setBusiness(t.id, e.target.value))}
                  disabled={!canEditNow}
                  className="block mt-1 text-sm rounded-xl px-3 py-2.5 disabled:opacity-60"
                  style={{ border: `2px solid ${panel?.businessId || t.business_id ? "#9A72F0" : "#B3261E"}`, background: "#fff", color: PS_INK, fontWeight: 700, minWidth: 240 }}
                >
                  {!(panel?.businessId || t.business_id) && <option value="">Choose a business</option>}
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}{b.entityType ? ` · ${entityLabel(b.entityType)}` : ""}</option>
                  ))}
                </select>
              </label>
            )}
            {t.business_id && <div style={{ fontSize: 13, color: "#0F6B4F", fontWeight: 700, marginTop: 6 }}>Counted in {businesses.find((b) => b.id === t.business_id)?.name || "your business"} expenses</div>}
          </div>
        )}
        {/* Only surfaces when the chosen category can't cover the full
            amount -- selectExpenseCategory already auto-saved the common
            case above, so this panel is reserved for the shortfall
            cascade, mileage/meals detail, and the explicit Save/Cancel. */}
        {panel?.open && (
          <div
            className="mt-2 p-3 space-y-2.5"
            style={{ background: "var(--color-neutral-100)", border: "1px solid var(--color-divider)", borderRadius: "var(--radius-md)" }}
          >
            {!panel.categoryLabel && (
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
            )}

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
  };

  if (loading) return <p className="text-sm text-[var(--color-neutral-700)]">Loading…</p>;

  const isTooEarlyToClose = period >= currentPeriod() && !(period === currentPeriod() && isLastDayOfCurrentMonthUTC());
  const displayNetIncome = isConfirmed ? Number(closeout?.net_income) || 0 : netIncomePreview;
  const displayW2Income = recommendations?.w2Income ?? w2IncomePreview;
  const displayBusiness = recommendations?.business ?? businessPreview;
  const liveTaxEstimate = estimateTaxReserve(displayNetIncome, taxRatePct);
  const annualNetIncomeValue = annualNetIncome === "" ? displayNetIncome * 12 : Number(annualNetIncome) || 0;
  const annualTaxEstimate = estimateTaxReserve(annualNetIncomeValue, annualTaxRatePct);

  return (
    <div className="ps-page max-w-2xl lg:max-w-[1200px] space-y-6" style={BLOOM_TOKENS}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GhostButton onClick={() => setPeriod((p) => shiftPeriod(p, -1))} className="px-2 py-1.5">
            <ChevronLeft size={16} />
          </GhostButton>
          <span style={{ fontSize: 17, fontWeight: 800, background: "#EDE6FF", color: PS_ACCENT, borderRadius: 999, padding: "8px 18px" }} className="text-center">{periodLabel(period)}</span>
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
      <div className="space-y-6">
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
                ? ", you're editing now. Retirement room, tax reserve, and Tax Summary all recalculate the moment you change a category. Money already sent isn't undone, only what's left to send adjusts."
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
          <div className="space-y-6">
            {/* Two columns instead of one shared list -- Deposits (money
                in) and Charges (money out) each only need their own
                category set, so a row never shows classification options
                (or inline fields, like the old "who was this from" input)
                that don't apply to its own direction. This includes every
                synced credit-card charge alongside bank debits -- cards
                aren't split out separately, just shown with their account
                name/mask like any other row (see `acc` below). */}
            {incomeSources.length > 0 && (
              <div style={{ background: "#fff", border: "2px solid #9A72F0", borderRadius: 22, padding: "18px 22px" }}>
                <div className="flex items-baseline justify-between flex-wrap gap-2">
                  <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: PS_ACCENT }}>Income this month, by where it came from</div>
                  <div style={{ fontSize: 13.5, color: PS_MUTED }}>Updates as you tag deposits</div>
                </div>
                <div className="overflow-x-auto">
                  <div style={{ minWidth: 460, marginTop: 8 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.4fr .8fr", gap: 14, fontSize: 11.5, fontWeight: 800, letterSpacing: "0.1em", color: PS_MUTED }}>
                      <div>SOURCE</div><div>SHARE</div><div style={{ textAlign: "right" }}>AMOUNT</div>
                    </div>
                    {incomeSources.map((r) => {
                      const pct = incomeGrandTotal > 0 ? Math.round((r.amount / incomeGrandTotal) * 100) : 0;
                      return (
                        <div key={r.key} style={{ display: "grid", gridTemplateColumns: "1.5fr 1.4fr .8fr", gap: 14, alignItems: "center", padding: "13px 0", borderTop: "1.5px solid #E7DEFA" }}>
                          <div>
                            <div style={{ fontSize: 16.5, fontWeight: 800, color: PS_INK }}>{r.label}</div>
                            <div style={{ fontSize: 13, color: PS_MUTED }}>{[r.detail, `${r.list.length} deposit${r.list.length === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}</div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ flex: 1, height: 10, borderRadius: 99, background: "#EDE6FF", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${pct}%`, background: r.color, borderRadius: 99 }} />
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: PS_MUTED, width: 38, textAlign: "right" }}>{pct}%</div>
                          </div>
                          <div style={{ textAlign: "right", fontFamily: '"IBM Plex Mono", ui-monospace, monospace', fontSize: 17, fontWeight: 600 }}>{currency(r.amount)}</div>
                        </div>
                      );
                    })}
                    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.4fr .8fr", gap: 14, alignItems: "center", padding: "14px 0 2px", borderTop: `2px solid ${PS_INK}` }}>
                      <div style={{ fontSize: 17, fontWeight: 800, color: PS_INK }}>Total income</div>
                      <div />
                      <div style={{ textAlign: "right", fontFamily: '"IBM Plex Mono", ui-monospace, monospace', fontSize: 24, fontWeight: 700 }}>{currency(incomeGrandTotal)}</div>
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: PS_MUTED, marginTop: 6 }}>Tax reserve and retirement only apply to the business lines. Investment income and miscellaneous stay out of them.</div>
              </div>
            )}

            {profitRows.length > 0 && (
              <div style={{ background: "#fff", border: "2px solid #9A72F0", borderRadius: 22, padding: "18px 22px" }}>
                <div className="flex items-baseline justify-between flex-wrap gap-2">
                  <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: PS_ACCENT }}>Business income and expenses, {periodLabel(period)}</div>
                  <div style={{ fontSize: 13.5, color: PS_MUTED }}>Updates as you sort expenses below</div>
                </div>
                <div className="overflow-x-auto">
                  <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8, minWidth: 460 }}>
                    <thead>
                      <tr style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: "0.1em", color: PS_MUTED, textAlign: "right" }}>
                        <th style={{ textAlign: "left", padding: "6px 0" }}>BUSINESS</th>
                        <th>INCOME</th>
                        <th>EXPENSES</th>
                        <th>PROFIT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profitRows.map((r) => (
                        <tr key={r.id} style={{ borderTop: "1.5px solid #E7DEFA", fontSize: 16 }}>
                          <td style={{ padding: "12px 0" }}>
                            <div style={{ fontWeight: 800, color: PS_INK }}>{r.name}</div>
                            <div style={{ fontSize: 13, color: PS_MUTED }}>{entityLabel(r.entityType)}</div>
                          </td>
                          <td style={{ textAlign: "right", fontFamily: '"IBM Plex Mono", ui-monospace, monospace', fontWeight: 600 }}>{currency(r.income)}</td>
                          <td style={{ textAlign: "right", fontFamily: '"IBM Plex Mono", ui-monospace, monospace', fontWeight: 600 }}>{currency(r.expenses)}</td>
                          <td style={{ textAlign: "right", fontFamily: '"IBM Plex Mono", ui-monospace, monospace', fontWeight: 700, color: r.profit < 0 ? "#B3261E" : "#0F6B4F" }}>{currency(r.profit)}</td>
                        </tr>
                      ))}
                      {profitRows.length > 1 && (
                        <tr style={{ borderTop: `2px solid ${PS_INK}`, fontSize: 16, fontWeight: 800 }}>
                          <td style={{ padding: "12px 0", color: PS_INK }}>All businesses</td>
                          <td style={{ textAlign: "right", fontFamily: '"IBM Plex Mono", ui-monospace, monospace' }}>{currency(profitTotals.income)}</td>
                          <td style={{ textAlign: "right", fontFamily: '"IBM Plex Mono", ui-monospace, monospace' }}>{currency(profitTotals.expenses)}</td>
                          <td style={{ textAlign: "right", fontFamily: '"IBM Plex Mono", ui-monospace, monospace', color: profitTotals.profit < 0 ? "#B3261E" : "#0F6B4F" }}>{currency(profitTotals.profit)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {unassignedIncome > 0 && (
                  <div style={{ fontSize: 13.5, color: "#8A6A00", fontWeight: 700, marginTop: 8 }}>
                    {currency(unassignedIncome)} of Biz Income has no business yet and is not in these numbers.
                  </div>
                )}
              </div>
            )}

            {(handledDeposits.length > 0 || handledCharges.length > 0) && (
              <div style={{ background: "#fff", border: "1.5px solid #E7DEFA", borderRadius: 18, padding: "14px 18px" }}>
                <button type="button" onClick={() => setShowHandled((v) => !v)} className="flex items-center gap-3 w-full text-left" style={{ background: "none", border: 0, cursor: "pointer" }}>
                  <span style={{ width: 30, height: 30, borderRadius: 99, background: "#E1F5EC", color: "#0F6B4F", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                    <CheckCircle2 size={16} />
                  </span>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: "block", fontSize: 16, fontWeight: 800, color: PS_INK }}>Already handled</span>
                    <span style={{ display: "block", fontSize: 14, color: PS_MUTED }}>
                      {handledDeposits.length} deposit{handledDeposits.length === 1 ? "" : "s"} and {handledCharges.length} expense{handledCharges.length === 1 ? "" : "s"} are counted.
                    </span>
                  </span>
                  <span style={{ fontSize: 14.5, fontWeight: 800, color: PS_ACCENT }}>{showHandled ? "Hide" : "View"}</span>
                </button>
                {showHandled && (
                  <div className="space-y-3 mt-3">
                    {handledDeposits.map((t) => renderDepositRow(t))}
                    {handledCharges.map((t) => renderChargeRow(t))}
                  </div>
                )}
              </div>
            )}

            <div>
              <div className="flex items-baseline gap-3 flex-wrap mb-3">
                <h3 style={{ fontSize: 22, fontWeight: 800, color: PS_INK }}>Needs your attention</h3>
                <span style={{ fontSize: 14.5, color: PS_MUTED }}>
                  {attentionCount === 0 ? "Nothing left. Everything is handled." : `${attentionCount} item${attentionCount === 1 ? "" : "s"} left. Only what is not already handled.`}
                </span>
              </div>
              <div className="space-y-6">
              {attentionDeposits.length > 0 && (
                <div>
                  <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.1em", color: PS_MUTED }}>INCOME</div>
                    <div style={{ fontSize: 13.5, color: PS_MUTED }}>Most of your income is already sorted from Split My Deposits</div>
                  </div>
                  <div style={{ background: "#fff", border: "1.5px solid #D9C9FF", borderRadius: 22, padding: "8px 22px" }}>{attentionDeposits.map((t, i) => renderCompactDeposit(t, i))}</div>
                </div>
              )}
              {attentionCharges.length > 0 && (
                <div>
                  <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.1em", color: PS_MUTED }}>EXPENSES</div>
                  </div>
                  <div className="max-h-[48rem] overflow-y-auto" style={{ background: "#fff", border: "1.5px solid #D9C9FF", borderRadius: 22, padding: "8px 22px" }}>{attentionCharges.map((t, i) => renderCompactCharge(t, i))}</div>
                  <div style={{ fontSize: 13.5, color: PS_MUTED, marginTop: 8 }}>Expenses marked Personal are left out of your business numbers.</div>
                </div>
              )}
              </div>
            </div>
          </div>
        )}
        <div className="mt-6" style={{ background: "#EDE6FF", border: "2px solid #CBB8F5", borderRadius: 20, padding: "18px 20px" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: PS_ACCENT, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Net income {isConfirmed ? "(confirmed)" : "(preview)"}
          </div>
          <div style={{ fontFamily: '"IBM Plex Mono", ui-monospace, monospace', fontSize: 38, fontWeight: 700, color: PS_INK, lineHeight: 1.2 }}>
            {currency(displayNetIncome)}
          </div>
          <div style={{ fontSize: 14, color: PS_MUTED }}>
            Money in {currency(moneyInTotal)} − expenses {currency(moneyOutTotal)}
          </div>
        </div>
        {displayW2Income > 0 && (
          <div className="flex items-center justify-between text-xs text-[var(--color-neutral-700)] mt-1">
            <span>W2 income this month (excluded from retirement &amp; tax below)</span>
            <span className="font-mono">{currency(displayW2Income)}</span>
          </div>
        )}
        {displayBusiness > 0 && (
          <div className="flex items-center justify-between text-xs text-[var(--color-neutral-700)] mt-1">
            <span>Flagged as business this month (excluded, belongs to the business side, see Tax Summary)</span>
            <span className="font-mono">{currency(displayBusiness)}</span>
          </div>
        )}
        {!isConfirmed && (
          <PrimaryButton onClick={handleConfirm} disabled={confirming} className="w-full mt-4" style={{ minHeight: 56, fontSize: 18 }}>
            {confirming ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            {confirming ? "Confirming…" : isW2NoSideHustlePersona || !showTaxGuidance ? "Save this month" : attentionCount > 0 ? `Confirm ${periodLabel(period).split(" ")[0]} (${attentionCount} left)` : "Confirm and see recommendations"}
          </PrimaryButton>
        )}
      </div>

      <SpendByCategory transactions={transactions} />

      {recommendations && !isW2NoSideHustlePersona && (
        <>
          {!showTaxGuidance && (
            <Card className="p-6">
              <h2 className="text-sm font-semibold mb-1">Taxes and retirement</h2>
              <p className="text-xs text-[var(--color-neutral-700)]" style={{ lineHeight: 1.6 }}>
                Tax set-aside and retirement suggestions are only calculated for sole proprietors. As an LLC or
                corporation owner, your taxes depend on your business&apos;s profit, not just what you pay yourself, so
                work out your tax set-aside and retirement contributions with your CPA. Everything else in Close-Out
                still works.
              </p>
            </Card>
          )}
          {showTaxGuidance && (
          <>
          <Card className="p-6">
            <h2 className="text-sm font-semibold mb-1">Step 2: Contribute to Retirement</h2>
            <p className="text-xs text-[var(--color-neutral-700)] mb-4">
              {isW2NoSideHustlePersona ? (
                <>
                  A 401k, IRA, and HSA are the retirement (and HSA) accounts available
                  to a W2 employee. For 2026, the elective-deferral limit relevant to a 401k is{" "}
                  {currency(electiveDeferralLimit(recommendations.ageBracket))}.
                </>
              ) : (
                <>
                  A solo 401(k) is a specialized retirement savings plan built for self-employed individuals and
                  business owners who have no employees, other than a spouse. For 2026, the combined annual limit is{" "}
                  {currency(overallDCLimit(recommendations.ageBracket))}, including up to{" "}
                  {currency(electiveDeferralLimit(recommendations.ageBracket))} as your own employee-style deferral.
                </>
              )}
            </p>
            {recommendations.retirement.length === 0 ? (
              <div className="space-y-5">
                <p className="text-sm text-[var(--color-neutral-700)]">
                  {isW2NoSideHustlePersona
                    ? "You haven't added a retirement category to your Income Split Rules yet. You can still calculate what you'd be able to contribute below, and see how to open one, before deciding what to route toward retirement."
                    : "You haven't added a Solo 401k category to your Income Split Rules yet. You can still calculate what you'd be able to contribute below, and see how to open one, before deciding what to route toward retirement."}
                </p>

                {!isBusinessOwnerWithEmployees && !isW2NoSideHustlePersona && (
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
                  {isW2NoSideHustlePersona
                    ? "Want a 401k, IRA, HSA, or another retirement account?"
                    : "Want a different retirement account instead?"}{" "}
                  <Link href="/splits" style={{ color: "var(--color-accent-700)", fontWeight: 600 }}>Connect another retirement account</Link> in
                  Income Split Rules so a share of every deposit is planned for it.
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
                            Solo 401k plans only cover a business owner and their spouse, with other employees on
                            payroll, the business isn&apos;t eligible for this specific plan, no exceptions. A
                            standard employer 401(k) or another employer-sponsored plan are the options to look
                            into instead, worth a conversation with a tax professional about which fits.
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
                          An employer-sponsored retirement plan that allows business owners to make tax-deductible
                          contributions for themselves and their eligible employees.
                        </p>
                      ) : (
                        <p className="text-xs text-[var(--color-neutral-700)] mb-2">
                          {currency(r.room)} of room left this year ({currency(r.ytdContributed)} sent through
                          PrioritySave so far this year, doesn&apos;t include anything contributed outside
                          PrioritySave). Holding in {r.holdingAccountLabel || "no account set"}
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
                Some people haven&apos;t set aside anything for taxes yet this year, use this to see roughly what
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
              but actual tax rates and amounts vary. PrioritySave isn&apos;t responsible for this number being
              accurate, and it&apos;s not tax advice. Talk to a tax professional about your real effective rate.
            </p>
            <p className="text-xs text-[var(--color-neutral-700)] mb-3">
              All of this stays in whichever account you already chose for Tax Reserve on Income Split Rules, this is
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
          </>
          )}

          {isBusinessOwnerWithEmployees && (
            <Card className="p-6">
              <h2 className="text-sm font-semibold mb-1">Team & Plan Obligations</h2>
              <p className="text-xs text-[var(--color-neutral-700)] mb-4">
                For employer payroll tax, unemployment insurance, workers&apos; comp, or a standard 401(k) match --
                anything your accountant or plan administrator calculates a number for. This plans money toward it,
                same as everything else above, but it&apos;s money staged and ready, not the actual
                contribution or filing itself, that still goes through your payroll provider or TPA when it&apos;s
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
                staged in Team & Plan Obligations above, a quick gut check that there&apos;s actually enough
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
                          <div className="text-xs text-[var(--color-neutral-700)]">{acc.account_name}{acc.mask ? ` •••• ${acc.mask}` : ""}</div>
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

      {/* The full Tax Summary section was removed; the yearly CSV report is
          still available from this export card. */}
      <TaxExportCard />

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
                  flag it so PrioritySave can leave it out of your retirement contribution room and tax reserve
                  estimate below. This impacts how much you can contribute to your Solo 401k or other retirement accounts, and how
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
                    No income transactions found for {periodLabel(period)} yet, nothing to flag right now.
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
