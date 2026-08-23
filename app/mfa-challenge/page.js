"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import AuthCard from "@/components/AuthCard";

// Reached via middleware.js whenever a signed-in session is still aal1 but
// the account has a verified TOTP factor (aal2 available) -- i.e. right
// after a correct password, before the session is allowed to reach any
// onboarding/dashboard page or Plaid Link. See components/MfaSettings.js
// for where the factor gets enrolled in the first place.
function MfaChallengeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // If someone lands here directly without an aal1 session waiting on a
    // factor (e.g. back button after already completing the challenge),
    // just bounce them onward instead of showing a dead-end form.
    const supabase = supabaseBrowser();
    supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data }) => {
      if (data && data.nextLevel === "aal2" && data.currentLevel !== data.nextLevel) {
        setReady(true);
      } else {
        router.replace(next);
      }
    });
  }, [next, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = supabaseBrowser();

    const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
    if (listError) {
      setLoading(false);
      setError(listError.message);
      return;
    }
    const factor = factors?.totp?.find((f) => f.status === "verified");
    if (!factor) {
      setLoading(false);
      setError("No verified authenticator found on this account. Contact support.");
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: factor.id,
      code: code.trim(),
    });
    setLoading(false);
    if (verifyError) {
      setError("That code didn't work. Check your authenticator app and try again.");
      return;
    }
    router.push(next);
    router.refresh();
  };

  if (!ready) return null;

  return (
    <AuthCard>
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
        Verify it&apos;s you
      </h1>
      <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "color-mix(in srgb, var(--color-text) 66%, transparent)", margin: 0 }}>
        Enter the 6-digit code from your authenticator app.
      </p>
      <div style={{ height: 1, background: "var(--color-divider)", margin: "24px 0 28px" }} />

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 22 }}>
        <div>
          <label
            htmlFor="pp-mfa-code"
            style={{
              display: "block",
              fontFamily: "var(--font-heading)",
              fontSize: 12,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "color-mix(in srgb, var(--color-text) 60%, transparent)",
              marginBottom: 9,
            }}
          >
            Authentication code
          </label>
          <input
            id="pp-mfa-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="123456"
            style={{
              width: "100%",
              boxSizing: "border-box",
              fontFamily: "var(--font-body)",
              fontSize: 22,
              letterSpacing: "0.3em",
              textAlign: "center",
              color: "var(--color-text)",
              background: "transparent",
              border: 0,
              borderBottom: "1px solid var(--color-divider)",
              borderRadius: 0,
              padding: "11px 2px",
            }}
          />
        </div>

        {error && <p style={{ fontSize: 13.5, lineHeight: 1.5, color: "#7a2f2a", margin: 0 }}>{error}</p>}

        <button
          type="submit"
          disabled={loading || code.length !== 6}
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
            cursor: loading || code.length !== 6 ? "default" : "pointer",
            opacity: loading || code.length !== 6 ? 0.6 : 1,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            boxSizing: "border-box",
          }}
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          Verify
        </button>
      </form>
    </AuthCard>
  );
}

export default function MfaChallengePage() {
  return (
    <Suspense fallback={null}>
      <MfaChallengeInner />
    </Suspense>
  );
}
