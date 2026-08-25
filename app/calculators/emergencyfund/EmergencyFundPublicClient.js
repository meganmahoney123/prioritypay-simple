"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import PersonaToggle from "@/components/PersonaToggle";
import { PrimaryButton, currency } from "@/components/ui";
import { BLOOM_TOKENS } from "@/lib/bloomTheme";

// Filled money field matching spec 05/04's inputs-card look: $ prefix,
// fixed height with margin-top: auto so a wrapping label doesn't knock
// neighboring controls out of baseline alignment.
function MoneyField({ label, value, onChange, height = 54, valueSize = 20, width }) {
  return (
    <label
      className="flex flex-col gap-2"
      style={{ width, fontSize: 15, fontWeight: 600, color: "var(--color-neutral-800)" }}
    >
      {label}
      <span
        style={{
          marginTop: "auto",
          height,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "var(--color-neutral-100)",
          border: "1px solid var(--color-neutral-300)",
          borderRadius: "var(--radius-sm)",
          padding: "0 14px",
        }}
      >
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 16, color: "var(--color-neutral-700)" }}>$</span>
        <input
          type="number"
          onFocus={(e) => e.target.select()}
          min={0}
          step={25}
          value={value}
          onChange={onChange}
          style={{
            width: "100%",
            border: 0,
            background: "transparent",
            outline: "none",
            fontFamily: "var(--font-mono)",
            fontSize: valueSize,
            fontWeight: 800,
            color: "var(--color-text)",
          }}
        />
      </span>
    </label>
  );
}

