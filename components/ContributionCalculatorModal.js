"use client";

import { useMemo, useState } from "react";
import { X, ChevronLeft, AlertTriangle, Calculator } from "lucide-react";
import { PrimaryButton, GhostButton, currency } from "@/components/ui";
import { LEDGER_TOKENS } from "@/lib/ledgerTheme";
import {
  AGE_BRACKETS,
  BUSINESS_TYPES,
  calculateSepIra,
  calculateSolo401k,
} from "@/lib/retirementCalculator";

function OptionButton({ selected, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left text-sm px-4 py-3 transition-colors"
      style={{
        fontFamily: "var(--font-body)",
        fontSize: 15.5,
        borderRadius: "var(--radius-md)",
        border: `1px solid ${selected ? "var(--color-accent)" : "var(--color-divider)"}`,
        background: selected ? "color-mix(in srgb, var(--color-accent) 7%, transparent)" : "transparent",
        color: selected ? "var(--color-accent-700)" : "var(--color-text)",
      }}
    >
      {children}
    </button>
  );
}

function Step({ title, subtitle, children }) {
  return (
    <div>
      <h3 className="text-base font-bold mb-1">{title}</h3>
      {subtitle && <p className="text-xs text-neutral-500 mb-4">{subtitle}</p>}
      <div className="space-y-2">{children}</div>
    </div>
  );
}

