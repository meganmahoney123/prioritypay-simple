"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { Card, PrimaryButton, currency } from "@/components/ui";
import { LEDGER_TOKENS, ledgerInputStyle, ledgerSelectStyle } from "@/lib/ledgerTheme";
import { calculateSepIra, calculateSolo401k, AGE_BRACKETS, BUSINESS_TYPES } from "@/lib/retirementCalculator";

// No persona toggle here (Megan's Aug 2026 note): the "How you're taxed"
// select (BUSINESS_TYPES) already captures the one distinction that
// actually changes the math -- self-employed/K-1 vs. S-corp/C-corp W-2
// wages. A separate self-employed/business-owner toggle on top of that
// was redundant and only existed to set a default for this same field.
//
// "Already deferred elsewhere this year" was dropped as its own input in
// favor of a note under Expected net income -- otherPlanDeferralYTD is
// hardcoded to 0 (full deferral room assumed) since this tool is scoped
// to a single self-employment/business plan, not multi-plan coordination.
//
// Renamed from "vs" to "+" and split "already contributed" into two
// separate fields per Megan's Aug 2026 note: this isn't an either-or
// choice (SEP IRA and Solo 401k are two different plans someone could
// hold at once, especially mid-year after switching from one to the
// other), and a single shared "already contributed" figure silently
// assumed whichever plan they ended up using got 100% of what they'd
// already put aside -- wrong if they'd split contributions, or funded
// one plan earlier in the year before considering the other.
export default function RetirementCalculatorPublicClient() {
  const router = useRouter();
  const [businessType, setBusinessType] = useState(BUSINESS_TYPES[0].value);
  const [netIncome, setNetIncome] = useState(90000);
  const [ageBracket, setAgeBracket] = useState("under50");
  const [sepContributed, setSepContributed] = useState(0);
  const [solo401kContributed, setSolo401kContributed] = useState(0);

  const sep = useMemo(() => calculateSepIra({ netIncome, businessType }), [netIncome, businessType]);
  const solo401k = useMemo(
    () => calculateSolo401k({ netIncome, businessType, ageBracket, otherPlanDeferralYTD: 0 }),
    [netIncome, businessType, ageBracket]
  );

  // Months left in the current calendar year, including the current one
  // (visiting in August -> 5 months: Aug through Dec) -- used to turn
  // "here's your room" into "here's what to send monthly to hit it,"
  // which is what makes the automate-it CTA below concrete instead of
  // abstract.
  const monthsRemaining = useMemo(() => Math.max(1, 12 - new Date().getMonth()), []);

  const planProgress = (target, contributedRaw) => {
    const contributed = Math.max(0, Number(contributedRaw) || 0);
    const remaining = target - contributed;
    return {
      contributed,
      remaining,
      overContributed: remaining < 0,
      monthlyToHitTarget: remaining > 0 ? remaining / monthsRemaining : 0,
    };
  };
  const sepProgress = planProgress(sep.contribution, sepContributed);
  const solo401kProgress = planProgress(solo401k.total, solo401kContributed);

  return (
    <div style={LEDGER_TOKENS}>
      <PublicHeader />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px clamp(18px, 4vw, 40px) 80px" }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(30px, 4vw, 40px)", fontWeight: 400, margin: "0 0 10px" }}>
          Solo 401k + SEP IRA Calculator
        </h1>
        <p className="text-sm" style={{ maxWidth: 600, color: "color-mix(in srgb, var(--color-text) 76%, transparent)", margin: "0 0 32px" }}>
          See how much room you actually have in each for 2026, side by side. Free, no account needed -- for
          self-employed people and business owners only, since W2 employees don't have access to either plan.
        </p>

        <Card style={{ padding: "24px 26px", marginBottom: 24 }}>
          <div className="flex gap-6 flex-wrap items-end mb-2">
            <label className="text-xs flex flex-col gap-1" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
              Expected net income, annual
              <span style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontFamily: "var(--font-heading)", fontSize: 18, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>$</span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={netIncome}
                  onChange={(e) => setNetIncome(Math.max(0, Number(e.target.value) || 0))}
                  style={ledgerInputStyle({ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 600, width: 140 })}
                />
              </span>
            </label>

            <label className="text-xs flex flex-col gap-1" style={{ flex: "1 1 300px", maxWidth: 340, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
              How you're taxed
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                style={ledgerSelectStyle({ fontSize: 13, width: "100%", boxSizing: "border-box" })}
              >
                {BUSINESS_TYPES.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs flex flex-col gap-1" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
              Age bracket
              <select value={ageBracket} onChange={(e) => setAgeBracket(e.target.value)} style={ledgerSelectStyle({ fontSize: 13 })}>
                {AGE_BRACKETS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-xs mt-1 mb-5" style={{ color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}>
            Just your self-employment or business net income -- if you also have a W2 job, don't include those wages
            here.
          </p>
        </Card>

        <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
          <Card style={{ padding: "26px 28px" }}>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 18, display: "block", marginBottom: 6 }}>SEP IRA</span>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 30, fontWeight: 600, display: "block", marginBottom: 14 }}>
              {currency(sep.contribution)}
            </span>
            <ul style={{ fontSize: 14, lineHeight: 2, margin: 0, paddingLeft: 18, color: "color-mix(in srgb, var(--color-text) 76%, transparent)" }}>
              <li>Employer-only contribution</li>
              <li>Compensation base: <strong>{currency(sep.compensation)}</strong></li>
              <li>Annual dollar cap: <strong>{currency(sep.cap)}</strong></li>
            </ul>
            {sep.cappedByAnnualLimit && (
              <p className="text-xs mt-3" style={{ color: "var(--color-accent-700)" }}>
                Capped by the annual dollar limit -- the uncapped 20-25% formula would allow {currency(sep.uncappedContribution)}.
              </p>
            )}
            <label className="text-xs flex flex-col gap-1 mt-4" style={{ maxWidth: 220, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
              Already contributed to this SEP IRA
              <span style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontFamily: "var(--font-heading)", fontSize: 16, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>$</span>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={sepContributed}
                  onChange={(e) => setSepContributed(Math.max(0, Number(e.target.value) || 0))}
                  style={ledgerInputStyle({ fontSize: 15, width: 100 })}
                />
              </span>
            </label>
            <div style={{ borderTop: "1px solid var(--color-divider)", marginTop: 16, paddingTop: 14 }}>
              {sepProgress.overContributed ? (
                <p className="text-sm m-0" style={{ color: "#7a2f2a", fontWeight: 600 }}>
                  {currency(-sepProgress.remaining)} over this estimate -- talk to your plan administrator before
                  contributing more.
                </p>
              ) : (
                <>
                  <p className="text-sm m-0" style={{ color: "color-mix(in srgb, var(--color-text) 76%, transparent)" }}>
                    Room left: <strong>{currency(sepProgress.remaining)}</strong>
                  </p>
                  {sepProgress.remaining > 0 && (
                    <p className="text-sm mt-1 mb-0" style={{ color: "var(--color-accent-700)", fontWeight: 600 }}>
                      About {currency(sepProgress.monthlyToHitTarget)}/mo for the rest of {new Date().getFullYear()} to hit it
                    </p>
                  )}
                </>
              )}
            </div>
          </Card>

          <Card style={{ padding: "26px 28px" }}>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 18, display: "block", marginBottom: 6 }}>Solo 401k</span>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 30, fontWeight: 600, display: "block", marginBottom: 14 }}>
              {currency(solo401k.total)}
            </span>
            <ul style={{ fontSize: 14, lineHeight: 2, margin: 0, paddingLeft: 18, color: "color-mix(in srgb, var(--color-text) 76%, transparent)" }}>
              <li>Employee deferral: <strong>{currency(solo401k.employeeDeferral)}</strong></li>
              <li>Employer/profit-share: <strong>{currency(solo401k.employerContribution)}</strong></li>
              <li>Overall dollar cap: <strong>{currency(solo401k.cap)}</strong></li>
            </ul>
            {solo401k.cappedByAnnualLimit && (
              <p className="text-xs mt-3" style={{ color: "var(--color-accent-700)" }}>
                Capped by the overall annual limit.
              </p>
            )}
            <label className="text-xs flex flex-col gap-1 mt-4" style={{ maxWidth: 220, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
              Already contributed to this Solo 401k
              <span style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontFamily: "var(--font-heading)", fontSize: 16, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>$</span>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={solo401kContributed}
                  onChange={(e) => setSolo401kContributed(Math.max(0, Number(e.target.value) || 0))}
                  style={ledgerInputStyle({ fontSize: 15, width: 100 })}
                />
              </span>
            </label>
            <div style={{ borderTop: "1px solid var(--color-divider)", marginTop: 16, paddingTop: 14 }}>
              {solo401kProgress.overContributed ? (
                <p className="text-sm m-0" style={{ color: "#7a2f2a", fontWeight: 600 }}>
                  {currency(-solo401kProgress.remaining)} over this estimate -- talk to your plan administrator
                  before contributing more.
                </p>
              ) : (
                <>
                  <p className="text-sm m-0" style={{ color: "color-mix(in srgb, var(--color-text) 76%, transparent)" }}>
                    Room left: <strong>{currency(solo401kProgress.remaining)}</strong>
                  </p>
                  {solo401kProgress.remaining > 0 && (
                    <p className="text-sm mt-1 mb-0" style={{ color: "var(--color-accent-700)", fontWeight: 600 }}>
                      About {currency(solo401kProgress.monthlyToHitTarget)}/mo for the rest of {new Date().getFullYear()} to hit it
                    </p>
                  )}
                </>
              )}
            </div>
          </Card>
        </div>
        <p className="text-xs mt-3" style={{ color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}>
          The monthly amounts above are a general estimate to help you plan, not financial or tax advice.
        </p>

        <p className="text-sm mt-4" style={{ color: "color-mix(in srgb, var(--color-text) 76%, transparent)" }}>
          {solo401k.total > sep.contribution
            ? `A Solo 401k gives you ${currency(solo401k.total - sep.contribution)} more room here, mainly because of the separate employee deferral on top of the employer share.`
            : `These come out close to even at this income -- a SEP IRA is simpler to administer if you'd rather skip the extra paperwork a Solo 401k needs.`}
        </p>

        <Card style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", padding: "18px 22px", margin: "24px 0 20px" }}>
          <p className="text-sm m-0" style={{ color: "color-mix(in srgb, var(--color-text) 76%, transparent)" }}>
            Want this contributed automatically every time you get paid?
          </p>
          <PrimaryButton onClick={() => router.push("/signup")}>
            Get started free <ArrowRight size={14} />
          </PrimaryButton>
        </Card>

        <p className="text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 45%, transparent)" }}>
          Estimate only, based on 2026 IRS limits. Not tax advice. Actual eligible contributions depend on plan
          documents and other real-world details a real accountant should confirm.
        </p>
      </div>
      <PublicFooter />
    </div>
  );
}
