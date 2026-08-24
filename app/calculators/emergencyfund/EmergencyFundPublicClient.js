"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import PersonaToggle from "@/components/PersonaToggle";
import { Card, PrimaryButton, currency } from "@/components/ui";
import { LEDGER_TOKENS, ledgerInputStyle } from "@/lib/ledgerTheme";

// Rebuilt per Megan's Aug 2026 feedback: the old version made you type
// one lump-sum "monthly expenses" number and one lump-sum "can save per
// month" number, which doesn't actually help anyone figure out either
// of those numbers. This version:
//   1. Builds the monthly expense total from a short list of common
//      categories instead of asking you to already know the total.
//   2. Picks runway with preset month buttons (3/6/9/12/18/24) instead
//      of a bare number field, with the recommended range called out.
//   3. Breaks the resulting gap down into a monthly savings figure
//      driven by "how many months do you want to take to get there"
//      (goal first), rather than the old reverse framing of "how much
//      can you save -> how long will it take."

const EXPENSE_CATEGORIES = [
  { key: "housing", label: "Housing (rent or mortgage)", default: 1500 },
  { key: "utilities", label: "Utilities", default: 250 },
  { key: "food", label: "Food & groceries", default: 600 },
  { key: "insurance", label: "Insurance", default: 300 },
  { key: "transportDebt", label: "Transportation & debt payments", default: 400 },
  { key: "other", label: "Other essentials", default: 200 },
];

const RUNWAY_PRESETS = [3, 6, 9, 12, 18, 24];
const TIMEFRAME_PRESETS = [6, 12, 18, 24];

// Recommended coverage range leans on how volatile/replaceable the income
// actually is -- a steady W2 paycheck can responsibly run a smaller
// cushion than income that can vanish with one client or one bad month,
// which is the whole reason this calculator asks who's using it instead
// of giving one generic "3-6 months" answer to everyone.
const RECOMMENDED_MONTHS = {
  self_employed: { min: 6, default: 9, max: 12, note: "Income can swing month to month, so the usual 3-6 months most advice gives isn't enough runway." },
  business_owner: { min: 6, default: 9, max: 12, note: "Same logic as self-employed for your personal cushion -- plus a separate reserve below for the business itself." },
  w2: { min: 3, default: 6, max: 6, note: "A steady paycheck means less runway is needed -- this is the range most general advice is built around." },
};
const BUSINESS_RESERVE_MONTHS = { min: 3, default: 3, max: 6 };

