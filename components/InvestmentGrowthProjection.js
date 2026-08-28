"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui";
import { bloomInputStyle } from "@/lib/bloomTheme";
import { currency } from "@/lib/allocations";

// Forward-looking "what could this become" projection card, deliberately
// separate from AccountBalances' two pie charts (which only ever look
// backward at real history) -- this is the Dashboard's section that
// projects forward, rendered ABOVE "How your money has been distributed"
// / "Where your money has gone" (see app/(app)/dashboard/page.js) so the
// encouraging, forward-looking number is the first thing someone sees.
//
// One <InvestmentGrowthProjection> renders one Card, but a Card can hold
// more than one projection "block" -- Investments only ever needs one
// (the whole "Investments" group blended together), but Retirement needs
// two side by side, Solo 401k and SEP IRA, since those are meaningfully
// different accounts with different tax treatment. Each block fetches its
// own slice from /api/allocations/investment-projection independently
// (?group=...&retirementType=...) and renders its own starting-balance
// figure, its own editable inputs, and its own chart -- nothing is shared
// across blocks except the card's title/tax-note/disclaimer.
//
// Three shades of purple from the app's existing Bloom palette
// (lib/bloomTheme.js / PriorityPayLogo.js), darkest -> lightest tracking
// scenario 1 -> 3 so the bars visually read as "least" to "most". Bars use
// rounded top corners and a celebratory "by year 50" callout pill (a la
// Duolingo-style positive-reinforcement UI) instead of a plain chart, to
// lean into the "promote positivity, encourage continued investing" goal.
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

function ProjectionBlock({ group, retirementType, startingLabel, subHeading, emptyStateText }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [ratePct, setRatePct] = useState(DEFAULT_RATE_PCT);
  // Scenario 3 ("Future Progress") only -- Scenarios 1 and 2 never use
  // this. Defaults to $50/mo, fully user-editable.
  const [monthlyContribution, setMonthlyContribution] = useState(DEFAULT_MONTHLY_CONTRIBUTION);

  useEffect(() => {
    const params = new URLSearchParams({ group });
    if (retirementType) params.set("retirementType", retirementType);
    fetch(`/api/allocations/investment-projection?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [group, retirementType]);

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

  const year50Total = chartData.length ? chartData[chartData.length - 1].futureProgress : 0;

  if (loading) {
    return <p className="text-sm text-neutral-400">Loading…</p>;
  }

  const isEmpty = !data || !data.hasGroupedCategories;
  const uid = `${group}-${retirementType || "all"}`;

  return (
    <div>
      {subHeading && (
        <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 14, fontWeight: 700, color: "var(--color-text)", margin: "0 0 8px" }}>
          {subHeading}
        </h3>
      )}

      {isEmpty ? (
        <p className="text-sm text-neutral-400">{emptyStateText}</p>
      ) : (
        <>
          <p className="text-sm mb-3" style={{ color: "var(--color-text)" }}>
            {startingLabel} Total Before PriorityPay:{" "}
            <span style={{ fontWeight: 700, fontFamily: "var(--font-mono)" }}>{currency(data.startingOnly)}</span>
          </p>

          <div className="flex items-center gap-3 mb-1">
            <label htmlFor={`pp-growth-rate-${uid}`} className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
              Assumed annual return
            </label>
            <input
              id={`pp-growth-rate-${uid}`}
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
            <label htmlFor={`pp-monthly-contribution-${uid}`} className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
              Monthly Contribution Amount
            </label>
            <span className="text-sm text-neutral-500">$</span>
            <input
              id={`pp-monthly-contribution-${uid}`}
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

          {/* Duolingo-style celebratory pill -- the payoff number up front,
              before the chart, so the encouraging figure lands first. */}
          <div
            className="flex items-center gap-2 mb-4 px-4 py-3"
            style={{
              borderRadius: 999,
              background: "linear-gradient(90deg, #6D3BE0 0%, #9A72F0 100%)",
              boxShadow: "0 2px 0 rgba(59, 28, 122, 0.35)",
            }}
          >
            <span style={{ fontSize: 20 }} aria-hidden="true">🚀</span>
            <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>
              Keep it up — by Year 50 you could have{" "}
              <span style={{ fontWeight: 800, fontFamily: "var(--font-mono)" }}>{currency(year50Total)}</span>
            </span>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => currency(v)} width={80} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => currency(v)} cursor={{ fill: "rgba(154, 114, 240, 0.08)" }} />
                <Legend />
                <Bar dataKey="prePriorityPay" name="Pre-PriorityPay" fill={COLOR_STARTING} radius={[8, 8, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="currentProgress" name="Current Progress" fill={COLOR_FROZEN} radius={[8, 8, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="futureProgress" name="Future Progress" fill={COLOR_ONGOING} radius={[8, 8, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

// Scenario descriptions used to repeat under every single block (three
// times over when Investments + Solo 401k + SEP IRA all render together),
// which read as a wall of near-duplicate text -- now shown exactly once
// per card, underneath every block's chart, since the definitions don't
// change block to block.
function ScenarioLegendNote() {
  return (
    <div className="mt-2 space-y-2 text-xs text-neutral-500">
      <p>
        <strong style={{ color: COLOR_STARTING }}>Pre-PriorityPay:</strong> projections based only on the money you
        had invested before joining PriorityPay, assuming the return rate above. Assumes you never contribute
        another dollar.
      </p>
      <p>
        <strong style={{ color: COLOR_FROZEN }}>Current Progress:</strong> projections based on your investments
        before PriorityPay and all of the contributions you&apos;ve made since joining, assuming the return rate
        above. Assumes you never contribute another dollar.
      </p>
      <p>
        <strong style={{ color: COLOR_ONGOING }}>Future Progress:</strong> projections based on your investments
        before PriorityPay and all of the contributions you&apos;ve made since joining, plus continuing to
        contribute the Monthly Contribution Amount above, assuming the return rate above.
      </p>
    </div>
  );
}

export default function InvestmentGrowthProjection({ title, blocks, taxNote = false }) {
  return (
    <Card className="p-5" style={{ borderRadius: 26, background: "var(--color-surface)" }}>
      <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 700, color: "var(--color-text)", margin: "0 0 4px" }}>
        {title}
      </h2>
      <p className="text-xs text-neutral-500 mb-4">
        A projection of {blocks.length > 1 ? "these categories" : "this category"}, if growth compounds monthly.
      </p>

      {/* Always laid out as a single row on wider screens -- up to three
          blocks (Investments, Solo 401k, SEP IRA) side by side -- rather
          than stacking Investments above a two-column Retirement row. */}
      <div className={blocks.length > 1 ? "grid grid-cols-1 md:grid-cols-3 gap-6" : ""}>
        {blocks.map((block) => (
          <ProjectionBlock key={block.retirementType || block.group} {...block} />
        ))}
      </div>

      <ScenarioLegendNote />

      {taxNote && (
        <p className="text-xs mt-4" style={{ color: "var(--color-accent-700)" }}>
          This reflects pre-tax contributions — you&apos;ll still owe income tax on withdrawals in retirement.
        </p>
      )}

      <p className="text-xs text-neutral-500 mt-4">
        This is a hypothetical illustration based on the return rate you choose, not a guarantee or investment
        advice. PriorityPay is not an investment adviser.
      </p>
    </Card>
  );
}
