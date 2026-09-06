"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import AuthCard from "@/components/AuthCard";

// Landed on from the link in the recovery email (see
// app/forgot-password/page.js). Clicking that link gives the browser a
// temporary Supabase session in the "recovery" state -- supabase.auth
// .updateUser({ password }) is what actually sets the new password using
// that session, no separate token/code to handle here ourselves. If
// someone reaches this page without a valid recovery session (link
// expired, already used, or just typed the URL directly), Supabase's
// updateUser call below fails and we show that error rather than letting
// them submit into a broken state.
export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase's client picks the recovery session up from the URL hash
    // on load -- just give it a tick before deciding the link is invalid.
    const t = setTimeout(() => setReady(true), 300);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 12) {
      setError("Password must be at least 12 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(
        error.message.toLowerCase().includes("session")
          ? "This reset link has expired or was already used. Request a new one."
          : error.message
      );
      return;
    }
    setDone(true);
    setTimeout(() => {
      router.push("/login");
      router.refresh();
    }, 2000);
  };

  if (done) {
    return (
      <AuthCard title="" subtitle="" switchPrompt="" switchLabel="" switchHref="/login">
        <div style={{ textAlign: "center", padding: "12px 0" }}>
          <h1
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(26px, 6vw, 32px)",
              fontWeight: 400,
              margin: "0 0 12px",
            }}
          >
            Password updated
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: "color-mix(in srgb, var(--color-text) 66%, transparent)", margin: 0 }}>
            Taking you to login...
          </p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="" subtitle="" switchPrompt="Changed your mind?" switchLabel="Log in" switchHref="/login">
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
        Set a new password
      </h1>
      <p style={{ fontSize: 17, lineHeight: 1.6, color: "var(--color-neutral-700)", margin: 0 }}>
        At least 12 characters.
      </p>
      <div style={{ height: 1, background: "var(--color-divider)", margin: "24px 0 28px" }} />
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 22 }}>
        <div>
          <label
            htmlFor="pp-new-pass"
            style={{
              display: "block",
              fontFamily: "var(--font-heading)",
              fontSize: 15,
              fontWeight: 700,
              color: "var(--color-text)",
              marginBottom: 9,
            }}
          >
            New password
          </label>
          <input
            id="pp-new-pass"
            type="password"
            required
            minLength={12}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 12 characters"
            disabled={!ready}
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
        <div>
          <label
            htmlFor="pp-confirm-pass"
            style={{
              display: "block",
              fontFamily: "var(--font-heading)",
              fontSize: 15,
              fontWeight: 700,
              color: "var(--color-text)",
              marginBottom: 9,
            }}
          >
            Confirm password
          </label>
          <input
            id="pp-confirm-pass"
            type="password"
            required
            minLength={12}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Type it again"
            disabled={!ready}
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
          disabled={loading || !ready}
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
            cursor: loading || !ready ? "default" : "pointer",
            opacity: loading || !ready ? 0.75 : 1,
          }}
        >
          {loading ? "Updating..." : "Update password"}
        </button>
      </form>
    </AuthCard>
  );
}
