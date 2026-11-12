"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Paperclip, ReceiptText, CreditCard } from "lucide-react";
import { Card, PrimaryButton, GhostButton, currency } from "@/components/ui";
import { bloomWarningCardStyle, bloomNoticeCardStyle } from "@/lib/bloomTheme";
import WithdrawalAllocator from "@/components/WithdrawalAllocator";
import PlaidLinkButton from "@/components/PlaidLinkButton";

// One place to record "I spent money" instead of it being spread across
// category cards on the Dashboard/Accounts pages and an inline panel
// buried in Monthly Close-Out -- per explicit feedback that having it in
// several places was confusing. This tab is now the single source of
// truth for recording a withdrawal:
//   1. Which category (or categories, via the same shortfall-cascade
//      WithdrawalAllocator Close-Out already used) the money came from,
//      and if that overdraws a category, where the rest came from.
//   2. Whether it was a cash expense (optional receipt) or a specific
//      credit-card charge -- matched against real synced card activity
//      (GET /api/withdrawals/card-transactions) so the same expense never
//      has to be entered twice.
//   3. Once matched to a card transaction, that transaction is
//      automatically marked "Expense" in Monthly Close-Out too (see POST
//      /api/withdrawals) -- Close-Out renders it read-only with a link
//      back here instead of asking the person to categorize it again.
function isMileageLabel(label) {
  return (label || "").toLowerCase().includes("mileage");
}
function isMealsLabel(label) {
  return (label || "").toLowerCase().includes("meal");
}
function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function monthKey(iso) {
  // Noon local time so a date-only string never slips into the previous
  // month in time zones behind UTC.
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
  return `${d.toLocaleDateString("en-US", { month: "long" })} ${d.getFullYear()}`;
}

