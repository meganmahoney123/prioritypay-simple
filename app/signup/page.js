"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import AuthCard from "@/components/AuthCard";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreed) {
      setError("Please agree to the Terms of Service and Privacy Policy to continue.");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = supabaseBrowser();
    // Dwolla's app-approval review requires that end users explicitly agree
    // to both PriorityPay's and Dwolla's Terms of Service/Privacy Policy
    // before their account can move money. Recording the timestamp in
    // Supabase auth user_metadata (rather than a separate DB table) means
    // it's captured at the moment of signup with no extra migration or
    // authenticated follow-up call needed -- it persists even if email
    // confirmation is still pending.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { terms_accepted_at: new Date().toISOString(), terms_version: "2026-08-17" } },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // If email confirmation is required (default in Supabase), there's no
    // session yet -- send them to check their inbox instead of onboarding.
    if (!data.session) {
      setCheckEmail(true);
      return;
    }
    router.push("/onboarding");
    router.refresh();
  };

  return (
    <AuthCard
      title="Create your account"
      subtitle="Takes about a minute."
      email={email}
      onEmail={(e) => setEmail(e.target.value)}
      password={password}
      onPassword={(e) => setPassword(e.target.value)}
      passwordPlaceholder="At least 12 characters"
      passwordMinLength={12}
      onSubmit={handleSubmit}
      submitLabel="Create account"
      loading={loading}
      error={error}
      switchPrompt="Already have an account?"
      switchLabel="Log in"
      switchHref="/login"
      belowFields={
        !checkEmail ? (
          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 9,
              fontSize: 13,
              lineHeight: 1.5,
              color: "color-mix(in srgb, var(--color-text) 66%, transparent)",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              style={{ marginTop: 3, flexShrink: 0 }}
            />
            <span>
              I agree to PriorityPay&apos;s{" "}
              <a href="/terms" target="_blank" rel="noreferrer" style={{ color: "var(--color-accent-700)", textDecoration: "underline" }}>
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="/privacy" target="_blank" rel="noreferrer" style={{ color: "var(--color-accent-700)", textDecoration: "underline" }}>
                Privacy Policy
              </a>
              , and Dwolla&apos;s{" "}
              <a
                href="https://www.dwolla.com/legal/dwolla-account-terms-of-service"
                target="_blank"
                rel="noreferrer"
                style={{ color: "var(--color-accent-700)", textDecoration: "underline" }}
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="https://www.dwolla.com/legal/privacy"
                target="_blank"
                rel="noreferrer"
                style={{ color: "var(--color-accent-700)", textDecoration: "underline" }}
              >
                Privacy Policy
              </a>
              , which govern the identity verification and money movement Dwolla provides for PriorityPay.
            </span>
          </label>
        ) : null
      }
    >
      {checkEmail ? (
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
            We sent a confirmation link to {email}. Click it, then come back and log in.
          </p>
        </div>
      ) : null}
    </AuthCard>
  );
}
