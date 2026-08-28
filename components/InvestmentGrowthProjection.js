"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui";
import { bloomInputStyle } from "@/lib/bloomTheme";
import { currency } from "@/lib/allocations";

// Forward-looking "what could this become" projection card, deliberately
// separate from AccountBalances' two pie charts (which only ever look
// backward at real history) -- this is the Dashboard's one section that
// projects forward. Scoped to Investments + Retirement only, blended into
// a single number per lib/api/allocations/investment-projection/route.js
// (never Tax Reserve, Savings, Emergency Fund, or OPEX).
//
// Three shades of purple from the app's existing Bloom palette
// (lib/bloomTheme.js / PriorityPayLogo.js), darkest -> lightest tracking
// scenario 1 -> 3 so the bars visually read as "least" to "most":
const COLOR_STARTING = "#3B1C7A"; // scenario 1: starting balance only
const COLOR_FROZEN = "#6D3BE0"; // scenario 2: what's been invested so far, frozen
const COLOR_ONGOING = "#9A72F0"; // scenario 3: current + ongoing monthly contributions

const YEARS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
const DEFAULT_RATE_PCT = 7;

function futureValue(principal, monthlyRate, months) {
  return principal * Math.pow(1 + monthlyRate, months);
}

function futureValueWithContributions(principal, monthlyRate, months, monthlyContribution) {
  const growthOfPrincipal = futureValue(principal, monthlyRate, months);
  const annuity =
    monthlyRate === 0
      ? monthlyContribution * months
      : monthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
  return growthOfPrincipal + annuity;
}

export default function InvestmentGrowthProjection() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [ratePct, setRatePct] = useState(DEFAULT_RATE_PCT);

  useEffect(() => {
    fetch("/api/allocations/investment-projection")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const chartData = useMemo(() => {
    if (!data) return [];
    const monthlyRate = (Number(ratePct) || 0) / 100 / 12;
    return YEARS.map((years) => {
      const months = years * 12;
      return {
        year: years,
        label: `Yr ${years}`,
        startingOnly: futureValue(data.startingOnly, monthlyRate, months),
        currentTotalFrozen: futureValue(data.currentTotalFrozen, monthlyRate, months),
        currentTotalPlusOngoing: futureValueWithContributions(
          data.currentTotalFrozen,
          monthlyRate,
          months,
          data.monthlyContribution
        ),
      };
    });
  }, [data, ratePct]);

  if (loading) {
    return (
      <Card className="p-5" style={{ borderRadius: 26, background: "var(--color-surface)" }}>
        <p className="text-sm text-neutral-400">Loading…</p>
      </Card>
    );
  }

  const isEmpty =
    !data ||
    !data.hasGroupedCategories ||
    (data.startingOnly === 0 && data.currentTotalFrozen === 0 && !data.isRealAverage);

  return (
    <Card className="p-5" style={{ borderRadius: 26, background: "var(--color-surface)" }}>
      <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 700, color: "var(--color-text)", margin: "0 0 4px" }}>
        Where your investments could go
      </h2>
      <p className="text-xs text-neutral-500 mb-4">
        A projection of your Investments and Retirement categories, combined, if their growth compounds monthly.
      </p>

      {isEmpty ? (
        <p className="text-sm text-neutral-400">
          Once you&apos;re contributing to Investments or Retirement, we&apos;ll show you where that could grow.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-4">
            <label htmlFor="pp-growth-rate" className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
              Assumed annual return
            </label>
            <input
              id="pp-growth-rate"
              type="number"
              min={0}
              max={30}
              step={0.5}
              value={ratePct}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setRatePct(e.target.value)}
              onBlur={(e) => setRatePct(Math.max(0, Math.min(30, Number(e.target.value) || 0)))}
              style={bloomInputStyle({ width: 80, padding: "8px 10px", fontFamily: "var(--font-mono)", textAlign: "right" })}
            />
            <span className="text-sm text-neutral-500">%/yr</span>
          </div>

          {!data.isRealAverage && (
            <p className="text-xs mb-3" style={{ color: "var(--color-accent-700)" }}>
              Example figure — the &quot;if you keep contributing&quot; bar assumes a placeholder $50/month for now.
              We&apos;ll use your real average once you&apos;ve been on PriorityPay for 3 months.
            </p>
          )}

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => currency(v)} width={80} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => currency(v)} />
                <Legend
                  formatter={(value) => {
                    if (value === "startingOnly") return "Starting amount only";
                    if (value === "currentTotalFrozen") return "What you've invested so far";
                    if (value === "currentTotalPlusOngoing") return "If you keep contributing";
                    return value;
                  }}
                />
                <Bar dataKey="startingOnly" fill={COLOR_STARTING} isAnimationActive={false} />
                <Bar dataKey="currentTotalFrozen" fill={COLOR_FROZEN} isAnimationActive={false} />
                <Bar dataKey="currentTotalPlusOngoing" fill={COLOR_ONGOING} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-xs text-neutral-500 mt-4">
            This is a hypothetical illustration based on the return rate you choose, not a guarantee or investment
            advice. PriorityPay is not an investment adviser.
          </p>
        </>
      )}
    </Card>
  );
}
