"use client";

import { SOLE_PROP, dropsOpex, shortDrawNote, splitUnit, paysByDraw, mixedOrDrawConnectNote } from "@/lib/entityCopy";
import EntityPicker from "@/components/EntityPicker";
import ChipCheckboxes from "@/components/ChipCheckboxes";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import PlaidLinkButton from "@/components/PlaidLinkButton";
import PercentSplitEditor from "@/components/PercentSplitEditor";
import SimpleSplitCard from "@/components/SimpleSplitCard";
import OnboardingLimits from "@/components/OnboardingLimits";
import TierCards, { TierLastCard } from "@/components/TierCards";
import PriorityPayLogo from "@/components/PriorityPayLogo";
import { DEFAULT_SPLIT_RULES, getDefaultSplitRules, pctTotal, roundPct, newSubAccountRow, clampPctToRemaining, maxAllowedPct, settleCaps, SUGGESTED_EXTRA_CATEGORIES, CATEGORY_COLORS, pickUniqueColor, PERSONA_W2_NO_SIDE_HUSTLE, PERSONA_W2_WITH_SIDE_HUSTLE, isW2NoSideHustle, retirementPickerOptions, buildRetirementRow, buildGenericRetirementRow, tierOf, tierProblems, tierSampleRows, addTierRow, removeTierRow, addTierBlock, removeTierBlock, priorityTiers, tierName } from "@/lib/allocations";
import { decodeSim } from "@/lib/simSharing";
import { BLOOM_TOKENS, bloomInputStyle } from "@/lib/bloomTheme";
// isValidUSPhone no longer used here -- the phone-number step is
// temporarily out of onboarding (see the step === 4 note below) -- still
// imported/used server-side and would come back with that step, so
// lib/phone.js itself is untouched.
import { normalizeUSPhone, isValidUSPhone } from "@/lib/phone";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { isNativeApp, purchasePlan, restorePurchases } from "@/lib/native";
import { notify } from "@/lib/notify";
import AddCategoryCard from "@/components/AddCategoryCard";

// Re-enabled: PrioritySave no longer needs a banking partner/ACH approval
// to onboard people at all (see TRANSFER_EXECUTION_MODE in lib/runSplit.js
// -- manual_approval mode calculates the split and lets the user send each
// transfer themselves, with zero standing transfer authority required).
// The old gate below assumed onboarding was blocked on Dwolla production
// access; that assumption no longer holds. Flip back to false only if
// onboarding needs to be paused for some other reason.
const ONBOARDING_LIVE = true;

