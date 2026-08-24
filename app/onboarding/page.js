"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import PlaidLinkButton from "@/components/PlaidLinkButton";
import PercentSplitEditor from "@/components/PercentSplitEditor";
import { DEFAULT_SPLIT_RULES, pctTotal, roundPct, newSubAccountRow, clampPctToRemaining, maxAllowedPct, settleCaps, SUGGESTED_EXTRA_CATEGORIES, CATEGORY_COLORS } from "@/lib/allocations";
import { decodeSim } from "@/lib/simSharing";
import { LEDGER_TOKENS, ledgerInputStyle } from "@/lib/ledgerTheme";
import { normalizeUSPhone, isValidUSPhone } from "@/lib/phone";

// Re-enabled: PriorityPay no longer needs a banking partner/ACH approval
// to onboard people at all (see TRANSFER_EXECUTION_MODE in lib/runSplit.js
// -- manual_approval mode calculates the split and lets the user send each
// transfer themselves, with zero standing transfer authority required).
// The old gate below assumed onboarding was blocked on Dwolla production
// access; that assumption no longer holds. Flip back to false only if
// onboarding needs to be paused for some other reason.
const ONBOARDING_LIVE = true;

// PriorityPay Simple has no fixed-costs step at all -- onboarding is: who
// you are, verified identity (required before any money can move), every
// account money reaches you through (so nothing skips the split), and the
// percentage each category gets of every deposit (with its own account
// connect-or-create option right on each row). Percentages start at
// PriorityPay Simple's suggested split (see DEFAULT_SPLIT_RULES in
// lib/allocations.js) and get tuned afterward from Split Rules -- nothing
// here is final, and every account connection is skippable: the dashboard
// nudges you to finish connecting before any money actually moves.
//
// Visual design: the "Ledger" system Megan designed in Claude Design
// (see lib/ledgerTheme.js), ported onto this same functional flow --
// every handler, validation rule, and API call below is unchanged from
// the previous version. Deeply-nested pieces (IdentityForm,
// PercentSplitEditor, AccountSelect, CreateSubAccountFlow, RetirementNote)
// opt into the same look via a `theme="ledger"` prop rather than being
// forked, so the standalone Split Rules page (which reuses several of the
// same components) keeps its original appearance untouched.
const STEPS = ["Welcome", "Business", "Connect Accounts", "Percentage Splits", "Deposit Alerts", "Review"];
// businessType drives real retirement-calculation logic downstream (see
// finish() below). "Business Owner (With Employees)" is the one option
// that unlocks two extra inline questions on this same step (see step 1
// below) -- everything else about onboarding stays identical across all
// three choices.
const BUSINESS_TYPES = [
  "Self Employed (No Employees)",
  "Business Owner (With Employees)",
  "W2 Employee + Side Hustle",
];
const HAS_EMPLOYEES_TYPE = "Business Owner (With Employees)";

// "Tax Reserve" / "Investments and Emergency Fund" / "A, B, and C" -- used
// to list unconnected category names in one sentence on Step 4 (see
// showUnconnectedModal below).
function joinWithAnd(items) {
  if (items.length <= 1) return items[0] || "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function BackBtn({ onClick }) {
  return (
    <button onClick={onClick} className="pp-btn pp-btn-secondary" style={{ padding: "13px 24px" }}>
      ← &nbsp;Back
    </button>
  );
}
function PrimaryBtn({ onClick, disabled, children, flex }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="pp-btn pp-btn-primary"
      style={{ padding: "13px 30px", flex: flex ? 1 : undefined, opacity: disabled ? 0.45 : 1, cursor: disabled ? "not-allowed" : "pointer" }}
    >
      {children}
    </button>
  );
}
function GhostBtn({ onClick, children, flex }) {
  return (
    <button onClick={onClick} className="pp-btn pp-btn-ghost" style={{ padding: "13px 30px", flex: flex ? 1 : undefined }}>
      {children}
    </button>
  );
}

function OnboardingPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
  const [businessName, setBusinessName] = useState("");
  const [entityType] = useState("Sole proprietor / freelancer");
  const [businessType, setBusinessType] = useState(BUSINESS_TYPES[0]);
  // Only asked/used for "Business Owner (With Employees)" -- a rough
  // self-reported number (no payroll integration exists) that feeds the
  // SEP IRA employer-parity cost shown later on Close-Out, and whether
  // business and personal money stay separate or share one account, which
  // sets the default assumption for how deposits/expenses get categorized
  // (still correctable transaction-by-transaction either way).
  const [employeePayroll, setEmployeePayroll] = useState("");
  const [incomeHandling, setIncomeHandling] = useState(null);
  const isBusinessOwnerWithEmployees = businessType === HAS_EMPLOYEES_TYPE;
  // Identity verification (Dwolla KYB/KYC) was required here back when
  // Dwolla originated real transfers on someone's behalf -- see the
  // removed Identity step below. Manual-approval mode (lib/runSplit.js)
  // means PriorityPay never touches money itself, so there's nothing left
  // that actually requires verifying identity before connecting accounts.
  // Removed rather than just skipped, so this doesn't quietly collect SSNs
  // for no reason -- see the equivalent removal on the Accounts page.
  const [accounts, setAccounts] = useState([]);
  const [percent, setPercent] = useState(DEFAULT_SPLIT_RULES.percent);
  // $50 is a hard floor (see PHASE N, supabase/schema.sql) -- enforced
  // both here (input can't go below it) and again server-side in
  // app/api/onboarding/complete, so it can't be bypassed by editing the
  // request directly. Below this amount, an automatic deposit is skipped
  // entirely rather than triggering a checklist for a few dollars. Lowered
  // from the original $100 floor since some clients pay as little as $50.
  const MIN_DEPOSIT_THRESHOLD_FLOOR = 50;
  const [minDepositThreshold, setMinDepositThreshold] = useState(MIN_DEPOSIT_THRESHOLD_FLOOR);
  // Deposit text alerts default to on (see PHASE M, supabase/schema.sql --
  // sms_notifications_enabled defaults true at the DB level for every new
  // profile) but nothing ever asked for a phone number until now, so the
  // feature was silently a no-op for anyone who signed up and never
  // separately visited Settings (see lib/runSplit.js -- it requires
  // phone_number AND sms_notifications_enabled both truthy before sending
  // anything). Asking here, right where the deposit threshold is already
  // being set, means alerts actually work from day one instead of quietly
  // depending on a Settings visit nobody's prompted to make.
  const [phoneNumber, setPhoneNumber] = useState("");
  const [smsEnabled, setSmsEnabled] = useState(true);
  // Carried over from the Money Simulator's "Start saving for this" /
  // "Set up my real accounts" buttons (see app/(app)/simulator/page.js),
  // which base64-encode the simulated split into ?sim=. Runs once on
  // mount and REPLACES the default seed -- the simulator payload is
  // already a complete split, not a delta.
  useEffect(() => {
    const decoded = decodeSim(searchParams.get("sim"));
    if (decoded) setPercent(decoded);
  }, [searchParams]);
  const [creating, setCreating] = useState({});
  const [connecting, setConnecting] = useState({});
  const [submitting, setSubmitting] = useState(false);
  // Stripe Checkout is a real off-domain redirect, so the whole page
  // (and every bit of the state above) reloads from scratch by the time
  // someone's back -- everything they entered was already saved
  // server-side via /api/onboarding/complete (finalize: false) right
  // before they left, so nothing here needs to be restored, just the
  // Review step needs to jump straight to confirming the payment instead
  // of starting over from Welcome. See finish() below for the send-off
  // half of this round trip.
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  useEffect(() => {
    const paid = searchParams.get("paid");
    if (paid === "1") {
      const sessionId = searchParams.get("session_id");
      setStep(STEPS.length - 1);
      setConfirmingPayment(true);
      fetch("/api/onboarding/confirm-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.ok) {
            router.push("/dashboard");
            router.refresh();
            return;
          }
          setConfirmingPayment(false);
          setPaymentError(data.error || "Could not confirm your payment. Please try again.");
        })
        .catch(() => {
          setConfirmingPayment(false);
          setPaymentError("Could not confirm your payment. Please try again.");
        });
    } else if (paid === "cancelled") {
      setStep(STEPS.length - 1);
      setPaymentError("Checkout was cancelled — no charge was made. Try again when you're ready.");
    }
    // Only ever meant to run once, against whatever ?paid= was on the URL
    // Stripe redirected back to -- not on every searchParams change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Step 3: after any account links, ask "got more?" instead of leaving it
  // to a static button label.
  const [showAddMorePopup, setShowAddMorePopup] = useState(false);
  // Step 4: the inline per-row "not connected" note is off here (see
  // showRowWarnings=false below) -- instead this catches it once, at the
  // moment someone tries to leave the step, and lists every affected
  // category by name in one place.
  const [showUnconnectedModal, setShowUnconnectedModal] = useState(false);
  // Step 3: a last-check confirmation before leaving "Connect Accounts" --
  // asks the user to double-check they haven't forgotten an income source,
  // since PriorityPay can only split deposits it actually sees.
  const [showConfirmAccountsModal, setShowConfirmAccountsModal] = useState(false);

  const next = () => {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo(0, 0);
  };
  const back = () => {
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo(0, 0);
  };

  // Saved as soon as an account is connected/changed on a row, even mid-
  // onboarding -- PUT replaces the whole rule set for this user regardless
  // of whether onboarding has been "finished" yet, so a real linked
  // account is never lost just because someone closes the tab before
  // reaching Step 5. Percentage/name edits still only get written for real
  // at finish() -- see below.
  const saveSplitRulesNow = (nextPercent) =>
    fetch("/api/split-rules", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ percent: settleCaps(nextPercent) }),
    });
  // Someone typing a percentage that would push the total over 100% gets
  // silently clamped (see clampPctToRemaining in lib/allocations.js) --
  // that alone can read as the input just not responding, so this also
  // surfaces a one-row-at-a-time warning explaining what happened and the
  // most they could actually enter. Cleared automatically after a few
  // seconds, same pattern as the "row deleted" toast below.
  const [pctOverflow, setPctOverflow] = useState(null);
  useEffect(() => {
    if (!pctOverflow) return;
    const t = setTimeout(() => setPctOverflow(null), 5000);
    return () => clearTimeout(t);
  }, [pctOverflow]);
  const updatePercent = (id, patch) =>
    setPercent((prev) => {
      if (patch.pct !== undefined) {
        const roomLeft = maxAllowedPct(prev, id);
        const requested = Math.max(0, Number(patch.pct) || 0);
        setPctOverflow(
          requested > roomLeft
            ? { id, message: `This would put your deposit allocation over 100%. Select no more than ${roomLeft}% or adjust some of the other percentages.` }
            : null
        );
      }
      const next = prev.map((r) =>
        r.id === id
          ? { ...r, ...patch, ...(patch.pct !== undefined ? { pct: clampPctToRemaining(prev, id, patch.pct) } : {}) }
          : r
      );
      if (patch.accountId !== undefined) saveSplitRulesNow(next);
      return next;
    });
  const addSubAccount = (group) => setPercent((prev) => [...prev, newSubAccountRow(group, prev.length)]);
  // { row, index } of the most recently deleted category/sub-account, so
  // "Undo" can put it back exactly where it was.
  const [lastDeleted, setLastDeleted] = useState(null);
  useEffect(() => {
    if (!lastDeleted) return;
    const t = setTimeout(() => setLastDeleted(null), 8000);
    return () => clearTimeout(t);
  }, [lastDeleted]);
  const removeRow = (id) =>
    setPercent((prev) => {
      const index = prev.findIndex((r) => r.id === id);
      if (index === -1) return prev;
      setLastDeleted({ row: prev[index], index });
      return prev.filter((r) => r.id !== id);
    });
  const undoDelete = () => {
    if (!lastDeleted) return;
    setPercent((prev) => {
      const copy = [...prev];
      copy.splice(Math.min(lastDeleted.index, copy.length), 0, lastDeleted.row);
      return copy;
    });
    setLastDeleted(null);
  };
  const onAccountLinked = (account) => account && setAccounts((prev) => [...prev, account]);

  // Same "add your own category" capability as Split Rules -- Wedding,
  // College Fund, Hobbies, Profit, or literally anything else -- available
  // right in onboarding instead of only after finishing it. New rows start
  // at 0% (see newSubAccountRow's comment) so adding one never changes
  // anyone else's split.
  const addPercent = () =>
    setPercent((prev) => [
      ...prev,
      { id: `new_${Date.now()}`, label: "New category", group: null, pct: 0, max: null, balanceCap: null, color: CATEGORY_COLORS[prev.length % CATEGORY_COLORS.length], accountId: null },
    ]);
  const addSuggested = (suggestion) =>
    setPercent((prev) => [
      ...prev,
      { id: `new_${Date.now()}`, label: suggestion.label, group: null, pct: 0, max: null, balanceCap: null, color: suggestion.color, accountId: null },
    ]);
  const usedLabels = new Set(percent.map((r) => r.label));
  const availableSuggestions = SUGGESTED_EXTRA_CATEGORIES.filter((s) => !usedLabels.has(s.label));

  const totalPct = pctTotal(percent);
  const remainingPct = roundPct(Math.max(0, 100 - totalPct));

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

  // No more 30-day free trial for anyone signing up from here on -- $7/mo
  // is collected via Stripe Checkout right here, before onboarding
  // actually finishes, since PriorityPay now incurs real costs (Plaid,
  // Twilio, Anthropic) the moment someone starts using it. Existing
  // trialing users are entirely unaffected -- this only ever runs for a
  // brand-new signup finishing onboarding for the first time.
  //
  // Everything is saved with `finalize: false` (so `onboarded` stays
  // false) BEFORE the redirect, since Checkout is a real off-domain page
  // and this whole tab reloads by the time someone's back -- see the
  // ?paid= handling in the useEffect above for the other half of this.
  const finish = async () => {
    setSubmitting(true);
    setPaymentError(null);
    await fetch("/api/onboarding/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        persona: businessType,
        businessName,
        entityType,
        retirementProfile: {
          incomeHandling: isBusinessOwnerWithEmployees ? incomeHandling || "separate" : "n/a",
          hasW2Plan: businessType === "W2 Employee + Side Hustle",
          w2ElectiveDeferralYTD: 0,
          // No age-bracket question in onboarding anymore -- defaults to
          // the under-50 IRS limit tier. Adjustable later from Split Rules
          // if that's ever wrong for someone.
          ageBracket: "under50",
          estimatedEmployeePayroll: isBusinessOwnerWithEmployees ? Number(employeePayroll) || 0 : null,
        },
        splitRules: { percent: settleCaps(percent) },
        minDepositThreshold,
        notifications: { phoneNumber: normalizeUSPhone(phoneNumber), smsEnabled },
        finalize: false,
      }),
    });
    const res = await fetch("/api/onboarding/checkout", { method: "POST" });
    const data = await res.json();
    if (!res.ok || !data.url) {
      setSubmitting(false);
      setPaymentError(data.error || "Could not start checkout. Please try again.");
      return;
    }
    window.location.href = data.url;
  };

  const stepCounter = step === 0 ? "Getting started" : `Step ${step} of ${STEPS.length - 1}`;
  const progress = step === 0 ? 2 : Math.min(100, step * (100 / (STEPS.length - 1)));

  if (!ONBOARDING_LIVE) {
    return (
      <div style={{ ...LEDGER_TOKENS, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
        <div style={{ maxWidth: "28em" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 30 }}>
            <span style={{ width: 34, height: 1, background: "var(--color-accent)" }} />
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>
              Coming soon
            </span>
            <span style={{ width: 34, height: 1, background: "var(--color-accent)" }} />
          </div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(30px, 5vw, 42px)", fontWeight: 400, lineHeight: 1.1, margin: "0 0 16px" }}>
            We&apos;re almost ready.
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: "color-mix(in srgb, var(--color-text) 70%, transparent)", margin: "0 0 30px" }}>
            We&apos;re finalizing our banking partner integration to make sure your money moves securely. Account
            setup will open again shortly — check back soon.
          </p>
          <a href="/" className="pp-btn pp-btn-primary" style={{ display: "inline-flex", padding: "13px 30px", textDecoration: "none" }}>
            ← &nbsp;Back home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...LEDGER_TOKENS, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "color-mix(in srgb, var(--color-bg) 92%, transparent)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "18px clamp(18px, 4vw, 40px) 0", display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontFamily: "var(--font-heading)", fontSize: 22, letterSpacing: "0.01em" }}>Priority</span>
          <span style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontStyle: "italic", color: "var(--color-accent-700)", marginLeft: -9 }}>Pay</span>
          <span style={{ width: 26, height: 1, background: "var(--color-accent)", alignSelf: "center" }} />
        </div>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "18px clamp(18px, 4vw, 40px) 0" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 20, paddingBottom: 10 }}>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 55%, transparent)", fontVariantNumeric: "lining-nums tabular-nums" }}>
              {stepCounter}
            </span>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>
              {STEPS[step]}
            </span>
          </div>
          <div style={{ height: 1, background: "var(--color-divider)", position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: 0,
                top: -1,
                height: 3,
                background: "var(--color-accent)",
                borderRadius: 2,
                transition: "width 420ms cubic-bezier(.2,.7,.2,1)",
                width: `${progress}%`,
              }}
            />
          </div>
        </div>
      </header>

      <main style={{ flex: 1, maxWidth: 1180, width: "100%", margin: "0 auto", padding: "clamp(40px, 7vw, 88px) clamp(18px, 4vw, 40px) 90px" }}>
        {step === 0 && (
          <div style={{ maxWidth: "44em", margin: "clamp(10px, 6vw, 60px) auto 0", textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 30 }}>
              <span style={{ width: 34, height: 1, background: "var(--color-accent)" }} />
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>
                Built for the self-employed
              </span>
              <span style={{ width: 34, height: 1, background: "var(--color-accent)" }} />
            </div>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(38px, 7vw, 66px)", fontWeight: 400, lineHeight: 1.02, letterSpacing: "-0.02em", margin: "0 0 26px" }}>
              Know your split<span style={{ fontStyle: "italic", color: "var(--color-accent-700)" }}> before you spend it.</span>
            </h1>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: "color-mix(in srgb, var(--color-text) 74%, transparent)", maxWidth: "32em", margin: "0 auto 40px" }}>
              Set a percentage of every deposit for investments, savings, and other accounts — PriorityPay
              calculates it the moment a deposit lands (BEFORE you spend it).
            </p>
            <button onClick={next} className="pp-btn pp-btn-primary" style={{ fontSize: 15, padding: "15px 34px" }}>
              Get started &nbsp;→
            </button>
          </div>
        )}

        {step === 1 && (
          <div style={{ maxWidth: "34em", margin: "0 auto" }}>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(32px, 5.4vw, 46px)", fontWeight: 400, lineHeight: 1.06, margin: "0 0 10px" }}>
              Tell us about your business
            </h1>
            <div style={{ height: 1, background: "var(--color-divider)", margin: "0 0 34px" }} />
            <div style={{ display: "grid", gap: 26 }}>
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-heading)", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 60%, transparent)", marginBottom: 10 }}>
                  Business name
                </label>
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Business name"
                  style={ledgerInputStyle({ fontSize: 16, padding: "12px 2px" })}
                />
              </div>
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-heading)", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 60%, transparent)", marginBottom: 10 }}>
                  Business type
                </label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  style={ledgerInputStyle({ fontSize: 16, padding: "12px 2px" })}
                >
                  {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {isBusinessOwnerWithEmployees && (
                <>
                  <div>
                    <label style={{ display: "block", fontFamily: "var(--font-heading)", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 60%, transparent)", marginBottom: 10 }}>
                      Rough total employee payroll this year
                    </label>
                    <input
                      type="number"
                      onFocus={(e) => e.target.select()}
                      min={0}
                      value={employeePayroll}
                      onChange={(e) => setEmployeePayroll(e.target.value)}
                      placeholder="e.g. 120000"
                      style={ledgerInputStyle({ fontSize: 16, padding: "12px 2px" })}
                    />
                    <p style={{ fontSize: 13, lineHeight: 1.6, color: "color-mix(in srgb, var(--color-text) 55%, transparent)", margin: "8px 0 0" }}>
                      A ballpark is fine — this only shapes what a SEP IRA would cost you once your team&apos;s
                      required share is included. Adjustable anytime.
                    </p>
                  </div>
                  <div>
                    <label style={{ display: "block", fontFamily: "var(--font-heading)", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 60%, transparent)", marginBottom: 10 }}>
                      Do you keep business and personal money separate?
                    </label>
                    <div style={{ display: "flex", gap: 10 }}>
                      {[
                        { value: "separate", label: "Yes, separate accounts" },
                        { value: "commingled", label: "No, it's mostly one pot" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setIncomeHandling(opt.value)}
                          style={{
                            flex: 1,
                            textAlign: "left",
                            fontFamily: "var(--font-body)",
                            fontSize: 14.5,
                            padding: "12px 14px",
                            borderRadius: "var(--radius-md)",
                            border: `1px solid ${incomeHandling === opt.value ? "var(--color-accent)" : "var(--color-divider)"}`,
                            background: incomeHandling === opt.value ? "color-mix(in srgb, var(--color-accent) 7%, transparent)" : "transparent",
                            color: incomeHandling === opt.value ? "var(--color-accent-700)" : "var(--color-text)",
                            cursor: "pointer",
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <p style={{ fontSize: 13, lineHeight: 1.6, color: "color-mix(in srgb, var(--color-text) 55%, transparent)", margin: "8px 0 0" }}>
                      Either way, every transaction stays individually correctable later — this just sets a
                      sensible starting default.
                    </p>
                  </div>
                </>
              )}
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 44 }}>
              <BackBtn onClick={back} />
              <PrimaryBtn onClick={next} disabled={isBusinessOwnerWithEmployees && !incomeHandling} flex>Continue &nbsp;→</PrimaryBtn>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ maxWidth: "36em", margin: "0 auto" }}>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(32px, 5.4vw, 46px)", fontWeight: 400, lineHeight: 1.06, margin: "0 0 10px" }}>
              Connect everywhere money reaches you
            </h1>
            <div style={{ height: 1, background: "var(--color-divider)", margin: "0 0 26px" }} />
            <p style={{ fontSize: 16, lineHeight: 1.75, color: "color-mix(in srgb, var(--color-text) 76%, transparent)", margin: "0 0 32px" }}>
              PriorityPay can only tell you to split a deposit it actually sees. Connect every bank account
              you could receive a client payment into. You can always add more inside the dashboard.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
              <PlaidLinkButton
                label="Connect Account"
                onLinked={(account) => {
                  onAccountLinked(account);
                  if (account) setShowAddMorePopup(true);
                }}
                style={{
                  fontFamily: "var(--font-heading)",
                  fontWeight: 600,
                  color: "var(--color-accent)",
                  background: "transparent",
                  border: "1px solid var(--color-accent)",
                  borderRadius: "var(--radius-md)",
                  padding: "13px 26px",
                }}
              />
              <PlaidLinkButton
                label="Add a credit card"
                creditCard
                onLinked={(account) => onAccountLinked(account)}
                style={{
                  fontFamily: "var(--font-heading)",
                  fontWeight: 600,
                  fontSize: 13.5,
                  color: "color-mix(in srgb, var(--color-text) 65%, transparent)",
                  background: "transparent",
                  border: "1px solid var(--color-divider)",
                  borderRadius: "var(--radius-md)",
                  padding: "13px 22px",
                }}
              />
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: "color-mix(in srgb, var(--color-text) 55%, transparent)", margin: "0 0 34px" }}>
              Credit cards are for close-out expense tracking only — they&apos;re never used for splits or
              transfers.
            </p>

            {accounts.length > 0 && (
              <div style={{ border: "1px solid var(--color-divider)", borderRadius: "var(--radius-md)", background: "var(--color-neutral-100)", overflow: "hidden", marginBottom: 34 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "14px 22px", borderBottom: "1px solid var(--color-divider)" }}>
                  <span style={{ fontFamily: "var(--font-heading)", fontSize: 11.5, letterSpacing: "0.18em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                    Connected
                  </span>
                  <span style={{ fontFamily: "var(--font-heading)", fontSize: 11.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-accent-700)", fontVariantNumeric: "lining-nums tabular-nums" }}>
                    {accounts.length} {accounts.length === 1 ? "account" : "accounts"}
                  </span>
                </div>
                <div style={{ padding: "2px 22px" }}>
                  {accounts.map((a) => (
                    <div
                      key={a.id}
                      style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 0", borderBottom: "1px solid color-mix(in srgb, var(--color-text) 8%, transparent)" }}
                    >
                      <span
                        style={{
                          width: 30,
                          height: 30,
                          flexShrink: 0,
                          border: "1px solid var(--color-accent-300)",
                          borderRadius: "var(--radius-sm)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: "var(--font-heading)",
                          fontSize: 14,
                          color: "var(--color-accent-700)",
                        }}
                      >
                        {(a.institution_name || "?").charAt(0).toUpperCase()}
                      </span>
                      <span style={{ fontFamily: "var(--font-heading)", fontSize: 16, flex: 1, minWidth: 0 }}>
                        {a.institution_name} — {a.account_name} •••• {a.mask}
                        {a.account_type === "credit" ? " (credit card)" : ""}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-heading)", fontSize: 11.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-accent)" }} />
                        Linked
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 12 }}>
              <BackBtn onClick={back} />
              {accounts.length > 0 ? (
                <PrimaryBtn onClick={() => setShowConfirmAccountsModal(true)} flex>Continue &nbsp;→</PrimaryBtn>
              ) : (
                <GhostBtn onClick={next} flex>Skip for now</GhostBtn>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ maxWidth: "40em", margin: "0 auto" }}>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(32px, 5.4vw, 46px)", fontWeight: 400, lineHeight: 1.06, margin: "0 0 10px" }}>
              Set your percentage splits
            </h1>
            <div style={{ height: 1, background: "var(--color-divider)", margin: "0 0 26px" }} />
            <div style={{ display: "grid", gap: 14, marginBottom: 36, maxWidth: "34em" }}>
              <p style={{ fontSize: 16, lineHeight: 1.75, color: "color-mix(in srgb, var(--color-text) 76%, transparent)", margin: 0 }}>
                Decide what percentage of each deposit received you want sent to each account.
              </p>
              <p style={{ fontSize: 16, lineHeight: 1.75, color: "color-mix(in srgb, var(--color-text) 76%, transparent)", margin: 0 }}>
                For example, if you select &quot;10%&quot; for savings, and PriorityPay detects a $100 deposit,
                it&apos;ll tell you to send $10 to the savings account connected.
              </p>
              <p style={{ fontSize: 16, lineHeight: 1.75, color: "color-mix(in srgb, var(--color-text) 76%, transparent)", margin: 0 }}>
                If you don&apos;t have one of these accounts, you can set the percentage to &quot;0%&quot; and no
                money will be set aside for that account.
              </p>
            </div>

            <PercentSplitEditor
              percent={percent}
              accounts={accounts}
              onUpdatePercent={updatePercent}
              onAddSubAccount={addSubAccount}
              onRemoveRow={removeRow}
              onAccountLinked={onAccountLinked}
              creating={creating}
              setCreating={setCreating}
              connecting={connecting}
              setConnecting={setConnecting}
              showRowWarnings={false}
              totalPct={totalPct}
              pctOverflow={pctOverflow}
              theme="ledger"
            />

            <button
              onClick={addPercent}
              className="pp-ledger-dashed"
              style={{
                width: "100%",
                marginTop: 20,
                background: "transparent",
                border: "1px dashed var(--color-accent-300)",
                borderRadius: "var(--radius-md)",
                padding: "14px 16px",
                cursor: "pointer",
                fontFamily: "var(--font-heading)",
                fontSize: 15,
                letterSpacing: "0.04em",
                color: "var(--color-accent-700)",
              }}
            >
              + &nbsp;Add your own category
            </button>

            {availableSuggestions.length > 0 && (
              <div style={{ marginTop: 30 }}>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 55%, transparent)", marginBottom: 14 }}>
                  Suggestions — click to add, starts at 0%
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
                  {availableSuggestions.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => addSuggested(s)}
                      className="pp-ledger-pill"
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: 14,
                        color: "color-mix(in srgb, var(--color-text) 72%, transparent)",
                        background: "transparent",
                        border: "1px solid var(--color-divider)",
                        borderRadius: 999,
                        padding: "8px 16px",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      + &nbsp;{s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 20, flexWrap: "wrap", borderTop: "1px solid var(--color-divider)", marginTop: 36, paddingTop: 20 }}>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                Allocated
              </span>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 17, fontVariantNumeric: "lining-nums tabular-nums" }}>
                {totalPct}% allocated{remainingPct > 0 ? ` and ${remainingPct}% remains where it was deposited.` : "."}
              </span>
            </div>

            <div style={{ borderTop: "1px solid var(--color-divider)", marginTop: 24, paddingTop: 24 }}>
              <label style={{ display: "block", fontFamily: "var(--font-heading)", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 60%, transparent)", marginBottom: 10 }}>
                Minimum deposit to split
              </label>
              <p style={{ fontSize: 14.5, lineHeight: 1.7, color: "color-mix(in srgb, var(--color-text) 68%, transparent)", margin: "0 0 14px" }}>
                Deposits below this amount (a refund, a reimbursement) won&apos;t trigger a message to initiate
                split. $50 is the lowest you can set it. Adjustable anytime from Settings.
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 10, maxWidth: 220 }}>
                <span style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>$</span>
                <input
                  type="number"
                  onFocus={(e) => e.target.select()}
                  min={MIN_DEPOSIT_THRESHOLD_FLOOR}
                  step="1"
                  value={minDepositThreshold}
                  onChange={(e) => setMinDepositThreshold(e.target.value)}
                  onBlur={(e) => {
                    const v = Math.max(MIN_DEPOSIT_THRESHOLD_FLOOR, Number(e.target.value) || MIN_DEPOSIT_THRESHOLD_FLOOR);
                    setMinDepositThreshold(v);
                  }}
                  style={ledgerInputStyle({ fontSize: 16, padding: "12px 2px" })}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 40 }}>
              <BackBtn onClick={back} />
              <PrimaryBtn onClick={handleStep4Continue} flex>Continue &nbsp;→</PrimaryBtn>
            </div>
          </div>
        )}

        {step === 4 && (
          <div style={{ maxWidth: "34em", margin: "0 auto" }}>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(32px, 5.4vw, 46px)", fontWeight: 400, lineHeight: 1.06, margin: "0 0 10px" }}>
              Get texted the moment a deposit lands
            </h1>
            <div style={{ height: 1, background: "var(--color-divider)", margin: "0 0 26px" }} />
            <p style={{ fontSize: 16, lineHeight: 1.75, color: "color-mix(in srgb, var(--color-text) 76%, transparent)", margin: "0 0 32px" }}>
              PriorityPay texts you the moment a qualifying deposit lands, with a link straight to your split
              checklist — that text is how you actually confirm and send each transfer, so a working phone
              number is required to finish setting up your account. We only support U.S. mobile numbers right
              now.
            </p>
            <label style={{ display: "block", fontFamily: "var(--font-heading)", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 60%, transparent)", marginBottom: 10 }}>
              Phone number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="(555) 123-4567"
              style={ledgerInputStyle({ fontSize: 16, padding: "12px 2px", marginBottom: 10 })}
            />
            {phoneNumber && !isValidUSPhone(phoneNumber) && (
              <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "#b3261e", margin: "0 0 16px" }}>
                That doesn&apos;t look like a valid U.S. phone number — enter 10 digits, with or without
                formatting.
              </p>
            )}
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginTop: 16 }}>
              <input
                type="checkbox"
                checked={smsEnabled}
                onChange={(e) => setSmsEnabled(e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              <span style={{ fontSize: 14.5, color: "color-mix(in srgb, var(--color-text) 76%, transparent)" }}>
                Text me when a deposit crosses my threshold
              </span>
            </label>
            <div style={{ display: "flex", gap: 12, marginTop: 40 }}>
              <BackBtn onClick={back} />
              <PrimaryBtn onClick={next} disabled={!isValidUSPhone(phoneNumber)} flex>Continue &nbsp;→</PrimaryBtn>
            </div>
          </div>
        )}

        {step === 5 && confirmingPayment && (
          <div style={{ maxWidth: "34em", margin: "0 auto", textAlign: "center" }}>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(32px, 5.4vw, 46px)", fontWeight: 400, lineHeight: 1.06, margin: "0 0 16px" }}>
              Confirming your payment…
            </h1>
            <p style={{ fontSize: 16, lineHeight: 1.75, color: "color-mix(in srgb, var(--color-text) 76%, transparent)", margin: 0 }}>
              One moment — you&apos;ll land in your dashboard as soon as this is done.
            </p>
          </div>
        )}

        {step === 5 && !confirmingPayment && (
          <div style={{ maxWidth: "34em", margin: "0 auto" }}>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(32px, 5.4vw, 46px)", fontWeight: 400, lineHeight: 1.06, margin: "0 0 10px" }}>
              Review and finish
            </h1>
            <div style={{ height: 1, background: "var(--color-divider)", margin: "0 0 24px" }} />
            <p style={{ fontSize: 16, lineHeight: 1.75, color: "color-mix(in srgb, var(--color-text) 76%, transparent)", margin: "0 0 34px" }}>
              You can change any percentage, account, or category later from Split Rules.
            </p>
            <div style={{ border: "1px solid var(--color-divider)", borderRadius: "var(--radius-md)", background: "var(--color-neutral-100)", padding: "6px 24px 8px" }}>
              {[
                { label: "You are", value: businessType },
                { label: "Accounts linked", value: String(accounts.length) },
                { label: "Percentages set", value: `${totalPct}%` },
              ].map((r) => (
                <div key={r.label} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 24, padding: "16px 0", borderBottom: "1px solid color-mix(in srgb, var(--color-text) 8%, transparent)" }}>
                  <span style={{ fontSize: 15, color: "color-mix(in srgb, var(--color-text) 66%, transparent)" }}>{r.label}</span>
                  <span style={{ fontFamily: "var(--font-heading)", fontSize: 18, textAlign: "right", fontVariantNumeric: "lining-nums tabular-nums" }}>{r.value}</span>
                </div>
              ))}
            </div>
            <div style={{ borderTop: "1px solid var(--color-divider)", marginTop: 24, paddingTop: 24 }}>
              <p style={{ fontSize: 14.5, lineHeight: 1.7, color: "color-mix(in srgb, var(--color-text) 68%, transparent)", margin: 0 }}>
                PriorityPay is $7/month, billed today to get started — there&apos;s no free trial for new
                accounts. You&apos;ll enter payment details on Stripe&apos;s secure checkout page next, and can
                cancel anytime from Settings.
              </p>
            </div>
            {paymentError && (
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "#b3261e", margin: "20px 0 0" }}>{paymentError}</p>
            )}
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <BackBtn onClick={back} />
              <PrimaryBtn onClick={finish} disabled={submitting} flex>
                {submitting ? "Redirecting to checkout…" : "Continue to payment — $7/month"} &nbsp;→
              </PrimaryBtn>
            </div>
          </div>
        )}
      </main>

      {showConfirmAccountsModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "color-mix(in srgb, #171614 55%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "var(--color-bg)", border: "1px solid var(--color-divider)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)", maxWidth: "26em", width: "100%", padding: "34px 34px 30px" }}>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 26, fontWeight: 400, margin: "0 0 10px" }}>
              Are you sure these are all your income accounts?
            </h2>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "color-mix(in srgb, var(--color-text) 60%, transparent)", margin: "0 0 26px" }}>
              PriorityPay can only route money from connected accounts and apps.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={() => {
                  setShowConfirmAccountsModal(false);
                  next();
                }}
                className="pp-btn pp-btn-primary"
                style={{ padding: "12px 22px" }}
              >
                Yes, continue
              </button>
              <button onClick={() => setShowConfirmAccountsModal(false)} className="pp-btn pp-btn-secondary" style={{ padding: "12px 22px" }}>
                Go back and connect more
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddMorePopup && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "color-mix(in srgb, #171614 55%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "var(--color-bg)", border: "1px solid var(--color-divider)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)", maxWidth: "26em", width: "100%", padding: "34px 34px 30px" }}>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 26, fontWeight: 400, margin: "0 0 20px" }}>Have any more accounts to add?</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <PlaidLinkButton
                label="Connect More Accounts"
                onLinked={(account) => onAccountLinked(account)}
                style={{
                  fontFamily: "var(--font-heading)",
                  fontWeight: 600,
                  color: "var(--color-accent)",
                  background: "transparent",
                  border: "1px solid var(--color-accent)",
                  borderRadius: "var(--radius-md)",
                  padding: "12px 22px",
                }}
              />
              <button onClick={() => setShowAddMorePopup(false)} className="pp-btn pp-btn-secondary" style={{ padding: "12px 22px" }}>
                No, that&apos;s all
              </button>
            </div>
          </div>
        </div>
      )}

      {showUnconnectedModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "color-mix(in srgb, #171614 55%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "var(--color-bg)", border: "1px solid var(--color-divider)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)", maxWidth: "30em", width: "100%", padding: "34px 34px 30px" }}>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 28, fontWeight: 400, margin: "0 0 8px" }}>Missing accounts</h2>
            <div style={{ height: 1, background: "var(--color-divider)", margin: "0 0 20px" }} />
            <p style={{ fontSize: 15.5, lineHeight: 1.75, color: "color-mix(in srgb, var(--color-text) 76%, transparent)", margin: "0 0 28px" }}>
              You haven&apos;t connected an account for {joinWithAnd(unconnectedForStep4.map((r) => r.label))} yet.
              Until you connect one, there&apos;s nowhere to send that share on your checklist, so it stays wherever
              the deposit landed.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button onClick={() => setShowUnconnectedModal(false)} className="pp-btn pp-btn-secondary" style={{ padding: "12px 22px" }}>
                Go back and connect
              </button>
              <button
                onClick={() => {
                  setShowUnconnectedModal(false);
                  next();
                }}
                className="pp-btn pp-btn-primary"
                style={{ padding: "12px 22px" }}
              >
                Continue anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {lastDeleted && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#171614",
            color: "#f3f2f2",
            fontSize: 14,
            borderRadius: "var(--radius-md)",
            paddingLeft: 18,
            paddingRight: 10,
            paddingTop: 10,
            paddingBottom: 10,
            display: "flex",
            alignItems: "center",
            gap: 14,
            boxShadow: "var(--shadow-lg)",
            zIndex: 50,
          }}
        >
          <span>&quot;{lastDeleted.row.label}&quot; removed.</span>
          <button
            onClick={undoDelete}
            style={{ fontFamily: "var(--font-heading)", fontWeight: 600, color: "var(--color-accent-300)", background: "none", border: 0, cursor: "pointer", padding: "6px 10px" }}
          >
            Undo
          </button>
        </div>
      )}

      <style jsx>{`
        a {
          color: var(--color-accent-700);
          text-decoration: none;
        }
        a:hover {
          color: var(--color-accent-600);
        }
        input:focus-visible,
        select:focus-visible,
        button:focus-visible {
          outline: 2px solid var(--color-accent);
          outline-offset: 2px;
        }
        .pp-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          cursor: pointer;
          text-decoration: none;
          font-family: var(--font-heading);
          font-weight: 600;
          font-size: 14px;
          line-height: 1.2;
          color: var(--color-text);
          background: transparent;
          border: 1px solid transparent;
          border-radius: var(--radius-md);
        }
        .pp-btn-primary {
          color: var(--color-accent);
          border-color: var(--color-accent);
        }
        .pp-btn-primary:hover {
          background: color-mix(in srgb, var(--color-accent) 12%, transparent);
        }
        .pp-btn-secondary {
          border-color: var(--color-divider);
        }
        .pp-btn-secondary:hover {
          background: color-mix(in srgb, var(--color-text) 7%, transparent);
        }
        .pp-btn-ghost {
          color: var(--color-accent);
        }
        .pp-btn-ghost:hover {
          background: color-mix(in srgb, var(--color-accent) 10%, transparent);
        }
        .pp-ledger-dashed:hover {
          border-color: var(--color-accent);
          background: color-mix(in srgb, var(--color-accent) 5%, transparent);
        }
        .pp-ledger-pill:hover {
          border-color: var(--color-accent);
          color: var(--color-accent-700);
        }
      `}</style>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingPageInner />
    </Suspense>
  );
}
