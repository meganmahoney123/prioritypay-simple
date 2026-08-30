"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Card, PrimaryButton, GhostButton, currency } from "@/components/ui";
import { bloomNoticeCardStyle } from "@/lib/bloomTheme";

const UNALLOCATED = "__unallocated__";

// One-time, ad-hoc moves of money into (or between) tracked categories --
// distinct from the automatic paycheck splits (see lib/runSplit.js) and
// from recording an expense (Withdrawals tab). Both the "from" and "to"
// side use the SAME picker: every tracked category, plus "Unallocated"
// (cash sitting in a connected account that isn't earmarked for any
// category yet). Picking Unallocated on either side reveals a second
// dropdown asking which account that cash is in/going to, since someone
// can have unallocated cash sitting in more than one account. Both sides
// can be a category, both can't be Unallocated at once (moving
// uncommitted cash between accounts isn't something this app tracks --
// there's no category event to log), and same-category-both-sides is
// blocked server-side too.
//
// Everything posts through POST /api/allocations/category-transfer, the
// same route the Accounts page's "where did the extra money come from?"
// overdraw prompt already uses -- so a transfer here updates category
// balances everywhere else in the product immediately (Dashboard, the
// per-account pies on Accounts, the Close-Out shortfall cascade, the
// Withdrawals category picker), since they all read the same underlying
// ledger.
export default function TransfersPage() {
  const [accounts, setAccounts] = useState([]);
  const [splitRulesPercent, setSplitRulesPercent] = useState([]);
  const [categoryBalances, setCategoryBalances] = useState({});
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  const [fromLabel, setFromLabel] = useState(""); // "" | UNALLOCATED | category label
  const [fromAccountId, setFromAccountId] = useState("");
  const [toLabel, setToLabel] = useState("");
  const [toAccountId, setToAccountId] = useState("");
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
  const fromIsUnallocated = fromLabel === UNALLOCATED;
  const toIsUnallocated = toLabel === UNALLOCATED;

  // A category picked on one side can't also be picked on the other --
  // Unallocated is excluded from this filter since it's fine to reference
  // the concept on both sides (just not both at once, blocked below).
  const fromOptions = splitRulesPercent.filter((r) => r.label !== toLabel);
  const toOptions = splitRulesPercent.filter((r) => r.label !== fromLabel);

  const fromBalance = !fromIsUnallocated && fromLabel ? Number(categoryBalances[fromLabel]) || 0 : null;
  const amt = Number(amount) || 0;
  const insufficientCategoryFunds = fromBalance !== null && amt > 0 && amt > fromBalance;
  const bothUnallocated = fromIsUnallocated && toIsUnallocated;

  const resetForm = () => {
    setFromLabel("");
    setFromAccountId("");
    setToLabel("");
    setToAccountId("");
    setAmount("");
    setNote("");
    setError(null);
  };

  const canSubmit =
    fromLabel &&
    toLabel &&
    !bothUnallocated &&
    amt > 0 &&
    (!fromIsUnallocated || !!fromAccountId) &&
    (!toIsUnallocated || !!toAccountId) &&
    !insufficientCategoryFunds;

  const accountLabel = (id) => {
    const a = accountsById[id];
    return a ? `${a.institution_name} ${a.account_name} •••• ${a.mask}` : "that account";
  };

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    const body = {
      fromLabel: fromIsUnallocated ? null : fromLabel,
      toLabel: toIsUnallocated ? null : toLabel,
      amount: amt,
      note:
        note ||
        (fromIsUnallocated
          ? `Moved from unallocated cash in ${accountLabel(fromAccountId)}`
          : toIsUnallocated
          ? `Moved to unallocated cash in ${accountLabel(toAccountId)}`
          : undefined),
    };
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
    setSuccess(
      `Moved ${currency(amt)} from ${fromIsUnallocated ? `unallocated cash (${accountLabel(fromAccountId)})` : fromLabel} to ${
        toIsUnallocated ? `unallocated cash (${accountLabel(toAccountId)})` : toLabel
      }.`
    );
    setRecent((prev) => [
      {
        id: `${Date.now()}`,
        fromDisplay: fromIsUnallocated ? `Unallocated — ${accountLabel(fromAccountId)}` : fromLabel,
        toDisplay: toIsUnallocated ? `Unallocated — ${accountLabel(toAccountId)}` : toLabel,
        amount: amt,
      },
      ...prev,
    ]);
    resetForm();
    // Both sides' category balances just changed -- refresh so the next
    // transfer's "available" note reflects it immediately, same as
    // everywhere else in the product that reads this endpoint.
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
          Move money between two tracked categories — like $3,000 from Wedding to Maintenance — or in/out of
          unallocated cash sitting in an account. This doesn&apos;t touch your automatic paycheck splits, and both
          balances update everywhere else in PriorityPay right away.
        </p>
      </div>

      <Card className="p-6 space-y-5">
        <div>
          <label className="text-xs font-semibold block mb-1">Transfer from</label>
          <select
            value={fromLabel}
            onChange={(e) => {
              setFromLabel(e.target.value);
              setFromAccountId("");
            }}
            className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2"
          >
            <option value="">Select…</option>
            <option value={UNALLOCATED}>Unallocated (cash not in a category)</option>
            {fromOptions.map((r) => (
              <option key={r.id} value={r.label}>
                {r.label} — {currency(categoryBalances[r.label] || 0)} available
              </option>
            ))}
          </select>
          {fromIsUnallocated && (
            <div className="mt-2">
              <label className="text-xs font-semibold block mb-1">Which account is that cash in?</label>
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
            </div>
          )}
          {fromBalance !== null && (
            <p className="text-xs mt-1.5" style={{ color: "var(--color-neutral-700)" }}>
              {currency(fromBalance)} currently available in {fromLabel}.
            </p>
          )}
        </div>

        <div className="flex items-center justify-center">
          <ArrowRight size={16} className="text-[var(--color-neutral-400)]" />
        </div>

        <div>
          <label className="text-xs font-semibold block mb-1">Transfer to</label>
          <select
            value={toLabel}
            onChange={(e) => {
              setToLabel(e.target.value);
              setToAccountId("");
            }}
            className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2"
          >
            <option value="">Select…</option>
            <option value={UNALLOCATED}>Unallocated (cash not in a category)</option>
            {toOptions.map((r) => (
              <option key={r.id} value={r.label}>
                {r.label} — {currency(categoryBalances[r.label] || 0)} available
              </option>
            ))}
          </select>
          {toIsUnallocated && (
            <div className="mt-2">
              <label className="text-xs font-semibold block mb-1">Which account should it land in?</label>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
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
            </div>
          )}
        </div>

        {bothUnallocated && (
          <p className="text-xs" style={{ color: "#9C3B22" }}>
            Pick at least one category — moving cash between accounts isn&apos;t tracked here.
          </p>
        )}

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
                  {r.fromDisplay} {" → "} {r.toDisplay}
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