// A self-contained what-if simulator, not a live tracker: every input here
// is typed in by hand (never pulled from real PriorityPay data), on
// purpose, so someone can answer once and then freely try different
// expected-net-income numbers to see how their contribution room moves.
// Walks through a short eligibility screen first (business structure,
// employees, age, other-employer-plan deferrals, spouse) because those
// answers change which formula applies, then lands on a persistent results
// screen where net income is the one thing meant to be adjusted over and
// over. See lib/retirementCalculator.js for the actual math and why it's
// more complete than the auto-cap estimate used elsewhere in the app.
export default function ContributionCalculatorModal({ planType, onClose }) {
  const isSolo = planType === "solo_401k";
  const planLabel = isSolo ? "Solo 401k" : "SEP IRA";

  const [step, setStep] = useState(0);
  const [businessType, setBusinessType] = useState(null);
  const [hasEmployees, setHasEmployees] = useState(null);
  const [ageBracket, setAgeBracket] = useState(null);
  const [hasOtherPlan, setHasOtherPlan] = useState(null);
  const [otherPlanDeferralYTD, setOtherPlanDeferralYTD] = useState("");
  const [spouseInBusiness, setSpouseInBusiness] = useState(null);
  const [netIncome, setNetIncome] = useState("");

  // Solo 401k requires the plan-sponsoring business to have no common-law
  // employees other than the owner and a spouse -- a real hard IRS
  // eligibility rule, not a cost tradeoff like it is for SEP.
  const soloBlockedByEmployees = isSolo && hasEmployees === true;

  const steps = useMemo(() => {
    const s = ["business", "employees"];
    if (!(isSolo && hasEmployees === true)) {
      // Age only matters for Solo 401k's catch-up brackets -- SEP IRA has
      // no age-based catch-up, so there's no reason to ask.
      if (isSolo) s.push("age", "otherPlan");
      s.push("spouse", "results");
    }
    return s;
  }, [isSolo, hasEmployees]);

  const current = steps[step];

  const result = useMemo(() => {
    if (!netIncome || soloBlockedByEmployees) return null;
    if (isSolo) {
      return calculateSolo401k({
        netIncome,
        businessType,
        ageBracket,
        otherPlanDeferralYTD: hasOtherPlan ? otherPlanDeferralYTD : 0,
      });
    }
    return calculateSepIra({ netIncome, businessType });
  }, [isSolo, netIncome, businessType, ageBracket, hasOtherPlan, otherPlanDeferralYTD, soloBlockedByEmployees]);

  const goNext = () => setStep((s) => Math.min(steps.length - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{ ...LEDGER_TOKENS, background: "color-mix(in srgb, #171614 55%, transparent)" }}
    >
      <div
        className="max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 relative"
        style={{ background: "var(--color-bg)", border: "1px solid var(--color-divider)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)" }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4"
          style={{ color: "color-mix(in srgb, var(--color-text) 45%, transparent)", background: "transparent", border: 0, cursor: "pointer" }}
          aria-label="Close"
        >
          <X size={20} />
        </button>
        <div className="flex items-center gap-2 mb-5">
          <Calculator size={18} style={{ color: "var(--color-accent-700)" }} />
          <span style={{ fontFamily: "var(--font-heading)", fontSize: 18, color: "var(--color-accent-700)" }}>{planLabel} contribution calculator</span>
        </div>

        {current === "business" && (
          <Step title="How is your business structured?" subtitle="This changes which formula applies.">
            {BUSINESS_TYPES.map((b) => (
              <OptionButton key={b.value} selected={businessType === b.value} onClick={() => setBusinessType(b.value)}>
                {b.label}
              </OptionButton>
            ))}
          </Step>
        )}

        {current === "employees" && (
          <Step
            title="Do you have any employees, other than yourself and a spouse?"
            subtitle={
              isSolo
                ? "A Solo 401k can only cover a business owner and their spouse -- any other common-law employee makes the business ineligible for this specific plan."
                : "SEP IRA doesn't block on this, but if you contribute for yourself, you're required to contribute the same percentage of compensation for every eligible employee too."
            }
          >
            <OptionButton selected={hasEmployees === false} onClick={() => setHasEmployees(false)}>
              No, just me (and maybe my spouse)
            </OptionButton>
            <OptionButton selected={hasEmployees === true} onClick={() => setHasEmployees(true)}>
              Yes, I have other employees
            </OptionButton>
          </Step>
        )}

        {current === "employees" && soloBlockedByEmployees && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 mb-1">Not eligible for a Solo 401k</p>
              <p className="text-xs text-amber-700">
                Solo 401k plans are only available to owner-only (plus spouse) businesses. With other employees on
                payroll, a SEP IRA or a standard employer 401k would be the options to look into instead -- worth a
                conversation with a tax professional about which fits.
              </p>
            </div>
          </div>
        )}

        {current === "age" && (
          <Step title="What's your age bracket?" subtitle="The IRS allows a larger catch-up contribution starting at 50, and an even bigger one from 60-63.">
            {AGE_BRACKETS.map((a) => (
              <OptionButton key={a.value} selected={ageBracket === a.value} onClick={() => setAgeBracket(a.value)}>
                {a.label}
              </OptionButton>
            ))}
          </Step>
        )}

        {current === "otherPlan" && (
          <Step
            title="Are you also contributing to a 401k, 403b, or TSP through another job this year?"
            subtitle="The employee-deferral dollar limit is shared across every plan one person contributes to, not per plan."
          >
            <OptionButton selected={hasOtherPlan === false} onClick={() => setHasOtherPlan(false)}>
              No
            </OptionButton>
            <OptionButton selected={hasOtherPlan === true} onClick={() => setHasOtherPlan(true)}>
              Yes
            </OptionButton>
            {hasOtherPlan && (
              <div className="pt-2">
                <label className="block text-xs text-neutral-500 mb-1">
                  How much have you deferred there so far this year?
                </label>
                <input
                  type="number"
                  min={0}
                  value={otherPlanDeferralYTD}
                  onChange={(e) => setOtherPlanDeferralYTD(e.target.value)}
                  className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 font-mono"
                  placeholder="0"
                />
              </div>
            )}
          </Step>
        )}

        {current === "spouse" && (
          <Step
            title="Does your spouse also earn self-employment income from this same business?"
            subtitle="Informational only -- doesn't change your own number below."
          >
            <OptionButton selected={spouseInBusiness === false} onClick={() => setSpouseInBusiness(false)}>
              No
            </OptionButton>
            <OptionButton selected={spouseInBusiness === true} onClick={() => setSpouseInBusiness(true)}>
              Yes
            </OptionButton>
          </Step>
        )}

        {current === "results" && (
          <div>
            <h3 className="text-base font-bold mb-1">Try different net income amounts</h3>
            <p className="text-xs text-neutral-500 mb-4">
              Enter what you expect your net self-employment income to be for the year -- adjust it as much as you
              want to see how the room changes.
            </p>
            <label className="block text-xs text-neutral-500 mb-1">
              Expected net income for the year
            </label>
            <input
              type="number"
              min={0}
              autoFocus
              value={netIncome}
              onChange={(e) => setNetIncome(e.target.value)}
              className="w-full text-lg border border-neutral-200 rounded-xl px-3 py-2.5 font-mono font-bold mb-1"
              placeholder="$0"
            />
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4 leading-snug">
              Have a W2 job too? Don&apos;t include that income here -- enter only the net profit from this
              self-employment business (after business expenses), since that&apos;s the only income this plan is
              allowed to be based on.
            </p>

            {result && (
              <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4 space-y-3">
                {isSolo ? (
                  <>
                    <div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-600">Employee deferral</span>
                        <span className="font-mono font-semibold">{currency(result.employeeDeferral)}</span>
                      </div>
                      <p className="text-[11px] text-neutral-400 leading-snug mt-0.5">
                        What you personally choose to set aside, like an employee electing to divert part of their
                        paycheck into a 401k -- capped at a flat dollar amount for the year, not a percentage.
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-600">Employer (profit-share) contribution</span>
                        <span className="font-mono font-semibold">{currency(result.employerContribution)}</span>
                      </div>
                      <p className="text-[11px] text-neutral-400 leading-snug mt-0.5">
                        A separate contribution your business makes on your behalf, calculated as a percentage of
                        your income -- on top of the employee deferral above, not instead of it.
                      </p>
                    </div>
                    <div className="pt-3 border-t border-neutral-200">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-bold">Maximum you could contribute this year</span>
                        <span className="font-mono font-bold" style={{ color: "var(--color-accent-700)" }}>{currency(result.total)}</span>
                      </div>
                      <p className="text-[11px] text-neutral-400 leading-snug mt-0.5">
                        This is the ceiling given what you entered above, not a recommendation -- the most you
                        could put in, not what you should.
                      </p>
                    </div>
                  </>
                ) : (
                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold">Maximum you could contribute this year</span>
                      <span className="font-mono font-bold" style={{ color: "var(--color-accent-700)" }}>{currency(result.contribution)}</span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-snug mt-0.5">
                      This is the ceiling given what you entered above, not a recommendation -- the most you could
                      put in, not what you should.
                    </p>
                  </div>
                )}
                {result.cappedByAnnualLimit && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Capped by this year&apos;s ${result.cap.toLocaleString()} IRS annual limit -- the uncapped
                    formula would&apos;ve allowed more.
                  </p>
                )}
                {hasEmployees && !isSolo && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Remember: contributing this % of your own compensation means contributing the same % for every
                    eligible employee too.
                  </p>
                )}
                {spouseInBusiness && (
                  <p className="text-xs text-neutral-500">
                    Your spouse may be able to open their own {planLabel} based on their own compensation from this
                    business -- this number is just yours.
                  </p>
                )}
              </div>
            )}

            <div className="mt-4 bg-neutral-50 border border-neutral-100 rounded-xl p-3 text-xs text-neutral-500 leading-relaxed">
              This is a simulator, not a tracker -- it has no idea what you&apos;ve actually contributed this year,
              here or anywhere else, and it doesn&apos;t know your real numbers unless you type them in above.
              Contributing more than your real limit (over-contributing) can trigger an IRS excise tax on the
              excess, so treat this as a starting point for a conversation with a tax professional, not a final
              answer -- and double-check against your actual year-to-date contributions before sending money.
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 mt-6">
          {step > 0 && (
            <GhostButton onClick={goBack} className="px-4 py-2 text-xs">
              <ChevronLeft size={14} /> Back
            </GhostButton>
          )}
          {current !== "results" && !(current === "employees" && soloBlockedByEmployees) && (
            <PrimaryButton
              onClick={goNext}
              disabled={
                (current === "business" && !businessType) ||
                (current === "employees" && hasEmployees === null) ||
                (current === "age" && !ageBracket) ||
                (current === "otherPlan" && hasOtherPlan === null) ||
                (current === "otherPlan" && hasOtherPlan === true && !otherPlanDeferralYTD && otherPlanDeferralYTD !== 0) ||
                (current === "spouse" && spouseInBusiness === null)
              }
              className="flex-1 text-sm py-2.5"
            >
              Continue
            </PrimaryButton>
          )}
          {current === "results" && (
            <GhostButton onClick={onClose} className="flex-1 text-sm py-2.5">
              Done
            </GhostButton>
          )}
        </div>
      </div>
    </div>
  );
}
