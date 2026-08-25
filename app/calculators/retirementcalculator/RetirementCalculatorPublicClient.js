"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { PrimaryButton, currency } from "@/components/ui";
import { BLOOM_TOKENS, bloomSelectStyle } from "@/lib/bloomTheme";
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
  const soloBigger = solo401k.total > sep.contribution;

  const plans = [
    {
      key: "sep",
      name: "SEP IRA",
      total: sep.contribution,
      isBigger: !soloBigger && sep.contribution > 0,
      lines: [
        { label: "Structure", value: "Employer only" },
        { label: "Compensation base", value: currency(sep.compensation) },
        { label: "Annual dollar cap", value: currency(sep.cap) },
      ],
      capped: sep.cappedByAnnualLimit,
      cappedNote: `Capped by the annual dollar limit -- the uncapped 20-25% formula would allow ${currency(sep.uncappedContribution)}.`,
      contributedLabel: "Already contributed to this SEP IRA",
      contributed: sepContributed,
      onContributed: (e) => setSepContributed(Math.max(0, Number(e.target.value) || 0)),
      progress: sepProgress,
    },
    {
      key: "solo401k",
      name: "Solo 401k",
      total: solo401k.total,
      isBigger: soloBigger,
      lines: [
        { label: "Employee deferral", value: currency(solo401k.employeeDeferral) },
        { label: "Employer/profit-share", value: currency(solo401k.employerContribution) },
        { label: "Overall dollar cap", value: currency(solo401k.cap) },
      ],
      capped: solo401k.cappedByAnnualLimit,
      cappedNote: "Capped by the overall annual limit.",
      contributedLabel: "Already contributed to this Solo 401k",
      contributed: solo401kContributed,
      onContributed: (e) => setSolo401kContributed(Math.max(0, Number(e.target.value) || 0)),
      progress: solo401kProgress,
    },
  ];

  return (
    <div style={BLOOM_TOKENS}>
      <PublicHeader />
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "56px clamp(18px, 4vw, 28px) 96px" }}>
        <h1
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(38px, 4.6vw, 52px)",
            lineHeight: 1.04,
            letterSpacing: "-0.035em",
            fontWeight: 800,
            margin: "0 0 16px",
          }}
        >
          Solo 401k + SEP IRA Calculator
        </h1>
        <p style={{ fontSize: 19, lineHeight: 1.6, color: "var(--color-neutral-800)", margin: "0 0 36px", maxWidth: "42em" }}>
          See how much room you actually have in each for 2026, side by side. Free, no account needed -- for
          self-employed people and business owners only, since W2 employees don't have access to either plan.
        </p>

        {/* Inputs card */}
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-divider)", borderRadius: 30, padding: 32 }}>
          <div className="flex gap-5 flex-wrap">
            <label className="flex flex-col gap-2" style={{ flex: "1 1 220px" }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text)" }}>Expected net income, annual</span>
              <span
                style={{
                  marginTop: "auto",
                  height: 56,
                  boxSizing: "border-box",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "var(--color-neutral-100)",
                  border: "1px solid var(--color-neutral-300)",
                  borderRadius: 16,
                  padding: "0 16px",
                }}
              >
                <span style={{ fontSize: 19, fontWeight: 700, color: "var(--color-neutral-700)" }}>$</span>
                <input
                  type="number"
                  onFocus={(e) => e.target.select()}
                  min={0}
                  step={1000}
                  value={netIncome}
                  onChange={(e) => setNetIncome(Math.max(0, Number(e.target.value) || 0))}
                  style={{
                    flex: 1,
                    width: "100%",
                    fontSize: 22,
                    fontWeight: 800,
                    color: "var(--color-text)",
                    background: "none",
                    border: 0,
                    padding: 0,
                    outline: "none",
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "-0.02em",
                  }}
                />
              </span>
            </label>

            <label className="flex flex-col gap-2" style={{ flex: "2 1 320px" }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text)" }}>How you're taxed</span>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                style={bloomSelectStyle({ marginTop: "auto", height: 56, fontSize: 16, borderRadius: 16 })}
              >
                {BUSINESS_TYPES.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2" style={{ flex: "1 1 180px" }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text)" }}>Age bracket</span>
              <select
                value={ageBracket}
                onChange={(e) => setAgeBracket(e.target.value)}
                style={bloomSelectStyle({ marginTop: "auto", height: 56, fontSize: 16, borderRadius: 16 })}
              >
                {AGE_BRACKETS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p
            style={{
              fontSize: 16,
              lineHeight: 1.6,
              color: "var(--color-neutral-800)",
              background: "var(--color-accent-100)",
              borderRadius: 16,
              padding: "15px 18px",
              margin: "20px 0 0",
            }}
          >
            Just your self-employment or business net income -- if you also have a W2 job, don't include those wages
            here.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", marginTop: 20 }}>
          {plans.map((p) => (
            <div
              key={p.key}
              style={{
                background: p.isBigger ? "#F7F3FF" : "var(--color-neutral-100)",
                border: `1px solid ${p.isBigger ? "#D9C9FF" : "var(--color-divider)"}`,
                borderRadius: 30,
                padding: 30,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div className="flex items-center gap-3">
                <span style={{ flex: 1, fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>{p.name}</span>
                {p.isBigger && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "#fff",
                      background: "var(--color-accent)",
                      borderRadius: 999,
                      padding: "5px 10px",
                    }}
                  >
                    More room
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: "clamp(34px, 4vw, 44px)",
                  fontWeight: 800,
                  letterSpacing: "-0.035em",
                  color: "#3B1C7A",
                  margin: "10px 0 20px",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {currency(p.total)}
              </div>

              <div className="flex flex-col gap-2">
                {p.lines.map((l) => (
                  <div
                    key={l.label}
                    className="flex items-baseline justify-between gap-3"
                    style={{ background: "var(--color-surface)", borderRadius: 14, padding: "13px 16px" }}
                  >
                    <span style={{ fontSize: 15, color: "var(--color-neutral-800)" }}>{l.label}</span>
                    <span style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-mono)" }}>{l.value}</span>
                  </div>
                ))}
              </div>

              {p.capped && (
                <p
                  style={{
                    fontSize: 15,
                    lineHeight: 1.55,
                    fontWeight: 600,
                    color: "var(--color-accent-700)",
                    background: "var(--color-accent-200)",
                    borderRadius: 14,
                    padding: "13px 16px",
                    margin: "12px 0 0",
                  }}
                >
                  {p.cappedNote}
                </p>
              )}

              <label className="flex flex-col gap-2" style={{ marginTop: 20 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text)" }}>{p.contributedLabel}</span>
                <span
                  style={{
                    height: 52,
                    boxSizing: "border-box",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-neutral-300)",
                    borderRadius: 14,
                    padding: "0 16px",
                  }}
                >
                  <span style={{ fontSize: 17, fontWeight: 700, color: "var(--color-neutral-700)" }}>$</span>
                  <input
                    type="number"
                    onFocus={(e) => e.target.select()}
                    min={0}
                    step={500}
                    value={p.contributed}
                    onChange={p.onContributed}
                    style={{
                      flex: 1,
                      width: "100%",
                      fontSize: 19,
                      fontWeight: 800,
                      color: "var(--color-text)",
                      background: "none",
                      border: 0,
                      padding: 0,
                      outline: "none",
                      fontFamily: "var(--font-mono)",
                    }}
                  />
                </span>
              </label>

              <div style={{ marginTop: "auto", paddingTop: 20 }}>
                {p.progress.overContributed ? (
                  <p
                    style={{
                      fontSize: 16,
                      lineHeight: 1.55,
                      fontWeight: 700,
                      color: "#9C3B22",
                      background: "#FBEEEA",
                      borderRadius: 16,
                      padding: "15px 18px",
                      margin: 0,
                    }}
                  >
                    {currency(-p.progress.remaining)} over this estimate -- talk to your plan administrator before
                    contributing more.
                  </p>
                ) : (
                  <div style={{ background: "#3B1C7A", color: "#fff", borderRadius: 20, padding: "20px 22px" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.75 }}>
                      Room left
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.025em", margin: "6px 0 0", fontFamily: "var(--font-mono)" }}>
                      {currency(p.progress.remaining)}
                    </div>
                    {p.progress.remaining > 0 && (
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#C4A9FA", marginTop: 10 }}>
                        About {currency(p.progress.monthlyToHitTarget)}/mo for the rest of {new Date().getFullYear()} to hit it
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--color-neutral-700)", margin: "16px 0 0" }}>
          The monthly amounts above are a general estimate to help you plan, not financial or tax advice.
        </p>

        <p
          style={{
            fontSize: 18,
            lineHeight: 1.6,
            color: "var(--color-text)",
            fontWeight: 600,
            background: "var(--color-surface)",
            border: "1px solid var(--color-divider)",
            borderRadius: 22,
            padding: "22px 24px",
            margin: "20px 0 0",
          }}
        >
          {soloBigger
            ? `A Solo 401k gives you ${currency(solo401k.total - sep.contribution)} more room here, mainly because of the separate employee deferral on top of the employer share.`
            : `These come out close to even at this income -- a SEP IRA is simpler to administer if you'd rather skip the extra paperwork a Solo 401k needs.`}
        </p>

        {/* CTA banner */}
        <div
          style={{
            background: "#EDE6FF",
            borderRadius: 26,
            padding: "28px 32px",
            marginTop: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <p style={{ fontSize: 19, fontWeight: 700, margin: 0, color: "var(--color-text)" }}>
            Want this contributed automatically every time you get paid?
          </p>
          <PrimaryButton onClick={() => router.push("/signup")}>
            Get started free <ArrowRight size={14} />
          </PrimaryButton>
        </div>

        <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--color-neutral-700)", margin: "22px 0 0" }}>
          Estimate only, based on 2026 IRS limits. Not tax advice. Actual eligible contributions depend on plan
          documents and other real-world details a real accountant should confirm.
        </p>
      </div>
      <PublicFooter />
    </div>
  );
}
