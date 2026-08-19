"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import PersonaToggle from "@/components/PersonaToggle";
import { Card, PrimaryButton, currency } from "@/components/ui";
import { LEDGER_TOKENS, ledgerInputStyle, ledgerSelectStyle } from "@/lib/ledgerTheme";
import { calculateSepIra, calculateSolo401k, AGE_BRACKETS, BUSINESS_TYPES } from "@/lib/retirementCalculator";

// Solo 401k / SEP IRA access requires self-employment or business income --
// a W2-only employee simply isn't eligible for either plan, so unlike the
// other calculators this one only ever shows two persona options.
const PERSONAS = [
  { value: "self_employed", label: "Self-employed" },
  { value: "business_owner", label: "Business owner" },
];

export default function RetirementCalculatorPublicClient() {
  const router = useRouter();
  const [persona, setPersona] = useState("self_employed");
  const [businessType, setBusinessType] = useState(BUSINESS_TYPES[0].value);
  const [netIncome, setNetIncome] = useState(90000);
  const [ageBracket, setAgeBracket] = useState("under50");
  const [otherPlanDeferralYTD, setOtherPlanDeferralYTD] = useState(0);

  const handlePersonaChange = (p) => {
    setPersona(p);
    setBusinessType(p === "business_owner" ? "corp" : "self_employed");
  };

  const sep = useMemo(() => calculateSepIra({ netIncome, businessType }), [netIncome, businessType]);
  const solo401k = useMemo(
    () => calculateSolo401k({ netIncome, businessType, ageBracket, otherPlanDeferralYTD }),
    [netIncome, businessType, ageBracket, otherPlanDeferralYTD]
  );

  return (
    <div style={LEDGER_TOKENS}>
      <PublicHeader />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px clamp(18px, 4vw, 40px) 80px" }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(30px, 4vw, 40px)", fontWeight: 400, margin: "0 0 10px" }}>
          Solo 401k vs SEP IRA Calculator
        </h1>
        <p className="text-sm" style={{ maxWidth: 600, color: "color-mix(in srgb, var(--color-text) 76%, transparent)", margin: "0 0 32px" }}>
          See how much room you actually have in each for 2026, side by side. Free, no account needed -- for
          self-employed people and business owners only, since W2 employees don't have access to either plan.
        </p>

        <Card style={{ padding: "24px 26px", marginBottom: 24 }}>
          <PersonaToggle value={persona} onChange={handlePersonaChange} options={PERSONAS} />

          <div className="flex gap-6 flex-wrap items-end mb-2">
            <label className="text-xs flex flex-col gap-1" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
              Net income, annual
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

            <label className="text-xs flex flex-col gap-1" style={{ maxWidth: 260, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
              How you're taxed
              <select value={businessType} onChange={(e) => setBusinessType(e.target.value)} style={ledgerSelectStyle({ fontSize: 13 })}>
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

            <label className="text-xs flex flex-col gap-1" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
              Already deferred elsewhere this year (e.g. a W2 job's 401k)
              <span style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontFamily: "var(--font-heading)", fontSize: 16, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>$</span>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={otherPlanDeferralYTD}
                  onChange={(e) => setOtherPlanDeferralYTD(Math.max(0, Number(e.target.value) || 0))}
                  style={ledgerInputStyle({ fontSize: 15, width: 100 })}
                />
              </span>
            </label>
          </div>
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
          </Card>
        </div>

        <p className="text-sm mt-6" style={{ color: "color-mix(in srgb, var(--color-text) 76%, transparent)" }}>
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
          Estimate only, based on 2026 IRS limits -- not tax advice. Actual eligible contributions depend on plan
          documents and other real-world details a real accountant should confirm.
        </p>
      </div>
    </div>
  );
}
