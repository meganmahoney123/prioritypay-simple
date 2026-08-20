"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import { Card, PrimaryButton, currency } from "@/components/ui";
import { LEDGER_TOKENS, ledgerInputStyle } from "@/lib/ledgerTheme";

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

  return (
    <div style={LEDGER_TOKENS}>
      <PublicHeader />
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "48px clamp(18px, 4vw, 40px) 80px" }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(30px, 4vw, 40px)", fontWeight: 400, margin: "0 0 10px" }}>
          Compound Interest Calculator
        </h1>
        <p className="text-sm" style={{ maxWidth: 580, color: "color-mix(in srgb, var(--color-text) 76%, transparent)", margin: "0 0 32px" }}>
          See what investing a set amount every year -- in an index fund or anything else with a steady average
          return -- could grow into over time. Free, no account needed.
        </p>

        <Card style={{ padding: "24px 26px", marginBottom: 24 }}>
          <div className="flex gap-6 flex-wrap items-end mb-5">
            <label className="text-xs flex flex-col gap-1" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
              Starting amount
              <span style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontFamily: "var(--font-heading)", fontSize: 18, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>$</span>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={startingAmount}
                  onChange={(e) => setStartingAmount(Math.max(0, Number(e.target.value) || 0))}
                  style={ledgerInputStyle({ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 600, width: 130 })}
                />
              </span>
            </label>
            <label className="text-xs flex flex-col gap-1" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
              Amount you invest per year
              <span style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontFamily: "var(--font-heading)", fontSize: 18, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>$</span>
                <input
                  type="number"
                  min={0}
                  step={250}
                  value={annualContribution}
                  onChange={(e) => setAnnualContribution(Math.max(0, Number(e.target.value) || 0))}
                  style={ledgerInputStyle({ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 600, width: 130 })}
                />
              </span>
            </label>
            <label className="text-xs flex flex-col gap-1" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
              Years to grow
              <input
                type="number"
                min={1}
                max={60}
                step={1}
                value={years}
                onChange={(e) => setYears(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
                style={ledgerInputStyle({ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 600, width: 90 })}
              />
            </label>
          </div>

          <label className="text-xs flex flex-col gap-1" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
            Expected average annual return
          </label>
          <div className="flex gap-2 flex-wrap items-center mt-2">
            {RETURN_PRESETS.map((p) => {
              const active = Number(annualReturnRate) === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setAnnualReturnRate(p.value)}
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: 13,
                    fontWeight: 600,
                    padding: "8px 14px",
                    borderRadius: 999,
                    cursor: "pointer",
                    border: `1px solid ${active ? "var(--color-accent)" : "var(--color-divider)"}`,
                    background: active ? "var(--color-accent-100)" : "transparent",
                    color: active ? "var(--color-accent-800)" : "color-mix(in srgb, var(--color-text) 65%, transparent)",
                  }}
                >
                  {p.label}
                </button>
              );
            })}
            <label className="text-xs flex items-baseline gap-1" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
              or custom:
              <input
                type="number"
                min={0}
                max={30}
                step={0.5}
                value={annualReturnRate}
                onChange={(e) => setAnnualReturnRate(Math.max(0, Number(e.target.value) || 0))}
                style={ledgerInputStyle({ fontSize: 15, width: 64 })}
              />
              %
            </label>
          </div>
          <p className="text-xs mt-3 mb-0" style={{ maxWidth: 600, color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}>
            The S&amp;P 500 has averaged roughly 10% a year before inflation, or about 7% after inflation, over the
            long run -- past performance doesn't guarantee future returns, and any single year can be very different
            from the average.
          </p>
        </Card>

        <Card style={{ padding: "26px 28px", marginBottom: 24 }}>
          <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4">
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 18 }}>Balance after {years} years</span>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 30, fontWeight: 600 }}>{currency(result.balance)}</span>
          </div>
          <ul style={{ fontSize: 14, lineHeight: 2, margin: "0 0 4px", paddingLeft: 18, color: "color-mix(in srgb, var(--color-text) 76%, transparent)" }}>
            <li>Total you put in: <strong>{currency(result.totalContributed)}</strong></li>
            <li>Growth from returns: <strong>{currency(result.totalGrowth)}</strong></li>
            <li>Growth is <strong>{Math.round(growthShare * 100)}%</strong> of the final balance</li>
          </ul>
        </Card>

        <Card style={{ padding: "26px 28px", marginBottom: 24 }}>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 18, marginBottom: 4 }}>Growth over time</div>
          <p className="text-xs mb-4" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
            Contributions vs. growth, year by year.
          </p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 440, fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "8px 12px 8px 0", borderBottom: "1px solid var(--color-accent)", fontFamily: "var(--font-heading)", fontSize: 11.5, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>
                    Year
                  </th>
                  <th style={{ textAlign: "right", padding: "8px 12px", borderBottom: "1px solid var(--color-accent)", fontFamily: "var(--font-heading)", fontSize: 11.5, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>
                    Contributed
                  </th>
                  <th style={{ textAlign: "right", padding: "8px 12px", borderBottom: "1px solid var(--color-accent)", fontFamily: "var(--font-heading)", fontSize: 11.5, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>
                    Growth
                  </th>
                  <th style={{ textAlign: "right", padding: "8px 0 8px 12px", borderBottom: "1px solid var(--color-accent)", fontFamily: "var(--font-heading)", fontSize: 11.5, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.year}>
                    <td style={{ padding: "9px 12px 9px 0", borderBottom: "1px solid var(--color-divider)" }}>{r.year}</td>
                    <td style={{ textAlign: "right", padding: "9px 12px", borderBottom: "1px solid var(--color-divider)" }}>{currency(r.totalContributed)}</td>
                    <td style={{ textAlign: "right", padding: "9px 12px", borderBottom: "1px solid var(--color-divider)" }}>{currency(r.totalGrowth)}</td>
                    <td style={{ textAlign: "right", padding: "9px 0 9px 12px", borderBottom: "1px solid var(--color-divider)", fontWeight: 600 }}>{currency(r.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", padding: "18px 22px", marginBottom: 20 }}>
          <p className="text-sm m-0" style={{ color: "color-mix(in srgb, var(--color-text) 76%, transparent)" }}>
            Want your investing contribution set aside automatically every time you get paid?
          </p>
          <PrimaryButton onClick={() => router.push("/signup")}>
            Get started free <ArrowRight size={14} />
          </PrimaryButton>
        </Card>

        <p className="text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 45%, transparent)" }}>
          Estimate only. Assumes a steady annual return and contributions made at the start of each year -- real
          markets don't move in a straight line, and this isn't investment advice. Not adjusted for taxes or fees.
        </p>
      </div>
    </div>
  );
}
