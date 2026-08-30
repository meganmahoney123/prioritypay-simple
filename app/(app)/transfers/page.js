"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Card, PrimaryButton, GhostButton, currency } from "@/components/ui";
import { bloomNoticeCardStyle } from "@/lib/bloomTheme";

// One-time, ad-hoc moves of money into (or between) tracked categories --
// distinct from the automatic paycheck splits (see lib/runSplit.js) and
// from recording an expense (Withdrawals tab). Two source types:
//   1. "An account" -- e.g. extra cash sitting in checking that isn't
//      earmarked for anything yet. This is pure bookkeeping (no real ACH
//      transfer is fired -- see POST /api/allocations/category-transfer's
//      "unallocated" branch), the same model the Accounts page already
//      uses for "where did the extra money come from" on an overdrawn
//      category. The chosen account is recorded in the note for context
//      but its own balance isn't debited, since Plaid is the source of
//      truth for real account balances and this app never fakes those.
//   2. "A category" -- moving already-tracked money from one fund to
//      another (e.g. $3,000 from Wedding to Maintenance). Reuses the same
//      route's fromLabel branch, which debits the source category and
//      credits the destination, both logged as simple_manual_contributions
//      rows so the money stays accounted for.
// Both paths land on the same category balances shown everywhere else
// (Accounts page pies, Close-Out shortfall cascade, Withdrawals category
// picker), since they all read from the same underlying tables.
export default function TransfersPage() {
  const [accounts, setAccounts] = useState([]);
  const [splitRulesPercent, setSplitRulesPercent] = useState([]);
  const [categoryBalances, setCategoryBalances] = useState({});
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  const [sourceType, setSourceType] = useState("account"); // "account" | "category"
  const [fromAccountId, setFromAccountId] = useState("");
  const [fromLabel, setFromLabel] = useState("");
  const [toLabel, setToLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const load = async () => {
    const [accountsRes, rulesRes, balancesRes] = await Promise.all([
      fetch("/api/accounts").then((r) => r.json()),
      fetch("/api/split-rules").then((r) => r.json()),
      fetch("/api/allocations/balances").then((r) => r.json()),
    ]);
    setAccounts(accountsRes.accounts || []);
    setSplitRulesPercent(rulesRes.splitRules?.percent || []);
    setCategoryBalances(balancesRes.balances || {});
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const accountsById = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a])), [accounts]);
  const toOptions = splitRulesPercent.filter((r) => r.label !== fromLabel);
  const fromCategoryOptions = splitRulesPercent.filter((r) => r.label !== toLabel);
  const fromBalance = sourceType === "category" && fromLabel ? Number(categoryBalances[fromLabel]) || 0 : null;
  const amt = Number(amount) || 0;
  const insufficientCategoryFunds = sourceType === "category" && fromLabel && amt > 0 && amt > fromBalance;

  const resetForm = () => {
    setFromAccountId("");
    setFromLabel("");
    setToLabel("");
    setAmount("");
    setNote("");
    setError(null);
  };

  const canSubmit =
    toLabel &&
    amt > 0 &&
    (sourceType === "account" ? !!fromAccountId : !!fromLabel && !insufficientCategoryFunds);

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    const body =
      sourceType === "account"
        ? {
            toLabel,
            amount: amt,
            note: note || `Transferred from ${accountsById[fromAccountId]?.institution_name || "account"} ${accountsById[fromAccountId]?.account_name || ""} •••• ${accountsById[fromAccountId]?.mask || ""}`,
          }
        : { toLabel, fromLabel, amount: amt, note: note || undefined };
    const res = await fetch("/api/allocations/category-transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => r.json());
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setSuccess(`Moved ${currency(amt)} into ${toLabel}.`);
    setRecent((prev) => [
      { id: `${Date.now()}`, toLabel, fromLabel: sourceType === "category" ? fromLabel : null, fromAccountLabel: sourceType === "account" ? accountsById[fromAccountId] : null, amount: amt, at: new Date().toISOString() },
      ...prev,
    ]);
    resetForm();
    // Category balances just changed on both ends -- refresh so the next
    // transfer (or the "available" note under the From-category select)
    // reflects it immediately.
    fetch("/api/allocations/balances")
      .then((r) => r.json())
      .then((d) => setCategoryBalances(d.balances || {}))
      .catch(() => {});
  };

  if (loading) return <p className="text-sm text-[var(--color-neutral-700)]">Loading…</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold mb-1">One-Time Transfer</h1>
        <p className="text-sm text-[var(--color-neutral-700)]">
          Move extra money into a category, or shift money from one tracked fund to another — like putting $3,000
          from Wedding toward Maintenance. This doesn&apos;t touch your automatic paycheck splits.
        </p>
      </div>

      <Card className="p-6 space-y-5">
        <div>
          <p className="text-xs font-semibold mb-2">Transfer from</p>
          <div className="flex gap-2">
            <button
              onClick={() => { setSourceType("account"); setFromLabel(""); }}
              className="flex-1 text-sm px-3 py-2 rounded-lg border"
              style={{
                borderColor: sourceType === "account" ? "var(--color-accent)" : "var(--color-divider)",
                background: sourceType === "account" ? "color-mix(in srgb, var(--color-accent) 8%, transparent)" : "transparent",
                fontWeight: sourceType === "account" ? 700 : 500,
              }}
            >
              An account
            </button>
            <button
              onClick={() => { setSourceType("category"); setFromAccountId(""); }}
              className="flex-1 text-sm px-3 py-2 rounded-lg border"
              style={{
                borderColor: sourceType === "category" ? "var(--color-accent)" : "var(--color-divider)",
                background: sourceType === "category" ? "color-mix(in srgb, var(--color-accent) 8%, transparent)" : "transparent",
                fontWeight: sourceType === "category" ? 700 : 500,
              }}
            >
              A category / fund
            </button>
          </div>
        </div>

        {sourceType === "account" ? (
          <div>
            <label className="text-xs font-semibold block mb-1">Which account?</label>
            <select
              value={fromAccountId}
              onChange={(e) => setFromAccountId(e.target.value)}
              className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2"
            >
              <option value="">Select an account…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.institution_name} {a.account_name} •••• {a.mask}
                  {a.current_balance != null ? ` — ${currency(a.current_balance)}` : ""}
                </option>
              ))}
            </select>
            <p className="text-xs mt-1.5" style={{ color: "var(--color-neutral-700)" }}>
              This is just for your records — we won&apos;t move real money out of this account. It only credits the
              category you pick below.
            </p>
          </div>
        ) : (
          <div>
            <label className="text-xs font-semibold block mb-1">Which category or fund?</label>
            <select
              value={fromLabel}
              onChange={(e) => setFromLabel(e.target.value)}
              className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2"
            >
              <option value="">Select a category…</option>
              {fromCategoryOptions.map((r) => (
                <option key={r.id} value={r.label}>
                  {r.label} — {currency(categoryBalances[r.label] || 0)} available
                </option>
              ))}
            </select>
            {fromLabel && (
              <p className="text-xs mt-1.5" style={{ color: "var(--color-neutral-700)" }}>
                {currency(fromBalance)} currently available in {fromLabel}.
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-center">
          <ArrowRight size={16} className="text-[var(--color-neutral-400)]" />
        </div>

        <div>
          <label className="text-xs font-semibold block mb-1">Transfer to (category)</label>
          <select
            value={toLabel}
            onChange={(e) => setToLabel(e.target.value)}
            className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2"
          >
            <option value="">Select a category…</option>
            {toOptions.map((r) => (
              <option key={r.id} value={r.label}>
                {r.label} — {currency(categoryBalances[r.label] || 0)} available
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold block mb-1">Amount</label>
          <div className="flex items-center gap-1 text-sm border border-neutral-200 rounded-lg px-3 py-2 w-40">
            $
            <input
              type="number"
              min={0}
              step={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 outline-none"
              placeholder="0"
            />
          </div>
          {insufficientCategoryFunds && (
            <p className="text-xs mt-1.5" style={{ color: "#9C3B22" }}>
              {fromLabel} only has {currency(fromBalance)} available.
            </p>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold block mb-1">Note (optional)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Covering a repair bill"
            className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2"
          />
        </div>

        {error && <p className="text-xs" style={{ color: "#9C3B22" }}>{error}</p>}
        {success && (
          <div className="text-xs p-2.5" style={bloomNoticeCardStyle({ padding: "8px 12px" })}>
            {success}
          </div>
        )}

        <div className="flex items-center gap-2">
          <PrimaryButton onClick={submit} disabled={!canSubmit || saving} className="text-sm px-4 py-2">
            {saving ? "Transferring…" : "Transfer"}
          </PrimaryButton>
          <GhostButton onClick={resetForm} className="text-sm px-4 py-2">
            Clear
          </GhostButton>
        </div>
      </Card>

      {recent.length > 0 && (
        <Card className="p-6">
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--color-neutral-700)" }}>
            This session
          </p>
          <div className="space-y-2">
            {recent.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <span>
                  {r.fromLabel ? r.fromLabel : r.fromAccountLabel ? `${r.fromAccountLabel.institution_name} •••• ${r.fromAccountLabel.mask}` : "Account"}
                  {" → "}
                  {r.toLabel}
                </span>
                <span className="font-mono">{currency(r.amount)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
