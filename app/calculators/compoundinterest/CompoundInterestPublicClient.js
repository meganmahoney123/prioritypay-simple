"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { PrimaryButton, currency } from "@/components/ui";
import { BLOOM_TOKENS } from "@/lib/bloomTheme";

// No persona toggle here on purpose -- unlike the tax/emergency-fund/
// debt calculators, what compound growth does with a dollar doesn't
// depend on whether you're self-employed, a business owner, or W2.
//
// Contributions are added at the START of each year, then growth is
// applied to the whole balance for that year (the standard "annuity
// due" convention most retirement-savings estimates use, since it
// matches contributing early in the year rather than the very last
// day). Verified against the closed-form annuity-due formula
// FV = P * [((1+r)^n - 1)/r] * (1+r) -- exact match at $6,000/yr, 7%,
// 30 years ($606,438 both ways).
const RETURN_PRESETS = [
  { value: 5, label: "5% · conservative" },
  { value: 7, label: "7% · S&P 500, after inflation" },
  { value: 10, label: "10% · S&P 500, before inflation" },
];

function simulateGrowth({ startingAmount, annualContribution, annualReturnRate, years }) {
  let balance = Math.max(0, Number(startingAmount) || 0);
  let totalContributed = balance;
  const rate = (Number(annualReturnRate) || 0) / 100;
  const n = Math.max(0, Math.round(Number(years) || 0));
  const rows = [];
  for (let y = 1; y <= n; y++) {
    balance += Math.max(0, Number(annualContribution) || 0);
    totalContributed += Math.max(0, Number(annualContribution) || 0);
    balance += balance * rate;
    rows.push({ year: y, balance, totalContributed, totalGrowth: balance - totalContributed });
  }
  return { balance, totalContributed, totalGrowth: balance - totalContributed, rows };
}

// Keeps a long table from getting unwieldy -- year 1, then every 5th
// year, and always the final year even if it doesn't land on a multiple
// of 5.
function tableRows(rows) {
  if (rows.length === 0) return [];
  const picked = rows.filter((r) => r.year === 1 || r.year % 5 === 0);
  const last = rows[rows.length - 1];
  if (picked[picked.length - 1]?.year !== last.year) picked.push(last);
  return picked;
}

function MoneyField({ label, value, onChange, width = 130, promoted, suffix, step = 500, min = 0, max }) {
  return (
    <label className="flex flex-col gap-2" style={{ color: "var(--color-text)" }}>
      <span style={{ fontSize: 15, fontWeight: 700 }}>{label}</span>
      <span
        style={{
          marginTop: "auto",
          height: 56,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: promoted ? "var(--color-accent-100)" : "var(--color-neutral-100)",
          border: `${promoted ? 2 : 1}px solid ${promoted ? "var(--color-accent-400)" : "var(--color-neutral-300)"}`,
          borderRadius: 16,
          padding: "0 16px",
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 700, color: promoted ? "var(--color-accent-700)" : "var(--color-neutral-700)" }}>$</span>
        <input
          type="number"
          onFocus={(e) => e.target.select()}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={onChange}
          style={{
            width,
            fontSize: 20,
            fontWeight: 800,
            color: "var(--color-text)",
            background: "none",
            border: 0,
            padding: 0,
            outline: "none",
            fontFamily: "var(--font-mono)",
          }}
        />
        {suffix && <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-neutral-700)" }}>{suffix}</span>}
      </span>
    </label>
  );
}

