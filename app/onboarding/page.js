"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Zap, Plus, Trash2 } from "lucide-react";
import { PrimaryButton, GhostButton, Badge } from "@/components/ui";
import IdentityForm from "@/components/IdentityForm";
import PlaidLinkButton from "@/components/PlaidLinkButton";
import AccountSelect from "@/components/AccountSelect";
import CreateSubAccountFlow from "@/components/CreateSubAccountFlow";
import RetirementNote from "@/components/RetirementNote";
import { DEFAULT_SPLIT_RULES, pctTotal, percentSections, groupPctTotal, newSubAccountRow } from "@/lib/allocations";

// PriorityPay Simple has no fixed-costs step at all -- onboarding is: who
// you are, verified identity (required before any money can move), and the
// percentage each category gets of every deposit (with an account connect
// or create option right on each row -- no separate "connect your bank"
// step). Percentages start at PriorityPay Simple's suggested split (see
// DEFAULT_SPLIT_RULES in lib/allocations.js) and get tuned afterward from
// Split Rules -- nothing here is final, and every account connection here
// is skippable: the dashboard nudges you to finish connecting before any
// money actually moves.
const STEPS = ["Welcome", "Business", "Identity", "Percentage Splits", "Review"];
const BUSINESS_TYPES = ["Self Employed (No W2 Employees)", "W2 Employee + Side Hustle"];

