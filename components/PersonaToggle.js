"use client";

// Shared "which describes you" pill toggle for the persona-aware public
// calculators (Tax Estimator, Emergency Fund, Debt Payoff). Kept as one
// component so the three-way self-employed/business-owner/W2 choice looks
// and behaves identically everywhere it appears, and options are
// filterable per calculator (e.g. Solo 401k/SEP IRA never shows W2 at
// all, since W2 employees don't have access to those plans).
export const ALL_PERSONAS = [
  { value: "self_employed", label: "Self-employed" },
  { value: "business_owner", label: "Business owner" },
  { value: "w2", label: "W2 employee" },
];

export default function PersonaToggle({ value, onChange, options = ALL_PERSONAS, label = "Which describes you?" }) {
  return (
    <div className="mb-5">
      <div
        className="text-xs mb-2"
        style={{ letterSpacing: "0.06em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}
      >
        {label}
      </div>
      <div className="flex gap-2 flex-wrap" role="group" aria-label={label}>
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              style={{
                fontSize: 13.5,
                padding: "8px 16px",
                borderRadius: 999,
                cursor: "pointer",
                fontFamily: "var(--font-heading)",
                border: `1px solid ${active ? "var(--color-accent)" : "var(--color-divider)"}`,
                background: active ? "color-mix(in srgb, var(--color-accent) 12%, transparent)" : "transparent",
                color: active ? "var(--color-accent-700)" : "color-mix(in srgb, var(--color-text) 65%, transparent)",
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
