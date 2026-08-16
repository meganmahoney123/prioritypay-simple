// Shared design tokens for the "Ledger" visual system (Cormorant Garamond +
// Lora, cream/gold palette) Megan designed in Claude Design and that's now
// used across the homepage, onboarding, and dashboard. Values copied
// verbatim from the exported design's _ds/styles.css so every surface
// stays visually identical. Fonts are loaded globally in app/layout.js.
//
// Components that render in more than one place (PercentSplitEditor,
// AccountSelect, RetirementNote, IdentityForm, CreateSubAccountFlow) take
// an optional `theme="ledger"` prop to opt into this look -- their default
// (no theme prop) rendering is untouched, so the standalone Split Rules
// page keeps its original appearance until/unless that gets its own pass.
export const LEDGER_TOKENS = {
  "--color-bg": "#f3f2f2",
  "--color-surface": "#eae9e9",
  "--color-text": "#201f1d",
  "--color-accent": "#b68235",
  "--color-accent-2": "#ac803e",
  "--color-divider": "color-mix(in srgb, #201f1d 16%, transparent)",

  "--color-neutral-100": "#f8f4f4",
  "--color-neutral-200": "#eae7e7",
  "--color-neutral-300": "#d7d3d3",
  "--color-neutral-400": "#bab6b6",
  "--color-neutral-500": "#9b9797",
  "--color-neutral-600": "#7d7979",
  "--color-neutral-700": "#605d5d",
  "--color-neutral-800": "#444141",
  "--color-neutral-900": "#2d2b2b",

  "--color-accent-100": "#fff3e4",
  "--color-accent-200": "#ffe3bf",
  "--color-accent-300": "#facb8d",
  "--color-accent-400": "#e1ad66",
  "--color-accent-500": "#c28d41",
  "--color-accent-600": "#a06f24",
  "--color-accent-700": "#7d5411",
  "--color-accent-800": "#5a3b0a",
  "--color-accent-900": "#3a270d",

  "--radius-sm": "2px",
  "--radius-md": "4px",
  "--radius-lg": "7px",

  "--shadow-sm": "0 1px 2px color-mix(in srgb, #2d2b2b 14%, transparent)",
  "--shadow-md": "0 3px 10px color-mix(in srgb, #2d2b2b 16%, transparent)",
  "--shadow-lg": "0 12px 32px color-mix(in srgb, #2d2b2b 22%, transparent)",

  "--font-heading": '"Cormorant Garamond", serif',
  "--font-body": '"Lora", serif',

  fontFamily: "var(--font-body)",
  color: "var(--color-text)",
  background: "var(--color-bg)",
};

// A bare, underlined input matching the design's Business/Splits fields --
// used anywhere a plain text/number/date input needs the ledger look.
export const ledgerInputStyle = (extra = {}) => ({
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "var(--font-body)",
  fontSize: 15,
  color: "var(--color-text)",
  background: "transparent",
  border: 0,
  borderBottom: "1px solid var(--color-divider)",
  borderRadius: 0,
  padding: "10px 2px",
  ...extra,
});

export const ledgerSelectStyle = (extra = {}) => ledgerInputStyle(extra);