// One row of the Percentage Splits step -- used both for flat rows (Tax
// Reserve, Emergency Fund, OPEX, Savings) and for sub-account rows inside
// an Investments/Retirement group. `canRemove` is only true for group
// sub-accounts -- the flat default rows have no delete control here (that
// lives on the full Split Rules page later, if someone wants it).
function PercentRow({ rule, accounts, onUpdate, onRemove, canRemove, creating, setCreating, connecting, setConnecting, onAccountLinked }) {
  return (
    <div className="border border-neutral-200 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: rule.color }} />
        <input
          value={rule.label}
          onChange={(e) => onUpdate(rule.id, { label: e.target.value })}
          className="text-sm font-medium flex-1 min-w-0 bg-transparent border-none focus:outline-none focus:underline"
        />
        <input
          type="number"
          min={0}
          max={100}
          value={rule.pct}
          onChange={(e) => onUpdate(rule.id, { pct: Number(e.target.value) })}
          className="w-14 text-sm border border-neutral-200 rounded-lg px-2 py-1 font-mono text-center"
        />
        <span className="text-xs text-neutral-500">%</span>
        {canRemove && (
          <button onClick={() => onRemove(rule.id)} className="text-neutral-400 hover:text-red-600 shrink-0">
            <Trash2 size={14} />
          </button>
        )}
      </div>
      {rule.retirementType || rule.group === "Retirement" ? <RetirementNote label={rule.label} /> : null}
      <div className="mt-2">
        <AccountSelect
          value={rule.accountId}
          onChange={(v) => onUpdate(rule.id, { accountId: v })}
          accounts={accounts}
          onCreateNew={() => setCreating((prev) => ({ ...prev, [rule.id]: true }))}
          onConnectAnother={() => setConnecting((prev) => ({ ...prev, [rule.id]: true }))}
          recommendCreate={false}
        />
      </div>
      {connecting[rule.id] && (
        <div className="mt-2">
          <PlaidLinkButton
            label="Connect another account"
            onLinked={(account) => {
              if (account) {
                onAccountLinked(account);
                onUpdate(rule.id, { accountId: account.id });
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
          onAccountLinked={onAccountLinked}
          onConfirmed={(accountId) => {
            onUpdate(rule.id, { accountId });
            setCreating((prev) => ({ ...prev, [rule.id]: false }));
          }}
        />
      )}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [businessName, setBusinessName] = useState("");
  const [entityType] = useState("Sole proprietor / freelancer");
  const [businessType, setBusinessType] = useState(BUSINESS_TYPES[0]);
  const [dwollaDone, setDwollaDone] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [percent, setPercent] = useState(DEFAULT_SPLIT_RULES.percent);
  const [creating, setCreating] = useState({});
  const [connecting, setConnecting] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const updatePercent = (id, patch) => setPercent((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const addSubAccount = (group) => setPercent((prev) => [...prev, newSubAccountRow(group, prev.length)]);
  const removeSubAccount = (group, id) =>
    setPercent((prev) => (prev.filter((r) => r.group === group).length <= 1 ? prev : prev.filter((r) => r.id !== id)));
  const onAccountLinked = (account) => account && setAccounts((prev) => [...prev, account]);

  const totalPct = pctTotal(percent);
  const remainingPct = Math.max(0, 100 - totalPct);

  const finish = async () => {
    setSubmitting(true);
    await fetch("/api/onboarding/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        persona: businessType,
        businessName,
        entityType,
        retirementProfile: {
          incomeHandling: "n/a",
          hasW2Plan: businessType === "W2 Employee + Side Hustle",
          w2ElectiveDeferralYTD: 0,
          // No age-bracket question in onboarding anymore -- defaults to
          // the under-50 IRS limit tier. Adjustable later from Split Rules
          // if that's ever wrong for someone.
          ageBracket: "under50",
        },
        splitRules: { percent },
      }),
    });
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen w-full bg-white flex flex-col">
      <div className="px-8 pt-6 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center">
          <Zap size={16} className="text-white" strokeWidth={2.5} />
        </div>
        <span className="text-base font-bold">PriorityPay Simple</span>
      </div>

      {step > 0 && (
        <div className="px-8 pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-neutral-500">Step {step} of {STEPS.length - 1}</span>
            <span className="text-xs font-semibold text-neutral-500">{STEPS[step]}</span>
          </div>
          <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-600 rounded-full transition-all" style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} />
          </div>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center px-8 py-10 overflow-y-auto">
        <div className="w-full max-w-md">
          {step === 0 && (
            <div className="text-center">
              <Badge>Built for the self-employed</Badge>
              <h1 className="text-4xl font-extrabold leading-tight mb-4 mt-4">
                Route your money <span className="text-emerald-600">BEFORE you spend it.</span>
              </h1>
              <p className="text-neutral-500 text-base mb-8">
                Allocate a percentage of every deposit to investments, savings, and other accounts automatically
                and immediately (BEFORE you spend it).
              </p>
              <PrimaryButton onClick={next} className="w-full">Get started <ArrowRight size={16} /></PrimaryButton>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Tell us about your business</h2>
              <div className="space-y-4 mb-8">
                <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Business name" className="w-full text-sm border border-neutral-200 rounded-xl px-3 py-2.5" />
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Business Type</label>
                  <select value={businessType} onChange={(e) => setBusinessType(e.target.value)} className="w-full text-sm border border-neutral-200 rounded-xl px-3 py-2.5">
                    {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <GhostButton onClick={back}><ArrowLeft size={16} /> Back</GhostButton>
                <PrimaryButton onClick={next} className="flex-1">Continue <ArrowRight size={16} /></PrimaryButton>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Verify your identity</h2>
              {dwollaDone ? (
                <p className="text-sm text-emerald-700 font-medium mb-6">Identity verified.</p>
              ) : (
                <IdentityForm onDone={() => setDwollaDone(true)} />
              )}
              <div className="flex gap-3 mt-6">
                <GhostButton onClick={back}><ArrowLeft size={16} /> Back</GhostButton>
                <PrimaryButton onClick={next} disabled={!dwollaDone} className="flex-1">Continue <ArrowRight size={16} /></PrimaryButton>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold mb-1">Set your percentage splits</h2>
              <p className="text-sm text-neutral-500 mb-4">
                Started at a sensible default -- dial each one in. Investments and Retirement can each hold
                multiple accounts (rename, add, or delete them freely); every row's total is just whatever its
                accounts add up to. Connect or create an account for anywhere you want the money to land, or
                skip it for now -- you can always finish connecting later from the dashboard, before any money
                actually moves. Doesn&apos;t need to add to 100%: whatever&apos;s left stays wherever a deposit
                lands, so it&apos;s there to cover rent, food, and anything else.
              </p>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {percentSections(percent).map((section) =>
                  section.type === "group" ? (
                    <div key={section.group} className="border border-neutral-200 rounded-xl p-3 bg-neutral-50">
                      <div className="flex items-center justify-between mb-2 px-0.5">
                        <span className="text-sm font-semibold">{section.group}</span>
                        <span className="text-xs font-mono text-neutral-500">{groupPctTotal(section.rows)}% total</span>
                      </div>
                      <div className="space-y-2">
                        {section.rows.map((rule) => (
                          <PercentRow
                            key={rule.id}
                            rule={rule}
                            accounts={accounts}
                            onUpdate={updatePercent}
                            onRemove={(id) => removeSubAccount(section.group, id)}
                            canRemove={section.rows.length > 1}
                            creating={creating}
                            setCreating={setCreating}
                            connecting={connecting}
                            setConnecting={setConnecting}
                            onAccountLinked={onAccountLinked}
                          />
                        ))}
                      </div>
                      <button
                        onClick={() => addSubAccount(section.group)}
                        className="mt-2 w-full text-xs font-medium text-emerald-700 border border-dashed border-emerald-300 rounded-lg py-1.5 flex items-center justify-center gap-1"
                      >
                        <Plus size={12} /> Add {section.group === "Retirement" ? "a retirement account" : "an investment account"}
                      </button>
                    </div>
                  ) : (
                    <PercentRow
                      key={section.row.id}
                      rule={section.row}
                      accounts={accounts}
                      onUpdate={updatePercent}
                      canRemove={false}
                      creating={creating}
                      setCreating={setCreating}
                      connecting={connecting}
                      setConnecting={setConnecting}
                      onAccountLinked={onAccountLinked}
                    />
                  )
                )}
              </div>
              <p className="text-xs text-neutral-500 mt-3 text-center">
                Total {totalPct}%{remainingPct > 0 ? ` -- ${remainingPct}% left over` : ""}
              </p>
              <div className="flex gap-3 mt-4">
                <GhostButton onClick={back}><ArrowLeft size={16} /> Back</GhostButton>
                <PrimaryButton onClick={next} className="flex-1">Continue <ArrowRight size={16} /></PrimaryButton>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="text-2xl font-bold mb-1">Review and finish</h2>
              <p className="text-sm text-neutral-500 mb-6">
                You can change any percentage, account, or category later from Split Rules.
              </p>
              <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 mb-6 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-neutral-500">You are</span><span className="font-semibold">{businessType}</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">Accounts linked</span><span className="font-semibold">{accounts.length}</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">Percentages set</span><span className="font-semibold">{totalPct}%</span></div>
              </div>
              <div className="flex gap-3">
                <GhostButton onClick={back}><ArrowLeft size={16} /> Back</GhostButton>
                <PrimaryButton onClick={finish} disabled={submitting} className="flex-1">
                  {submitting ? "Setting up…" : "Enter dashboard"} <ArrowRight size={16} />
                </PrimaryButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
