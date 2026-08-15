"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Save, RotateCcw } from "lucide-react";
import { Card, PrimaryButton, GhostButton, currency } from "@/components/ui";
import AccountSelect from "@/components/AccountSelect";
import CreateSubAccountFlow from "@/components/CreateSubAccountFlow";
import PlaidLinkButton from "@/components/PlaidLinkButton";
import BucketIcon from "@/components/BucketIcon";
import RetirementNote from "@/components/RetirementNote";
import { DEFAULT_SPLIT_RULES, SUGGESTED_EXTRA_CATEGORIES, CATEGORY_COLORS, pctTotal } from "@/lib/allocations";

function currentPeriod() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default function SplitRulesPage() {
  const [percent, setPercent] = useState([]);
  const [accounts, setAccounts] = useState([]);
  // Real month-to-date dollars per category label (see
  // app/api/allocations/history/[period] with categoryType=percent) -- the
  // exact same source of truth the server uses to enforce Monthly Total Cap.
  const [mtdByLabel, setMtdByLabel] = useState({});
  const [mtdPercentTotal, setMtdPercentTotal] = useState(0);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState({});
  const [connecting, setConnecting] = useState({});

  useEffect(() => {
    (async () => {
      const [rulesRes, accountsRes, mtdRes] = await Promise.all([
        fetch("/api/split-rules").then((r) => r.json()),
        fetch("/api/accounts").then((r) => r.json()),
        fetch(`/api/allocations/history/${currentPeriod()}?categoryType=percent`).then((r) => r.json()),
      ]);
      setPercent(rulesRes.splitRules?.percent || []);
      setAccounts(accountsRes.accounts || []);
      const byLabel = {};
      (mtdRes.categories || []).forEach((c) => { byLabel[c.label] = c.amount; });
      setMtdByLabel(byLabel);
      setMtdPercentTotal(mtdRes.total || 0);
      setLoading(false);
    })();
  }, []);

  const totalPct = useMemo(() => pctTotal(percent), [percent]);
  const remainingPct = Math.max(0, 100 - totalPct);

  const updatePercent = (id, patch) => {
    setSaved(false);
    setPercent((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };
  const addPercent = () => {
    setSaved(false);
    setPercent((prev) => [
      ...prev,
      { id: `new_${Date.now()}`, label: "New category", pct: 0, max: null, color: CATEGORY_COLORS[prev.length % CATEGORY_COLORS.length], accountId: null },
    ]);
  };
  const addSuggested = (suggestion) => {
    setSaved(false);
    setPercent((prev) => [
      ...prev,
      { id: `new_${Date.now()}`, label: suggestion.label, pct: 0, max: null, color: suggestion.color, accountId: null },
    ]);
  };
  const removePercent = (id) => {
    if (percent.length <= 1) return;
    setSaved(false);
    setPercent((prev) => prev.filter((r) => r.id !== id));
  };
  const resetPercent = () => {
    setPercent(DEFAULT_SPLIT_RULES.percent);
    setSaved(false);
  };

  const usedLabels = useMemo(() => new Set(percent.map((r) => r.label)), [percent]);
  const availableSuggestions = useMemo(
    () => SUGGESTED_EXTRA_CATEGORIES.filter((s) => !usedLabels.has(s.label)),
    [usedLabels]
  );

  const handleSave = async () => {
    await fetch("/api/split-rules", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ percent }),
    });
    setSaved(true);
  };

  if (loading) return <p className="text-sm text-neutral-500">Loading…</p>;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="text-center mb-1">
        <h2 className="text-lg font-bold mb-1">Split every deposit by percentage</h2>
        <p className="text-sm text-neutral-500 max-w-xl mx-auto">
          Set a percentage and connect an account for each category below. Every deposit gets divided up
          automatically. Whatever percentage isn&apos;t claimed here stays in the account the deposit landed
          in -- that&apos;s what covers rent, food, and everything else that isn&apos;t a category below, so
          it&apos;s on you to leave enough room for those.
        </p>
      </div>

      <Card className="p-6">
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {percent.map((rule) => {
            const mtdBaseline = mtdByLabel[rule.label] || 0;
            const fillPct = mtdPercentTotal > 0 ? (mtdBaseline / mtdPercentTotal) * 100 : 0;
            return (
              <div key={rule.id} className="border border-neutral-100 rounded-xl p-4 flex flex-col items-center text-center gap-2">
                <div className="flex items-center gap-2 w-full">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: rule.color }} />
                  <input value={rule.label} onChange={(e) => updatePercent(rule.id, { label: e.target.value })} className="text-sm font-medium bg-transparent border-none focus:outline-none focus:underline text-center flex-1 min-w-0" />
                  <button onClick={() => removePercent(rule.id)} disabled={percent.length <= 1} className="text-neutral-400 hover:text-red-600 disabled:opacity-30 shrink-0"><Trash2 size={14} /></button>
                </div>
                <BucketIcon fillPct={fillPct} size={52} />
                <span className="text-[10px] font-mono text-neutral-500">{currency(mtdBaseline)} this month</span>
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  <input type="number" min={0} max={100} value={rule.pct} onChange={(e) => updatePercent(rule.id, { pct: Number(e.target.value) })} className="w-14 text-sm border border-neutral-200 rounded-lg px-2 py-1 font-mono text-center" />
                  <span className="text-xs text-neutral-500">%</span>
                </div>
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  <span className="text-xs text-neutral-500">Monthly Cap $</span>
                  <input type="number" min={0} placeholder="none" value={rule.max === null ? "" : rule.max} onChange={(e) => updatePercent(rule.id, { max: e.target.value === "" ? null : Number(e.target.value) })} className="w-20 text-sm border border-neutral-200 rounded-lg px-2 py-1 font-mono text-center" />
                </div>
                {rule.retirementType && <RetirementNote label={rule.label} />}
                <div className="w-full">
                  <label className="block text-[11px] text-neutral-500 mb-1">What account should this money be stored in?</label>
                  <AccountSelect
                    value={rule.accountId}
                    onChange={(v) => updatePercent(rule.id, { accountId: v })}
                    accounts={accounts}
                    onCreateNew={() => setCreating((prev) => ({ ...prev, [rule.id]: true }))}
                    onConnectAnother={() => setConnecting((prev) => ({ ...prev, [rule.id]: true }))}
                    recommendCreate={false}
                  />
                  {connecting[rule.id] && (
                    <div className="mt-2">
                      <PlaidLinkButton
                        label="Connect another account"
                        onLinked={(account) => {
                          if (account) {
                            setAccounts((prev) => [...prev, account]);
                            updatePercent(rule.id, { accountId: account.id });
                          }
                          setConnecting((prev) => ({ ...prev, [rule.id]: false }));
                        }}
                        className="text-xs px-4 py-2"
                      />
                    </div>
                  )}
                  {creating[rule.id] && (
                    <CreateSubAccountFlow
                      costLabel={rule.label}
                      accounts={accounts}
                      onAccountLinked={(account) => setAccounts((prev) => [...prev, account])}
                      onConfirmed={(accountId) => {
                        updatePercent(rule.id, { accountId });
                        setCreating((prev) => ({ ...prev, [rule.id]: false }));
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <button onClick={addPercent} className="flex-1 min-w-[200px] flex items-center justify-center gap-2 text-sm font-medium text-emerald-700 border border-dashed border-emerald-300 rounded-xl py-2.5">
            <Plus size={15} /> Add your own category
          </button>
          <GhostButton onClick={resetPercent}>
            <RotateCcw size={16} /> Reset to default categories
          </GhostButton>
        </div>

        {availableSuggestions.length > 0 && (
          <div className="pt-4 mt-4 border-t border-neutral-100">
            <p className="text-xs text-neutral-500 mb-2">Suggestions -- click to add, starts at 0%:</p>
            <div className="flex flex-wrap gap-2">
              {availableSuggestions.map((s) => (
                <button
                  key={s.label}
                  onClick={() => addSuggested(s)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200 flex items-center gap-1"
                >
                  <Plus size={12} /> {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="pt-4 mt-4 border-t border-neutral-100 text-center text-xs">
          <span className="font-semibold text-neutral-500">
            Percentages total {totalPct}%{remainingPct > 0 ? ` -- ${remainingPct}% stays wherever each deposit lands` : ""}
          </span>
        </div>
      </Card>

      <div className="flex items-center gap-3 flex-wrap">
        <PrimaryButton onClick={handleSave}>
          <Save size={16} /> Save split rules
        </PrimaryButton>
        {saved && <span className="text-sm text-emerald-700 font-medium">Saved</span>}
      </div>
    </div>
  );
}