export default function EmergencyFundPublicClient() {
  const router = useRouter();
  const [persona, setPersona] = useState("self_employed");
  const [expenses, setExpenses] = useState(() => Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.key, c.default])));
  const [businessExpenses, setBusinessExpenses] = useState(2500);
  const [currentSavings, setCurrentSavings] = useState(3000);
  const [months, setMonths] = useState(RECOMMENDED_MONTHS.self_employed.default);
  const [timeframe, setTimeframe] = useState(12);

  const rec = RECOMMENDED_MONTHS[persona];

  const handlePersonaChange = (p) => {
    setPersona(p);
    setMonths(RECOMMENDED_MONTHS[p].default);
  };

  const monthlyExpenses = useMemo(() => EXPENSE_CATEGORIES.reduce((sum, c) => sum + (Number(expenses[c.key]) || 0), 0), [expenses]);
  const setExpenseField = (key, value) => setExpenses((prev) => ({ ...prev, [key]: Math.max(0, Number(value) || 0) }));

  const target = useMemo(() => monthlyExpenses * (Number(months) || 0), [monthlyExpenses, months]);
  const gap = Math.max(0, target - currentSavings);
  const monthlyNeeded = gap > 0 ? Math.ceil(gap / (Number(timeframe) || 1)) : 0;

  const businessTarget = businessExpenses * BUSINESS_RESERVE_MONTHS.default;

  return (
    <div style={LEDGER_TOKENS}>
      <PublicHeader />
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "48px clamp(18px, 4vw, 40px) 80px" }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(30px, 4vw, 40px)", fontWeight: 400, margin: "0 0 10px" }}>
          Emergency Fund Calculator
        </h1>
        <p className="text-sm" style={{ maxWidth: 580, color: "color-mix(in srgb, var(--color-text) 76%, transparent)", margin: "0 0 32px" }}>
          Build your monthly expenses from what you actually spend, pick how much runway you want, and see the
          target -- and the monthly savings plan to get there. Free, no account needed.
        </p>

        <Card style={{ padding: "24px 26px", marginBottom: 24 }}>
          <PersonaToggle value={persona} onChange={handlePersonaChange} />

          <div className="text-xs mb-2" style={{ letterSpacing: "0.06em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
            {persona === "business_owner" ? "Your personal monthly essentials" : "Your monthly essentials"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px 24px", marginBottom: 8 }}>
            {EXPENSE_CATEGORIES.map((c) => (
              <label key={c.key} className="text-xs flex flex-col gap-1" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                {c.label}
                <span style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{ fontFamily: "var(--font-heading)", fontSize: 16, color: "color-mix(in srgb, var(--color-text) 45%, transparent)" }}>$</span>
                  <input
                    type="number"
                    onFocus={(e) => e.target.select()}
                    min={0}
                    step={25}
                    value={expenses[c.key]}
                    onChange={(e) => setExpenseField(c.key, e.target.value)}
                    style={ledgerInputStyle({ fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 600, width: "100%" })}
                  />
                </span>
              </label>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              borderTop: "1px solid var(--color-divider)",
              marginTop: 14,
              paddingTop: 14,
            }}
          >
            <span className="text-sm" style={{ color: "color-mix(in srgb, var(--color-text) 65%, transparent)" }}>Monthly essentials total</span>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 600 }}>{currency(monthlyExpenses)}/mo</span>
          </div>

          {persona === "business_owner" && (
            <label className="text-xs flex flex-col gap-1 mt-5" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
              Business monthly operating expenses
              <span style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontFamily: "var(--font-heading)", fontSize: 18, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>$</span>
                <input
                  type="number"
                  onFocus={(e) => e.target.select()}
                  min={0}
                  step={100}
                  value={businessExpenses}
                  onChange={(e) => setBusinessExpenses(Math.max(0, Number(e.target.value) || 0))}
                  style={ledgerInputStyle({ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 600, width: 150 })}
                />
              </span>
            </label>
          )}

          <label className="text-xs flex flex-col gap-1 mt-5" style={{ maxWidth: 240, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
            Already saved toward this
            <span style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 18, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>$</span>
              <input
                type="number"
                onFocus={(e) => e.target.select()}
                min={0}
                step={100}
                value={currentSavings}
                onChange={(e) => setCurrentSavings(Math.max(0, Number(e.target.value) || 0))}
                style={ledgerInputStyle({ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 600, width: 150 })}
              />
            </span>
          </label>
        </Card>

        <Card style={{ padding: "24px 26px", marginBottom: 24 }}>
          <div className="text-xs mb-2" style={{ letterSpacing: "0.06em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
            How much runway do you want?
          </div>
          <div className="flex gap-2 flex-wrap mb-2">
            {RUNWAY_PRESETS.map((m) => {
              const active = Number(months) === m;
              const recommended = m >= rec.min && m <= rec.max;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMonths(m)}
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: 13.5,
                    fontWeight: 600,
                    padding: "8px 16px",
                    borderRadius: 999,
                    cursor: "pointer",
                    border: `1px solid ${active ? "var(--color-accent)" : "var(--color-divider)"}`,
                    background: active ? "var(--color-accent-100)" : "transparent",
                    color: active ? "var(--color-accent-800)" : "color-mix(in srgb, var(--color-text) 65%, transparent)",
                  }}
                >
                  {m} mo{recommended ? " · recommended" : ""}
                </button>
              );
            })}
          </div>
          <p className="text-xs" style={{ color: "color-mix(in srgb, var(--color-text) 50%, transparent)", margin: "8px 0 0" }}>
            {rec.note}
          </p>
        </Card>

        <Card style={{ padding: "26px 28px", marginBottom: 24 }}>
          <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4">
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 18 }}>Personal fund target</span>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 30, fontWeight: 600 }}>{currency(target)}</span>
          </div>
          <ul style={{ fontSize: 14, lineHeight: 2, margin: "0 0 4px", paddingLeft: 18, color: "color-mix(in srgb, var(--color-text) 76%, transparent)" }}>
            <li>{currency(monthlyExpenses)}/mo &times; {months} months</li>
            <li>Already saved: <strong>{currency(currentSavings)}</strong></li>
            <li>Still needed: <strong>{currency(gap)}</strong></li>
          </ul>
        </Card>

        <Card style={{ padding: "24px 26px", marginBottom: 24 }}>
          <div className="text-xs mb-2" style={{ letterSpacing: "0.06em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
            Break it down monthly
          </div>
          {gap <= 0 ? (
            <p className="text-sm m-0" style={{ color: "var(--color-accent-700)", fontWeight: 600 }}>
              You've already got your target covered.
            </p>
          ) : (
            <>
              <p className="text-sm mb-3" style={{ color: "color-mix(in srgb, var(--color-text) 65%, transparent)" }}>
                I want to reach {currency(gap)} in:
              </p>
              <div className="flex gap-2 flex-wrap items-center mb-3">
                {TIMEFRAME_PRESETS.map((t) => {
                  const active = Number(timeframe) === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTimeframe(t)}
                      style={{
                        fontFamily: "var(--font-heading)",
                        fontSize: 13.5,
                        fontWeight: 600,
                        padding: "8px 16px",
                        borderRadius: 999,
                        cursor: "pointer",
                        border: `1px solid ${active ? "var(--color-accent)" : "var(--color-divider)"}`,
                        background: active ? "var(--color-accent-100)" : "transparent",
                        color: active ? "var(--color-accent-800)" : "color-mix(in srgb, var(--color-text) 65%, transparent)",
                      }}
                    >
                      {t} mo
                    </button>
                  );
                })}
                <label className="text-xs flex items-baseline gap-1" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                  or custom:
                  <input
                    type="number"
                    onFocus={(e) => e.target.select()}
                    min={1}
                    step={1}
                    value={timeframe}
                    onChange={(e) => setTimeframe(Math.max(1, Number(e.target.value) || 1))}
                    style={ledgerInputStyle({ fontFamily: "var(--font-heading)", fontSize: 15, width: 60 })}
                  />
                  mo
                </label>
              </div>
              <div className="flex items-baseline justify-between flex-wrap gap-2" style={{ borderTop: "1px solid var(--color-divider)", paddingTop: 14 }}>
                <span className="text-sm" style={{ color: "color-mix(in srgb, var(--color-text) 65%, transparent)" }}>Save this much per month</span>
                <span style={{ fontFamily: "var(--font-heading)", fontSize: 26, fontWeight: 600, color: "var(--color-accent-700)" }}>{currency(monthlyNeeded)}/mo</span>
              </div>
            </>
          )}
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
      <PublicFooter />
    </div>
  );
}
