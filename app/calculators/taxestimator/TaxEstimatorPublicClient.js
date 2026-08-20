"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PublicHeader from "@/components/PublicHeader";
import PersonaToggle from "@/components/PersonaToggle";
import { Card, PrimaryButton, GhostButton, currency } from "@/components/ui";
import { LEDGER_TOKENS, ledgerInputStyle, ledgerSelectStyle } from "@/lib/ledgerTheme";
import {
  FILING_STATUSES,
  estimateSelfEmployedTax,
  estimateBusinessOwnerTax,
  estimateW2Tax,
} from "@/lib/federalTaxCalculator";
import { ArrowRight } from "lucide-react";

const pct = (n) => `${Math.round((n || 0) * 1000) / 10}%`;

export default function TaxEstimatorPublicClient() {
  const router = useRouter();
  const [persona, setPersona] = useState("self_employed");
  const [filingStatus, setFilingStatus] = useState("single");
  const [netIncome, setNetIncome] = useState(80000);
  const [businessProfit, setBusinessProfit] = useState(120000);
  const [wagesToSelf, setWagesToSelf] = useState(60000);
  const [grossSalary, setGrossSalary] = useState(80000);

  const result = useMemo(() => {
    if (persona === "self_employed") return estimateSelfEmployedTax({ netIncome, filingStatus });
    if (persona === "business_owner") return estimateBusinessOwnerTax({ businessProfit, wagesToSelf, filingStatus });
    return estimateW2Tax({ grossSalary, filingStatus });
  }, [persona, filingStatus, netIncome, businessProfit, wagesToSelf, grossSalary]);

  const setAsidePct = Math.min(60, Math.ceil((result.effectiveRate || 0) * 100) + 2);

  return (
    <div style={LEDGER_TOKENS}>
      <PublicHeader />
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "48px clamp(18px, 4vw, 40px) 80px" }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(30px, 4vw, 40px)", fontWeight: 400, margin: "0 0 10px" }}>
          Tax Reserve Estimator
        </h1>
        <p className="text-sm" style={{ maxWidth: 580, color: "color-mix(in srgb, var(--color-text) 76%, transparent)", margin: "0 0 32px" }}>
          Estimate your 2026 federal tax bill so you know how much to set aside for taxes if you're self employed
          or a business owner.
        </p>

        <Card style={{ padding: "24px 26px", marginBottom: 24 }}>
          <PersonaToggle value={persona} onChange={setPersona} />

          <label className="text-xs flex flex-col gap-1 mb-5" style={{ maxWidth: 260, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
            Filing status
            <select value={filingStatus} onChange={(e) => setFilingStatus(e.target.value)} style={ledgerSelectStyle({ fontSize: 14 })}>
              {FILING_STATUSES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>

          {persona === "self_employed" && (
            <label className="text-xs flex flex-col gap-1" style={{ maxWidth: 280, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
              Net self-employment income (after business expenses), annual
              <span style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontFamily: "var(--font-heading)", fontSize: 18, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>$</span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={netIncome}
                  onChange={(e) => setNetIncome(Math.max(0, Number(e.target.value) || 0))}
                  style={ledgerInputStyle({ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 600, width: 160 })}
                />
              </span>
            </label>
          )}

          {persona === "business_owner" && (
            <div className="flex gap-6 flex-wrap">
              <label className="text-xs flex flex-col gap-1" style={{ maxWidth: 260, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                Total business profit, annual
                <span style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{ fontFamily: "var(--font-heading)", fontSize: 18, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>$</span>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={businessProfit}
                    onChange={(e) => setBusinessProfit(Math.max(0, Number(e.target.value) || 0))}
                    style={ledgerInputStyle({ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 600, width: 150 })}
                  />
                </span>
              </label>
              <label className="text-xs flex flex-col gap-1" style={{ maxWidth: 260, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                What you pay yourself in W2 wages, annual
                <span style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{ fontFamily: "var(--font-heading)", fontSize: 18, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>$</span>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={wagesToSelf}
                    onChange={(e) => setWagesToSelf(Math.max(0, Number(e.target.value) || 0))}
                    style={ledgerInputStyle({ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 600, width: 150 })}
                  />
                </span>
              </label>
              <p className="text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 50%, transparent)", flexBasis: "100%", margin: 0 }}>
                The rest ({currency(result.draw || 0)}) is treated as an owner's draw / distribution -- not subject
                to payroll tax the way wages are.
              </p>
            </div>
          )}

          {persona === "w2" && (
            <label className="text-xs flex flex-col gap-1" style={{ maxWidth: 260, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
              Gross annual salary
              <span style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontFamily: "var(--font-heading)", fontSize: 18, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>$</span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={grossSalary}
                  onChange={(e) => setGrossSalary(Math.max(0, Number(e.target.value) || 0))}
                  style={ledgerInputStyle({ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 600, width: 160 })}
                />
              </span>
            </label>
          )}
        </Card>

        <Card style={{ padding: "26px 28px", marginBottom: 24 }}>
          <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4">
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 18 }}>Estimated federal tax</span>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 30, fontWeight: 600 }}>{currency(result.totalTax)}</span>
          </div>

          <ul style={{ fontSize: 14, lineHeight: 2, margin: "0 0 18px", paddingLeft: 18, color: "color-mix(in srgb, var(--color-text) 76%, transparent)" }}>
            {persona === "self_employed" && (
              <>
                <li>Self-employment tax (15.3%): <strong>{currency(result.seTax)}</strong></li>
                <li>Federal income tax: <strong>{currency(result.incomeTax)}</strong></li>
              </>
            )}
            {persona === "business_owner" && (
              <>
                <li>Payroll tax on wages (15.3% of {currency(result.wages)}): <strong>{currency(result.payrollTax)}</strong></li>
                <li>Federal income tax on wages + draw: <strong>{currency(result.incomeTax)}</strong></li>
              </>
            )}
            {persona === "w2" && <li>Federal income tax: <strong>{currency(result.incomeTax)}</strong></li>}
            <li>Effective rate: <strong>{pct(result.effectiveRate)}</strong> &middot; Marginal bracket: <strong>{pct(result.marginalRate)}</strong></li>
          </ul>

          {persona !== "w2" ? (
            <p className="text-sm m-0" style={{ color: "var(--color-accent-700)", fontWeight: 600 }}>
              Set aside about {setAsidePct}% of every payment to cover this.
            </p>
          ) : (
            <p className="text-sm m-0" style={{ color: "color-mix(in srgb, var(--color-text) 60%, transparent)" }}>
              Your employer withholds throughout the year. Compare this estimate to what's coming out of your
              paychecks to see if you're on track.
            </p>
          )}

          {persona === "business_owner" && result.potentialSavingsVsSelfEmployed > 100 && (
            <p className="text-sm mt-3" style={{ color: "color-mix(in srgb, var(--color-text) 60%, transparent)" }}>
              Running this same {currency(result.businessProfit)} as plain self-employment income (no wages/draw
              split) would cost about <strong>{currency(result.potentialSavingsVsSelfEmployed)} more</strong> in
              payroll/self-employment tax.
            </p>
          )}

          {result.overQbiThreshold && (
            <p className="text-xs mt-3" style={{ color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}>
              Heads up: at this income the 20% qualified business income deduction used here starts phasing out for
              some business types -- worth a real accountant's review at this level.
            </p>
          )}
        </Card>

        <Card style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", padding: "18px 22px", marginBottom: 20 }}>
          <p className="text-sm m-0" style={{ color: "color-mix(in srgb, var(--color-text) 76%, transparent)" }}>
            Want this set aside automatically every time you get paid?
          </p>
          <PrimaryButton onClick={() => router.push("/signup")}>
            Get started free <ArrowRight size={14} />
          </PrimaryButton>
        </Card>

        <p className="text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 45%, transparent)" }}>
          Estimate only, based on 2026 federal brackets and standard deductions -- not tax advice. Doesn't account
          for state tax, credits, itemized deductions, or other income. Talk to a real accountant for your specific
          situation.
        </p>
      </div>
    </div>
  );
}
