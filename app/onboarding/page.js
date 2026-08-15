"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Zap, Plus } from "lucide-react";
import { PrimaryButton, GhostButton, Badge } from "@/components/ui";
import IdentityForm from "@/components/IdentityForm";
import PlaidLinkButton from "@/components/PlaidLinkButton";
import PercentSplitEditor from "@/components/PercentSplitEditor";
import { DEFAULT_SPLIT_RULES, pctTotal, newSubAccountRow, clampPctToRemaining, SUGGESTED_EXTRA_CATEGORIES, CATEGORY_COLORS } from "@/lib/allocations";

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

// "Tax Reserve" / "Investments and Emergency Fund" / "A, B, and C" -- used
// to list unconnected category names in one sentence on Step 4 (see
// showUnconnectedModal below).
function joinWithAnd(items) {
  if (items.length <= 1) return items[0] || "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

// Quick-connect shortcuts for the fintech apps money most often lands in.
// Zelle isn't included on purpose -- it has no account/routing number of
// its own, it's a feature layered onto whatever bank account someone
// already registered with it, so there's nothing for Plaid to connect to.
const APP_CONNECT_OPTIONS = [
  { key: "paypal", name: "PayPal", color: "#0070ba", hoverColor: "#005ea6" },
  { key: "venmo", name: "Venmo", color: "#3D95CE", hoverColor: "#2f7dad" },
  { key: "cashapp", name: "Cash App", color: "#00D632", hoverColor: "#00b82b" },
];

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
  // Step 3: after any account links, ask "got more?" instead of leaving it
  // to a static button label.
  const [showAddMorePopup, setShowAddMorePopup] = useState(false);
  // Step 4: the inline per-row "not connected" note is off here (see
  // showRowWarnings=false below) -- instead this catches it once, at the
  // moment someone tries to leave the step, and lists every affected
  // category by name in one place.
  const [showUnconnectedModal, setShowUnconnectedModal] = useState(false);

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const updatePercent = (id, patch) =>
    setPercent((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, ...patch, ...(patch.pct !== undefined ? { pct: clampPctToRemaining(prev, id, patch.pct) } : {}) }
          : r
      )
    );
  const addSubAccount = (group) => setPercent((prev) => [...prev, newSubAccountRow(group, prev.length)]);
  const removeSubAccount = (group, id) =>
    setPercent((prev) => (prev.filter((r) => r.group === group).length <= 1 ? prev : prev.filter((r) => r.id !== id)));
  const onAccountLinked = (account) => account && setAccounts((prev) => [...prev, account]);

  // Same "add your own category" capability as Split Rules -- Wedding,
  // College Fund, Hobbies, Profit, or literally anything else -- available
  // right in onboarding instead of only after finishing it. New rows start
  // at 0% (see newSubAccountRow's comment) so adding one never changes
  // anyone else's split.
  const addPercent = () =>
    setPercent((prev) => [
      ...prev,
      { id: `new_${Date.now()}`, label: "New category", group: null, pct: 0, max: null, color: CATEGORY_COLORS[prev.length % CATEGORY_COLORS.length], accountId: null },
    ]);
  const addSuggested = (suggestion) =>
    setPercent((prev) => [
      ...prev,
      { id: `new_${Date.now()}`, label: suggestion.label, group: null, pct: 0, max: null, color: suggestion.color, accountId: null },
    ]);
  const usedLabels = new Set(percent.map((r) => r.label));
  const availableSuggestions = SUGGESTED_EXTRA_CATEGORIES.filter((s) => !usedLabels.has(s.label));

  const totalPct = pctTotal(percent);
  const remainingPct = Math.max(0, 100 - totalPct);

  // Same criterion the Dashboard nudge uses post-onboarding (see
  // app/(app)/dashboard/page.js) -- a row claiming a real percentage with
  // nowhere to send it yet.
  const unconnectedForStep4 = percent.filter((r) => (Number(r.pct) || 0) > 0 && !r.accountId);
  const handleStep4Continue = () => {
    if (unconnectedForStep4.length > 0) {
      setShowUnconnectedModal(true);
      return;
    }
    next();
  };

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
                <>
                  <IdentityForm onDone={() => setDwollaDone(true)} />
                  {/* TEMPORARY -- testing convenience only, remove before this
                      app moves past prototype. Lets Megan click through
                      onboarding repeatedly without fighting Dwolla sandbox's
                      one-identity-per-email rule. Sets local state only --
                      no real Dwolla customer gets created, so dwollaDone
                      resets to false again on the next fresh visit unless
                      IdentityForm is actually completed. */}
                  <button
                    onClick={() => setDwollaDone(true)}
                    className="text-xs text-neutral-400 underline mt-3"
                  >
                    Skip identity verification (testing only)
                  </button>
                </>
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
                PriorityPay Simple can only split a deposit it actually sees. Connect every account you could
                receive a client payment from, including Venmo, Cash App, PayPal, and anywhere else money might
                land. You can always add more inside the dashboard.
              </p>
              <PlaidLinkButton
                label="Connect Account"
                onLinked={(account) => {
                  onAccountLinked(account);
                  if (account) setShowAddMorePopup(true);
                }}
              />

              <p className="text-xs font-semibold text-neutral-500 mt-6 mb-2">Connect these apps:</p>
              <div className="flex flex-wrap gap-2">
                {APP_CONNECT_OPTIONS.map((app) => (
                  <PlaidLinkButton
                    key={app.key}
                    label={app.name}
                    className="text-xs px-4 py-2"
                    style={{ backgroundColor: app.color }}
                    onLinked={(account) => {
                      onAccountLinked(account);
                      if (account) setShowAddMorePopup(true);
                    }}
                  />
                ))}
                <PlaidLinkButton
                  label="Connect More Apps"
                  className="text-xs px-4 py-2"
                  style={{ backgroundColor: "#525252" }}
                  onLinked={(account) => {
                    onAccountLinked(account);
                    if (account) setShowAddMorePopup(true);
                  }}
                />
              </div>
              <p className="text-[11px] text-neutral-400 mt-2">
                &quot;Connect More Apps&quot; opens the same Plaid search used above -- look up any other app or
                bank you get paid through that isn&apos;t listed here.
              </p>

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
              <p className="text-sm text-neutral-500 mb-2">
                Each deposit you receive will be split and automatically sent to the following accounts. Here,
                set the percentages you want sent to each account.
              </p>
              <p className="text-sm text-neutral-500 mb-2">
                For example, if you select &quot;10%&quot; for savings, and PriorityPay detects a $100 deposit,
                $10 will be automatically routed to the savings account connected.
              </p>
              <p className="text-sm text-neutral-500 mb-2">
                If you don&apos;t have one of these accounts, you can set the percentage to &quot;0%&quot; and no
                money will be routed to that account.
              </p>
              <p className="text-sm text-neutral-500 mb-4">
                Note: Any money not routed to one of the accounts below will remain where it was deposited.
              </p>
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
                showRowWarnings={false}
              />
              <div className="flex items-center gap-2 flex-wrap mt-3">
                <button
                  onClick={addPercent}
                  className="flex-1 min-w-[180px] flex items-center justify-center gap-2 text-sm font-medium text-emerald-700 border border-dashed border-emerald-300 rounded-xl py-2"
                >
                  <Plus size={15} /> Add your own category
                </button>
              </div>
              {availableSuggestions.length > 0 && (
                <div className="mt-3">
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
              <p className="text-xs text-neutral-500 mt-3 text-center">
                {totalPct}% allocated{remainingPct > 0 ? ` and ${remainingPct}% remains where it was deposited.` : "."}
              </p>
              <div className="flex gap-3 mt-4">
                <GhostButton onClick={back}><ArrowLeft size={16} /> Back</GhostButton>
                <PrimaryButton onClick={handleStep4Continue} className="flex-1">Continue <ArrowRight size={16} /></PrimaryButton>
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

      {showAddMorePopup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6">
            <h3 className="text-base font-bold mb-4">Have any more accounts to add?</h3>
            <div className="flex flex-col gap-2">
              <PlaidLinkButton
                label="Connect More Accounts"
                onLinked={(account) => {
                  onAccountLinked(account);
                }}
              />
              <GhostButton onClick={() => setShowAddMorePopup(false)}>No, that&apos;s all</GhostButton>
            </div>
          </div>
        </div>
      )}

      {showUnconnectedModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6">
            <h3 className="text-base font-bold mb-3">Missing accounts</h3>
            <p className="text-sm text-neutral-600 mb-6">
              You haven&apos;t connected an account for {joinWithAnd(unconnectedForStep4.map((r) => r.label))} yet.
              Until you connect one, money will not be routed and will stay wherever the deposit landed.
            </p>
            <div className="flex gap-3">
              <GhostButton onClick={() => setShowUnconnectedModal(false)} className="flex-1">
                Go back and connect
              </GhostButton>
              <PrimaryButton
                onClick={() => {
                  setShowUnconnectedModal(false);
                  next();
                }}
                className="flex-1"
              >
                Continue anyway
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
