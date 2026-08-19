"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import PersonaToggle from "@/components/PersonaToggle";
import { Card, PrimaryButton, currency } from "@/components/ui";
import { LEDGER_TOKENS, ledgerInputStyle } from "@/lib/ledgerTheme";

// Recommended coverage range leans on how volatile/replaceable the income
// actually is -- a steady W2 paycheck can responsibly run a smaller
// cushion than income that can vanish with one client or one bad month,
// which is the whole reason this calculator asks who's using it instead
// of giving one generic "3-6 months" answer to everyone.
const RECOMMENDED_MONTHS = {
  self_employed: { min: 6, default: 9, max: 12, note: "Income can swing month to month, so the usual 3-6 months most advice gives isn't enough runway." },
  business_owner: { min: 6, default: 9, max: 12, note: "Same logic as self-employed for your personal cushion -- plus a separate reserve below for the business itself." },
  w2: { min: 3, default: 4.5, max: 6, note: "A steady paycheck means less runway is needed -- this is the range most general advice is built around." },
};
const BUSINESS_RESERVE_MONTHS = { min: 3, default: 3, max: 6 };

function monthsToGoal(gap, monthlySavings) {
  if (gap <= 0) return 0;
  if (monthlySavings <= 0) return Infinity;
  return Math.ceil(gap / monthlySavings);
}

export default function EmergencyFundPublicClient() {
  const router = useRouter();
  const [persona, setPersona] = useState("self_employed");
  const [monthlyExpenses, setMonthlyExpenses] = useState(4000);
  const [businessExpenses, setBusinessExpenses] = useState(2500);
  const [currentSavings, setCurrentSavings] = useState(3000);
  const [monthlySavingsRate, setMonthlySavingsRate] = useState(400);
  const [months, setMonths] = useState(RECOMMENDED_MONTHS.self_employed.default);

  const rec = RECOMMENDED_MONTHS[persona];

  const handlePersonaChange = (p) => {
    setPersona(p);
    setMonths(RECOMMENDED_MONTHS[p].default);
  };

  const target = useMemo(() => monthlyExpenses * (Number(months) || 0), [monthlyExpenses, months]);
  const gap = Math.max(0, target - currentSavings);
  const monthsToReach = monthsToGoal(gap, monthlySavingsRate);

  const businessTarget = businessExpenses * BUSINESS_RESERVE_MONTHS.default;

  return (
    <div style={LEDGER_TOKENS}>
      <PublicHeader />
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "48px clamp(18px, 4vw, 40px) 80px" }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(30px, 4vw, 40px)", fontWeight: 400, margin: "0 0 10px" }}>
          Emergency Fund Calculator
        </h1>
        <p className="text-sm" style={{ maxWidth: 580, color: "color-mix(in srgb, var(--color-text) 76%, transparent)", margin: "0 0 32px" }}>
          How big your cushion should be depends a lot on how steady your income actually is. Free, no account
          needed.
        </p>

        <Card style={{ padding: "24px 26px", marginBottom: 24 }}>
          <PersonaToggle value={persona} onChange={handlePersonaChange} />

          <div className="flex gap-6 flex-wrap mb-5">
            <label className="text-xs flex flex-col gap-1" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
              {persona === "business_owner" ? "Personal monthly essential expenses" : "Monthly essential expenses"}
              <span style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontFamily: "var(--font-heading)", fontSize: 18, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>$</span>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={monthlyExpenses}
                  onChange={(e) => setMonthlyExpenses(Math.max(0, Number(e.target.value) || 0))}
                  style={ledgerInputStyle({ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 600, width: 130 })}
                />
              </span>
            </label>

            {persona === "business_owner" && (
              <label className="text-xs flex flex-col gap-1" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                Business monthly operating expenses
                <span style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{ fontFamily: "var(--font-heading)", fontSize: 18, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>$</span>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={businessExpenses}
                    onChange={(e) => setBusinessExpenses(Math.max(0, Number(e.target.value) || 0))}
                    style={ledgerInputStyle({ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 600, width: 130 })}
                  />
                </span>
              </label>
            )}

            <label className="text-xs flex flex-col gap-1" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
              Already saved toward this
              <span style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontFamily: "var(--font-heading)", fontSize: 18, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>$</span>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={currentSavings}
                  onChange={(e) => setCurrentSavings(Math.max(0, Number(e.target.value) || 0))}
                  style={ledgerInputStyle({ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 600, width: 130 })}
                />
              </span>
            </label>

            <label className="text-xs flex flex-col gap-1" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
              Can set aside per month
              <span style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontFamily: "var(--font-heading)", fontSize: 18, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>$</span>
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={monthlySavingsRate}
                  onChange={(e) => setMonthlySavingsRate(Math.max(0, Number(e.target.value) || 0))}
                  style={ledgerInputStyle({ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 600, width: 130 })}
                />
              </span>
            </label>
          </div>

          <label className="text-xs flex flex-col gap-1" style={{ maxWidth: 320, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
            Months of coverage to target ({rec.min}-{rec.max} recommended)
            <input
              type="number"
              min={1}
              max={24}
              step={0.5}
              value={months}
              onChange={(e) => setMonths(Math.max(0, Number(e.target.value) || 0))}
              style={ledgerInputStyle({ fontFamily: "var(--font-heading)", fontSize: 16, width: 90 })}
            />
          </label>
          <p className="text-xs mt-2" style={{ color: "color-mix(in srgb, var(--color-text) 50%, transparent)", margin: "8px 0 0" }}>
            {rec.note}
          </p>
        </Card>

        <Card style={{ padding: "26px 28px", marginBottom: 24 }}>
          <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4">
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 18 }}>Personal fund target</span>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 30, fontWeight: 600 }}>{currency(target)}</span>
          </div>
          <ul style={{ fontSize: 14, lineHeight: 2, margin: "0 0 4px", paddingLeft: 18, color: "color-mix(in srgb, var(--color-text) 76%, transparent)" }}>
            <li>Already saved: <strong>{currency(currentSavings)}</strong></li>
            <li>Still needed: <strong>{currency(gap)}</strong></li>
            <li>
              At {currency(monthlySavingsRate)}/mo:{" "}
              <strong>{gap <= 0 ? "Goal met" : monthsToReach === Infinity ? "add a monthly amount to see a timeline" : `${monthsToReach} months away`}</strong>
            </li>
          </ul>
        </Card>

        {persona === "business_owner" && (
          <Card style={{ padding: "26px 28px", marginBottom: 24 }}>
            <div className="flex items-baseline justify-between flex-wrap gap-2 mb-2">
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 18 }}>Business reserve target</span>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 24, fontWeight: 600 }}>{currency(businessTarget)}</span>
            </div>
            <p className="text-sm m-0" style={{ color: "color-mix(in srgb, var(--color-text) 76%, transparent)" }}>
              {BUSINESS_RESERVE_MONTHS.default} months of operating expenses, kept separate from your personal
              cushion above -- covers a slow month without you having to dip into your own savings or draw less pay.
            </p>
          </Card>
        )}

        <Card style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", padding: "18px 22px", marginBottom: 20 }}>
          <p className="text-sm m-0" style={{ color: "color-mix(in srgb, var(--color-text) 76%, transparent)" }}>
            Want this saved automatically every time you get paid?
          </p>
          <PrimaryButton onClick={() => router.push("/signup")}>
            Get started free <ArrowRight size={14} />
          </PrimaryButton>
        </Card>

        <p className="text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 45%, transparent)" }}>
          A general guideline, not personalized advice -- your actual right number depends on your own situation,
          dependents, and risk tolerance.
        </p>
      </div>
    </div>
  );
}