export default function CompoundInterestPublicClient() {
  const router = useRouter();
  const [startingAmount, setStartingAmount] = useState(1000);
  const [annualContribution, setAnnualContribution] = useState(6000);
  const [annualReturnRate, setAnnualReturnRate] = useState(7);
  const [years, setYears] = useState(30);

  const result = useMemo(
    () => simulateGrowth({ startingAmount, annualContribution, annualReturnRate, years }),
    [startingAmount, annualContribution, annualReturnRate, years]
  );
  const rows = useMemo(() => tableRows(result.rows), [result.rows]);
  const growthShare = result.balance > 0 ? result.totalGrowth / result.balance : 0;
  const contributedPct = Math.min(100, Math.max(0, (1 - growthShare) * 100));

  const tiles = [
    { value: currency(result.totalContributed), label: "Total you put in" },
    { value: currency(result.totalGrowth), label: "Growth from returns" },
    { value: `${Math.round(growthShare * 100)}%`, label: "Growth as % of final balance" },
  ];

  return (
    <div style={BLOOM_TOKENS}>
      <PublicHeader />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "56px clamp(18px, 4vw, 28px) 96px" }}>
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
          Compound Interest Calculator
        </h1>
        <p style={{ fontSize: 19, lineHeight: 1.6, color: "var(--color-neutral-800)", margin: "0 0 36px", maxWidth: "42em" }}>
          See what investing a set amount every year, in an index fund or anything else with a steady average
          return, could grow into over time. Free, no account needed.
        </p>

        {/* Inputs card */}
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-divider)", borderRadius: 30, padding: 32 }}>
          <div className="flex gap-5 flex-wrap items-end">
            <MoneyField label="Starting amount" value={startingAmount} onChange={(e) => setStartingAmount(Math.max(0, Number(e.target.value) || 0))} width={130} step={500} />

            <label className="flex flex-col gap-2" style={{ color: "var(--color-text)" }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>Amount you invest</span>
              <span className="flex items-center gap-2 flex-wrap" style={{ marginTop: "auto" }}>
                <span
                  style={{
                    height: 56,
                    boxSizing: "border-box",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "var(--color-accent-100)",
                    border: "2px solid var(--color-accent-400)",
                    borderRadius: 16,
                    padding: "0 16px",
                  }}
                >
                  <span style={{ fontSize: 18, fontWeight: 700, color: "var(--color-accent-700)" }}>$</span>
                  <input
                    type="number"
                    onFocus={(e) => e.target.select()}
                    min={0}
                    step={250}
                    value={annualContribution}
                    onChange={(e) => setAnnualContribution(Math.max(0, Number(e.target.value) || 0))}
                    style={{
                      width: 110,
                      fontSize: 20,
                      fontWeight: 800,
                      color: "var(--color-text)",
                      background: "none",
                      border: 0,
                      padding: 0,
                      outline: "none",
                      fontFamily: "var(--font-mono)",
                    }}
                  />
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-accent-700)" }}>/yr</span>
                </span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-neutral-700)" }}>or</span>
                <span
                  style={{
                    height: 56,
                    boxSizing: "border-box",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "var(--color-accent-100)",
                    border: "2px solid var(--color-accent-400)",
                    borderRadius: 16,
                    padding: "0 16px",
                  }}
                >
                  <span style={{ fontSize: 18, fontWeight: 700, color: "var(--color-accent-700)" }}>$</span>
                  <input
                    type="number"
                    onFocus={(e) => e.target.select()}
                    min={0}
                    step={25}
                    value={Math.round(annualContribution / 12)}
                    onChange={(e) => setAnnualContribution(Math.max(0, Number(e.target.value) || 0) * 12)}
                    style={{
                      width: 100,
                      fontSize: 20,
                      fontWeight: 800,
                      color: "var(--color-text)",
                      background: "none",
                      border: 0,
                      padding: 0,
                      outline: "none",
                      fontFamily: "var(--font-mono)",
                    }}
                  />
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-accent-700)" }}>/mo</span>
                </span>
              </span>
            </label>

            <label className="flex flex-col gap-2" style={{ color: "var(--color-text)" }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>Years to grow</span>
              <span
                style={{
                  marginTop: "auto",
                  height: 56,
                  boxSizing: "border-box",
                  display: "flex",
                  alignItems: "center",
                  background: "var(--color-neutral-100)",
                  border: "1px solid var(--color-neutral-300)",
                  borderRadius: 16,
                  padding: "0 16px",
                }}
              >
                <input
                  type="number"
                  onFocus={(e) => e.target.select()}
                  min={1}
                  max={60}
                  step={1}
                  value={years}
                  onChange={(e) => setYears(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
                  style={{
                    width: 90,
                    fontSize: 20,
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
          </div>

          <div style={{ marginTop: 28 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text)", marginBottom: 12 }}>Expected average annual return</div>
            <div className="flex gap-2 flex-wrap items-center">
              {RETURN_PRESETS.map((p) => {
                const active = Number(annualReturnRate) === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setAnnualReturnRate(p.value)}
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      padding: "13px 20px",
                      borderRadius: 999,
                      cursor: "pointer",
                      border: `2px solid ${active ? "var(--color-accent)" : "var(--color-neutral-300)"}`,
                      background: active ? "var(--color-accent)" : "var(--color-surface)",
                      color: active ? "#fff" : "#3B1C7A",
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
              <label className="flex items-baseline gap-2" style={{ fontSize: 15, fontWeight: 600, color: "var(--color-neutral-800)" }}>
                or custom:
                <span
                  style={{
                    height: 44,
                    boxSizing: "border-box",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    background: "var(--color-neutral-100)",
                    border: "1px solid var(--color-neutral-300)",
                    borderRadius: 14,
                    padding: "0 12px",
                  }}
                >
                  <input
                    type="number"
                    onFocus={(e) => e.target.select()}
                    min={0}
                    max={30}
                    step={0.5}
                    value={annualReturnRate}
                    onChange={(e) => setAnnualReturnRate(Math.max(0, Number(e.target.value) || 0))}
                    style={{
                      width: 50,
                      fontSize: 16,
                      fontWeight: 800,
                      color: "var(--color-text)",
                      background: "none",
                      border: 0,
                      padding: 0,
                      outline: "none",
                      fontFamily: "var(--font-mono)",
                    }}
                  />
                  <span>%</span>
                </span>
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
                marginTop: 16,
                maxWidth: "60em",
              }}
            >
              The S&amp;P 500 has averaged roughly 10% a year before inflation, or about 7% after inflation, over the
              long run. Past performance doesn't guarantee future returns, and any single year can be very different
              from the average.
            </p>
          </div>
        </div>

        {/* Result panel -- plum */}
        <div style={{ background: "#3B1C7A", color: "#fff", borderRadius: 30, padding: 34, marginTop: 20 }}>
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 18, fontWeight: 700, opacity: 0.85 }}>
              Balance after {years} years
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(40px, 5vw, 54px)", fontWeight: 800 }}>
              {currency(result.balance)}
            </span>
          </div>

          {/* Contribution-vs-growth split bar */}
          <div style={{ marginTop: 22 }}>
            <div style={{ height: 18, borderRadius: 999, overflow: "hidden", display: "flex" }}>
              <div style={{ width: `${contributedPct}%`, background: "#C4A9FA" }} />
              <div style={{ width: `${100 - contributedPct}%`, background: "#fff" }} />
            </div>
            <div className="flex items-center gap-5" style={{ marginTop: 10, fontSize: 14, fontWeight: 600, opacity: 0.9 }}>
              <span className="flex items-center gap-2">
                <span style={{ width: 10, height: 10, borderRadius: 999, background: "#C4A9FA", display: "inline-block" }} />
                What you put in
              </span>
              <span className="flex items-center gap-2">
                <span style={{ width: 10, height: 10, borderRadius: 999, background: "#fff", display: "inline-block" }} />
                Growth
              </span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginTop: 22 }}>
            {tiles.map((t) => (
              <div key={t.label} style={{ background: "rgba(255,255,255,0.1)", borderRadius: 18, padding: 18 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>{t.value}</div>
                <div style={{ fontSize: 14, fontWeight: 600, opacity: 0.8, marginTop: 6, lineHeight: 1.4 }}>{t.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Growth over time */}
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-divider)", borderRadius: 30, padding: 32, marginTop: 20 }}>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Growth over time</div>
          <p style={{ fontSize: 15, color: "var(--color-neutral-800)", marginBottom: 18 }}>
            Contributions vs. growth, year by year.
          </p>
          <div className="flex flex-col gap-2">
            <div className="flex gap-4" style={{ padding: "0 16px 6px" }}>
              <span style={{ flex: "0 0 60px", fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>
                Year
              </span>
              <span style={{ flex: 1, textAlign: "right", fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>
                Contributed
              </span>
              <span style={{ flex: 1, textAlign: "right", fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>
                Growth
              </span>
              <span style={{ flex: 1, textAlign: "right", fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>
                Balance
              </span>
            </div>
            {rows.map((r) => (
              <div
                key={r.year}
                className="flex items-center gap-4"
                style={{ background: "var(--color-neutral-100)", borderRadius: 16, padding: "14px 16px" }}
              >
                <span style={{ flex: "0 0 60px", fontSize: 15, color: "var(--color-text)" }}>{r.year}</span>
                <span style={{ flex: 1, textAlign: "right", fontSize: 15, fontFamily: "var(--font-mono)", color: "var(--color-text)" }}>
                  {currency(r.totalContributed)}
                </span>
                <span style={{ flex: 1, textAlign: "right", fontSize: 15, fontFamily: "var(--font-mono)", color: "var(--color-accent-700)" }}>
                  {currency(r.totalGrowth)}
                </span>
                <span style={{ flex: 1, textAlign: "right", fontSize: 15, fontWeight: 800, fontFamily: "var(--font-mono)", color: "var(--color-text)" }}>
                  {currency(r.balance)}
                </span>
              </div>
            ))}
          </div>
        </div>

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
            Want your investing contribution set aside automatically every time you get paid?
          </p>
          <PrimaryButton onClick={() => router.push("/signup")}>
            Get started free <ArrowRight size={14} />
          </PrimaryButton>
        </div>

        <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--color-neutral-700)", margin: "22px 0 0" }}>
          Estimate only. Assumes a steady annual return and contributions made at the start of each year -- real
          markets don't move in a straight line, and this isn't investment advice. Not adjusted for taxes or fees.
        </p>
      </div>
      <PublicFooter />
    </div>
  );
}