function WithdrawalsPageInner() {
  // Lets a Dashboard category card's "Withdrawals" link
  // (?category=<label>, see components/CategoryDistributionSection.js)
  // land here with that category already selected, instead of making
  // someone re-pick it from the dropdown.
  const searchParams = useSearchParams();
  const [splitRulesPercent, setSplitRulesPercent] = useState([]);
  const [categoryBalances, setCategoryBalances] = useState({});
  const [cardAccounts, setCardAccounts] = useState([]);
  const [cardTransactions, setCardTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [categoryLabel, setCategoryLabel] = useState("");
  const [allocations, setAllocations] = useState([]);
  const [allocationsComplete, setAllocationsComplete] = useState(false);
  // "card" by default -- most withdrawals are matching a real synced card
  // charge (see the card-transactions matcher below), so that's the more
  // common starting point; Cash expense is one click away for the rest.
  const [sourceType, setSourceType] = useState("card");
  const [matchedTxnId, setMatchedTxnId] = useState("");
  const [cardSearchQuery, setCardSearchQuery] = useState("");
  const [cardMonth, setCardMonth] = useState("");
  const [cardMin, setCardMin] = useState("");
  const [cardMax, setCardMax] = useState("");
  const [mileageMiles, setMileageMiles] = useState("");
  const [mileagePurpose, setMileagePurpose] = useState("");
  const [mealPurpose, setMealPurpose] = useState("");
  const [mealAttendees, setMealAttendees] = useState("");
  const [businesses, setBusinesses] = useState([]);
  const [businessId, setBusinessId] = useState("");
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptUrl, setReceiptUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    const [rulesRes, balancesRes, cardRes, withdrawalsRes, bizRes] = await Promise.all([
      fetch("/api/split-rules").then((r) => r.json()),
      fetch("/api/allocations/balances").then((r) => r.json()),
      fetch("/api/withdrawals/card-transactions").then((r) => r.json()),
      fetch("/api/withdrawals").then((r) => r.json()),
      fetch("/api/businesses").then((r) => r.json()).catch(() => ({})),
    ]);
    setBusinesses(bizRes.businesses || []);
    setSplitRulesPercent(rulesRes.splitRules?.percent || []);
    setCategoryBalances(balancesRes.balances || {});
    setCardAccounts(cardRes.accounts || []);
    setCardTransactions(cardRes.transactions || []);
    setWithdrawals(withdrawalsRes.withdrawals || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // Only preselect once the real category list has loaded, and only when
  // the linked-to label actually exists -- an unrecognized or missing
  // ?category= just leaves the normal empty dropdown state.
  useEffect(() => {
    const requested = searchParams.get("category");
    if (!requested || categoryLabel) return;
    if (splitRulesPercent.some((r) => r.label === requested)) {
      setCategoryLabel(requested);
    }
  }, [searchParams, splitRulesPercent, categoryLabel]);

  const trackedLabels = useMemo(() => splitRulesPercent.map((r) => r.label), [splitRulesPercent]);
  const accountsById = useMemo(() => Object.fromEntries(cardAccounts.map((a) => [a.id, a])), [cardAccounts]);
  const unmatchedCardTxns = useMemo(() => cardTransactions.filter((t) => !t.linkedWithdrawal), [cardTransactions]);

  const groupedCardTxns = useMemo(() => {
    const q = cardSearchQuery.trim().toLowerCase();
    // Filters the "Match a credit card charge" list by merchant name so a
    // long list of unmatched charges can be narrowed down quickly instead
    // of scrolling the whole (potentially long) grouped list -- doesn't
    // touch cardTransactions/unmatchedCardTxns themselves, so the
    // "Credit card activity" list elsewhere on the page is unaffected.
    const min = cardMin === "" ? null : Number(cardMin);
    const max = cardMax === "" ? null : Number(cardMax);
    const filtered = unmatchedCardTxns.filter((t) => {
      if (q && !(t.name || "").toLowerCase().includes(q)) return false;
      if (cardMonth && String(t.txnDate).slice(0, 7) !== cardMonth) return false;
      const amt = Math.abs(Number(t.amount) || 0);
      if (min !== null && Number.isFinite(min) && amt < min) return false;
      if (max !== null && Number.isFinite(max) && amt > max) return false;
      return true;
    });
    const groups = {};
    filtered.forEach((t) => {
      const acc = accountsById[t.accountId];
      const accKey = acc ? `${acc.institution_name} •••• ${acc.mask}` : "Unknown card";
      const mKey = monthKey(t.txnDate);
      const key = `${accKey}, ${mKey}`;
      (groups[key] ||= []).push(t);
    });
    return groups;
  }, [unmatchedCardTxns, accountsById, cardSearchQuery, cardMonth, cardMin, cardMax]);

  // Months that actually have an unmatched charge, newest first.
  const cardMonthOptions = useMemo(() => {
    const keys = [...new Set(unmatchedCardTxns.map((t) => String(t.txnDate).slice(0, 7)))].sort().reverse();
    return keys.map((k) => ({ value: k, label: monthKey(`${k}-01`) }));
  }, [unmatchedCardTxns]);
  const cardFiltersActive = !!(cardSearchQuery.trim() || cardMonth || cardMin !== "" || cardMax !== "");
  const clearCardFilters = () => {
    setCardSearchQuery("");
    setCardMonth("");
    setCardMin("");
    setCardMax("");
  };

  // Business expenses are attributed to one business so profit adds up per business.
  const isOpex = /^Business Expenses/i.test(categoryLabel || "");
  useEffect(() => {
    if (isOpex && !businessId && businesses.length === 1) setBusinessId(businesses[0].id);
  }, [isOpex, businesses, businessId]);
  const mileage = isMileageLabel(categoryLabel);
  const meals = isMealsLabel(categoryLabel);

  const resetForm = () => {
    setAmount("");
    setDescription("");
    setOccurredAt(new Date().toISOString().slice(0, 10));
    setCategoryLabel("");
    setBusinessId("");
    setAllocations([]);
    setAllocationsComplete(false);
    setSourceType("card");
    setMatchedTxnId("");
    setCardSearchQuery("");
    setCardMonth("");
    setCardMin("");
    setCardMax("");
    setMileageMiles("");
    setMileagePurpose("");
    setMealPurpose("");
    setMealAttendees("");
    setReceiptFile(null);
    setReceiptUrl(null);
    setError(null);
  };

  const uploadReceipt = async (file) => {
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/withdrawals/receipt", { method: "POST", body: fd }).then((r) => r.json());
    setUploading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setReceiptFile(file);
    setReceiptUrl(res.url);
  };

  const pickCardTxn = (t) => {
    setMatchedTxnId(t.id);
    setAmount(String(t.amount));
    setDescription(t.name || "");
    setOccurredAt(t.txnDate);
    setCardSearchQuery("");
    setCardMonth("");
    setCardMin("");
    setCardMax("");
  };

  const save = async () => {
    setError(null);
    const amt = Number(amount) || 0;
    if (amt <= 0) {
      setError("Enter an amount greater than $0.");
      return;
    }
    if (!categoryLabel) {
      setError("Pick a category (or Other) this came out of.");
      return;
    }
    if (isOpex && !businessId) {
      setError("Pick which business this expense was for.");
      return;
    }
    if (!allocationsComplete) {
      setError("Finish accounting for the full amount before saving.");
      return;
    }
    if (sourceType === "card" && !matchedTxnId) {
      setError("Pick which card charge this matches, or switch to Cash expense.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: amt,
        description,
        occurredAt,
        categoryLabel,
        receiptUrl,
        mileageMiles: mileage ? mileageMiles : null,
        mileagePurpose: mileage ? mileagePurpose : null,
        mealPurpose: meals ? mealPurpose : null,
        mealAttendees: meals ? mealAttendees : null,
        allocations,
        sourceType,
        closeoutTransactionId: sourceType === "card" ? matchedTxnId : null,
        businessId: isOpex ? businessId : null,
      }),
    }).then((r) => r.json());
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    resetForm();
    load();
  };

  if (loading) return <p className="text-base" style={{ color: "var(--color-neutral-700)" }}>Loading…</p>;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-lg font-bold mb-1">Record a withdrawal</h2>
        <p className="text-[15px] mb-4" style={{ color: "var(--color-neutral-700)" }}>
          One place for every expense, pick where the money came from, and whether it's a specific credit-card
          charge or a cash expense. If it's a card charge, Monthly Close-Out will already show it as categorized.
        </p>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => {
              setSourceType("card");
              setMatchedTxnId("");
            }}
            className="flex-1 text-base font-semibold px-3 py-2.5 rounded-xl flex items-center justify-center gap-2"
            style={{
              border: `1px solid ${sourceType === "card" ? "var(--color-accent)" : "var(--color-divider)"}`,
              color: sourceType === "card" ? "var(--color-accent-700)" : "var(--color-neutral-700)",
              background: sourceType === "card" ? "color-mix(in srgb, var(--color-accent) 8%, transparent)" : "transparent",
            }}
          >
            <CreditCard size={15} /> Match a credit card charge
          </button>
          <button
            type="button"
            onClick={() => {
              setSourceType("cash");
              setMatchedTxnId("");
            }}
            className="flex-1 text-base font-semibold px-3 py-2.5 rounded-xl flex items-center justify-center gap-2"
            style={{
              border: `1px solid ${sourceType === "cash" ? "var(--color-accent)" : "var(--color-divider)"}`,
              color: sourceType === "cash" ? "var(--color-accent-700)" : "var(--color-neutral-700)",
              background: sourceType === "cash" ? "color-mix(in srgb, var(--color-accent) 8%, transparent)" : "transparent",
            }}
          >
            <ReceiptText size={15} /> Cash expense
          </button>
        </div>

        {sourceType === "card" && (
          <div className="mb-4">
            {cardAccounts.length === 0 ? (
              <div className="text-[15px] p-3 flex items-center justify-between gap-3 flex-wrap" style={bloomNoticeCardStyle()}>
                <span>No credit cards connected yet.</span>
                <PlaidLinkButton
                  label="Click here to connect your credit card"
                  creditCard
                  onLinked={load}
                  className="text-[15px] px-3 py-1.5"
                  style={{ borderRadius: "var(--radius-pill)", fontFamily: "var(--font-heading)", fontWeight: 600 }}
                />
              </div>
            ) : matchedTxnId ? (
              <div
                className="flex items-center justify-between gap-3 flex-wrap"
                style={{ padding: "14px 16px", borderRadius: 16, border: "2.5px solid #4E22B8", background: "#EDE6FF" }}
              >
                <span>
                  <span style={{ display: "block", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", color: "#4E22B8" }}>SELECTED CHARGE</span>
                  <span style={{ display: "block", fontSize: 17, fontWeight: 600, color: "#241337" }}>
                    {description} · {formatDate(occurredAt)}
                  </span>
                </span>
                <span className="flex items-center gap-4">
                  <span className="font-mono" style={{ fontSize: 22, fontWeight: 600, color: "#241337" }}>{currency(Number(amount) || 0)}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setMatchedTxnId("");
                      setAmount("");
                      setDescription("");
                    }}
                    className="underline shrink-0"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#4E22B8", fontWeight: 600, minHeight: 44 }}
                  >
                    Change
                  </button>
                </span>
              </div>
            ) : (
              <>
                {unmatchedCardTxns.length > 0 && (
                  <div className="mb-3 flex flex-col gap-2">
                    <input
                      type="text"
                      value={cardSearchQuery}
                      onChange={(e) => setCardSearchQuery(e.target.value)}
                      placeholder="Search by name (or part of a name)…"
                      aria-label="Search charges by name"
                      className="w-full"
                      style={{ minHeight: 48, padding: "0 16px", borderRadius: 14, border: "1.1px solid #DDD5F3", background: "#fff", fontSize: 16, color: "#241337" }}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={cardMonth}
                        onChange={(e) => setCardMonth(e.target.value)}
                        aria-label="Filter charges by month"
                        style={{ minHeight: 44, padding: "0 12px", borderRadius: 14, border: "1.1px solid #DDD5F3", background: "#fff", fontSize: 15, color: "#241337" }}
                      >
                        <option value="">All months</option>
                        {cardMonthOptions.map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                      <span className="flex items-center gap-1.5" style={{ fontSize: 14, color: "#4A3F63" }}>
                        Amount $
                        <input
                          type="number"
                          min={0}
                          inputMode="decimal"
                          value={cardMin}
                          onChange={(e) => setCardMin(e.target.value)}
                          placeholder="Min"
                          aria-label="Minimum amount"
                          className="font-mono"
                          style={{ width: 84, minHeight: 44, padding: "0 10px", borderRadius: 14, border: "1.1px solid #DDD5F3", background: "#fff", fontSize: 15, color: "#241337" }}
                        />
                        to
                        <input
                          type="number"
                          min={0}
                          inputMode="decimal"
                          value={cardMax}
                          onChange={(e) => setCardMax(e.target.value)}
                          placeholder="Max"
                          aria-label="Maximum amount"
                          className="font-mono"
                          style={{ width: 84, minHeight: 44, padding: "0 10px", borderRadius: 14, border: "1.1px solid #DDD5F3", background: "#fff", fontSize: 15, color: "#241337" }}
                        />
                      </span>
                      {cardFiltersActive && (
                        <button
                          type="button"
                          onClick={clearCardFilters}
                          className="underline"
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#4E22B8", fontWeight: 600, fontSize: 14, minHeight: 44 }}
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {Object.keys(groupedCardTxns).length === 0 ? (
                  <p className="text-[15px] p-3" style={bloomNoticeCardStyle()}>
                    {cardFiltersActive
                      ? "No charges match your search or filters."
                      : "No unmatched card activity found. It may already be logged, or hasn't synced yet."}
                  </p>
                ) : (
              <div className="max-h-96 overflow-y-auto space-y-4 pr-1">
                {Object.entries(groupedCardTxns).map(([group, txns]) => (
                  <div key={group}>
                    <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#3B1C7A", marginBottom: 8 }}>
                      {group}
                    </div>
                    <div className="flex flex-col gap-2.5">
                      {txns.map((t) => {
                        const [, mm, dd] = String(t.txnDate).slice(0, 10).split("-");
                        const mon = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][Number(mm) - 1] || "";
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => pickCardTxn(t)}
                            className="w-full flex items-center gap-4 text-left"
                            style={{ minHeight: 64, padding: "8px 16px", borderRadius: 16, border: "1.1px solid #DDD5F3", background: "#fff", color: "#241337" }}
                          >
                            <span
                              className="flex flex-col items-center justify-center shrink-0"
                              style={{ width: 52, height: 48, borderRadius: 12, background: "#EDE6FF", color: "#3B1C7A" }}
                            >
                              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em" }}>{mon}</span>
                              <span style={{ fontSize: 19, fontWeight: 600, lineHeight: 1 }}>{Number(dd)}</span>
                            </span>
                            <span className="flex-1 min-w-0 truncate" style={{ fontSize: 17, fontWeight: 600 }}>{t.name}</span>
                            <span className="font-mono shrink-0" style={{ fontSize: 18, fontWeight: 600 }}>{currency(t.amount)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
                )}
              </>
            )}
          </div>
        )}

        {sourceType === "cash" && (
          <>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <label className="text-[15px]">
            <span className="block mb-1" style={{ color: "var(--color-neutral-700)" }}>Amount</span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={amount}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setAmount(e.target.value)}
              disabled={sourceType === "card" && !!matchedTxnId}
              className="w-full text-base border border-neutral-200 rounded-lg px-2.5 py-2 font-mono disabled:opacity-60"
            />
          </label>
          <label className="text-[15px]">
            <span className="block mb-1" style={{ color: "var(--color-neutral-700)" }}>Date</span>
            <input
              type="date"
              value={occurredAt?.slice(0, 10)}
              onChange={(e) => setOccurredAt(e.target.value)}
              disabled={sourceType === "card" && !!matchedTxnId}
              className="w-full text-base border border-neutral-200 rounded-lg px-2.5 py-2 disabled:opacity-60"
            />
          </label>
        </div>
        <label className="text-[15px] block mb-3">
          <span className="block mb-1" style={{ color: "var(--color-neutral-700)" }}>Description</span>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What was this for?"
            className="w-full text-base border border-neutral-200 rounded-lg px-2.5 py-2"
          />
        </label>

          </>
        )}

        {(sourceType === "cash" || !!matchedTxnId) && (
        <>
        <label className="text-[15px] block mb-2">
          <span className="block mb-1" style={{ color: "var(--color-neutral-700)" }}>What category did this come out of?</span>
          <select
            value={categoryLabel}
            onChange={(e) => setCategoryLabel(e.target.value)}
            className="w-full text-base border border-neutral-200 rounded-lg px-2.5 py-2"
          >
            <option value="">Select…</option>
            {splitRulesPercent.map((r) => (
              <option key={r.id} value={r.label}>{r.label}</option>
            ))}
            <option value="Other">Other (not tracked)</option>
          </select>
        </label>

        {isOpex && (
          <div className="mb-3">
            {businesses.length === 0 ? (
              <p className="text-[15px] p-3" style={bloomNoticeCardStyle()}>
                <b>No businesses added yet.</b> Add each business in Settings and pick its type, then come back to save this expense.{" "}
                <a href="/settings#businesses" style={{ color: "var(--color-accent-700)", fontWeight: 600 }}>Open Settings</a>
              </p>
            ) : (
              <label className="text-[15px] block">
                <span className="block mb-1" style={{ color: "var(--color-neutral-700)" }}>Which business was this for? <span style={{ color: "#B3261E" }}>*</span></span>
                <select
                  value={businessId}
                  onChange={(e) => setBusinessId(e.target.value)}
                  className="w-full text-base border border-neutral-200 rounded-lg px-2.5 py-2"
                >
                  <option value="">Select…</option>
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}

        {categoryLabel && (Number(amount) || 0) > 0 && (
          <div className="mb-3">
            <WithdrawalAllocator
              totalAmount={Number(amount) || 0}
              primaryLabel={categoryLabel === "Other" ? null : categoryLabel}
              balances={categoryBalances}
              trackedLabels={trackedLabels}
              onChange={(a, complete) => {
                setAllocations(a);
                setAllocationsComplete(complete);
              }}
            />
          </div>
        )}

        {mileage && (
          <div className="flex items-center gap-2 flex-wrap text-[15px] mb-3">
            <label className="flex items-center gap-1">
              Miles driven
              <input
                type="number"
                min={0}
                value={mileageMiles}
                onChange={(e) => setMileageMiles(e.target.value)}
                className="w-20 border border-neutral-200 rounded-lg px-2 py-1 font-mono text-center"
              />
            </label>
            <label className="flex items-center gap-1 flex-1 min-w-[160px]">
              Business purpose
              <input
                type="text"
                value={mileagePurpose}
                onChange={(e) => setMileagePurpose(e.target.value)}
                className="flex-1 border border-neutral-200 rounded-lg px-2 py-1"
              />
            </label>
          </div>
        )}
        {meals && (
          <div className="flex items-center gap-2 flex-wrap text-[15px] mb-3">
            <label className="flex items-center gap-1 flex-1 min-w-[160px]">
              Business purpose
              <input
                type="text"
                value={mealPurpose}
                onChange={(e) => setMealPurpose(e.target.value)}
                className="flex-1 border border-neutral-200 rounded-lg px-2 py-1"
              />
            </label>
            <label className="flex items-center gap-1 flex-1 min-w-[160px]">
              Who attended
              <input
                type="text"
                value={mealAttendees}
                onChange={(e) => setMealAttendees(e.target.value)}
                className="flex-1 border border-neutral-200 rounded-lg px-2 py-1"
              />
            </label>
          </div>
        )}

        <div
          className="mb-4"
          style={{ background: "#F3EEFF", border: "1.5px dashed #9A72F0", borderRadius: 16, padding: "14px 16px" }}
        >
          <div style={{ fontSize: 15, fontWeight: 600, color: "#241337" }}>Receipt for your taxes (optional)</div>
          <p style={{ fontSize: 14, color: "#4A3F63", margin: "2px 0 10px", lineHeight: 1.45 }}>
            Keep a photo or PDF of the receipt with this expense so it is ready at tax time.
          </p>
          <label
            className="inline-flex items-center gap-2 cursor-pointer"
            style={{ background: receiptUrl ? "#fff" : "#4E22B8", color: receiptUrl ? "#4E22B8" : "#fff", border: "2px solid #4E22B8", borderRadius: 14, padding: "11px 18px", fontSize: 15, fontWeight: 600, minHeight: 46 }}
          >
            <Paperclip size={16} />
            {uploading ? "Uploading…" : receiptUrl ? `Receipt attached${receiptFile?.name ? `: ${receiptFile.name}` : ""}. Replace` : "Attach receipt"}
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadReceipt(e.target.files[0])}
            />
          </label>
        </div>

        {error && <p className="text-[15px] mb-3 p-2" style={bloomWarningCardStyle()}>{error}</p>}

        <PrimaryButton onClick={save} disabled={saving} className="text-base px-4 py-2">
          {saving ? "Saving…" : "Save withdrawal"}
        </PrimaryButton>
        </>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-bold mb-3">Recent withdrawals</h2>
        {withdrawals.length === 0 ? (
          <p className="text-base" style={{ color: "var(--color-neutral-700)" }}>No withdrawals recorded yet.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {withdrawals.map((w) => (
              <div key={w.id} className="flex items-center justify-between gap-3 text-[15px] border-b border-[var(--color-divider)] pb-2">
                <div className="min-w-0">
                  <div className="text-base font-medium truncate">{w.description || "(no description)"}</div>
                  <div style={{ color: "var(--color-neutral-700)" }}>
                    {formatDate(w.occurredAt)} ·{" "}
                    {w.allocations.length
                      ? w.allocations.map((a) => `${a.label || "Other"} ${currency(a.amount)}`).join(" + ")
                      : w.categoryLabel || "Other"}
                    {w.sourceType === "card" ? " · Card" : " · Cash"}{w.receiptUrl ? " · Receipt saved" : ""}
                  </div>
                </div>
                <span className="font-mono shrink-0">{currency(w.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

    </div>
  );
}

export default function WithdrawalsPage() {
  return (
    <Suspense fallback={null}>
      <WithdrawalsPageInner />
    </Suspense>
  );
}
