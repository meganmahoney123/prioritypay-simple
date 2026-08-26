"use client";

import { Loader2 } from "lucide-react";
import { BLOOM_TOKENS } from "@/lib/bloomTheme";
import PriorityPayLogo from "@/components/PriorityPayLogo";

// Shared visual scaffold for /login and /signup -- restyled per the Aug 2026
// "Bloom" purple redesign handoff (spec 13a-login-and-empty-hubs.md). The
// stacked logo lockup, filled 56px inputs, and pill submit button match the
// rest of the redesigned marketing/calculator pages. Each page still owns
// its own auth call (login posts to /api/auth/login to enforce Dwolla's
// failed-login lockout, signup does its own thing), loading/error state,
// and copy -- this file only changes chrome.
const fieldLabelStyle = {
  display: "block",
  fontFamily: "var(--font-heading)",
  fontSize: 15,
  fontWeight: 700,
  color: "var(--color-text)",
  marginBottom: 9,
};

const fieldInputStyle = {
  width: "100%",
  boxSizing: "border-box",
  height: 56,
  // 16px keeps iOS Safari from auto-zooming the page when a field is
  // focused -- important since this is often the first screen someone
  // hits on a phone.
  fontFamily: "var(--font-body)",
  fontSize: 17,
  color: "var(--color-text)",
  background: "var(--color-neutral-100)",
  border: "1px solid var(--color-neutral-300)",
  borderRadius: "var(--radius-md)",
  padding: "0 16px",
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
  belowFields,
}) {
  return (
    <div
      className="pp-auth-shell"
      style={{
        ...BLOOM_TOKENS,
        minHeight: "100vh",
        background: "var(--color-bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px 64px",
      }}
    >
      <PriorityPayLogo size={22} layout="stack" style={{ marginBottom: 30 }} />

      <div
        style={{
          width: "100%",
          maxWidth: "27em",
          border: "1px solid var(--color-divider)",
          borderRadius: 30,
          background: "var(--color-surface)",
          boxShadow: "0 24px 50px -34px rgba(52,26,102,0.3)",
          padding: "clamp(30px, 6vw, 42px) clamp(24px, 6vw, 40px) clamp(30px, 6vw, 40px)",
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
                fontSize: "clamp(30px, 7vw, 40px)",
                fontWeight: 800,
                lineHeight: 1.06,
                letterSpacing: "-0.035em",
                margin: "0 0 8px",
              }}
            >
              {title}
            </h1>
            <p style={{ fontSize: 17, lineHeight: 1.6, color: "var(--color-neutral-700)", margin: 0 }}>
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

              {belowFields}

              {error && (
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    lineHeight: 1.5,
                    color: "#9C3B22",
                    background: "#FBEEEA",
                    borderRadius: 14,
                    padding: "12px 16px",
                    margin: 0,
                  }}
                >
                  {error}
                </p>
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
                  fontSize: 17,
                  fontWeight: 700,
                  color: "#fff",
                  background: "var(--color-accent)",
                  border: "1px solid var(--color-accent)",
                  borderRadius: "var(--radius-pill)",
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
          fontSize: 16,
          textAlign: "center",
          color: "var(--color-neutral-700)",
        }}
      >
        <span>{switchPrompt}</span>
        <a
          href={switchHref}
          className="pp-auth-switch"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: 16,
            fontWeight: 700,
            color: "var(--color-accent)",
            textDecoration: "underline",
            textUnderlineOffset: "3px",
          }}
        >
          {switchLabel}
        </a>
      </div>

      <style jsx global>{`
        .pp-auth-submit:hover:not(:disabled) {
          background: var(--color-accent-700) !important;
          border-color: var(--color-accent-700) !important;
        }
        .pp-auth-switch:hover {
          color: var(--color-accent-700) !important;
        }
        .pp-auth-shell input:focus-visible,
        .pp-auth-shell button:focus-visible {
          outline: 2px solid var(--color-accent);
          outline-offset: 2px;
        }
        body {
          background: var(--color-bg, #FAF7FD);
        }
      `}</style>
    </div>
  );
}
