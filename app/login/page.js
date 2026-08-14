"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Loader2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
            <Zap size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-bold">PriorityPay Simple</span>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-6 card-shadow">
          <h1 className="text-xl font-bold mb-1">Log in</h1>
          <p className="text-sm text-neutral-500 mb-5">Welcome back.</p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-sm border border-neutral-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
            />
            <input
              type="password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-sm border border-neutral-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-4 py-2.5 text-sm disabled:opacity-50"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              Log in
            </button>
          </form>
        </div>
        <p className="text-center text-sm text-neutral-500 mt-4">
          New here? <a href="/signup" className="text-emerald-700 font-medium">Create an account</a>
        </p>
      </div>
    </div>
  );
}
