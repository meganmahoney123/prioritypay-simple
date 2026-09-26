"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui";
import { bloomInputStyle, bloomWarningCardStyle } from "@/lib/bloomTheme";
import { currency } from "@/lib/allocations";

// Redone (Sep 2026) from three separate scenario-comparison charts
// (Pre-PriorityPay / Current Progress / Future Progress, one per category)
// into a single combined "solve for the missing number" calculator, per
// explicit request: fetch the person's current combined balance
// automatically, then let them enter any three of {goal amount, years,
// annual return, monthly contribution} and solve for the fourth. Combined
// across every investable category (Investments + Retirement + Retirement
// (Side Income)) rather than one block per category -- see
// app/api/allocations/investment-projection/route.js, now the sole caller
// of a route that used to be scoped per group/retirementType.
const COLOR_BAR = "#6D3BE0";
const COLOR_GOAL = "#3B1C7A";

const SOLVE_OPTIONS = [
  { id: "goal", label: "Goal amount" },
  { id: "years", label: "Years to reach it" },
  { id: "contribution", label: "Monthly contribution" },
  { id: "return", label: "Annual return" },
];

function monthlyRateFromPct(pct) {
  return (Number(pct) || 0) / 100 / 12;
}

function futureValue(principal, monthlyRate, months, monthlyContribution) {
  if (monthlyRate === 0) return principal + monthlyContribution * months;
  const growthOfPrincipal = principal * Math.pow(1 + monthlyRate, months);
  const annuity = monthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
  return growthOfPrincipal + annuity;
}

// Solves for the number of months needed to reach `goal`, given a fixed
// principal/rate/contribution. Algebraic, not iterative: letting
// x = (1+r)^n, the future-value formula rearranges to a direct expression
// for x, so this only needs one log rather than a search.
function solveMonths(principal, monthlyRate, monthlyContribution, goal) {
  if (goal <= principal) return 0;
  if (monthlyRate === 0) {
    return monthlyContribution > 0 ? (goal - principal) / monthlyContribution : null;
  }
  const denom = principal + monthlyContribution / monthlyRate;
  if (denom <= 0) return null;
  const x = (goal + monthlyContribution / monthlyRate) / denom;
  if (x <= 1) return 0;
  return Math.log(x) / Math.log(1 + monthlyRate);
}

// Solves for the monthly contribution needed to reach `goal` in exactly
// `months`, given a fixed principal/rate. Direct algebraic rearrangement
// of the future-value formula.
function solveContribution(principal, monthlyRate, months, goal) {
  if (months <= 0) return null;
  if (monthlyRate === 0) return Math.max(0, (goal - principal) / months);
  const growth = principal * Math.pow(1 + monthlyRate, months);
  const denom = Math.pow(1 + monthlyRate, months) - 1;
  if (denom <= 0) return null;
  return Math.max(0, ((goal - growth) * monthlyRate) / denom);
}

