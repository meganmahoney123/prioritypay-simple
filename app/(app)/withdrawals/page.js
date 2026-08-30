"use client";

import { useEffect, useMemo, useState } from "react";
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
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-US", { month: "long" })} ${d.getFullYear()}`;
}

export default function WithdrawalsPage() {
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
  const [mileageMiles, setMileageMiles] = useState("");
  const [mileagePurpose, setMileagePurpose] = useState("");
  const [mealPurpose, setMealPurpose] = useState("");
  const [mealAttendees, setMealAttendees] = useState("");
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptUrl, setReceiptUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    const [rulesRes, balancesRes, cardRes, withdrawalsRes] = await Promise.all([
      fetch("/api/split-rules").then((r) => r.json()),
      fetch("/api/allocations/balances").then((r) => r.json()),
      fetch("/api/withdrawals/card-transactions").then((r) => r.json()),
      fetch("/api/withdrawals").then((r) => r.json()),
    ]);
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

  const trackedLabels = useMemo(() => splitRulesPercent.map((r) => r.label), [splitRulesPercent]);
  const accountsById = useMemo(() => Object.fromEntries(cardAccounts.map((a) => [a.id, a])), [cardAccounts]);
  const unmatchedCardTxns = useMemo(() => cardTransactions.filter((t) => !t.linkedWithdrawal), [cardTransactions]);

  const groupedCardTxns = useMemo(() => {
    const groups = {};
    unmatchedCardTxns.forEach((t) => {
      const acc = accountsById[t.accountId];
      const accKey = acc ? `${acc.institution_name} •••• ${acc.mask}` : "Unknown card";
      const mKey = monthKey(t.txnDate);
      const key = `${accKey} — ${mKey}`;
      (groups[key] ||= []).push(t);
    });
    return groups;
  }, [unmatchedCardTxns, accountsById]);

  const mileage = isMileageLabel(categoryLabel);
  const meals = isMealsLabel(categoryLabel);

  const resetForm = () => {
    setAmount("");
    setDescription("");
    setOccurredAt(new Date().toISOString().slice(0, 10));
    setCategoryLabel("");
    setAllocations([]);
    setAllocationsComplete(false);
    setSourceType("card");
    setMatchedTxnId("");
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

  if (loading) return <p className="text-sm" style={{ color: "var(--color-neutral-700)" }}>Loading…</p>;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-sm font-semibold mb-1">Record a withdrawal</h2>
        <p className="text-xs mb-4" style={{ color: "var(--color-neutral-700)" }}>
          One place for every expense — pick where the money came from, and whether it's a specific credit-card
          charge or a cash expense. If it's a card charge, Monthly Close-Out will already show it as categorized.
        </p>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => {
              setSourceType("card");
              setMatchedTxnId("");
            }}
            className="flex-1 text-sm font-semibold px-3 py-2.5 rounded-xl flex items-center justify-center gap-2"
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
            className="flex-1 text-sm font-semibold px-3 py-2.5 rounded-xl flex items-center justify-center gap-2"
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
              <div className="text-xs p-3 flex items-center justify-between gap-3 flex-wrap" style={bloomNoticeCardStyle()}>
                <span>No credit cards connected yet.</span>
                <PlaidLinkButton
                  label="Click here to connect your credit card"
                  creditCard
                  onLinked={load}
                  className="text-xs px-3 py-1.5"
                  style={{ borderRadius: "var(--radius-pill)", fontFamily: "var(--font-heading)", fontWeight: 700 }}
                />
              </div>
            ) : matchedTxnId ? (
              <div className="text-xs p-3 flex items-center justify-between gap-2" style={bloomNoticeCardStyle()}>
                <span>
                  Matched: <span style={{ fontWeight: 600 }}>{description}</span> — {currency(Number(amount) || 0)} on{" "}
                  {formatDate(occurredAt)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMatchedTxnId("");
                    setAmount("");
                    setDescription("");
                  }}
                  className="underline shrink-0"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}
                >
                  Change
                </button>
              </div>
            ) : Object.keys(groupedCardTxns).length === 0 ? (
              <p className="text-xs p-3" style={bloomNoticeCardStyle()}>
                No unmatched card activity found. It may already be logged, or hasn&apos;t synced yet.
              </p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-3 border border-[var(--color-divider)] rounded-xl p-3">
                {Object.entries(groupedCardTxns).map(([group, txns]) => (
                  <div key={group}>
                    <div className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--color-neutral-700)" }}>
                      {group}
                    </div>
                    <div className="space-y-1">
                      {txns.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => pickCardTxn(t)}
                          className="w-full flex items-center justify-between gap-2 text-xs text-left px-2.5 py-2 rounded-lg hover:bg-[var(--color-neutral-100)]"
                          style={{ border: "1px solid var(--color-divider)" }}
                        >
                          <span className="truncate">
                            {t.name} <span style={{ color: "var(--color-neutral-700)" }}>· {formatDate(t.txnDate)}</span>
                          </span>
                          <span className="font-mono shrink-0">{currency(t.amount)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <label className="text-xs">
            <span className="block mb-1" style={{ color: "var(--color-neutral-700)" }}>Amount</span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={amount}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setAmount(e.target.value)}
              disabled={sourceType === "card" && !!matchedTxnId}
              className="w-full text-sm border border-neutral-200 rounded-lg px-2.5 py-2 font-mono disabled:opacity-60"
            />
          </label>
          <label className="text-xs">
            <span className="block mb-1" style={{ color: "var(--color-neutral-700)" }}>Date</span>
            <input
              type="date"
              value={occurredAt?.slice(0, 10)}
              onChange={(e) => setOccurredAt(e.target.value)}
              disabled={sourceType === "card" && !!matchedTxnId}
              className="w-full text-sm border border-neutral-200 rounded-lg px-2.5 py-2 disabled:opacity-60"
            />
          </label>
        </div>
        <label className="text-xs block mb-3">
          <span className="block mb-1" style={{ color: "var(--color-neutral-700)" }}>Description</span>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What was this for?"
            className="w-full text-sm border border-neutral-200 rounded-lg px-2.5 py-2"
          />
        </label>

        <label className="text-xs block mb-2">
          <span className="block mb-1" style={{ color: "var(--color-neutral-700)" }}>What category did this come out of?</span>
          <select
            value={categoryLabel}
            onChange={(e) => setCategoryLabel(e.target.value)}
            className="w-full text-sm border border-neutral-200 rounded-lg px-2.5 py-2"
          >
            <option value="">Select…</option>
            {splitRulesPercent.map((r) => (
              <option key={r.id} value={r.label}>{r.label}</option>
            ))}
            <option value="Other">Other (not tracked)</option>
          </select>
        </label>

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
          <div className="flex items-center gap-2 flex-wrap text-xs mb-3">
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
          <div className="flex items-center gap-2 flex-wrap text-xs mb-3">
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

        {sourceType === "cash" && (
          <div className="mb-3">
            <label className="flex items-center gap-1.5 cursor-pointer text-xs" style={{ color: "var(--color-accent-700)", fontWeight: 600 }}>
              <Paperclip size={13} />
              {uploading ? "Uploading…" : receiptUrl ? "Receipt attached — replace" : "Attach a receipt (optional)"}
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadReceipt(e.target.files[0])}
              />
            </label>
          </div>
        )}

        {error && <p className="text-xs mb-3 p-2" style={bloomWarningCardStyle()}>{error}</p>}

        <PrimaryButton onClick={save} disabled={saving} className="text-sm px-4 py-2">
          {saving ? "Saving…" : "Save withdrawal"}
        </PrimaryButton>
      </Card>

      <Card className="p-6">
        <h2 className="text-sm font-semibold mb-3">Recent withdrawals</h2>
        {withdrawals.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--color-neutral-700)" }}>No withdrawals recorded yet.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {withdrawals.map((w) => (
              <div key={w.id} className="flex items-center justify-between gap-3 text-xs border-b border-[var(--color-divider)] pb-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{w.description || "(no description)"}</div>
                  <div style={{ color: "var(--color-neutral-700)" }}>
                    {formatDate(w.occurredAt)} ·{" "}
                    {w.allocations.length
                      ? w.allocations.map((a) => `${a.label || "Other"} ${currency(a.amount)}`).join(" + ")
                      : w.categoryLabel || "Other"}
                    {w.sourceType === "card" ? " · Card" : " · Cash"}
                  </div>
                </div>
                <span className="font-mono shrink-0">{currency(w.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-sm font-semibold mb-1">Credit card activity</h2>
        <p className="text-xs mb-3" style={{ color: "var(--color-neutral-700)" }}>
          Every synced charge across your connected cards, by account and month. There's no true billing-cycle
          data available, so this is grouped by calendar month instead of your actual statement dates.
        </p>
        {cardAccounts.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--color-neutral-700)" }}>No credit cards connected yet.</p>
        ) : cardTransactions.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--color-neutral-700)" }}>No card activity synced yet.</p>
        ) : (
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {cardTransactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 text-xs border-b border-[var(--color-divider)] pb-1.5">
                <div className="min-w-0 flex-1">
                  <span className="truncate">{t.name}</span>{" "}
                  <span style={{ color: "var(--color-neutral-700)" }}>
                    · {accountsById[t.accountId] ? `${accountsById[t.accountId].institution_name} •••• ${accountsById[t.accountId].mask}` : ""} · {formatDate(t.txnDate)}
                  </span>
                </div>
                <span className="font-mono shrink-0">{currency(t.amount)}</span>
                <span
                  className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  style={
                    t.linkedWithdrawal
                      ? { background: "color-mix(in srgb, var(--color-accent) 12%, transparent)", color: "var(--color-accent-700)" }
                      : { background: "var(--color-neutral-100)", color: "var(--color-neutral-700)" }
                  }
                >
                  {t.linkedWithdrawal ? "Logged" : "Unmatched"}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
