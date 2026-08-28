"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui";
import { bloomInputStyle } from "@/lib/bloomTheme";
import { currency } from "@/lib/allocations";

// Forward-looking "what could this become" projection card, deliberately
// separate from AccountBalances' two pie charts (which only ever look
// backward at real history) -- this is the Dashboard's section that
// projects forward. Rendered twice on the Dashboard (app/(app)/dashboard/
// page.js), once per group -- "Your Investment Projections" (group=
// "Investments") and "Your Retirement Projections" (group="Retirement",
// taxNote) -- each fetching its own group from
// /api/allocations/investment-projection?group=... rather than blending
// the two together.
//
// Three shades of purple from the app's existing Bloom palette
// (lib/bloomTheme.js / PriorityPayLogo.js), darkest -> lightest tracking
// scenario 1 -> 3 so the bars visually read as "least" to "most":
const COLOR_STARTING = "#3B1C7A"; // scenario 1: Pre-PriorityPay
const COLOR_FROZEN = "#6D3BE0"; // scenario 2: Current Progress
const COLOR_ONGOING = "#9A72F0"; // scenario 3: Future Progress

const YEARS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
const DEFAULT_RATE_PCT = 7;
const DEFAULT_MONTHLY_CONTRIBUTION = 50;

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

export default function InvestmentGrowthProjection({ group, title, emptyStateText, taxNote = false }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [ratePct, setRatePct] = useState(DEFAULT_RATE_PCT);
  // Scenario 3 ("Future Progress") only -- Scenarios 1 and 2 never use
  // this. Defaults to $50/mo, fully user-editable, same as the return-rate
  // input below it.
  const [monthlyContribution, setMonthlyContribution] = useState(DEFAULT_MONTHLY_CONTRIBUTION);

  useEffect(() => {
    fetch(`/api/allocations/investment-projection?group=${encodeURIComponent(group)}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [group]);

  const chartData = useMemo(() => {
    if (!data) return [];
    const monthlyRate = (Number(ratePct) || 0) / 100 / 12;
    const monthlyAmount = Number(monthlyContribution) || 0;
    return YEARS.map((years) => {
      const months = years * 12;
      return {
        year: years,
        label: `Yr ${years}`,
        prePriorityPay: futureValue(data.startingOnly, monthlyRate, months),
        currentProgress: futureValue(data.currentTotalFrozen, monthlyRate, months),
        futureProgress: futureValueWithContributions(data.currentTotalFrozen, monthlyRate, months, monthlyAmount),
      };
    });
  }, [data, ratePct, monthlyContribution]);

  if (loading) {
    return (
      <Card className="p-5" style={{ borderRadius: 26, background: "var(--color-surface)" }}>
        <p className="text-sm text-neutral-400">Loading…</p>
      </Card>
    );
  }

  const isEmpty = !data || !data.hasGroupedCategories;

  return (
    <Card className="p-5" style={{ borderRadius: 26, background: "var(--color-surface)" }}>
      <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 700, color: "var(--color-text)", margin: "0 0 4px" }}>
        {title}
      </h2>
      <p className="text-xs text-neutral-500 mb-4">
        A projection of your {group} category, if its growth compounds monthly.
      </p>

      {isEmpty ? (
        <p className="text-sm text-neutral-400">{emptyStateText}</p>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-1">
            <label htmlFor={`pp-growth-rate-${group}`} className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
              Assumed annual return
            </label>
            <input
              id={`pp-growth-rate-${group}`}
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
          <p className="text-xs mb-4" style={{ color: "var(--color-neutral-500, var(--color-text))" }}>
            7% approximates the S&amp;P 500&apos;s average annual return after inflation over the past century.
          </p>

          <div className="flex items-center gap-3 mb-4">
            <label htmlFor={`pp-monthly-contribution-${group}`} className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
              Monthly Contribution Amount
            </label>
            <span className="text-sm text-neutral-500">$</span>
            <input
              id={`pp-monthly-contribution-${group}`}
              type="number"
              min={0}
              step={10}
              value={monthlyContribution}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setMonthlyContribution(e.target.value)}
              onBlur={(e) => setMonthlyContribution(Math.max(0, Number(e.target.value) || 0))}
              style={bloomInputStyle({ width: 90, padding: "8px 10px", fontFamily: "var(--font-mono)", textAlign: "right" })}
            />
            <span className="text-xs text-neutral-500">only affects Future Progress, below</span>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => currency(v)} width={80} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => currency(v)} />
                <Legend
                  formatter={(value) => {
                    if (value === "prePriorityPay") return "Pre-PriorityPay";
                    if (value === "currentProgress") return "Current Progress";
                    if (value === "futureProgress") return "Future Progress";
                    return value;
                  }}
                />
                <Bar dataKey="prePriorityPay" fill={COLOR_STARTING} isAnimationActive={false} />
                <Bar dataKey="currentProgress" fill={COLOR_FROZEN} isAnimationActive={false} />
                <Bar dataKey="futureProgress" fill={COLOR_ONGOING} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 space-y-2 text-xs text-neutral-500">
            <p>
              <strong style={{ color: COLOR_STARTING }}>Pre-PriorityPay:</strong> projections based only on the money
              you had invested before joining PriorityPay, assuming the return rate above. Assumes you never
              contribute another dollar.
            </p>
            <p>
              <strong style={{ color: COLOR_FROZEN }}>Current Progress:</strong> projections based on your
              investments before PriorityPay and all of the contributions you&apos;ve made since joining, assuming
              the return rate above. Assumes you never contribute another dollar.
            </p>
            <p>
              <strong style={{ color: COLOR_ONGOING }}>Future Progress:</strong> projections based on your
              investments before PriorityPay and all of the contributions you&apos;ve made since joining, plus
              continuing to contribute the Monthly Contribution Amount above, assuming the return rate above.
            </p>
          </div>

          {taxNote && (
            <p className="text-xs mt-3" style={{ color: "var(--color-accent-700)" }}>
              This reflects pre-tax contributions — you&apos;ll still owe income tax on withdrawals in retirement.
            </p>
          )}

          <p className="text-xs text-neutral-500 mt-4">
            This is a hypothetical illustration based on the return rate you choose, not a guarantee or investment
            advice. PriorityPay is not an investment adviser.
          </p>
        </>
      )}
    </Card>
  );
}
