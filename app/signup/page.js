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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = supabaseBrowser();
    const { data, error } = await supabase.auth.signUp({ email, password });
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
      passwordPlaceholder="Six characters or more"
      passwordMinLength={6}
      onSubmit={handleSubmit}
      submitLabel="Create account"
      loading={loading}
      error={error}
      switchPrompt="Already have an account?"
      switchLabel="Log in"
      switchHref="/login"
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
