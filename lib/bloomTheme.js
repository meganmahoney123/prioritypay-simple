// Shared design tokens for the "Bloom" visual system (Figtree + IBM Plex
// Mono, purple palette) from the Aug 2026 redesign handoff -- same token
// *shape* as lib/ledgerTheme.js (LEDGER_TOKENS) so any component already
// wired to read var(--color-*)/var(--font-*)/var(--radius-*) re-themes
// automatically just by swapping which tokens object is spread on the
// page's wrapping element, exactly like PublicHeader.js does for the
// marketing site. This file is intentionally separate from
// lib/ledgerTheme.js -- LEDGER_TOKENS is still used by the dashboard,
// accounts, split rules, settings, and every calculator page, none of
// which are being redesigned yet, so those must keep reading the old
// values untouched.
export const BLOOM_TOKENS = {
  "--color-bg": "#FAF7FD",
  "--color-surface": "#FFFFFF",
  "--color-text": "#241634",
  "--color-accent": "#6D3BE0",
  "--color-accent-2": "#4E22B8",
  "--color-divider": "#EFE7FA",

  "--color-neutral-100": "#FAF7FD",
  "--color-neutral-200": "#F2ECFC",
  "--color-neutral-300": "#E3D6FA",
  "--color-neutral-400": "#D9C9FF",
  "--color-neutral-500": "#C4A9FA",
  "--color-neutral-600": "#9A72F0",
  // #6B5E7A, not the spec's originally-listed #8A7C99 -- the Aug 25
  // handoff (zip 4) corrected this: #8A7C99 failed WCAG AA contrast on
  // both white and #FAF7FD, #6B5E7A is the only muted value the spec
  // now allows for text under 18px (5.2:1 on white, 4.9:1 on #FAF7FD).
  "--color-neutral-700": "#6B5E7A",
  "--color-neutral-800": "#574A68",
  "--color-neutral-900": "#241634",

  "--color-accent-100": "#F4EEFF",
  "--color-accent-200": "#EDE6FF",
  "--color-accent-300": "#D9C9FF",
  "--color-accent-400": "#C4A9FA",
  "--color-accent-500": "#9A72F0",
  "--color-accent-600": "#6D3BE0",
  "--color-accent-700": "#4E22B8",
  "--color-accent-800": "#3B1C7A",
  "--color-accent-900": "#2A1550",

  // Cards/panels in the new spec run 20-24px; buttons use --radius-pill
  // (see app/globals.css .pp-btn, and bloomPrimaryButtonStyle below)
  // rather than --radius-md, so bumping radius-md here does NOT make
  // every ledger-token-driven button pill-shaped by accident.
  "--radius-sm": "14px",
  "--radius-md": "22px",
  "--radius-lg": "30px",
  "--radius-pill": "999px",

  "--shadow-sm": "0 1px 2px rgba(52,26,102,0.06)",
  "--shadow-md": "0 12px 28px -12px rgba(52,26,102,0.18)",
  "--shadow-lg": "0 30px 60px -30px rgba(52,26,102,0.3)",

  "--font-heading": '"Figtree", -apple-system, sans-serif',
  "--font-body": '"Figtree", -apple-system, sans-serif',
  "--font-mono": '"IBM Plex Mono", monospace',

  fontFamily: "var(--font-body)",
  color: "var(--color-text)",
  background: "var(--color-bg)",
};

// Rounded, bordered field matching the new spec's input look (radius
// 14-16px, full border, 16px min font so iOS Safari doesn't auto-zoom).
export const bloomInputStyle = (extra = {}) => ({
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "var(--font-body)",
  fontSize: 16,
  color: "var(--color-text)",
  background: "var(--color-surface)",
  border: "1px solid var(--color-neutral-300)",
  borderRadius: "var(--radius-sm)",
  padding: "14px 16px",
  ...extra,
});

export const bloomSelectStyle = (extra = {}) => bloomInputStyle(extra);

export const bloomCardStyle = (extra = {}) => ({
  border: "1px solid var(--color-divider)",
  borderRadius: "var(--radius-md)",
  background: "var(--color-surface)",
  ...extra,
});
