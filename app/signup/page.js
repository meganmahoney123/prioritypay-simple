"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Loader2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
            <Zap size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-bold">PriorityPay Simple</span>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-6 card-shadow">
          {checkEmail ? (
            <div className="text-center py-4">
              <h1 className="text-lg font-bold mb-2">Check your email</h1>
              <p className="text-sm text-neutral-500">
                We sent a confirmation link to {email}. Click it, then come back and log in.
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold mb-1">Create your account</h1>
              <p className="text-sm text-neutral-500 mb-5">Takes about a minute.</p>
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
                  minLength={6}
                  placeholder="Password (6+ characters)"
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
                  Create account
                </button>
              </form>
            </>
          )}
        </div>
        <p className="text-center text-sm text-neutral-500 mt-4">
          Already have an account? <a href="/login" className="text-emerald-700 font-medium">Log in</a>
        </p>
      </div>
    </div>
  );
}