// Solves for the monthly rate needed to reach `goal` in `months` with a
// fixed principal/contribution. There's no algebraic inverse for the rate,
// but futureValue(...) is monotonically increasing in the rate (principal
// and contribution are always >= 0 here), so a bounded bisection search
// always converges to a unique answer.
function solveMonthlyRate(principal, months, monthlyContribution, goal) {
  if (months <= 0) return null;
  if (futureValue(principal, 0, months, monthlyContribution) >= goal) return 0;
  let lo = 0;
  let hi = 0.1; // start at 10%/mo (~215%/yr, a generous ceiling) and expand if needed
  let guard = 0;
  while (futureValue(principal, hi, months, monthlyContribution) < goal && guard < 30) {
    hi *= 1.6;
    guard += 1;
  }
  if (futureValue(principal, hi, months, monthlyContribution) < goal) return null; // not reachable within a sane ceiling
  for (let i = 0; i < 80; i += 1) {
    const mid = (lo + hi) / 2;
    if (futureValue(principal, mid, months, monthlyContribution) < goal) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function compactCurrency(v) {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${Math.round(n)}`;
}

function formatSolved(value, unit) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "Not reachable";
  if (unit === "currency") return currency(value);
  if (unit === "years") {
    const y = Math.floor(value);
    const months = Math.round((value - y) * 12);
    if (months === 0) return `${y} ${y === 1 ? "year" : "years"}`;
    return `${y}y ${months}mo`;
  }
  return `${value.toFixed(2)}%`;
}

function FieldLabel({ children, htmlFor }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-medium mb-1" style={{ color: "var(--color-text)" }}>
      {children}
    </label>
  );
}

// The field currently being solved for renders as this instead of an
// input -- same footprint as bloomInputStyle so the 2x2 grid doesn't
// jump around when the "Solve for" pill selection changes.
function ResultBox({ text }) {
  return (
    <div
      style={{
        ...bloomInputStyle({ width: "100%", minWidth: 0, padding: "7px 8px" }),
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        background: "var(--color-accent-200)",
        color: "var(--color-accent-800)",
        fontFamily: "var(--font-mono)",
        fontWeight: 700,
      }}
    >
      {text}
    </div>
  );
}

export default function InvestmentGrowthProjection({ title = "Investment & Retirement Projections", taxNote = false }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const [solveFor, setSolveFor] = useState("goal");
  const [goalAmount, setGoalAmount] = useState(500000);
  const [years, setYears] = useState(30);
  const [ratePct, setRatePct] = useState(7);
  const [monthlyContribution, setMonthlyContribution] = useState(200);

  useEffect(() => {
    fetch("/api/allocations/investment-projection")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // The real, live Plaid balance behind everything in scope right now when
  // it's known; otherwise this app's own tracked ledger total. Either way,
  // this is the starting "current contributions" principal the calculator
  // solves from -- the person never types this in themselves.
  const principal = data ? (data.liveBalanceKnown ? data.liveBalance : data.currentTotalFrozen) : 0;

  const result = useMemo(() => {
    const r = monthlyRateFromPct(ratePct);
    const months = (Number(years) || 0) * 12;
    const contribution = Number(monthlyContribution) || 0;
    const goal = Number(goalAmount) || 0;

    if (solveFor === "goal") return { value: futureValue(principal, r, months, contribution), unit: "currency" };
    if (solveFor === "years") {
      const solvedMonths = solveMonths(principal, r, contribution, goal);
      return { value: solvedMonths === null ? null : solvedMonths / 12, unit: "years" };
    }
    if (solveFor === "contribution") return { value: solveContribution(principal, r, months, goal), unit: "currency" };
    const solvedMonthlyRate = solveMonthlyRate(principal, months, contribution, goal);
    return { value: solvedMonthlyRate === null ? null : solvedMonthlyRate * 12 * 100, unit: "percent" };
  }, [solveFor, principal, ratePct, years, monthlyContribution, goalAmount]);

  // Whatever isn't being solved for uses the person's typed-in number;
  // whatever IS being solved for uses the freshly computed result --
  // together these give one coherent set of four numbers for the chart,
  // no matter which field is the "unknown" one right now.
  const effectiveYears = solveFor === "years" ? result.value ?? 0 : Number(years) || 0;
  const effectiveContribution = solveFor === "contribution" ? result.value ?? 0 : Number(monthlyContribution) || 0;
  const effectiveRatePct = solveFor === "return" ? result.value ?? 0 : Number(ratePct) || 0;
  const effectiveGoal = solveFor === "goal" ? result.value ?? 0 : Number(goalAmount) || 0;

  const chartData = useMemo(() => {
    const r = monthlyRateFromPct(effectiveRatePct);
    const totalYears = Math.max(1, Math.round(effectiveYears));
    const step = Math.max(1, Math.round(totalYears / 10));
    const points = [];
    for (let y = 0; y <= totalYears; y += step) {
      points.push({ label: `Yr ${y}`, balance: futureValue(principal, r, y * 12, effectiveContribution) });
    }
    if (points[points.length - 1]?.label !== `Yr ${totalYears}`) {
      points.push({ label: `Yr ${totalYears}`, balance: futureValue(principal, r, totalYears * 12, effectiveContribution) });
    }
    return points;
  }, [principal, effectiveRatePct, effectiveContribution, effectiveYears]);

  if (loading) return <p className="text-sm text-neutral-400">Loading…</p>;

  const isEmpty = !data || !data.hasGroupedCategories;

  return (
    <Card className="p-5" style={{ borderRadius: 26, background: "var(--color-surface)" }}>
      <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 700, color: "var(--color-text)", margin: "0 0 4px" }}>
        {title}
      </h2>
      <p className="text-xs text-neutral-500 mb-4">
        A combined projection across your Investments and Retirement accounts, assuming growth compounds monthly.
        7% approximates the S&amp;P 500&apos;s average annual return after inflation over the past century.
      </p>

      {isEmpty ? (
        <p className="text-sm text-neutral-400">
          Once you&apos;re contributing to Investments or a Retirement account, you&apos;ll be able to project it here.
        </p>
      ) : (
        <>
          <p className="text-sm mb-4" style={{ color: "var(--color-text)" }}>
            Current combined balance:{" "}
            <span style={{ fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--color-accent-700)" }}>
              {currency(principal)}
            </span>
          </p>

          <div className="mb-4">
            <span className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text)" }}>
              Solve for
            </span>
            <div className="flex flex-wrap gap-2">
              {SOLVE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSolveFor(opt.id)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full"
                  style={{
                    border: `1px solid ${solveFor === opt.id ? "var(--color-accent)" : "var(--color-divider)"}`,
                    color: solveFor === opt.id ? "var(--color-accent-700)" : "var(--color-neutral-700)",
                    background: solveFor === opt.id ? "color-mix(in srgb, var(--color-accent) 8%, transparent)" : "transparent",
                    cursor: "pointer",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <FieldLabel htmlFor="pp-goal-amount">Goal amount</FieldLabel>
              {solveFor === "goal" ? (
                <ResultBox text={formatSolved(result.value, result.unit)} />
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-neutral-500 shrink-0">$</span>
                  <input
                    id="pp-goal-amount"
                    type="number"
                    min={0}
                    step={1000}
                    value={goalAmount}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setGoalAmount(e.target.value)}
                    onBlur={(e) => setGoalAmount(Math.max(0, Number(e.target.value) || 0))}
                    style={bloomInputStyle({ width: "100%", minWidth: 0, padding: "7px 8px", fontFamily: "var(--font-mono)", textAlign: "right" })}
                  />
                </div>
              )}
            </div>

            <div>
              <FieldLabel htmlFor="pp-years">Years</FieldLabel>
              {solveFor === "years" ? (
                <ResultBox text={formatSolved(result.value, result.unit)} />
              ) : (
                <div className="flex items-center gap-1.5">
                  <input
                    id="pp-years"
                    type="number"
                    min={1}
                    max={80}
                    step={1}
                    value={years}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setYears(e.target.value)}
                    onBlur={(e) => setYears(Math.max(1, Math.min(80, Number(e.target.value) || 1)))}
                    style={bloomInputStyle({ width: "100%", minWidth: 0, padding: "7px 8px", fontFamily: "var(--font-mono)", textAlign: "right" })}
                  />
                  <span className="text-xs text-neutral-500 shrink-0">yrs</span>
                </div>
              )}
            </div>

            <div>
              <FieldLabel htmlFor="pp-monthly-contribution">Monthly contribution</FieldLabel>
              {solveFor === "contribution" ? (
                <ResultBox text={formatSolved(result.value, result.unit)} />
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-neutral-500 shrink-0">$</span>
                  <input
                    id="pp-monthly-contribution"
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
              )}
            </div>

            <div>
              <FieldLabel htmlFor="pp-growth-rate">Annual return</FieldLabel>
              {solveFor === "return" ? (
                <ResultBox text={formatSolved(result.value, result.unit)} />
              ) : (
                <div className="flex items-center gap-1.5">
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
                    style={bloomInputStyle({ width: "100%", minWidth: 0, padding: "7px 8px", fontFamily: "var(--font-mono)", textAlign: "right" })}
                  />
                  <span className="text-xs text-neutral-500 shrink-0">%/yr</span>
                </div>
              )}
            </div>
          </div>

          {result.value === null && (
            <p className="text-xs mb-3 p-2.5" style={bloomWarningCardStyle()}>
              That goal isn&apos;t reachable with these numbers within a realistic range -- try adjusting one of the
              other fields.
            </p>
          )}

          {/* Duolingo-style celebratory pill carried over from the old
              card -- the payoff number up front, before the chart. */}
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
                {solveFor === "goal" && "Keep it up! With these numbers you could have"}
                {solveFor === "years" && "At this pace, you'd reach your goal in"}
                {solveFor === "contribution" && "To hit your goal, plan to contribute"}
                {solveFor === "return" && "You'd need an annual return of"}
              </span>
            </div>
            <div style={{ color: "#fff", fontSize: 22, fontWeight: 800, fontFamily: "var(--font-mono)", lineHeight: 1.2, marginTop: 2 }}>
              {formatSolved(result.value, result.unit)}
              {solveFor === "contribution" && result.value !== null && "/mo"}
            </div>
          </div>

          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }} barCategoryGap="18%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  tickFormatter={(v) => v.replace("Yr ", "")}
                />
                <YAxis tickFormatter={compactCurrency} width={44} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => currency(v)} cursor={{ fill: "rgba(154, 114, 240, 0.08)" }} />
                {effectiveGoal > 0 && (
                  <ReferenceLine
                    y={effectiveGoal}
                    stroke={COLOR_GOAL}
                    strokeDasharray="4 4"
                    label={{ value: `Goal: ${compactCurrency(effectiveGoal)}`, position: "insideTopRight", fontSize: 10, fill: COLOR_GOAL }}
                  />
                )}
                <Bar dataKey="balance" name="Projected balance" fill={COLOR_BAR} radius={[6, 6, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {taxNote && (
        <p className="text-xs mt-4" style={{ color: "var(--color-accent-700)" }}>
          This reflects pre-tax contributions, you&apos;ll still owe income tax on withdrawals in retirement.
        </p>
      )}

      <p className="text-xs text-neutral-500 mt-4">
        This is a hypothetical illustration based on the numbers you enter, not a guarantee or investment advice.
        PriorityPay is not an investment adviser.
      </p>
    </Card>
  );
}
