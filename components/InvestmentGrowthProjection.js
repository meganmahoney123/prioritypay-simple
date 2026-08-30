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

// Abbreviated axis labels ($600k instead of $600,000) -- with three charts
// side by side on desktop, each one only has ~1/3 of the card's width, so
// full currency() tick labels were crowding into the plot area and forcing
// bars to compress. Only used for the Y-axis ticks; the tooltip and every
// other on-screen dollar figure still use the full currency() formatter.
function compactCurrency(v) {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${Math.round(n)}`;
}

function ProjectionBlock({ group, retirementType, startingLabel, subHeading, emptyStateText, onYear50Change }) {
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
  const isEmpty = !data || !data.hasGroupedCategories;

  // Reports this block's Year-50 "Future Progress" figure up to the card
  // wrapper so it can show a combined grand total across all blocks (see
  // GrandTotalBanner below) -- reported as 0 once loading/empty so a block
  // with nothing in it doesn't hold the grand total at a stale value.
  useEffect(() => {
    if (!onYear50Change) return;
    onYear50Change(loading || isEmpty ? 0 : year50Total);
  }, [onYear50Change, loading, isEmpty, year50Total]);

  if (loading) {
    return <p className="text-sm text-neutral-400">Loading…</p>;
  }

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

          {/* Label stacked above its input (rather than inline) so a
              narrower column -- each block only gets ~1/3 of the card's
              width once three sit side by side -- never has to wrap the
              label text mid-sentence, which is what made this feel
              cramped. */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label htmlFor={`pp-growth-rate-${uid}`} className="block text-xs font-medium mb-1" style={{ color: "var(--color-text)" }}>
                Annual return
              </label>
              <div className="flex items-center gap-1.5">
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
                  style={bloomInputStyle({ width: "100%", minWidth: 0, padding: "7px 8px", fontFamily: "var(--font-mono)", textAlign: "right" })}
                />
                <span className="text-xs text-neutral-500 shrink-0">%/yr</span>
              </div>
            </div>
            <div>
              <label htmlFor={`pp-monthly-contribution-${uid}`} className="block text-xs font-medium mb-1" style={{ color: "var(--color-text)" }}>
                Monthly contribution
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-neutral-500 shrink-0">$</span>
                <input
                  id={`pp-monthly-contribution-${uid}`}
                  type="number"
                  min={0}
                  step={10}
                  value={monthlyContribution}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setMonthlyContribution(e.target.value)}
                  onBlur={(e) => setMonthlyContribution(Math.max(0, Number(e.target.value) || 0))}
                  style={bloomInputStyle({ width: "100%", minWidth: 0, padding: "7px 8px", fontFamily: "var(--font-mono)", textAlign: "right" })}
                />
              </div>
            </div>
          </div>

          {/* Duolingo-style celebratory pill -- the payoff number up front,
              before the chart, so the encouraging figure lands first. The
              dollar amount gets its own line, bigger and in a lighter
              tint, so it reads as the headline rather than blending into
              the sentence around it. */}
          <div
            className="mb-3 px-3.5 py-2.5"
            style={{
              borderRadius: 20,
              background: "linear-gradient(90deg, #6D3BE0 0%, #9A72F0 100%)",
              boxShadow: "0 2px 0 rgba(59, 28, 122, 0.35)",
            }}
          >
            <div className="flex items-center gap-1.5">
              <span style={{ fontSize: 16 }} aria-hidden="true">🚀</span>
              <span style={{ color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: 600 }}>
                Keep it up! By Year 50 you could have
              </span>
            </div>
            <div
              style={{
                color: "#fff",
                fontSize: 22,
                fontWeight: 800,
                fontFamily: "var(--font-mono)",
                lineHeight: 1.2,
                marginTop: 2,
              }}
            >
              {currency(year50Total)}
            </div>
          </div>

          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }} barGap={2} barCategoryGap="18%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  tickFormatter={(v) => v.replace("Yr ", "")}
                />
                <YAxis tickFormatter={compactCurrency} width={40} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => currency(v)} cursor={{ fill: "rgba(154, 114, 240, 0.08)" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="prePriorityPay" name="Pre-PriorityPay" fill={COLOR_STARTING} radius={[6, 6, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="currentProgress" name="Current Progress" fill={COLOR_FROZEN} radius={[6, 6, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="futureProgress" name="Future Progress" fill={COLOR_ONGOING} radius={[6, 6, 0, 0]} isAnimationActive={false} />
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

// Sum of every block's own Year-50 "Future Progress" callout -- e.g. Solo
// 401k's $364,189 + SEP IRA's $318,296 -- so someone with both retirement
// accounts sees what they'd have combined, not just two separate numbers
// they have to add up themselves. Only rendered once every block has
// reported in (see ProjectionBlock's onYear50Change) and only when there's
// more than one block, since a single-block card (Investments on its own)
// would just repeat the same number already shown above.
function GrandTotalBanner({ total }) {
  return (
    <div
      className="mt-6 px-5 py-4 flex items-center justify-between flex-wrap gap-2"
      style={{
        borderRadius: 20,
        background: "var(--color-accent-800)",
      }}
    >
      <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 600 }}>
        🎉 Combined, all three by Year 50
      </span>
      <span style={{ color: "#fff", fontSize: 26, fontWeight: 800, fontFamily: "var(--font-mono)" }}>
        {currency(total)}
      </span>
    </div>
  );
}

export default function InvestmentGrowthProjection({ title, blocks, taxNote = false }) {
  const [year50ByIndex, setYear50ByIndex] = useState({});

  const grandTotal = useMemo(
    () => Object.values(year50ByIndex).reduce((s, v) => s + (Number(v) || 0), 0),
    [year50ByIndex]
  );
  const reportedCount = Object.keys(year50ByIndex).length;

  return (
    <Card className="p-5" style={{ borderRadius: 26, background: "var(--color-surface)" }}>
      <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 700, color: "var(--color-text)", margin: "0 0 4px" }}>
        {title}
      </h2>
      <p className="text-xs text-neutral-500 mb-4">
        A projection of {blocks.length > 1 ? "these categories" : "this category"}, if growth compounds monthly.
        7% approximates the S&amp;P 500&apos;s average annual return after inflation over the past century.
      </p>

      {/* Always laid out as a single row on wider screens -- up to three
          blocks (Investments, Solo 401k, SEP IRA) side by side -- rather
          than stacking Investments above a two-column Retirement row. */}
      <div
        className={
          blocks.length === 3
            ? "grid grid-cols-1 md:grid-cols-3 gap-6"
            : blocks.length === 2
            ? "grid grid-cols-1 md:grid-cols-2 gap-6"
            : ""
        }
      >
        {blocks.map((block, i) => (
          <ProjectionBlock
            key={block.retirementType || block.group}
            {...block}
            onYear50Change={(v) => setYear50ByIndex((prev) => (prev[i] === v ? prev : { ...prev, [i]: v }))}
          />
        ))}
      </div>

      {blocks.length > 1 && reportedCount === blocks.length && <GrandTotalBanner total={grandTotal} />}

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
