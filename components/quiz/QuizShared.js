"use client";

// Shared building blocks for the Tax Savings Quiz, used by both the public
// marketing page (app/tax-savings-quiz) and the logged-in in-app version
// (app/(app)/advisor). Extracted from the original TaxSavingsQuizClient.js
// so both surfaces render identically and stay in sync automatically --
// there's no reason the account-holder version should look or behave
// differently from the one prospects see.

import { useState } from "react";

export const CATEGORY_BLURBS = {
  "Retirement Accounts": "Ways to shelter income and grow savings tax-advantaged.",
  "Health & Education Accounts": "HSA, 529, and similar earmarked accounts.",
  "Family & Dependents": "Strategies tied to a spouse, kids, or dependents.",
  "Business Deductions": "Everyday business spending that may be deductible.",
  "Business Structure & Elections": "How your entity is set up, and elections available to it.",
  "Investment Tax": "Managing taxes on a taxable brokerage account.",
  "Charitable Giving": "Ways to structure giving more tax-efficiently.",
  "Equity & Startups": "Stock options, QSBS, and startup-equity mechanics.",
  "State & Residency": "State tax exposure, residency, and cross-border issues.",
  "Recent Law Changes": "Provisions from recent tax legislation that may affect you.",
};

// Renders one line of the If / You could / The benefit framework, a
// small uppercase label plus the sentence, so the three pieces read as a
// single structured claim per card instead of a wall of prose. "You could"
// is bolded slightly heavier since it's the actionable center of the card.
export function StrategyLine({ label, text, emphasize }) {
  if (!text) return null;
  // Fixed 96px chip + sentence, two-column row (wraps to stacked on narrow
  // widths) -- replaces the old tiny inline caps label, which read as part
  // of the sentence rather than a distinct structural marker. Benefit gets
  // its own green tint so it reads as a distinct, positive outcome; If/You
  // could share the purple tint since they're both part of the same
  // conditional-action framing.
  const isBenefit = label === "The benefit";
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap", margin: "0 0 8px" }}>
      <span
        style={{
          flex: "0 0 96px",
          width: 96,
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          borderRadius: 8,
          padding: "4px 8px",
          textAlign: "center",
          color: isBenefit ? "#22684C" : "#4E22B8",
          background: isBenefit ? "#E9F6EF" : "#F4EEFF",
        }}
      >
        {label}
      </span>
      <p
        className="text-sm"
        style={{
          flex: "1 1 220px",
          minWidth: 0,
          margin: 0,
          fontSize: 17,
          lineHeight: 1.6,
          color: emphasize ? "#241634" : "color-mix(in srgb, var(--color-text) 82%, transparent)",
        }}
      >
        {text}
      </p>
    </div>
  );
}

export function StrategyCard({ s }) {
  const [showScenario, setShowScenario] = useState(false);
  return (
    <div style={{ borderTop: "1px solid #F2ECFC", padding: "18px 0" }}>
      <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 10 }}>{s.title}</div>

      <StrategyLine label="If" text={s.condition} />
      <StrategyLine label="You could" text={s.action} emphasize />
      <StrategyLine label="The benefit" text={s.benefit} />

      {s.scenario && (
        <div style={{ margin: "8px 0" }}>
          <button
            type="button"
            onClick={() => setShowScenario((v) => !v)}
            style={{
              background: "transparent",
              border: 0,
              padding: 0,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "var(--font-heading)",
              fontSize: 15,
              fontWeight: 700,
              color: "#6D3BE0",
            }}
            aria-expanded={showScenario}
          >
            Sample scenario
            <span style={{ fontSize: 11, transform: showScenario ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
              ▾
            </span>
          </button>

          {showScenario && (
            <div
              style={{
                marginTop: 8,
                padding: "12px 14px",
                borderRadius: 16,
                background: "#FAF7FD",
                border: "1px solid var(--color-divider)",
              }}
            >
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 55%, transparent)", marginBottom: 6 }}>
                Example
              </div>
              <p className="text-sm" style={{ margin: "0 0 8px", fontSize: 16, lineHeight: 1.6, color: "var(--color-text)" }}>
                {s.scenario}
              </p>
              <p style={{ margin: 0, fontSize: 12, fontStyle: "italic", color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                Illustrative only, using example numbers. Not a calculation of your actual numbers or a prediction of what you'd save.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Deliberately the quietest element on the card, per spec, while
          still passing contrast -- same muted color/weight as the rest of
          the page's meta text, no colored chip like the If/You could/
          Benefit rows above. */}
      {s.notFinancialAdviceNote && (
        <div style={{ display: "flex", gap: 14, marginTop: 4, flexWrap: "wrap" }}>
          <span style={{ flex: "0 0 96px", width: 96, fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#6B5E7A", flexShrink: 0, paddingTop: 1 }}>
            Not advice
          </span>
          <p style={{ flex: "1 1 220px", minWidth: 0, margin: 0, fontSize: 15, fontStyle: "italic", color: "#6B5E7A" }}>
            {s.notFinancialAdviceNote}
          </p>
        </div>
      )}
    </div>
  );
}

// `multi` distinguishes a checkbox-style mark (square, for select-all-that-
// apply questions) from a radio-style mark (circle, for choose-one
// questions) -- the redesign's fix for the old design giving no visible
// selected state and no way to tell single- vs multi-select apart just by
// looking at the options.
export function OptionButton({ selected, onClick, label, multi }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        width: "100%",
        minHeight: 60,
        textAlign: "left",
        boxSizing: "border-box",
        padding: "18px 20px",
        marginBottom: 10,
        borderRadius: 18,
        border: selected ? "2px solid #6D3BE0" : "2px solid #E3D6FA",
        background: selected ? "#F4EEFF" : "var(--color-surface, #fff)",
        color: "var(--color-text)",
        fontFamily: "var(--font-body)",
        fontSize: 17,
        fontWeight: 600,
        cursor: "pointer",
        transition: "border-color 140ms ease, background 140ms ease",
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.borderColor = "#9A72F0";
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.borderColor = "#E3D6FA";
      }}
    >
      <span
        style={{
          flexShrink: 0,
          width: 24,
          height: 24,
          borderRadius: multi ? 8 : "50%",
          border: selected ? "2px solid #6D3BE0" : "2px solid #D9C9FF",
          background: selected ? "#6D3BE0" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {selected && (
          <span style={{ color: "#fff", fontSize: 14, fontWeight: 800, lineHeight: 1 }}>✓</span>
        )}
      </span>
      {label}
    </button>
  );
}
