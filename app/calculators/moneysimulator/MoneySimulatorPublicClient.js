"use client";

import { useRouter } from "next/navigation";
import PublicHeader from "@/components/PublicHeader";
import MoneySimulator from "@/components/MoneySimulator";
import { LEDGER_TOKENS } from "@/lib/ledgerTheme";
import { encodeSim } from "@/lib/simSharing";

// Public, logged-out-friendly Money Simulator -- linked from the
// Resources dropdown in PublicHeader. Unlike the dashboard tab (see
// app/(app)/simulator/page.js), there's no real account to seed from, so
// this starts from PriorityPay Simple's generic suggested categories plus
// one filled-in example goal (this is most people's first time seeing the
// tool -- an empty goal list explains nothing). Both CTAs route to
// /signup with the simulated split attached, so the percentages chosen
// here land directly on the real Percentage Splits step of onboarding
// instead of making someone re-enter them.
const DEFAULT_ROWS = [
  { id: "tax_reserve", label: "Tax Reserve", pct: 15, fixed: true, color: "#a3a3a3" },
  { id: "fixed_costs", label: "Fixed Costs", pct: 30, fixed: true, color: "#7c3aed" },
  { id: "emergency_fund", label: "Emergency Fund", pct: 10, fixed: false, color: "#f59e0b" },
  { id: "savings", label: "Savings", pct: 10, fixed: false, color: "#ef4444" },
  { id: "investments_1", label: "Investments", pct: 10, fixed: false, color: "#14b8a6" },
  { id: "solo_401k", label: "Retirement", pct: 15, fixed: false, color: "#8b5cf6" },
  { id: "hobbies", label: "Hobbies", pct: 5, fixed: false, color: "#ec4899" },
];

const DEMO_GOALS = [{ id: "demo_wedding", name: "Wedding", target: 50000, date: "2027-06" }];

export default function MoneySimulatorPublicClient() {
  const router = useRouter();

  const goToSignupWith = (rows) => {
    router.push(`/signup?sim=${encodeSim(rows)}`);
  };

  return (
    <div style={LEDGER_TOKENS}>
      <PublicHeader />
      <div style={{ maxWidth: 1024, margin: "0 auto", padding: "48px clamp(18px, 4vw, 40px) 80px" }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(30px, 4vw, 40px)", fontWeight: 400, margin: "0 0 10px" }}>
          Money Simulator
        </h1>
        <p className="text-sm" style={{ maxWidth: 560, color: "color-mix(in srgb, var(--color-text) 76%, transparent)", margin: "0 0 28px" }}>
          Enter what you make, set percentages for taxes, savings, and everything else, and add a real goal with a
          date. Free to use, no account needed -- when you're ready, carry it straight into a real PriorityPay setup.
        </p>
        <MoneySimulator
          initialIncome={10000}
          initialRows={DEFAULT_ROWS}
          initialGoals={DEMO_GOALS}
          secondaryCtaLabel="Set up my real accounts"
          secondaryCtaHelp="Like this split even without a specific goal? Carry it into a real PriorityPay account."
          onStartSavingForGoal={goToSignupWith}
          onSetUpReal={goToSignupWith}
        />
      </div>
    </div>
  );
}
