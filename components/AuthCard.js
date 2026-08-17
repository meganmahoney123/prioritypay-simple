"use client";

import { Loader2 } from "lucide-react";
import { LEDGER_TOKENS } from "@/lib/ledgerTheme";

// Shared "Ledger" visual scaffold for /login and /signup -- built from
// Megan's PriorityPay-Auth.dc.html export (a single-card prototype that
// toggled between a "signup" and "login" mode). This app keeps those as
// two real routes instead of one client-side toggle, so the card chrome
// (logo, card, fields, submit button, switch-page footer link) lives here
// and each page owns its own Supabase auth call, loading/error state, and
// copy. Values (padding, font sizes, colors) are copied directly from the
// exported design's inline styles so the page matches pixel-for-pixel.
function Logo() {
  return (
    <span style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 10, marginBottom: 30 }}>
      <span style={{ fontFamily: "var(--font-heading)", fontSize: 26, letterSpacing: "0.01em" }}>Priority</span>
      <span style={{ fontFamily: "var(--font-heading)", fontSize: 26, fontStyle: "italic", color: "var(--color-accent-700)", marginLeft: -10 }}>
        Pay
      </span>
    </span>
  );
}

const fieldLabelStyle = {
  display: "block",
  fontFamily: "var(--font-heading)",
  fontSize: 12,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "color-mix(in srgb, var(--color-text) 60%, transparent)",
  marginBottom: 9,
};

const fieldInputStyle = {
  width: "100%",
  boxSizing: "border-box",
  // 16px keeps iOS Safari from auto-zooming the page when a field is
  // focused -- important since this is often the first screen someone
  // hits on a phone.
  fontFamily: "var(--font-body)",
  fontSize: 16,
  color: "var(--color-text)",
  background: "transparent",
  border: 0,
  borderBottom: "1px solid var(--color-divider)",
  borderRadius: 0,
  padding: "11px 2px",
};

export default function AuthCard({
  title,
  subtitle,
  email,
  onEmail,
  password,
  onPassword,
  passwordPlaceholder,
  passwordMinLength,
  onSubmit,
  submitLabel,
  loading,
  error,
  switchPrompt,
  switchLabel,
  switchHref,
  children,
}) {
  return (
    <div
      className="pp-auth-shell"
      style={{
        ...LEDGER_TOKENS,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 20px 64px",
      }}
    >
      <Logo />

      <div
        style={{
          width: "100%",
          maxWidth: "26em",
          border: "1px solid var(--color-divider)",
          borderRadius: "var(--radius-lg)",
          background: "var(--color-neutral-100)",
          boxShadow: "var(--shadow-sm)",
          padding: "clamp(28px, 6vw, 40px) clamp(22px, 6vw, 38px) clamp(28px, 6vw, 38px)",
          boxSizing: "border-box",
        }}
      >
        {children ? (
          children
        ) : (
          <>
            <h1
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(28px, 7vw, 38px)",
                fontWeight: 400,
                lineHeight: 1.06,
                letterSpacing: "-0.015em",
                margin: "0 0 8px",
              }}
            >
              {title}
            </h1>
            <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "color-mix(in srgb, var(--color-text) 66%, transparent)", margin: 0 }}>
              {subtitle}
            </p>
            <div style={{ height: 1, background: "var(--color-divider)", margin: "24px 0 28px" }} />

            <form onSubmit={onSubmit} style={{ display: "grid", gap: 22 }}>
              <div>
                <label htmlFor="pp-email" style={fieldLabelStyle}>
                  Email
                </label>
                <input
                  id="pp-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={onEmail}
                  placeholder="you@example.com"
                  style={fieldInputStyle}
                />
              </div>
              <div>
                <label htmlFor="pp-pass" style={fieldLabelStyle}>
                  Password
                </label>
                <input
                  id="pp-pass"
                  type="password"
                  required
                  minLength={passwordMinLength}
                  autoComplete={passwordMinLength ? "new-password" : "current-password"}
                  value={password}
                  onChange={onPassword}
                  placeholder={passwordPlaceholder}
                  style={fieldInputStyle}
                />
              </div>

              {error && (
                <p style={{ fontSize: 13.5, lineHeight: 1.5, color: "#7a2f2a", margin: 0 }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="pp-auth-submit"
                style={{
                  width: "100%",
                  marginTop: 4,
                  padding: "15px 26px",
                  fontFamily: "var(--font-heading)",
                  fontSize: 15.5,
                  fontWeight: 600,
                  color: "#fff",
                  background: "var(--color-accent)",
                  border: "1px solid var(--color-accent)",
                  borderRadius: "var(--radius-md)",
                  cursor: loading ? "default" : "pointer",
                  opacity: loading ? 0.75 : 1,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxSizing: "border-box",
                }}
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {submitLabel}
              </button>
            </form>
          </>
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "center",
          gap: 8,
          flexWrap: "wrap",
          marginTop: 22,
          fontSize: 15,
          textAlign: "center",
          color: "color-mix(in srgb, var(--color-text) 62%, transparent)",
        }}
      >
        <span>{switchPrompt}</span>
        <a
          href={switchHref}
          className="pp-auth-switch"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: 16,
            fontStyle: "italic",
            color: "var(--color-accent-700)",
            textDecoration: "underline",
            textUnderlineOffset: "3px",
          }}
        >
          {switchLabel}
        </a>
      </div>

      <style jsx global>{`
        .pp-auth-submit:hover:not(:disabled) {
          background: var(--color-accent-600) !important;
          border-color: var(--color-accent-600) !important;
        }
        .pp-auth-switch:hover {
          color: var(--color-accent-600) !important;
        }
        .pp-auth-shell input:focus-visible,
        .pp-auth-shell button:focus-visible {
          outline: 2px solid var(--color-accent);
          outline-offset: 2px;
        }
        body {
          background: var(--color-bg, #f3f2f2);
        }
      `}</style>
    </div>
  );
}
