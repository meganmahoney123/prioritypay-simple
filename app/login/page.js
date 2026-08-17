"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
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
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
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
