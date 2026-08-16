"use client";

// Shared building blocks for every authenticated page (Dashboard,
// Accounts, Split Rules, Close Out, Settings) plus AppShell -- restyled to
// Megan's "Ledger" design (see lib/ledgerTheme.js) so the whole app shell
// reads as one cohesive redesign instead of restyling each page's markup
// by hand. Every export keeps its original prop signature; only the look
// changed, so no call site needed to change.
import {
  ledgerCardStyle,
  ledgerPrimaryButtonStyle,
  ledgerGhostButtonStyle,
  ledgerBadgeStyle,
} from "@/lib/ledgerTheme";

export function Card({ children, className = "", style }) {
  return (
    <div className={className} style={ledgerCardStyle(style)}>
      {children}
    </div>
  );
}

export function PrimaryButton({ children, onClick, disabled, className = "", type = "button", style }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`pp-ledger-btn-primary ${className}`}
      style={ledgerPrimaryButtonStyle({ opacity: disabled ? 0.45 : 1, cursor: disabled ? "not-allowed" : "pointer", ...style })}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, onClick, className = "", disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`pp-ledger-btn-ghost ${className}`}
      style={ledgerGhostButtonStyle({ opacity: disabled ? 0.45 : 1, cursor: disabled ? "not-allowed" : "pointer" })}
    >
      {children}
    </button>
  );
}

export function Badge({ children, tone = "emerald" }) {
  const tones = {
    emerald: {},
    amber: { color: "var(--color-accent-800)", borderColor: "var(--color-accent-600)" },
    neutral: { color: "color-mix(in srgb, var(--color-text) 55%, transparent)", borderColor: "var(--color-divider)" },
  };
  return <span style={ledgerBadgeStyle(tones[tone])}>{children}</span>;
}

export const currency = (n) =>
  Number(n || 0).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
