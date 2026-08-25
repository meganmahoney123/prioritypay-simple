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

// Restyled per the Aug 2026 Bloom redesign (spec 04/05): the label is now
// a normal-weight sentence instead of small uppercase letterspaced gray,
// and the active pill is a solid accent fill with white text -- the old
// active state (a faint accent-tinted wash) read as nearly invisible next
// to the idle pills once the design moved off the amber ledger palette.
export default function PersonaToggle({ value, onChange, options = ALL_PERSONAS, label = "Which describes you?" }) {
  return (
    <div className="mb-5">
      <div
        className="mb-2"
        style={{ fontFamily: "var(--font-heading)", fontSize: 15, fontWeight: 700, color: "var(--color-text)" }}
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
              aria-pressed={active}
              style={{
                fontSize: 16,
                fontWeight: 700,
                padding: "14px 26px",
                borderRadius: 999,
                cursor: "pointer",
                fontFamily: "var(--font-heading)",
                border: `2px solid ${active ? "var(--color-accent)" : "var(--color-neutral-300)"}`,
                background: active ? "var(--color-accent)" : "var(--color-surface)",
                color: active ? "#fff" : "var(--color-accent-800)",
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
