"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthCard from "@/components/AuthCard";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    // Goes through our own API route (not supabase.auth.signInWithPassword
    // directly) so the per-account failed-login lockout Dwolla requires can
    // be enforced -- see app/api/auth/login/route.js.
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong. Please try again.");
      return;
    }
    router.push("/");
    router.refresh();
  };

  return (
    <AuthCard
      title="Log in"
      subtitle="Welcome back."
      email={email}
      onEmail={(e) => setEmail(e.target.value)}
      password={password}
      onPassword={(e) => setPassword(e.target.value)}
      passwordPlaceholder="Your password"
      onSubmit={handleSubmit}
      submitLabel="Log in"
      loading={loading}
      error={error}
      switchPrompt="New here?"
      switchLabel="Create an account"
      switchHref="/signup"
    />
  );
}
