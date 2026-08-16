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

// Card, button, and badge styles shared by the ui.js atoms (Card,
// PrimaryButton, GhostButton, Badge) so every authenticated page --
// Dashboard, Accounts, Split Rules, Close Out, Settings -- inherits the
// same look automatically instead of restyling each page's markup by hand.
export const ledgerCardStyle = (extra = {}) => ({
  border: "1px solid var(--color-divider)",
  borderRadius: "var(--radius-md)",
  background: "var(--color-neutral-100)",
  ...extra,
});

export const ledgerButtonBase = {
  fontFamily: "var(--font-heading)",
  fontSize: 15,
  cursor: "pointer",
  whiteSpace: "nowrap",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  transition: "border-color 160ms ease, background 160ms ease, color 160ms ease, opacity 160ms ease",
  padding: "12px 24px",
  borderRadius: "var(--radius-md)",
};

export const ledgerPrimaryButtonStyle = (extra = {}) => ({
  ...ledgerButtonBase,
  background: "var(--color-accent)",
  border: "1px solid var(--color-accent)",
  color: "#fff",
  ...extra,
});

export const ledgerGhostButtonStyle = (extra = {}) => ({
  ...ledgerButtonBase,
  background: "transparent",
  border: "1px solid var(--color-divider)",
  color: "var(--color-text)",
  ...extra,
});

export const ledgerBadgeStyle = (extra = {}) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontFamily: "var(--font-heading)",
  fontSize: 11,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--color-accent-700)",
  border: "1px solid var(--color-accent)",
  borderRadius: 999,
  padding: "5px 12px",
  whiteSpace: "nowrap",
  ...extra,
});

// Accent-tinted callout card (matches the design's "Total saved" hero box)
// -- used for neutral/positive highlighted callouts across the dashboard.
export const ledgerAccentCardStyle = (extra = {}) => ({
  border: "1px solid var(--color-accent-300)",
  borderRadius: "var(--radius-lg)",
  background: "color-mix(in srgb, var(--color-accent) 6%, transparent)",
  ...extra,
});

// Amber-toned notice card -- e.g. "these categories need an account before
// money can move." Less severe than ledgerWarningCardStyle.
export const ledgerNoticeCardStyle = (extra = {}) => ({
  border: "1px solid #d8a34c",
  borderRadius: "var(--radius-md)",
  background: "color-mix(in srgb, #d8a34c 10%, transparent)",
  color: "#6b4d15",
  ...extra,
});

// Muted warm-red warning card -- reserved for the dashboard's
// non-dismissible "you aren't contributing to retirement/investments"
// callouts, kept out of the neutral accent palette on purpose so these
// still read as more urgent than a routine notice.
export const ledgerWarningCardStyle = (extra = {}) => ({
  border: "1px solid #b3695f",
  borderRadius: "var(--radius-md)",
  background: "color-mix(in srgb, #9b3b3b 7%, transparent)",
  color: "#7a2f2a",
  ...extra,
});
