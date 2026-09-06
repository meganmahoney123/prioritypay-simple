"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import AuthCard from "@/components/AuthCard";

// Sends the Supabase recovery email. The link it contains lands on
// /reset-password (see that page) with a temporary recovery session --
// there's no separate "token" step to build here, Supabase handles the
// token itself. redirectTo has to be an allowed Redirect URL in the
// Supabase project's Auth settings (Authentication -> URL Configuration)
// or the email link silently falls back to the Site URL instead.
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    // Always show the same "check your email" state regardless of whether
    // the address is registered -- otherwise this becomes a way to test
    // which emails have PriorityPay accounts.
    if (error) {
      setError("Something went wrong. Please try again.");
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <AuthCard title="Forgot password" subtitle="" switchPrompt="" switchLabel="" switchHref="/login">
        <div style={{ textAlign: "center", padding: "12px 0" }}>
          <h1
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(26px, 6vw, 32px)",
              fontWeight: 400,
              margin: "0 0 12px",
            }}
          >
            Check your email
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: "color-mix(in srgb, var(--color-text) 66%, transparent)", margin: 0 }}>
            If an account exists for {email}, we sent a link to reset your password.
          </p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Forgot password"
      subtitle="We'll email you a link to reset it."
      email={email}
      onEmail={(e) => setEmail(e.target.value)}
      password={null}
      onSubmit={handleSubmit}
      submitLabel="Send reset link"
      loading={loading}
      error={error}
      switchPrompt="Remembered it?"
      switchLabel="Log in"
      switchHref="/login"
    >
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
        Forgot password
      </h1>
      <p style={{ fontSize: 17, lineHeight: 1.6, color: "var(--color-neutral-700)", margin: 0 }}>
        We&apos;ll email you a link to reset it.
      </p>
      <div style={{ height: 1, background: "var(--color-divider)", margin: "24px 0 28px" }} />
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 22 }}>
        <div>
          <label
            htmlFor="pp-email"
            style={{
              display: "block",
              fontFamily: "var(--font-heading)",
              fontSize: 15,
              fontWeight: 700,
              color: "var(--color-text)",
              marginBottom: 9,
            }}
          >
            Email
          </label>
          <input
            id="pp-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{
              width: "100%",
              boxSizing: "border-box",
              height: 56,
              fontFamily: "var(--font-body)",
              fontSize: 17,
              color: "var(--color-text)",
              background: "var(--color-neutral-100)",
              border: "1px solid var(--color-neutral-300)",
              borderRadius: "var(--radius-md)",
              padding: "0 16px",
            }}
          />
        </div>

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
          }}
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>
    </AuthCard>
  );
}