// Preset pill shared by the runway and timeframe rows -- 2px border,
// solid accent fill + white text when active, idle white/neutral (same
// treatment as PersonaToggle's pills per spec 05).
function PresetPill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontFamily: "var(--font-heading)",
        fontSize: 15,
        fontWeight: 700,
        padding: "12px 20px",
        borderRadius: 999,
        cursor: "pointer",
        border: `2px solid ${active ? "var(--color-accent)" : "var(--color-neutral-300)"}`,
        background: active ? "var(--color-accent)" : "var(--color-surface)",
        color: active ? "#fff" : "var(--color-accent-800)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
      }}
    >
      {children}
    </button>
  );
}

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
  const progressPct = target > 0 ? Math.min(100, Math.round((currentSavings / target) * 100)) : 0;

  return (
    <div style={BLOOM_TOKENS}>
      <PublicHeader />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px clamp(18px, 4vw, 40px) 80px" }}>
        <h1
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(38px, 4.6vw, 52px)",
            fontWeight: 800,
            letterSpacing: "-0.035em",
            lineHeight: 1.04,
            margin: "0 0 14px",
          }}
        >
          Emergency Fund Calculator
        </h1>
        <p style={{ fontSize: 19, lineHeight: 1.6, maxWidth: "42em", color: "var(--color-neutral-800)", margin: "0 0 32px" }}>
          Build your monthly expenses from what you actually spend, pick how much runway you want, and see the
          target -- and the monthly savings plan to get there. Free, no account needed.
        </p>

        {/* Inputs card */}
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-divider)", borderRadius: 30, padding: 32, marginBottom: 28 }}>
          <PersonaToggle value={persona} onChange={handlePersonaChange} />

          <div style={{ fontFamily: "var(--font-heading)", fontSize: 15, fontWeight: 700, color: "var(--color-text)", marginBottom: 14 }}>
            {persona === "business_owner" ? "Your personal monthly essentials" : "Your monthly essentials"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px 20px" }}>
            {EXPENSE_CATEGORIES.map((c) => (
              <MoneyField
                key={c.key}
                label={c.label}
                value={expenses[c.key]}
                onChange={(e) => setExpenseField(c.key, e.target.value)}
              />
            ))}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              borderTop: "1px solid var(--color-divider)",
              marginTop: 20,
              paddingTop: 20,
            }}
          >
            <span style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text)" }}>Monthly essentials total</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 30, fontWeight: 800, color: "#3B1C7A" }}>{currency(monthlyExpenses)}/mo</span>
          </div>

          <div className="flex gap-5 flex-wrap" style={{ marginTop: 20 }}>
            {persona === "business_owner" && (
              <MoneyField
                label="Business monthly operating expenses"
                value={businessExpenses}
                onChange={(e) => setBusinessExpenses(Math.max(0, Number(e.target.value) || 0))}
                height={56}
                valueSize={22}
                width={240}
              />
            )}
            <MoneyField
              label="Already saved toward this"
              value={currentSavings}
              onChange={(e) => setCurrentSavings(Math.max(0, Number(e.target.value) || 0))}
              height={56}
              valueSize={22}
              width={240}
            />
          </div>
        </div>

        {/* Runway card */}
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-divider)", borderRadius: 30, padding: 32, marginBottom: 28 }}>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 15, fontWeight: 700, color: "var(--color-text)", marginBottom: 14 }}>
            How much runway do you want?
          </div>
          <div className="flex gap-2 flex-wrap mb-3">
            {RUNWAY_PRESETS.map((m) => {
              const active = Number(months) === m;
              const recommended = m >= rec.min && m <= rec.max;
              return (
                <PresetPill key={m} active={active} onClick={() => setMonths(m)}>
                  <span>{m} mo</span>
                  {recommended && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: active ? "#fff" : "#4E22B8",
                      }}
                    >
                      recommended
                    </span>
                  )}
                </PresetPill>
              );
            })}
          </div>
          <p style={{ fontSize: 16, lineHeight: 1.6, background: "var(--color-accent-100)", borderRadius: 16, padding: "14px 18px", color: "var(--color-neutral-800)", margin: 0 }}>
            {rec.note}
          </p>
        </div>

        {/* Personal fund target -- plum panel */}
        <div style={{ background: "#3B1C7A", color: "#fff", borderRadius: 30, padding: 34, marginBottom: 28 }}>
          <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4">
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 18, fontWeight: 700, opacity: 0.85 }}>Personal fund target</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(40px, 5vw, 54px)", fontWeight: 800 }}>{currency(target)}</span>
          </div>

          {/* Progress meter -- new: derived from existing saved/target values */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ height: 12, borderRadius: 999, background: "rgba(255,255,255,0.16)", overflow: "hidden" }}>
              <div style={{ width: `${progressPct}%`, height: "100%", background: "#C4A9FA", borderRadius: 999 }} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, opacity: 0.85, marginTop: 8 }}>
              {progressPct}% of the way there &middot; {currency(currentSavings)} of {currency(target)}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
            <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 18, padding: "14px 16px" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 800 }}>{currency(monthlyExpenses)}/mo &times; {months}</div>
              <div style={{ fontSize: 14, fontWeight: 600, opacity: 0.8, marginTop: 4 }}>months of essentials</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 18, padding: "14px 16px" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 800 }}>{currency(currentSavings)}</div>
              <div style={{ fontSize: 14, fontWeight: 600, opacity: 0.8, marginTop: 4 }}>already saved</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 18, padding: "14px 16px" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 800 }}>{currency(gap)}</div>
              <div style={{ fontSize: 14, fontWeight: 600, opacity: 0.8, marginTop: 4 }}>still needed</div>
            </div>
          </div>
        </div>

        {/* Monthly breakdown card */}
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-divider)", borderRadius: 30, padding: 32, marginBottom: 28 }}>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 15, fontWeight: 700, color: "var(--color-text)", marginBottom: 14 }}>
            Break it down monthly
          </div>
          {gap <= 0 ? (
            <div style={{ background: "#E9F6EF", borderRadius: 20, padding: "18px 22px", fontSize: 19, fontWeight: 700, color: "#22684C" }}>
              &#10003; You've already got your target covered.
            </div>
          ) : (
            <>
              <p style={{ fontSize: 18, fontWeight: 600, color: "var(--color-text)", margin: "0 0 14px" }}>
                I want to reach <strong>{currency(gap)}</strong> in:
              </p>
              <div className="flex gap-2 flex-wrap items-center mb-4">
                {TIMEFRAME_PRESETS.map((t) => {
                  const active = Number(timeframe) === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTimeframe(t)}
                      style={{
                        fontFamily: "var(--font-heading)",
                        fontSize: 15,
                        fontWeight: 700,
                        padding: "13px 22px",
                        borderRadius: 999,
                        cursor: "pointer",
                        border: `2px solid ${active ? "var(--color-accent)" : "var(--color-neutral-300)"}`,
                        background: active ? "var(--color-accent)" : "var(--color-surface)",
                        color: active ? "#fff" : "var(--color-accent-800)",
                      }}
                    >
                      {t} mo
                    </button>
                  );
                })}
                <span
                  style={{
                    height: 50,
                    boxSizing: "border-box",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "var(--color-neutral-100)",
                    border: "1px solid var(--color-neutral-300)",
                    borderRadius: "var(--radius-sm)",
                    padding: "0 14px",
                  }}
                >
                  <input
                    type="number"
                    onFocus={(e) => e.target.select()}
                    min={1}
                    step={1}
                    value={timeframe}
                    onChange={(e) => setTimeframe(Math.max(1, Number(e.target.value) || 1))}
                    style={{
                      width: 56,
                      border: 0,
                      background: "transparent",
                      outline: "none",
                      textAlign: "right",
                      fontFamily: "var(--font-mono)",
                      fontSize: 18,
                      fontWeight: 800,
                      color: "var(--color-text)",
                    }}
                  />
                  <span style={{ fontSize: 15, fontWeight: 600, color: "var(--color-neutral-700)" }}>mo</span>
                </span>
              </div>
              <div style={{ background: "#EDE6FF", borderRadius: 22, padding: "20px 24px", display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 34, fontWeight: 800, color: "#4E22B8" }}>{currency(monthlyNeeded)}/mo</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text)" }}>Save this much per month to get there.</span>
              </div>
            </>
          )}
        </div>

        {/* Business reserve card -- business owner only */}
        {persona === "business_owner" && (
          <div style={{ background: "#F7F3FF", border: "1px solid #D9C9FF", borderRadius: 30, padding: 32, marginBottom: 28 }}>
            <div className="flex items-baseline justify-between flex-wrap gap-2 mb-3">
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 800, color: "var(--color-text)" }}>Business reserve target</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 34, fontWeight: 800, color: "#3B1C7A" }}>{currency(businessTarget)}</span>
            </div>
            <p style={{ fontSize: 17, lineHeight: 1.6, color: "var(--color-neutral-800)", margin: 0 }}>
              {BUSINESS_RESERVE_MONTHS.default} months of operating expenses, kept separate from your personal
              cushion above -- covers a slow month without you having to dip into your own savings or draw less pay.
            </p>
          </div>
        )}

        {/* CTA banner */}
        <div style={{ background: "#EDE6FF", borderRadius: 26, padding: "28px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
          <p style={{ fontSize: 19, fontWeight: 700, margin: 0, color: "var(--color-text)" }}>
            Want this saved automatically every time you get paid?
          </p>
          <PrimaryButton onClick={() => router.push("/signup")}>
            Get started free <ArrowRight size={14} />
          </PrimaryButton>
        </div>

        <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--color-neutral-700)" }}>
          A general guideline, not personalized advice -- your actual right number depends on your own situation,
          dependents, and risk tolerance.
        </p>
      </div>
      <PublicFooter />
    </div>
  );
}
