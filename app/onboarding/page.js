"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Zap } from "lucide-react";
import { PrimaryButton, GhostButton, Badge } from "@/components/ui";
import IdentityForm from "@/components/IdentityForm";
import PlaidLinkButton from "@/components/PlaidLinkButton";
import AccountSelect from "@/components/AccountSelect";
import { DEFAULT_SPLIT_RULES, pctTotal } from "@/lib/allocations";

// PriorityPay Simple has no fixed-costs step at all -- onboarding is: who
// you are, verified identity (required before any money can move), connect
// your real bank account(s), and set the percentage each category gets of
// every deposit. Percentages start at PriorityPay Simple's suggested split
// (see DEFAULT_SPLIT_RULES in lib/allocations.js) and get tuned afterward
// from Split Rules -- nothing here is final.
const STEPS = ["Welcome", "Business", "Identity", "Connect bank", "Percentage Splits", "Review"];
// PriorityPay is scoped to self-employed income only -- W2 paychecks aren't
// split by PriorityPay, and a user with an employer 401(k) sharing the same
// IRS elective-deferral limit as their Solo 401k would throw off the
// contribution-room math in lib/allocations.js.
const PERSONA = "Self-Employed (No W2 Employees)";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [businessName, setBusinessName] = useState("");
  const [entityType, setEntityType] = useState("Sole proprietor / freelancer");
  const [dwollaDone, setDwollaDone] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [percent, setPercent] = useState(DEFAULT_SPLIT_RULES.percent);
  const [ageBracket, setAgeBracket] = useState("under50");
  const [submitting, setSubmitting] = useState(false);

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const updatePercent = (id, patch) => setPercent((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const totalPct = pctTotal(percent);
  const remainingPct = Math.max(0, 100 - totalPct);

  const finish = async () => {
    setSubmitting(true);
    await fetch("/api/onboarding/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        persona: PERSONA,
        businessName,
        entityType,
        retirementProfile: { incomeHandling: "n/a", hasW2Plan: false, w2ElectiveDeferralYTD: 0, ageBracket },
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
                Every deposit, <span className="text-emerald-600">split by percentage</span> -- automatically.
              </h1>
              <p className="text-neutral-500 text-base mb-8">
                Set a percentage for Solo 401k, SEP IRA, Investments, Tax Reserve, Emergency Fund, OPEX,
                Savings, or anything else you want -- connect an account for each, and PriorityPay Simple
                routes every deposit the moment it lands. No fixed minimums, no priority order -- you&apos;re
                responsible for making sure fixed costs are covered by whatever&apos;s left.
              </p>
              <PrimaryButton onClick={next} className="w-full">Get started <ArrowRight size={16} /></PrimaryButton>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold mb-1">Tell us about your business</h2>
              <p className="text-sm text-neutral-500 mb-4">
                PriorityPay is built exclusively for self-employed income -- no W2 paycheck splitting,
                since a mix of the two would throw off your Solo 401k / SEP IRA contribution-room math.
              </p>
              <div className="space-y-4 mb-8">
                <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Business name" className="w-full text-sm border border-neutral-200 rounded-xl px-3 py-2.5" />
                <select value={entityType} onChange={(e) => setEntityType(e.target.value)} className="w-full text-sm border border-neutral-200 rounded-xl px-3 py-2.5">
                  <option>Sole proprietor / freelancer</option>
                  <option>LLC</option>
                  <option>S-Corp</option>
                  <option>C-Corp</option>
                </select>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Your age</label>
                  <select value={ageBracket} onChange={(e) => setAgeBracket(e.target.value)} className="w-full text-sm border border-neutral-200 rounded-xl px-3 py-2.5">
                    <option value="under50">Under 50</option>
                    <option value="50to59_64plus">50–59 or 64+</option>
                    <option value="60to63">60–63</option>
                  </select>
                  <p className="text-xs text-neutral-400 mt-1">Used to size your Solo 401k / SEP IRA catch-up contribution room accurately.</p>
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
              <h2 className="text-2xl font-bold mb-1">Verify your identity</h2>
              <p className="text-sm text-neutral-500 mb-6">Required by Dwolla before any money can move. Sandbox mode.</p>
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
              <h2 className="text-2xl font-bold mb-1">Connect your bank accounts</h2>
              <p className="text-sm text-neutral-500 mb-6">
                Connect every account you use for business income and everyday spending -- checking,
                savings, whatever you&apos;ve got. Real Plaid Link, sandbox mode. Add as many as you need,
                one at a time.
              </p>
              <PlaidLinkButton
                label={accounts.length > 0 ? "Connect another account" : "Connect a bank account"}
                onLinked={(acc) => setAccounts((prev) => [...prev, acc])}
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
                Started at a sensible default -- dial each one in, and connect an account for anywhere you
                want it to land. Doesn&apos;t need to add to 100%: whatever&apos;s left stays wherever a
                deposit lands, so it&apos;s there to cover rent, food, and anything else. Skip account
                connections here if you&apos;d rather do it later from Split Rules.
              </p>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {percent.map((rule) => (
                  <div key={rule.id} className="border border-neutral-200 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: rule.color }} />
                      <span className="text-sm font-medium flex-1">{rule.label}</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={rule.pct}
                        onChange={(e) => updatePercent(rule.id, { pct: Number(e.target.value) })}
                        className="w-14 text-sm border border-neutral-200 rounded-lg px-2 py-1 font-mono text-center"
                      />
                      <span className="text-xs text-neutral-500">%</span>
                    </div>
                    {accounts.length > 0 && (
                      <AccountSelect value={rule.accountId} onChange={(v) => updatePercent(rule.id, { accountId: v })} accounts={accounts} />
                    )}
                  </div>
                ))}
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
                <div className="flex justify-between"><span className="text-neutral-500">You are</span><span className="font-semibold">{PERSONA}</span></div>
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
