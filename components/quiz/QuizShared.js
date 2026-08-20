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
  return (
    <p
      className="text-sm"
      style={{
        margin: "0 0 8px",
        color: emphasize ? "var(--color-text)" : "color-mix(in srgb, var(--color-text) 80%, transparent)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: 10.5,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--color-accent-700)",
          marginRight: 8,
        }}
      >
        {label}
      </span>
      {text}
    </p>
  );
}

export function StrategyCard({ s }) {
  const [showScenario, setShowScenario] = useState(false);
  return (
    <div style={{ borderTop: "1px solid var(--color-divider)", padding: "18px 0" }}>
      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 10 }}>{s.title}</div>

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
              fontSize: 13,
              fontWeight: 600,
              color: "var(--color-accent-700)",
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
                borderRadius: "var(--radius-sm)",
                background: "var(--color-neutral-200)",
                border: "1px solid var(--color-divider)",
              }}
            >
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 55%, transparent)", marginBottom: 6 }}>
                Example
              </div>
              <p className="text-sm" style={{ margin: "0 0 8px", color: "var(--color-text)" }}>
                {s.scenario}
              </p>
              <p style={{ margin: 0, fontSize: 12, fontStyle: "italic", color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                Illustrative only, using example numbers. Not a calculation of your actual numbers or a prediction of what you'd save.
              </p>
            </div>
          )}
        </div>
      )}

      {s.notFinancialAdviceNote && (
        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <span style={{ fontFamily: "var(--font-heading)", fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 50%, transparent)", flexShrink: 0, paddingTop: 1 }}>
            Not advice
          </span>
          <p style={{ margin: 0, fontSize: 12.5, fontStyle: "italic", color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
            {s.notFinancialAdviceNote}
          </p>
        </div>
      )}
    </div>
  );
}

export function OptionButton({ selected, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "14px 16px",
        marginBottom: 10,
        borderRadius: "var(--radius-md)",
        border: selected ? "1px solid var(--color-accent)" : "1px solid var(--color-divider)",
        background: selected ? "color-mix(in srgb, var(--color-accent) 12%, var(--color-neutral-100))" : "var(--color-neutral-100)",
        color: "var(--color-text)",
        fontFamily: "var(--font-body)",
        fontSize: 15,
        cursor: "pointer",
      }}
    >
      <span style={{ marginRight: 10 }}>{selected ? "◉" : "○"}</span>
      {label}
    </button>
  );
}
