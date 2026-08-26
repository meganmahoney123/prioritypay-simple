"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import PersonaToggle from "@/components/PersonaToggle";
import { Card, PrimaryButton, currency } from "@/components/ui";
import { BLOOM_TOKENS, bloomSelectStyle } from "@/lib/bloomTheme";
import {
  FILING_STATUSES,
  estimateSelfEmployedTax,
  estimateBusinessOwnerTax,
  estimateW2Tax,
} from "@/lib/federalTaxCalculator";
import { ArrowRight } from "lucide-react";

// Shared field styling for the inputs card -- filled box (not a bare
// underline), $ prefix, fixed 56px height with margin-top: auto inside a
// stretched flex label so every control bottom-aligns on one baseline
// even when a neighboring label wraps to two lines (see spec 04's
// "baseline alignment" note -- the W2-wages label is the one that wraps).
function MoneyField({ label, value, onChange, width = 220 }) {
  return (
    <label
      className="flex flex-col gap-2"
      style={{ flex: "1 1 240px", fontSize: 15, fontWeight: 700, color: "var(--color-text)" }}
    >
      {label}
      <span
        style={{
          marginTop: "auto",
          height: 56,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          gap: 6,
          width,
          maxWidth: "100%",
          background: "var(--color-neutral-100)",
          border: "1px solid var(--color-neutral-300)",
          borderRadius: "var(--radius-sm)",
          padding: "0 16px",
        }}
      >
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 18, color: "var(--color-neutral-700)" }}>$</span>
        <input
          type="number"
          onFocus={(e) => e.target.select()}
          min={0}
          step={1000}
          value={value}
          onChange={onChange}
          style={{
            width: "100%",
            border: 0,
            background: "transparent",
            outline: "none",
            fontFamily: "var(--font-mono)",
            fontSize: 22,
            fontWeight: 800,
            color: "var(--color-text)",
          }}
        />
      </span>
    </label>
  );
}

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

  // Breakdown tiles vary by persona (spec 04): SE tax/income tax/effective
  // + marginal for self-employed; payroll tax/income tax/effective +
  // marginal for business owner; income tax/effective/marginal for W2.
  const tiles =
    persona === "self_employed"
      ? [
          { label: "SE tax (15.3%)", value: currency(result.seTax) },
          { label: "income tax", value: currency(result.incomeTax) },
          { label: "effective rate", value: pct(result.effectiveRate) },
          { label: "marginal bracket", value: pct(result.marginalRate) },
        ]
      : persona === "business_owner"
      ? [
          { label: `payroll tax on ${currency(result.wages)} wages`, value: currency(result.payrollTax) },
          { label: "income tax on wages + draw", value: currency(result.incomeTax) },
          { label: "effective rate", value: pct(result.effectiveRate) },
          { label: "marginal bracket", value: pct(result.marginalRate) },
        ]
      : [
          { label: "income tax", value: currency(result.incomeTax) },
          { label: "effective rate", value: pct(result.effectiveRate) },
          { label: "marginal bracket", value: pct(result.marginalRate) },
        ];

  return (
    <div style={BLOOM_TOKENS}>
      <PublicHeader />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px clamp(18px, 4vw, 40px) 80px" }}>
        <h1
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(38px, 4.6vw, 52px)",
            fontWeight: 800,
            letterSpacing: "-0.035em",
            lineHeight: 1.04,
            margin: "0 0 14px",
          }}
        >
          Tax Reserve Estimator
        </h1>
        <p style={{ fontSize: 19, lineHeight: 1.6, maxWidth: "42em", color: "var(--color-neutral-800)", margin: "0 0 32px" }}>
          Estimate your 2026 federal tax bill so you know how much to set aside for taxes if you're self employed
          or a business owner.
        </p>

        {/* Inputs card */}
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-divider)", borderRadius: 30, padding: 32, marginBottom: 28 }}>
          <PersonaToggle value={persona} onChange={setPersona} />

          <label
            className="flex flex-col gap-2 mb-5"
            style={{ maxWidth: 280, fontSize: 15, fontWeight: 700, color: "var(--color-text)" }}
          >
            Filing status
            <select value={filingStatus} onChange={(e) => setFilingStatus(e.target.value)} style={bloomSelectStyle({ height: 56, fontSize: 16 })}>
              {FILING_STATUSES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>

          {persona === "self_employed" && (
            <div className="flex gap-5 flex-wrap items-end">
              <MoneyField
                label="Net self-employment income (after business expenses), annual"
                value={netIncome}
                onChange={(e) => setNetIncome(Math.max(0, Number(e.target.value) || 0))}
                width={220}
              />
            </div>
          )}

          {persona === "business_owner" && (
            <div className="flex gap-5 flex-wrap items-end">
              <MoneyField
                label="Total business profit, annual"
                value={businessProfit}
                onChange={(e) => setBusinessProfit(Math.max(0, Number(e.target.value) || 0))}
                width={220}
              />
              <MoneyField
                label="What you pay yourself in W2 wages, annual"
                value={wagesToSelf}
                onChange={(e) => setWagesToSelf(Math.max(0, Number(e.target.value) || 0))}
                width={220}
              />
              <p
                style={{
                  flexBasis: "100%",
                  margin: "16px 0 0",
                  background: "var(--color-accent-100)",
                  borderRadius: 16,
                  padding: "14px 18px",
                  fontSize: 16,
                  lineHeight: 1.6,
                  color: "var(--color-neutral-800)",
                }}
              >
                The rest ({currency(result.draw || 0)}) is treated as an owner's draw / distribution -- not subject
                to payroll tax the way wages are.
              </p>
            </div>
          )}

          {persona === "w2" && (
            <div className="flex gap-5 flex-wrap items-end">
              <MoneyField
                label="Gross annual salary"
                value={grossSalary}
                onChange={(e) => setGrossSalary(Math.max(0, Number(e.target.value) || 0))}
                width={220}
              />
            </div>
          )}
        </div>

        {/* Result panel -- plum, white text, the main visual change */}
        <div style={{ background: "#3B1C7A", color: "#fff", borderRadius: 30, padding: 34, marginBottom: 28 }}>
          <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4">
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 18, fontWeight: 700, opacity: 0.85 }}>Estimated federal tax</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(40px, 5vw, 54px)", fontWeight: 800 }}>{currency(result.totalTax)}</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
            {tiles.map((t) => (
              <div key={t.label} style={{ background: "rgba(255,255,255,0.1)", borderRadius: 18, padding: "14px 16px" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 800 }}>{t.value}</div>
                <div style={{ fontSize: 14, fontWeight: 600, opacity: 0.8, marginTop: 4, textTransform: "capitalize" }}>{t.label}</div>
              </div>
            ))}
          </div>

          {persona !== "w2" ? (
            <div style={{ background: "#fff", borderRadius: 20, padding: "20px 24px", display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 34, fontWeight: 800, color: "#4E22B8" }}>{setAsidePct}%</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text)" }}>Set aside about this much of every payment to cover it.</span>
            </div>
          ) : (
            <p style={{ fontSize: 16, lineHeight: 1.6, opacity: 0.85, margin: "0 0 16px" }}>
              Your employer withholds throughout the year. Compare this estimate to what's coming out of your
              paychecks to see if you're on track.
            </p>
          )}

          {persona === "business_owner" && result.potentialSavingsVsSelfEmployed > 100 && (
            <p style={{ fontSize: 16, lineHeight: 1.6, opacity: 0.85, margin: "0 0 16px" }}>
              Running this same {currency(result.businessProfit)} as plain self-employment income (no wages/draw
              split) would cost about <strong>{currency(result.potentialSavingsVsSelfEmployed)} more</strong> in
              payroll/self-employment tax.
            </p>
          )}

          {result.overQbiThreshold && (
            <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 14, padding: "14px 16px", fontSize: 15, lineHeight: 1.6 }}>
              Heads up: at this income the 20% qualified business income deduction used here starts phasing out for
              some business types -- worth a real accountant's review at this level.
            </div>
          )}
        </div>

        {/* CTA banner */}
        <div style={{ background: "#EDE6FF", borderRadius: 26, padding: "28px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
          <p style={{ fontSize: 19, fontWeight: 700, margin: 0, color: "var(--color-text)" }}>
            Want this set aside automatically every time you get paid?
          </p>
          <PrimaryButton onClick={() => router.push("/signup")}>
            Get started free <ArrowRight size={14} />
          </PrimaryButton>
        </div>

        <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--color-neutral-700)" }}>
          Estimate only, based on 2026 federal brackets and standard deductions -- not tax advice. Doesn't account
          for state tax, credits, itemized deductions, or other income. Talk to a real accountant for your specific
          situation.
        </p>
      </div>
      <PublicFooter />
    </div>
  );
}