// PrioritySave Simple has no fixed-costs step at all -- onboarding is: who
// you are, verified identity (required before any money can move), every
// account money reaches you through (so nothing skips the split), and the
// percentage each category gets of every deposit (with its own account
// connect-or-create option right on each row). Percentages start at
// PrioritySave Simple's suggested split (see DEFAULT_SPLIT_RULES in
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
// "Review" was dropped (Sept 2026) -- it added one more click with nothing
// actionable on it (everything shown was already visible/editable on
// earlier steps), so it was pure friction right before checkout. Payment
// now happens from the last real step (Deposit Alerts) instead. "Starting
// Balances" is new, inserted right after Percentage Splits -- see the
// step === 4 block below for why it needed its own dedicated step rather
// than staying folded into each category row on Percentage Splits.
// Order (Nov 2026): the fun part first (percentages), then connect banks, then
// the plan step, and only after paying are accounts matched to each split.
// Payment no longer finishes onboarding -- the last step does.
const STEPS = ["Welcome", "Business", "Set Your Splits", "Limits", "Connect Accounts", "Start Plan", "Match Accounts", "Deposit Alerts", "Credit Cards"];
const STEP_LIMITS = 3;
const STEP_CONNECT = 4;
const STEP_PLAN = 5;
const STEP_MATCH = 6;
const STEP_ALERTS = 7;
const STEP_CARDS = 8;
// businessType drives real retirement-calculation logic downstream (see
// finish() below). "Business Owner (With Employees)" is the one option
// that unlocks two extra inline questions on this same step (see step 1
// below) -- everything else about onboarding stays identical across all
// three choices.
const BUSINESS_TYPES = [
  "Self Employed (No Employees)",
  "Business Owner (With Employees)",
  PERSONA_W2_WITH_SIDE_HUSTLE,
  PERSONA_W2_NO_SIDE_HUSTLE,
];
const HAS_EMPLOYEES_TYPE = "Business Owner (With Employees)";
const WORK_OPTIONS = [
  { value: "self_employed", label: "Self Employed", hint: "(Often applicable to freelance, coaching, consulting, or other 1099 work)" },
  { value: "owns_business", label: "Business Owner/Partner", hint: "(If you own or co-own a business, such as an LLC, S-corp, C-corp or partnership)" },
  { value: "w2", label: "I have a W-2 job" },
  { value: "retired", label: "Retired" },
  { value: "between", label: "Between jobs or starting something new" },
];
// One persona drives split defaults, so combine the picks: a business with
// employees wins, then any self-employment or business ownership (with a W-2
// job on top it is the side-hustle persona), then a W-2 job alone.
function personaFromWork(picks, hasEmployees) {
  if ((picks.includes("owns_business") || picks.includes("self_employed")) && hasEmployees) return HAS_EMPLOYEES_TYPE;
  if (picks.includes("self_employed") || picks.includes("owns_business")) {
    return picks.includes("w2") ? PERSONA_W2_WITH_SIDE_HUSTLE : BUSINESS_TYPES[0];
  }
  // A W-2 job, retirement, or time between jobs with no business: no
  // self-employment income, so the plain 401k / IRA / HSA rows fit. They can
  // still edit every row on the Split Rules page.
  if (picks.length) return PERSONA_W2_NO_SIDE_HUSTLE;
  return BUSINESS_TYPES[0];
}
// Friendlier wording shown in the dropdown, matching the first question of
// the Tax Savings Quiz. The stored value stays the exact persona string.
const BUSINESS_TYPE_LABELS = {
  "Self Employed (No Employees)": "Self-employed: freelance, 1099 or a solo business, with or without an LLC",
  "Business Owner (With Employees)": "I own a business with full-time employees or business partners",
};

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
  const [entityType, setEntityType] = useState(SOLE_PROP);
  const [businessType, setBusinessType] = useState(BUSINESS_TYPES[0]);
  // Work is select-all-that-apply (a freelancer can also co-own a business, or
  // have a W-2 job), and the single persona that drives split defaults is
  // worked out from those picks. The follow-up questions only appear once they
  // have picked something.
  const [workPicks, setWorkPicks] = useState([]);
  const [hasEmployees, setHasEmployees] = useState(null);
  // Nothing is pre-selected for "How is your business set up?" -- they must pick.
  const [entityChosen, setEntityChosen] = useState(false);
  // Freelancing or owning a business is what unlocks the business questions.
  const ownsBusiness = workPicks.includes("self_employed") || workPicks.includes("owns_business");
  const typeChosen = workPicks.length > 0;
  // Starting split for a persona and business structure. Draw-only owners start
  // without the OPEX row (their business pays its own expenses first); its
  // share moves to Savings so the starting total stays the same.
  // Retired-only people can't contribute to an employer 401k or an IRA (no
  // earned income) and mostly can't fund an HSA (Medicare), so they start with
  // no retirement rows; that share goes to Savings so the total stays the same.
  const defaultsForBase = (persona, entity, picks = workPicks) => {
    let rows = getDefaultSplitRules(persona).percent;
    if (picks.length > 0 && picks.every((v) => v === "retired")) {
      const ret = rows.filter((r) => (r.group || "").startsWith("Retirement")).reduce((n, r) => n + (Number(r.pct) || 0), 0);
      return rows
        .filter((r) => !(r.group || "").startsWith("Retirement"))
        .map((r) => (r.id === "savings" ? { ...r, pct: (Number(r.pct) || 0) + ret } : r));
    }
    // Retirement starts as one generic bucket with the usual total. People then
    // tick the accounts they have open right now (see toggleRetirement).
    const isRet = (r) => (r.group || "").startsWith("Retirement");
    const retTotal = rows.filter(isRet).reduce((n, r) => n + (Number(r.pct) || 0), 0);
    const firstRet = rows.findIndex(isRet);
    if (firstRet >= 0) {
      const rest = rows.filter((r) => !isRet(r));
      const at = rows.slice(0, firstRet).filter((r) => !isRet(r)).length;
      rest.splice(at, 0, buildGenericRetirementRow(retTotal || 15, rows.map((r) => r.color)));
      rows = rest;
    }
    if (!dropsOpex(entity)) return rows;
    const opex = rows.find((r) => r.id === "opex");
    if (!opex) return rows;
    return rows
      .filter((r) => r.id !== "opex")
      .map((r) => (r.id === "savings" ? { ...r, pct: (Number(r.pct) || 0) + (Number(opex.pct) || 0) } : r));
  };
  // Starting point for everyone: a sample tier 1 (Rent) and tier 2 (Car payment,
  // Insurance, Utilities) on top of the usual percent categories. People edit or
  // delete them rather than starting from a blank page.
  const defaultsFor = (persona, entity, picks = workPicks) => {
    const base = defaultsForBase(persona, entity, picks);
    return [...tierSampleRows(base.map((r) => r.color)), ...base];
  };
  // Retirement picker on the percentage step: one row per account the person
  // has. The group's total stays the same and is shared evenly between them.
  const isRetRow = (r) => (r.group || "").startsWith("Retirement");
  // type: one of the account values, "other" (untick removes every custom row),
  // or "add-other" (one more custom row).
  const toggleRetirement = (type) =>
    setPercent((prev) => {
      const existing = prev.filter(isRetRow);
      const defaultTotal = getDefaultSplitRules(businessType).percent.filter(isRetRow).reduce((n, r) => n + (Number(r.pct) || 0), 0);
      const currentTotal = existing.reduce((n, r) => n + (Number(r.pct) || 0), 0);
      const total = currentTotal > 0 ? currentTotal : defaultTotal || 15;
      const colors = prev.map((r) => r.color);
      let typed = existing.filter((r) => r.retirementType);
      let customs = existing.filter((r) => !r.retirementType && r.id !== "retirement_savings");
      if (type === "other") {
        customs = customs.length ? [] : [{ ...newSubAccountRow("Retirement", colors), label: "Other retirement account" }];
      } else if (type === "add-other") {
        customs = [...customs, { ...newSubAccountRow("Retirement", [...colors, ...customs.map((r) => r.color)]), label: "Other retirement account" }];
      } else if (typed.some((r) => r.retirementType === type)) {
        typed = typed.filter((r) => r.retirementType !== type);
      } else {
        typed = [...typed, buildRetirementRow(type, businessType, colors)];
      }
      const order = retirementPickerOptions().map((o) => o.value);
      typed = [...typed].sort((x, y) => order.indexOf(x.retirementType) - order.indexOf(y.retirementType));
      let rows = [...typed, ...customs];
      if (!rows.length) rows = [buildGenericRetirementRow(total, colors)];
      const share = Math.floor((total / rows.length) * 100) / 100;
      rows = rows.map((r, i) => ({ ...r, pct: i === 0 ? roundPct(total - share * (rows.length - 1)) : share }));
      const firstIdx = prev.findIndex(isRetRow);
      const rest = prev.filter((r) => !isRetRow(r));
      const invIdx = rest.map((r) => r.group).lastIndexOf("Investments");
      const at = firstIdx >= 0 ? prev.slice(0, firstIdx).filter((r) => !isRetRow(r)).length : invIdx >= 0 ? invIdx + 1 : Math.min(2, rest.length);
      rest.splice(at, 0, ...rows);
      return rest;
    });
  const changeEntity = (value) => {
    setEntityChosen(true);
    setEntityType(value);
    setPercent(defaultsFor(businessType, value));
  };
  const applyWork = (picks, emp) => {
    const nextType = personaFromWork(picks, Boolean(emp));
    setBusinessType(nextType);
    if (!picks.length || isW2NoSideHustle(nextType)) setEntityType(SOLE_PROP);
    // Retirement's default sub-account(s) depend on persona (see
    // getDefaultSplitRules in lib/allocations.js). Safe to reset here since
    // this is Step 1, before anyone has customized their split on Step 3.
    setPercent(defaultsFor(nextType, isW2NoSideHustle(nextType) || !picks.length ? SOLE_PROP : entityType, picks));
  };
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
  // means PrioritySave never touches money itself, so there's nothing left
  // that actually requires verifying identity before connecting accounts.
  // Removed rather than just skipped, so this doesn't quietly collect SSNs
  // for no reason -- see the equivalent removal on the Accounts page.
  const [accounts, setAccounts] = useState([]);
  const [percent, setPercent] = useState(() => [...tierSampleRows(DEFAULT_SPLIT_RULES.percent.map((r) => r.color)), ...DEFAULT_SPLIT_RULES.percent]);
  // On the match step, splits are read-only until someone asks to edit them.
  const [editSplits, setEditSplits] = useState(false);
  // Anyone with earned income should put at least 1% toward retirement. Retired
  // people and people between jobs may have no earned income, so they can skip it.
  const earnsIncome = workPicks.some((v) => ["self_employed", "owns_business", "w2"].includes(v));
  const retirementPct = percent.filter((r) => (r.group || "").startsWith("Retirement")).reduce((n, r) => n + (Number(r.pct) || 0), 0);
  const needsRetirement = earnsIncome && retirementPct < 1;
  const retirementPicker = {
    options: retirementPickerOptions(),
    selected: [
      ...percent.filter((r) => isRetRow(r) && r.retirementType).map((r) => r.retirementType),
      ...(percent.some((r) => isRetRow(r) && !r.retirementType && r.id !== "retirement_savings") ? ["other"] : []),
    ],
    onToggle: toggleRetirement,
  };
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
  // Off by default -- users must actively opt in to SMS deposit alerts.
  const [smsEnabled, setSmsEnabled] = useState(true);
  // Note: actual SMS *delivery* stays gated by SMS_ALERTS_ENABLED
  // (lib/runSplit.js) until the Telnyx toll-free number clears Toll-Free
  // Verification -- this step only collects the opt-in + phone number and
  // shows the required disclosures. Email alerts (below) remain the primary
  // channel, sent to the account's own login email.
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);
  const [emailAddress, setEmailAddress] = useState("");
  // Where alerts actually get sent -- defaults to the account's own login
  // email (below), same as before, but editable so someone can point
  // alerts at a bookkeeper or assistant's inbox instead. Only ever
  // overwritten by the emailAddress fetch below if it's still empty, so
  // typing here before that fetch resolves is never clobbered.
  const [alertEmail, setAlertEmail] = useState("");
  useEffect(() => {
    supabaseBrowser()
      .auth.getUser()
      .then(({ data }) => {
        const email = data?.user?.email || "";
        setEmailAddress(email);
        setAlertEmail((prev) => prev || email);
      });
  }, []);
  // Testing-only "jump to any step" panel -- same account restriction
  // pattern as Settings' persona-switch panel (DEV_TESTING_EMAILS there) --
  // lets Megan click through every onboarding screen to eyeball it without
  // needing to fill in real answers first, since setStep() itself has no
  // validation gate (only the two `disabled` Continue buttons below do, and
  // those are bypassed for this account too). Never rendered for anyone
  // else, so nobody can skip ahead of onboarding's real required steps.
  const DEV_TESTING_EMAILS = new Set(["megan@ignitemysite.com", "megan+onboarding@ignitemysite.com"]);
  const [isDevTester, setIsDevTester] = useState(false);
  useEffect(() => {
    supabaseBrowser()
      .auth.getUser()
      .then(({ data }) => setIsDevTester(DEV_TESTING_EMAILS.has((data?.user?.email || "").toLowerCase())));
  }, []);

  // Apple Guideline 3.1.1: starting a NEW paid subscription from inside the
  // native app has to go through Apple's In-App Purchase, not a Stripe
  // checkout redirect -- so onboarding's final "pay now" step calls
  // purchasePlan() (lib/native.js) instead of finish() below when running
  // natively. Existing paid users logging in on native are never gated
  // (see app/(app)/layout.js).
  const [isNative, setIsNative] = useState(false);
  useEffect(() => {
    isNativeApp().then(setIsNative);
  }, []);
  // Needed to configure RevenueCat with the right appUserID -- see
  // purchasePlan() in lib/native.js. Fetched separately from the
  // emailAddress effect above so this still works even if that one is ever
  // restructured.
  const [userId, setUserId] = useState(null);
  useEffect(() => {
    supabaseBrowser()
      .auth.getUser()
      .then(({ data }) => setUserId(data?.user?.id || null));
  }, []);
  const [nativePurchasing, setNativePurchasing] = useState(false);
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
  const [isPaid, setIsPaid] = useState(false);
  // After Stripe (a full page reload) or a return visit by someone who already
  // paid, everything they entered is saved server-side. Load it back so the
  // matching step, starting balances and the final save all start from it.
  const loadSavedProgress = async () => {
    const [profileRes, accountsRes, rulesRes] = await Promise.all([
      fetch("/api/profile").then((r) => r.json()).catch(() => null),
      fetch("/api/accounts").then((r) => r.json()).catch(() => null),
      fetch("/api/split-rules").then((r) => r.json()).catch(() => null),
    ]);
    const pr = profileRes?.profile;
    if (pr) {
      const persona = pr.persona || BUSINESS_TYPES[0];
      setBusinessType(persona);
      setEntityType(pr.entityType || SOLE_PROP);
      if (pr.entityType) setEntityChosen(true);
      if (pr.minDepositThreshold) setMinDepositThreshold(pr.minDepositThreshold);
      const payroll = pr.retirementProfile?.estimatedEmployeePayroll;
      if (payroll) setEmployeePayroll(String(payroll));
      // Rebuild the step 1 picks from the saved persona so Back still looks right.
      if (persona === HAS_EMPLOYEES_TYPE) {
        setWorkPicks(["owns_business"]);
        setHasEmployees(true);
      } else if (persona === PERSONA_W2_WITH_SIDE_HUSTLE) {
        setWorkPicks(["self_employed", "w2"]);
        setHasEmployees(false);
      } else if (persona === PERSONA_W2_NO_SIDE_HUSTLE) {
        setWorkPicks(["w2"]);
      } else {
        setWorkPicks(["self_employed"]);
        setHasEmployees(false);
      }
    }
    if (accountsRes?.accounts) setAccounts(accountsRes.accounts);
    const saved = rulesRes?.splitRules?.percent;
    if (saved && saved.length) setPercent(saved);
    return pr;
  };
  // Someone who paid and left before finishing comes back to the matching step.
  useEffect(() => {
    if (searchParams.get("paid")) return;
    fetch("/api/profile")
      .then((r) => r.json())
      .then(async (d) => {
        const pr = d?.profile;
        if (pr && !pr.onboarded && pr.billing?.subscriptionStatus === "active") {
          await loadSavedProgress();
          setIsPaid(true);
          setStep(STEP_MATCH);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  useEffect(() => {
    const paid = searchParams.get("paid");
    if (paid === "1") {
      const sessionId = searchParams.get("session_id");
      setConfirmingPayment(true);
      fetch("/api/onboarding/confirm-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.ok) {
            // Paid. Reload what they entered, then on to matching accounts.
            return loadSavedProgress().then(() => {
              setIsPaid(true);
              setConfirmingPayment(false);
              setStep(STEP_MATCH);
              router.replace("/onboarding");
            });
          }
          setConfirmingPayment(false);
          setStep(STEP_PLAN);
          setPaymentError(data.error || "Could not confirm your payment. Please try again.");
        })
        .catch(() => {
          setConfirmingPayment(false);
          setStep(STEP_PLAN);
          setPaymentError("Could not confirm your payment. Please try again.");
        });
    } else if (paid === "cancelled") {
      loadSavedProgress();
      setStep(STEP_PLAN);
      setPaymentError("Checkout was cancelled. No charge was made. Try again when you're ready.");
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
  // since PrioritySave can only split deposits it actually sees.
  const [showConfirmAccountsModal, setShowConfirmAccountsModal] = useState(false);
  const [opAcctAck, setOpAcctAck] = useState(false);
  const [showOpAcctHint, setShowOpAcctHint] = useState(false);
  // Step 3 (Onboarding Pass 2, Aug 2026 handoff): the three explainer
  // paragraphs, the "any percentage not assigned..." callout, and the cap
  // explanation all now live inside one collapsible panel instead of
  // always being on screen -- closed by default, since most people don't
  // need any of it to fill out the step.
  const [howOpen, setHowOpen] = useState(false);

  const next = () => {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo(0, 0);
  };
  const back = () => {
    // Once the plan is active there is no reason to land on the payment screen again.
    setStep((s) => (s === STEP_MATCH && isPaid ? STEP_CONNECT : Math.max(s - 1, 0)));
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
    }).then(async (res) => {
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // Same account-capacity check as Split Rules (see app/api/split-
        // rules/route.js's PUT) -- less likely to trip during onboarding
        // since a freshly-connected account rarely already has other
        // categories claiming it, but still possible if two rows in this
        // step point at the same account with too much starting balance
        // between them.
        notify(data.error || "Couldn't save that -- please try again.");
      }
      return res;
    });
  // Someone typing a percentage that would push the total over 100% gets
  // silently clamped (see clampPctToRemaining in lib/allocations.js) --
  // that alone can read as the input just not responding, so this also
  // surfaces a one-row-at-a-time warning explaining what happened and the
  // most they could actually enter. Cleared automatically after a few
  // seconds, same pattern as the "row deleted" toast below.
  const [pctOverflow, setPctOverflow] = useState(null);
  const [showTierErrors, setShowTierErrors] = useState(false);
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
  const addSubAccount = (group) => setPercent((prev) => [...prev, newSubAccountRow(group, prev.map((r) => r.color))]);
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
  const onAccountLinked = (account) => account && setAccounts((prev) => (prev.some((a) => a.id === account.id) ? prev : [...prev, account]));
  // Step 2: categories removed with the x. Kept here (with their old position)
  // so one tap puts them back at 0%, which leaves every other split unchanged.
  const [removedRows, setRemovedRows] = useState([]);
  const removeFromStep2 = (id) => {
    const index = percent.findIndex((r) => r.id === id);
    if (index === -1) return;
    setRemovedRows((prev) => [...prev, { row: percent[index], index }]);
    removeRow(id);
  };
  const addBackRemoved = (id) => {
    const item = removedRows.find((x) => x.row.id === id);
    if (!item) return;
    setPercent((prev) => {
      if (prev.some((r) => r.id === id)) return prev;
      const copy = [...prev];
      copy.splice(Math.min(item.index, copy.length), 0, { ...item.row, pct: 0, max: null, categoryCap: null, balanceCap: null });
      return copy;
    });
    setRemovedRows((prev) => prev.filter((x) => x.row.id !== id));
  };
  // Tier 1 and 2 caps are required, so "no limits" only clears the last tier.
  const clearAllLimits = () => setPercent((prev) => prev.map((r) => (tierOf(r) === 0 ? { ...r, max: null, categoryCap: null, balanceCap: null } : r)));
  // Tier 1 / tier 2 editing (see TierCards).
  const addTier = (tier) =>
    setPercent((prev) =>
      addTierRow(prev, tier, { id: `new_${Date.now()}`, label: "New bill", group: null, pct: 0, max: null, categoryCap: null, balanceCap: null, color: pickUniqueColor(prev.map((r) => r.color)), accountId: null, startingBalance: null })
    );
  const removeTier = (id) => setPercent((prev) => removeTierRow(prev, id));
  const addTierBy = () =>
    setPercent((prev) =>
      addTierBlock(prev, { id: `new_${Date.now()}`, label: "New bill", group: null, max: null, categoryCap: null, balanceCap: null, color: pickUniqueColor(prev.map((r) => r.color)), accountId: null, startingBalance: null })
    );
  const removeTierBy = (t) => setPercent((prev) => removeTierBlock(prev, t));
  const tierIssues = tierProblems(percent);
  const lastTierRows = percent.filter((r) => tierOf(r) === 0);


  // Same "add your own category" capability as Split Rules -- Wedding,
  // College Fund, Hobbies, Profit, or literally anything else -- available
  // right in onboarding instead of only after finishing it. New rows start
  // at 0% (see newSubAccountRow's comment) so adding one never changes
  // anyone else's split.
  const addPercent = () =>
    setPercent((prev) => [
      ...prev,
      { id: `new_${Date.now()}`, label: "New category", group: null, pct: 0, max: null, balanceCap: null, color: pickUniqueColor(prev.map((r) => r.color)), accountId: null },
    ]);
  // Debt Payoff starts at 10%, taken from Savings so the total stays the same
  // (or less if Savings has less to give). Every other suggestion starts at 0%.
  const addSuggested = (suggestion) =>
    setPercent((prev) => {
      let pct = 0;
      let rows = prev;
      if (suggestion.label === "Debt Payoff") {
        const savings = prev.find((r) => r.id === "savings");
        pct = Math.min(10, Number(savings?.pct) || 0);
        if (pct > 0) rows = prev.map((r) => (r.id === "savings" ? { ...r, pct: roundPct((Number(r.pct) || 0) - pct) } : r));
      }
      return [
        ...rows,
        { id: `new_${Date.now()}`, label: suggestion.label, group: null, pct, max: null, balanceCap: null, color: pickUniqueColor(prev.map((r) => r.color)), accountId: null },
      ];
    });
  const usedLabels = new Set(percent.map((r) => r.label));
  const availableSuggestions = SUGGESTED_EXTRA_CATEGORIES.filter((s) => !usedLabels.has(s.label));

  const totalPct = pctTotal(percent);
  const remainingPct = roundPct(Math.max(0, 100 - totalPct));

  // Same criterion the Dashboard nudge uses post-onboarding (see
  // app/(app)/dashboard/page.js) -- a row claiming a real percentage with
  // nowhere to send it yet.
  const unconnectedForStep4 = percent.filter((r) => (Number(r.pct) || 0) > 0 && !r.accountId);
  // The "choose an account" / "pick a retirement %" messages only appear once
  // someone actually tries to continue without doing it, not up front.
  const [showBlockHint, setShowBlockHint] = useState(false);
  useEffect(() => { setShowBlockHint(false); }, [step]);
  const handleStep4Continue = () => {
    // Every split with a percentage needs an account before moving on.
    if (unconnectedForStep4.length > 0) { setShowBlockHint(true); return; }
    next();
  };
  // Every category can be removed now, so "at least 1% to retirement" is a
  // gentle note on the screen (see needsRetirement) rather than a block.
  const handleStep2Continue = () => {
    // Tier 1 and 2 need a cap on every row and must total exactly 100%.
    if (step === 2 && tierIssues.length > 0) { setShowTierErrors(true); return; }
    next();
  };

  // Bug fix: `finish()` below sets submitting=true, then hard-navigates to
  // Stripe Checkout via `window.location.href`. If someone hits their
  // browser's Back button from Checkout, Chrome/Safari often restore this
  // page from bfcache (back-forward cache) instead of reloading it --
  // which means React state is frozen exactly as it was the instant they
  // left, with submitting still stuck at `true`. The Continue button stays
  // disabled forever, permanently showing "Redirecting to checkout..."
  // with no way to retry short of a manual page refresh. `pageshow` fires
  // on both a normal load AND a bfcache restore, and its `persisted` flag
  // is only true for the latter -- exactly the case that needs the stuck
  // state cleared.
  useEffect(() => {
    const onPageShow = (event) => {
      if (event.persisted) {
        setSubmitting(false);
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  // No more 30-day free trial for anyone signing up from here on -- $12/mo
  // is collected via Stripe Checkout right here, before onboarding
  // actually finishes, since PrioritySave now incurs real costs (Plaid,
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
        workPicks,
        retirementProfile: {
          incomeHandling: isBusinessOwnerWithEmployees ? incomeHandling || "separate" : "n/a",
          hasW2Plan: businessType === PERSONA_W2_WITH_SIDE_HUSTLE || businessType === PERSONA_W2_NO_SIDE_HUSTLE,
          w2ElectiveDeferralYTD: 0,
          // No age-bracket question in onboarding anymore -- defaults to
          // the under-50 IRS limit tier. Adjustable later from Split Rules
          // if that's ever wrong for someone.
          ageBracket: "under50",
          estimatedEmployeePayroll: isBusinessOwnerWithEmployees && Number(employeePayroll) > 0 ? Number(employeePayroll) : null,
        },
        splitRules: { percent: settleCaps(percent) },
        minDepositThreshold,
        notifications: { phoneNumber: normalizeUSPhone(phoneNumber), smsEnabled, emailEnabled: emailAlertsEnabled, alertEmail },
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
  // Native counterpart to finish() -- same /api/onboarding/complete save
  // (finalize: false, for the same bfcache/reload reasons as finish()
  // above), but buys the Simple plan through Apple In-App Purchase
  // (purchasePlan() in lib/native.js) instead of redirecting to Stripe
  // Checkout, then confirms with RevenueCat via /api/billing/iap/confirm
  // (onboarding: true flips onboarded -- see that route) rather than
  // /api/onboarding/confirm-payment's Stripe-session flow.
  const finishNative = async () => {
    setNativePurchasing(true);
    setPaymentError(null);
    await fetch("/api/onboarding/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        persona: businessType,
        businessName,
        entityType,
        workPicks,
        retirementProfile: {
          incomeHandling: isBusinessOwnerWithEmployees ? incomeHandling || "separate" : "n/a",
          hasW2Plan: businessType === PERSONA_W2_WITH_SIDE_HUSTLE || businessType === PERSONA_W2_NO_SIDE_HUSTLE,
          w2ElectiveDeferralYTD: 0,
          ageBracket: "under50",
          estimatedEmployeePayroll: isBusinessOwnerWithEmployees && Number(employeePayroll) > 0 ? Number(employeePayroll) : null,
        },
        splitRules: { percent: settleCaps(percent) },
        minDepositThreshold,
        notifications: { phoneNumber: normalizeUSPhone(phoneNumber), smsEnabled, emailEnabled: emailAlertsEnabled, alertEmail },
        finalize: false,
      }),
    });

    const purchase = await purchasePlan("simple", userId);
    if (!purchase.ok) {
      setNativePurchasing(false);
      // A cancelled Apple purchase sheet is an expected, silent outcome --
      // see purchasePlan()'s own comment -- not an error to surface.
      if (!purchase.cancelled) {
        setPaymentError(purchase.error || "Purchase failed. Please try again.");
      }
      return;
    }

    const res = await fetch("/api/billing/iap/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onboarding: false }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      setNativePurchasing(false);
      setPaymentError(data.error || "Your purchase went through, but we couldn't confirm it yet. Please try again.");
      return;
    }
    setNativePurchasing(false);
    setIsPaid(true);
    setStep(STEP_MATCH);
    window.scrollTo(0, 0);
  };
  // Required by Apple Guideline 3.1.1 -- lets someone who already has an
  // active PrioritySave subscription under this Apple ID (reinstalled the
  // app, or a prior purchase that didn't confirm server-side) pick it back
  // up without paying again, instead of being stuck re-purchasing through
  // finishNative() above. Mirrors finishNative()'s shape but calls
  // restorePurchases() (lib/native.js) instead of purchasePlan(), then the
  // same /api/billing/iap/confirm sync.
  const restoreNativePurchases = async () => {
    setNativePurchasing(true);
    setPaymentError(null);
    const restored = await restorePurchases(userId);
    if (!restored.ok) {
      setNativePurchasing(false);
      setPaymentError(restored.error || "Couldn't restore purchases. Please try again.");
      return;
    }
    const res = await fetch("/api/billing/iap/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onboarding: false }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      setNativePurchasing(false);
      setPaymentError(data.error || "We found a purchase but couldn't confirm it yet. Please try again.");
      return;
    }
    setNativePurchasing(false);
    setIsPaid(true);
    setStep(STEP_MATCH);
    window.scrollTo(0, 0);
  };
  // Dev-only counterpart to finish() -- same /api/onboarding/complete call,
  // but with finalize: true right away instead of routing through Stripe
  // Checkout, so testing the onboarding flow end-to-end doesn't require a
  // real card charge. Restricted to isDevTester, same as the jump-to-step
  // panel above.
  const completeOnboarding = async () => {
    setSubmitting(true);
    setPaymentError(null);
    const res = await fetch("/api/onboarding/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        persona: businessType,
        businessName,
        entityType,
        workPicks,
        retirementProfile: {
          incomeHandling: isBusinessOwnerWithEmployees ? incomeHandling || "separate" : "n/a",
          hasW2Plan: businessType === PERSONA_W2_WITH_SIDE_HUSTLE || businessType === PERSONA_W2_NO_SIDE_HUSTLE,
          w2ElectiveDeferralYTD: 0,
          ageBracket: "under50",
          estimatedEmployeePayroll: isBusinessOwnerWithEmployees && Number(employeePayroll) > 0 ? Number(employeePayroll) : null,
        },
        splitRules: { percent: settleCaps(percent) },
        minDepositThreshold,
        notifications: { phoneNumber: normalizeUSPhone(phoneNumber), smsEnabled, emailEnabled: emailAlertsEnabled, alertEmail },
        finalize: true,
      }),
    });
    if (!res.ok) {
      setSubmitting(false);
      setPaymentError("Couldn't save -- please try again.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  };

  const stepCounter = step === 0 ? "Getting started" : `Step ${step} of ${STEPS.length - 1}`;
  const progress = step === 0 ? 2 : Math.min(100, step * (100 / (STEPS.length - 1)));

  if (!ONBOARDING_LIVE) {
    return (
      <div style={{ ...BLOOM_TOKENS, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
        <div style={{ maxWidth: "28em" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 30 }}>
            <span style={{ width: 34, height: 1, background: "var(--color-accent)" }} />
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>
              Coming soon
            </span>
            <span style={{ width: 34, height: 1, background: "var(--color-accent)" }} />
          </div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(30px, 5vw, 42px)", fontWeight: 800, lineHeight: 1.1, margin: "0 0 16px" }}>
            We&apos;re almost ready.
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: "color-mix(in srgb, var(--color-text) 70%, transparent)", margin: "0 0 30px" }}>
            We&apos;re finalizing our banking partner integration to make sure your money moves securely. Account
            setup will open again shortly. Check back soon.
          </p>
          <a href="/" className="pp-btn pp-btn-primary" style={{ display: "inline-flex", padding: "13px 30px", textDecoration: "none" }}>
            ← &nbsp;Back home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...BLOOM_TOKENS, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {isDevTester && (
        // Testing-only jump-to-any-step panel, visible on every step --
        // only megan@ignitemysite.com ever sees this (see DEV_TESTING_EMAILS
        // above). setStep() has no validation gate of its own, so this lets
        // every screen be previewed without filling in real answers first.
        <div
          style={{
            position: "fixed",
            bottom: 16,
            right: 16,
            zIndex: 50,
            background: "#111",
            color: "#fff",
            borderRadius: 10,
            padding: "10px 12px",
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            maxWidth: 280,
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          }}
        >
          <span style={{ width: "100%", fontSize: 11, opacity: 0.7, marginBottom: 2 }}>Testing: jump to step</span>
          {STEPS.map((label, i) => (
            <button
              key={label}
              onClick={() => {
                setStep(i);
                window.scrollTo(0, 0);
              }}
              style={{
                fontSize: 12,
                padding: "4px 8px",
                borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.25)",
                background: step === i ? "#fff" : "transparent",
                color: step === i ? "#111" : "#fff",
                cursor: "pointer",
              }}
            >
              {i}. {label}
            </button>
          ))}
        </div>
      )}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "color-mix(in srgb, var(--color-bg) 92%, transparent)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "18px clamp(18px, 4vw, 40px) 0" }}>
          <PriorityPayLogo size={22} layout="row" />
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
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(34px, 6vw, 56px)", fontWeight: 800, lineHeight: 1.06, letterSpacing: "-0.02em", margin: "0 0 26px" }}>
              Send money to savings, investments, and retirement.<span style={{ fontStyle: "italic", color: "var(--color-accent-700)" }}> BEFORE you spend it.</span>
            </h1>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: "color-mix(in srgb, var(--color-text) 74%, transparent)", maxWidth: "32em", margin: "0 auto 40px" }}>
              Set a percentage of every deposit or owner’s draw for investments, savings, and other accounts. PrioritySave
              calculates it the moment the money lands.
            </p>
            <button onClick={next} className="pp-btn pp-btn-primary" style={{ fontSize: 15, padding: "15px 34px" }}>
              Get started &nbsp;→
            </button>
          </div>
        )}

        {step === 1 && (
          <div style={{ maxWidth: "34em", margin: "0 auto" }}>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(32px, 5.4vw, 46px)", fontWeight: 800, lineHeight: 1.06, margin: "0 0 10px" }}>
              Tell us about yourself
            </h1>
            <div style={{ height: 1, background: "var(--color-divider)", margin: "0 0 34px" }} />
            <div style={{ display: "grid", gap: 26 }}>
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-heading)", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 60%, transparent)", marginBottom: 10 }}>
                  Which of the following describes your work? Select all that apply.
                </label>
                <ChipCheckboxes
                  options={WORK_OPTIONS}
                  selected={workPicks}
                  onToggle={(v) => {
                    const next = workPicks.includes(v) ? workPicks.filter((x) => x !== v) : [...workPicks, v];
                    setWorkPicks(next);
                    const runs = next.includes("self_employed") || next.includes("owns_business");
                    if (!runs) setHasEmployees(null);
                    applyWork(next, runs ? hasEmployees : null);
                  }}
                />
              </div>

              {ownsBusiness && (
                <div>
                  <label style={{ display: "block", fontFamily: "var(--font-heading)", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 60%, transparent)", marginBottom: 10 }}>
                    Do you have employees? (Other than a spouse or your kids)
                  </label>
                  <div style={{ display: "flex", gap: 10 }}>
                    {[{ value: true, label: "Yes" }, { value: false, label: "No" }].map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => {
                          setHasEmployees(opt.value);
                          applyWork(workPicks, opt.value);
                        }}
                        style={{
                          flex: 1,
                          textAlign: "left",
                          fontFamily: "var(--font-body)",
                          fontSize: 14.5,
                          padding: "12px 14px",
                          borderRadius: "var(--radius-md)",
                          border: `1px solid ${hasEmployees === opt.value ? "var(--color-accent)" : "var(--color-divider)"}`,
                          background: hasEmployees === opt.value ? "color-mix(in srgb, var(--color-accent) 7%, transparent)" : "transparent",
                          color: hasEmployees === opt.value ? "var(--color-accent-700)" : "var(--color-text)",
                          cursor: "pointer",
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <p style={{ fontSize: 13, lineHeight: 1.6, color: "color-mix(in srgb, var(--color-text) 55%, transparent)", margin: "8px 0 0" }}>
                    If you have more than one business, answer Yes if any of them do.
                  </p>
                </div>
              )}

              {ownsBusiness && (
                <div>
                  <label style={{ display: "block", fontFamily: "var(--font-heading)", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 60%, transparent)", marginBottom: 10 }}>
                    How is your business set up? Select all that apply.
                  </label>
                  <EntityPicker value={entityType} onChange={changeEntity} chosen={entityChosen} />
                  {shortDrawNote(entityType) && (
                    <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "color-mix(in srgb, var(--color-text) 70%, transparent)", margin: "10px 0 0" }}>
                      {shortDrawNote(entityType)}
                    </p>
                  )}
                </div>
              )}

            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 44 }}>
              <BackBtn onClick={back} />
              <PrimaryBtn onClick={next} disabled={!typeChosen || (ownsBusiness && (hasEmployees === null || !entityChosen))} flex>Continue &nbsp;→</PrimaryBtn>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ maxWidth: "40em", margin: "0 auto" }}>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(32px, 5.4vw, 46px)", fontWeight: 800, lineHeight: 1.06, margin: "0 0 10px" }}>
              Set your splits
            </h1>
            <div style={{ height: 1, background: "var(--color-divider)", margin: "0 0 26px" }} />
            {paysByDraw(entityType) && (
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "color-mix(in srgb, var(--color-text) 62%, transparent)", margin: "-8px 0 22px" }}>
                <strong>Keep your LLC or corporation&apos;s money separate from your personal money.</strong> Pay
                yourself with a draw or distribution from the business account, and don&apos;t pay personal
                expenses from it. Mixing the two can weaken the legal protection the business gives you.
              </p>
            )}
            <p style={{ fontSize: 16, lineHeight: 1.75, color: "color-mix(in srgb, var(--color-text) 76%, transparent)", margin: "0 0 22px", maxWidth: "34em" }}>
              We started you with an example. Every {splitUnit(entityType)} pays your top priority categories first, what is left flows
              to the next tier, and the rest is split by percent. Change anything, add or delete whole tiers, and remove what you do not need.
            </p>

            <TierCards
              percent={percent}
              onUpdate={updatePercent}
              onAddRow={addTier}
              onRemoveRow={removeTier}
              onAddTier={addTierBy}
              onRemoveTier={removeTierBy}
            >
              <TierLastCard
                rows={lastTierRows}
                onUpdate={updatePercent}
                onRemove={removeFromStep2}
                overflow={pctOverflow}
                persona={businessType}
                title="Final Categories"
                num={priorityTiers(percent).length + 1}
              >
                <AddCategoryCard inline suggestions={availableSuggestions} onAddSuggested={addSuggested} onAddOwn={addPercent} />
              </TierLastCard>
            </TierCards>



            {needsRetirement && (
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "color-mix(in srgb, var(--color-text) 68%, transparent)", margin: "16px 0 0" }}>
                Most people with earned income put at least 1% toward retirement. You can add it back below if you removed it.
              </p>
            )}

            {percent.some(isRetRow) && (
              <div style={{ marginTop: 18, border: "1px solid #D9C9FF", borderRadius: 18, background: "#fff", padding: "16px 18px" }}>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "#4E22B8", fontWeight: 600, marginBottom: 8 }}>
                  Retirement accounts
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: "color-mix(in srgb, var(--color-text) 62%, transparent)", margin: "0 0 12px", maxWidth: "40em" }}>
                  Which of these do you have open right now? Select all that apply. If none, set a percentage anyway. The money builds up until you open one.
                </p>
                <ChipCheckboxes options={retirementPicker.options} selected={retirementPicker.selected} onToggle={retirementPicker.onToggle} />
                {retirementPicker.selected.includes("other") && (
                  <button
                    type="button"
                    onClick={() => retirementPicker.onToggle("add-other")}
                    style={{ marginTop: 12, background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 14, color: "#4E22B8" }}
                  >
                    + Add another account
                  </button>
                )}
              </div>
            )}

            {removedRows.length > 0 && (
              <div style={{ marginTop: 22, display: "grid", gap: 8, padding: "14px 16px", border: "1px solid #D9C9FF", borderRadius: 18, background: "#F7F3FF" }}>
                <span style={{ fontFamily: "var(--font-heading)", fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "#4E22B8", fontWeight: 600 }}>
                  Removed by you: tap to add back
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                  {removedRows.map((x) => (
                    <button
                      key={x.row.id}
                      type="button"
                      onClick={() => addBackRemoved(x.row.id)}
                      style={{ height: 36, padding: "0 16px", border: "1px solid #B79CF5", borderRadius: 18, background: "#EDE6FF", color: "#4E22B8", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                    >
                      + {x.row.label}
                    </button>
                  ))}
                  <span style={{ fontSize: 13, color: "#4B4160" }}>It comes back at 0%, so your other splits don&apos;t change.</span>
                </div>
              </div>
            )}

            <div style={{ borderTop: "1px solid var(--color-divider)", marginTop: 36, paddingTop: 24 }}>
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
                  style={bloomInputStyle({ fontSize: 16 })}
                />
              </div>
            </div>
          </div>
        )}

        {step === STEP_LIMITS && (
          <div style={{ maxWidth: "46em", margin: "0 auto" }}>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(32px, 5.4vw, 46px)", fontWeight: 800, lineHeight: 1.06, margin: "0 0 10px" }}>
              Add additional limits{" "}
              <span style={{ fontWeight: 500, color: "color-mix(in srgb, var(--color-text) 55%, transparent)", fontSize: "0.6em", whiteSpace: "nowrap" }}>(Optional)</span>
            </h1>
            <div style={{ height: 1, background: "var(--color-divider)", margin: "0 0 26px" }} />
            <OnboardingLimits rows={lastTierRows} onUpdate={updatePercent} />
          </div>
        )}

        {step === STEP_CONNECT && (
          <div style={{ maxWidth: "36em", margin: "0 auto" }}>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(32px, 5.4vw, 46px)", fontWeight: 800, lineHeight: 1.06, margin: "0 0 10px" }}>
              Connect everywhere money reaches you
            </h1>
            <div style={{ height: 1, background: "var(--color-divider)", margin: "0 0 26px" }} />
            <p style={{ fontSize: 16, lineHeight: 1.75, color: "color-mix(in srgb, var(--color-text) 76%, transparent)", margin: "0 0 32px" }}>
              {paysByDraw(entityType)
                ? "PrioritySave can only tell you to split money it actually sees. Connect the account where your pay lands. You can always add more inside the dashboard."
                : "PrioritySave can only tell you to split a deposit it actually sees. Connect every bank account you could receive a payment from. You can always add more inside the dashboard."}
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
            </div>

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
                        {a.institution_name}, {a.account_name} •••• {a.mask}
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

            {paysByDraw(entityType) && (
              <p style={{ fontSize: 14.5, lineHeight: 1.7, color: "color-mix(in srgb, var(--color-text) 72%, transparent)", margin: "0 0 20px", padding: "14px 16px", border: "1px solid var(--color-divider)", borderRadius: "var(--radius-md)" }}>
                {mixedOrDrawConnectNote(entityType)}
              </p>
            )}
            {paysByDraw(entityType) && (
              <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14.5, lineHeight: 1.5, margin: "0 0 20px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={opAcctAck}
                  onChange={(e) => { setOpAcctAck(e.target.checked); if (e.target.checked) setShowOpAcctHint(false); }}
                  style={{ marginTop: 3 }}
                />
                <span>
                  I&apos;m connecting the accounts where I get paid, not my business operating account.
                  {showOpAcctHint && !opAcctAck && (
                    <span style={{ display: "block", fontSize: 13.5, marginTop: 4, color: "color-mix(in srgb, var(--color-text) 70%, transparent)" }}>
                      Please check this box to continue.
                    </span>
                  )}
                </span>
              </label>
            )}
            <div style={{ display: "flex", gap: 12 }}>
              <BackBtn onClick={back} />
              {accounts.length > 0 && (
                <PrimaryBtn onClick={() => { if (paysByDraw(entityType) && !opAcctAck) { setShowOpAcctHint(true); return; } setShowConfirmAccountsModal(true); }} flex>Continue &nbsp;→</PrimaryBtn>
              )}
            </div>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "color-mix(in srgb, var(--color-text) 60%, transparent)", margin: "16px 0 0" }}>
              Next you&apos;ll start your plan, then match each account to your splits.
            </p>
          </div>
        )}

        {step === STEP_PLAN && (
          <div style={{ maxWidth: "34em", margin: "0 auto" }}>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(32px, 5.4vw, 46px)", fontWeight: 800, lineHeight: 1.06, margin: "0 0 10px" }}>
              {isPaid ? "Your plan is active" : "Start your plan"}
            </h1>
            <div style={{ height: 1, background: "var(--color-divider)", margin: "0 0 26px" }} />
            <p style={{ fontSize: 16, lineHeight: 1.75, color: "color-mix(in srgb, var(--color-text) 76%, transparent)", margin: "0 0 26px" }}>
              {isPaid
                ? "You're all set. One more quick step: match each account to your splits."
                : "Your splits are set and your accounts are connected. Start your plan to finish setting up. One more quick step comes after this: matching each account to your splits."}
            </p>
            {isPaid ? (
              <div style={{ display: "flex", gap: 12 }}>
                <BackBtn onClick={back} />
                <PrimaryBtn onClick={() => setStep(STEP_MATCH)} flex>Continue &nbsp;→</PrimaryBtn>
              </div>
            ) : (
              <>
            <div style={{ borderTop: "1px solid var(--color-divider)", marginTop: 32, paddingTop: 24 }}>
              <p style={{ fontSize: 14.5, lineHeight: 1.7, color: "color-mix(in srgb, var(--color-text) 68%, transparent)", margin: 0 }}>
                {isNative
                  ? "PrioritySave Simple is $12.99/month, billed today through your Apple ID. This subscription automatically renews monthly at $12.99 unless cancelled at least 24 hours before the end of the current period. Cancel anytime from iOS Settings > Apple ID > Subscriptions."
                  : "PrioritySave is $12.99/month, billed today to get started. You’ll enter payment details on Stripe’s secure checkout page next, and can cancel anytime from Settings."}
              </p>
              {isNative && (
                <p style={{ fontSize: 13, lineHeight: 1.6, color: "color-mix(in srgb, var(--color-text) 60%, transparent)", margin: "10px 0 0" }}>
                  By continuing you agree to our{" "}
                  <a href="/terms" style={{ color: "var(--color-accent-700)", textDecoration: "underline" }}>
                    Terms of Use (EULA)
                  </a>{" "}
                  and{" "}
                  <a href="/privacy" style={{ color: "var(--color-accent-700)", textDecoration: "underline" }}>
                    Privacy Policy
                  </a>
                  .
                </p>
              )}
            </div>
            {paymentError && (
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "#b3261e", margin: "20px 0 0" }}>{paymentError}</p>
            )}
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <BackBtn onClick={back} />
              {isNative ? (
                <PrimaryBtn onClick={finishNative} disabled={nativePurchasing} flex>
                  {nativePurchasing ? "Processing…" : "Continue to payment ($12.99/month)"} &nbsp;→
                </PrimaryBtn>
              ) : (
                <PrimaryBtn onClick={finish} disabled={submitting} flex>
                  {submitting ? "Redirecting to checkout…" : "Continue to payment ($12.99/month)"} &nbsp;→
                </PrimaryBtn>
              )}
            </div>
            {isNative && (
              <button
                type="button"
                onClick={restoreNativePurchases}
                disabled={nativePurchasing}
                style={{
                  display: "block",
                  margin: "16px auto 0",
                  background: "none",
                  border: "none",
                  color: "var(--color-accent-700)",
                  textDecoration: "underline",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Restore Purchases
              </button>
            )}
            {isDevTester && (
              <button
                onClick={completeOnboarding}
                disabled={submitting}
                style={{ marginTop: 12, width: "100%", padding: "10px 0", fontSize: 13, borderRadius: 8, border: "1px dashed color-mix(in srgb, var(--color-text) 30%, transparent)", background: "transparent", color: "color-mix(in srgb, var(--color-text) 60%, transparent)", cursor: submitting ? "not-allowed" : "pointer" }}
              >
                Testing only: finish without Stripe checkout
              </button>
            )}
              </>
            )}
          </div>
        )}

        {step === STEP_MATCH && (
          <div style={{ maxWidth: "40em", margin: "0 auto" }}>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(32px, 5.4vw, 46px)", fontWeight: 800, lineHeight: 1.06, margin: "0 0 10px" }}>
              Match accounts to your splits
            </h1>
            <div style={{ height: 1, background: "var(--color-divider)", margin: "0 0 26px" }} />
            <p style={{ fontSize: 16, lineHeight: 1.75, color: "color-mix(in srgb, var(--color-text) 76%, transparent)", margin: "0 0 22px", maxWidth: "34em" }}>
              Your plan is active. Last setup step: choose an account for every split, so your checklist
              knows where to send it. You can connect accounts right on each row.
            </p>
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
              pctOverflow={pctOverflow}
              hideCapDetails
              theme="ledger"
              hideStartingBalance
              hideCreateNew
              flattenInvestments
              hideGroupSubtext
              readOnly={!editSplits}
              retirementPicker={editSplits ? retirementPicker : null}
              persona={businessType}
            />
            {editSplits ? (
              <>
                <AddCategoryCard style={{ marginTop: 20 }} suggestions={availableSuggestions} onAddSuggested={addSuggested} onAddOwn={addPercent} />
                <button
                  type="button"
                  onClick={() => setEditSplits(false)}
                  style={{ display: "block", margin: "26px auto 0", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 15, color: "var(--color-accent-700)", textDecoration: "underline" }}
                >
                  Done editing splits
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setEditSplits(true)}
                style={{ display: "block", margin: "26px auto 0", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 15, color: "var(--color-accent-700)", textDecoration: "underline" }}
              >
                Want to edit your splits?
              </button>
            )}
          </div>
        )}

        {confirmingPayment && (
          <div style={{ ...BLOOM_TOKENS, position: "fixed", inset: 0, zIndex: 80, background: "var(--color-bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
            <div style={{ maxWidth: "34em" }}>
              <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(32px, 5.4vw, 46px)", fontWeight: 800, lineHeight: 1.06, margin: "0 0 16px" }}>
                Confirming your payment…
              </h1>
              <p style={{ fontSize: 16, lineHeight: 1.75, color: "color-mix(in srgb, var(--color-text) 76%, transparent)", margin: 0 }}>
                One moment. You&apos;ll move on to matching your accounts as soon as this is done.
              </p>
            </div>
          </div>
        )}

        {step === STEP_ALERTS && (
          <div style={{ maxWidth: "34em", margin: "0 auto" }}>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(32px, 5.4vw, 46px)", fontWeight: 800, lineHeight: 1.06, margin: "0 0 10px" }}>
              Get notified the moment a deposit lands
            </h1>
            <div style={{ height: 1, background: "var(--color-divider)", margin: "0 0 26px" }} />
            {/* Text alerts are temporarily on hold (see the same note in
                app/(app)/settings/page.js) -- this step asked for a phone
                number before; the phoneNumber/smsEnabled state and
                validation above are left in place, untouched, so bringing
                that step back later is a quick revert rather than a
                rebuild. */}
            <p style={{ fontSize: 16, lineHeight: 1.75, color: "color-mix(in srgb, var(--color-text) 76%, transparent)", margin: "0 0 32px" }}>
              PrioritySave notifies you the moment a qualifying deposit lands, with a link straight to your split
              checklist. That&apos;s how you actually confirm and send each transfer.
            </p>
            <div style={{ marginBottom: 32 }}>
              <label
                style={{ display: "block", fontFamily: "var(--font-heading)", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 60%, transparent)", marginBottom: 10 }}
              >
                Mobile number (required)
              </label>
              <div style={{ maxWidth: 340 }}>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="(555) 123-4567"
                  style={bloomInputStyle({ fontSize: 16 })}
                />
              </div>
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
              <p style={{ fontSize: 13, lineHeight: 1.6, color: "color-mix(in srgb, var(--color-text) 60%, transparent)", margin: "8px 0 0", maxWidth: "30em" }}>
                By opting in you agree to receive deposit-alert texts from PrioritySave. Message &amp; data rates may
                apply; frequency varies with your deposit activity. Reply STOP to cancel or HELP for help. See our{" "}
                <a href="/terms" target="_blank" rel="noreferrer" style={{ color: "var(--color-accent-700)", textDecoration: "underline" }}>
                  Terms
                </a>
                .
              </p>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginTop: 16 }}>
              <input
                type="checkbox"
                checked={emailAlertsEnabled}
                onChange={(e) => setEmailAlertsEnabled(e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              <span style={{ fontSize: 14.5, color: "color-mix(in srgb, var(--color-text) 76%, transparent)" }}>
                Also email me when a deposit crosses my threshold
              </span>
            </label>
            {emailAlertsEnabled && (
              <div style={{ marginTop: 24, maxWidth: 340 }}>
                <label
                  style={{ display: "block", fontFamily: "var(--font-heading)", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 60%, transparent)", marginBottom: 10 }}
                >
                  Send alerts to
                </label>
                <input
                  type="email"
                  value={alertEmail}
                  onChange={(e) => setAlertEmail(e.target.value)}
                  placeholder={emailAddress || "you@example.com"}
                  style={bloomInputStyle({ fontSize: 16 })}
                />
                <p style={{ fontSize: 13, lineHeight: 1.6, color: "color-mix(in srgb, var(--color-text) 60%, transparent)", margin: "8px 0 0" }}>
                  Defaults to your account email. You can change it if you&apos;d rather alerts go somewhere else, like a
                  bookkeeper or assistant&apos;s inbox.
                </p>
              </div>
            )}
            {paymentError && (
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "#b3261e", margin: "20px 0 0" }}>{paymentError}</p>
            )}
            <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
              <BackBtn onClick={back} />
              <PrimaryBtn onClick={next} disabled={!isValidUSPhone(phoneNumber)} flex>
                Continue &nbsp;→
              </PrimaryBtn>
            </div>
          </div>
        )}

        {step === STEP_CARDS && (
          <div style={{ maxWidth: "34em", margin: "0 auto" }}>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(32px, 5.4vw, 46px)", fontWeight: 800, lineHeight: 1.06, margin: "0 0 10px" }}>
              Connect your credit cards
            </h1>
            <div style={{ height: 1, background: "var(--color-divider)", margin: "0 0 26px" }} />
            <p style={{ fontSize: 16, lineHeight: 1.75, color: "color-mix(in srgb, var(--color-text) 76%, transparent)", margin: "0 0 12px" }}>
              Optional, and the last step. Connecting your credit cards helps you track expenses, which keeps your
              balances accurate.
            </p>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: "color-mix(in srgb, var(--color-text) 55%, transparent)", margin: "0 0 24px" }}>
              Credit cards are for close-out expense tracking only. They&apos;re never used for splits or transfers.
            </p>
            <div style={{ marginBottom: 20 }}>
              <PlaidLinkButton
                label="Add a credit card"
                creditCard
                onLinked={(account) => onAccountLinked(account)}
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
            </div>
            {accounts.filter((a) => a.account_type === "credit").length > 0 && (
              <div style={{ border: "1px solid var(--color-divider)", borderRadius: "var(--radius-md)", background: "var(--color-neutral-100)", padding: "4px 22px", marginBottom: 20 }}>
                {accounts.filter((a) => a.account_type === "credit").map((a) => (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 0", fontFamily: "var(--font-heading)", fontSize: 16 }}>
                    <span style={{ flex: 1, minWidth: 0 }}>{a.institution_name}, {a.account_name} •••• {a.mask}</span>
                    <span style={{ fontSize: 11.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>Linked</span>
                  </div>
                ))}
              </div>
            )}
            {paymentError && (
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "#b3261e", margin: "0 0 16px" }}>{paymentError}</p>
            )}
            <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
              <BackBtn onClick={back} />
              <PrimaryBtn onClick={completeOnboarding} disabled={submitting} flex>
                {submitting ? "Finishing…" : "Finish and go to my dashboard"} &nbsp;→
              </PrimaryBtn>
            </div>
          </div>
        )}
      </main>

      {/* Onboarding Pass 2 (Aug 2026 handoff): replaces the mid-page
          "Allocated" row and step 3's own Back/Continue block -- pinning
          allocation status + Continue to the bottom of the viewport keeps
          both visible no matter how far someone has scrolled through the
          bucket list. Sticky to the outer flex column (not main's own
          max-width wrapper) so it can sit flush with the viewport edge. */}
      {(step === 2 || step === STEP_LIMITS || step === STEP_MATCH) && (
        <div
          style={{
            position: "sticky",
            bottom: 0,
            zIndex: 15,
            background: "color-mix(in srgb, var(--color-bg) 94%, transparent)",
            backdropFilter: "blur(14px)",
            borderTop: "1px solid var(--color-divider)",
          }}
        >
          <div style={{ maxWidth: "40em", margin: "0 auto", padding: "16px clamp(18px, 4vw, 40px) 20px" }}>
            {step === STEP_MATCH && (
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", fontSize: 15, color: "color-mix(in srgb, var(--color-text) 70%, transparent)", marginBottom: 12 }}>
                <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, color: "var(--color-accent-700)" }}>
                  {totalPct}% allocated
                </span>
                <span>
                  {remainingPct > 0 ? `· ${remainingPct}% remains where it was deposited` : ""}
                </span>
              </div>
            )}
            {step === 2 && tierIssues.length > 0 && (
              <p style={{ fontSize: 14, lineHeight: 1.5, color: "#b3261e", margin: "0 0 12px" }}>{tierIssues[0]}</p>
            )}
            {step === STEP_MATCH && showBlockHint && unconnectedForStep4.length > 0 && (
              <p style={{ fontSize: 14, lineHeight: 1.5, color: "#b3261e", margin: "0 0 12px" }}>
                Choose an account for {joinWithAnd(unconnectedForStep4.map((r) => r.label))} to continue.
              </p>
            )}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <BackBtn onClick={back} />
              {step === STEP_LIMITS && (
                <GhostBtn onClick={() => { clearAllLimits(); next(); }}>Skip, no limits</GhostBtn>
              )}
              <PrimaryBtn onClick={step === 2 || step === STEP_LIMITS ? handleStep2Continue : handleStep4Continue} disabled={step === 2 && tierIssues.length > 0} flex>Continue &nbsp;→</PrimaryBtn>
            </div>
            {step === STEP_MATCH && unconnectedForStep4.length > 0 && isDevTester && (
              <button
                onClick={next}
                style={{ marginTop: 10, width: "100%", padding: "10px 0", fontSize: 13, borderRadius: 8, border: "1px dashed color-mix(in srgb, var(--color-text) 30%, transparent)", background: "transparent", color: "color-mix(in srgb, var(--color-text) 60%, transparent)", cursor: "pointer" }}
              >
                Testing only: continue without connecting accounts
              </button>
            )}
          </div>
        </div>
      )}

      {showConfirmAccountsModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "color-mix(in srgb, #171614 55%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "var(--color-bg)", border: "1px solid var(--color-divider)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)", maxWidth: "26em", width: "100%", padding: "34px 34px 30px" }}>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 26, fontWeight: 800, margin: "0 0 10px" }}>
              Are you sure these are all your income accounts?
            </h2>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "color-mix(in srgb, var(--color-text) 60%, transparent)", margin: "0 0 26px" }}>
              PrioritySave can only route money from connected accounts and apps.
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
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 26, fontWeight: 800, margin: "0 0 20px" }}>Have any more accounts to add?</h2>
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
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 28, fontWeight: 800, margin: "0 0 8px" }}>Missing accounts</h2>
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
          font-weight: 700;
          font-size: 14px;
          line-height: 1.2;
          color: var(--color-text);
          background: transparent;
          border: 1px solid transparent;
          border-radius: var(--radius-pill, 999px);
        }
        .pp-btn-primary {
          color: #fff;
          background: var(--color-accent);
          border-color: var(--color-accent);
        }
        .pp-btn-primary:hover {
          background: color-mix(in srgb, var(--color-accent) 82%, black);
          border-color: color-mix(in srgb, var(--color-accent) 82%, black);
        }
        .pp-btn-secondary {
          color: var(--color-accent);
          background: var(--color-surface, #fff);
          border-color: var(--color-divider);
        }
        .pp-btn-secondary:hover {
          background: color-mix(in srgb, var(--color-accent) 8%, transparent);
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
