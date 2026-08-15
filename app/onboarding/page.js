"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Zap } from "lucide-react";
import { PrimaryButton, GhostButton, Badge } from "@/components/ui";
import IdentityForm from "@/components/IdentityForm";
import PlaidLinkButton from "@/components/PlaidLinkButton";
import PercentSplitEditor from "@/components/PercentSplitEditor";
import { DEFAULT_SPLIT_RULES, pctTotal, newSubAccountRow } from "@/lib/allocations";

// PriorityPay Simple has no fixed-costs step at all -- onboarding is: who
// you are, verified identity (required before any money can move), every
// account money reaches you through (so nothing skips the split), and the
// percentage each category gets of every deposit (with its own account
// connect-or-create option right on each row). Percentages start at
// PriorityPay Simple's suggested split (see DEFAULT_SPLIT_RULES in
// lib/allocations.js) and get tuned afterward from Split Rules -- nothing
// here is final, and every account connection is skippable: the dashboard
// nudges you to finish connecting before any money actually moves.
const STEPS = ["Welcome", "Business", "Identity", "Connect Accounts", "Percentage Splits", "Review"];
const BUSINESS_TYPES = ["Self Employed (No W2 Employees)", "W2 Employee + Side Hustle"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [businessName, setBusinessName] = useState("");
  const [entityType] = useState("Sole proprietor / freelancer");
  const [businessType, setBusinessType] = useState(BUSINESS_TYPES[0]);
  // Checked against the real Dwolla record on mount instead of assuming
  // false -- someone who already verified in an earlier session (or hit
  // this step twice) would otherwise always see a blank form again, and
  // submitting it a second time gets rejected by Dwolla as a duplicate
  // customer for the same email. `null` means "still checking."
  const [dwollaDone, setDwollaDone] = useState(null);

  useEffect(() => {
    fetch("/api/dwolla/status")
      .then((r) => r.json())
      .then((d) => setDwollaDone(!!d.verified))
      .catch(() => setDwollaDone(false));
  }, []);
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
              {dwollaDone === null ? (
                <p className="text-sm text-neutral-400 mb-6">Checking your identity status…</p>
              ) : dwollaDone ? (
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
              <h2 className="text-2xl font-bold mb-1">Connect everywhere money reaches you</h2>
              <p className="text-sm text-neutral-500 mb-6">
                PriorityPay Simple can only split a deposit it actually sees. Connect every account a client
                could ever pay you into -- your business checking and savings, of course, but also Venmo,
                Zelle, Cash App, PayPal, and anywhere else money might land. Miss one, and every deposit that
                lands there skips your split entirely. Add as many as you need, one at a time -- you can always
                come back and add more later from Accounts.
              </p>
              <PlaidLinkButton
                label={accounts.length > 0 ? "Connect another account" : "Connect an account"}
                onLinked={onAccountLinked}
              />
              <div className="mt-4 space-y-2">
                {accounts.map((a) => (
                  <div key={a.id} className="text-sm text-neutral-700 border border-neutral-200 rounded-lg px-3 py-2">
                    {a.institution_name} — {a.account_name} •••• {a.mask}
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-6">
                <GhostButton onClick={back}><ArrowLeft size={16} /> Back</GhostButton>
                {accounts.length > 0 ? (
                  <PrimaryButton onClick={next} className="flex-1">Continue <ArrowRight size={16} /></PrimaryButton>
                ) : (
                  <GhostButton onClick={next} className="flex-1">Skip for now</GhostButton>
                )}
              </div>
            </div>
          )}

          {step === 4 && (
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
              <div className="max-h-96 overflow-y-auto pr-1">
                <PercentSplitEditor
                  percent={percent}
                  accounts={accounts}
                  onUpdatePercent={updatePercent}
                  onAddSubAccount={addSubAccount}
                  onRemoveSubAccount={removeSubAccount}
                  onAccountLinked={onAccountLinked}
                  creating={creating}
                  setCreating={setCreating}
                  connecting={connecting}
                  setConnecting={setConnecting}
                />
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

          {step === 5 && (
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
