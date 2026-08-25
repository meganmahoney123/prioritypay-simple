"use client";

import { useRouter } from "next/navigation";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import MoneySimulator from "@/components/MoneySimulator";
import { BLOOM_TOKENS } from "@/lib/bloomTheme";
import { encodeSim, DEMO_GOALS } from "@/lib/simSharing";

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
  { id: "tax_reserve", label: "Tax Reserve", pct: 15, fixed: true, color: "#2C1259" },
  { id: "fixed_costs", label: "Fixed Costs", pct: 30, fixed: true, color: "#3B1C7A" },
  { id: "emergency_fund", label: "Emergency Fund", pct: 10, fixed: false, color: "#5A2BC0" },
  { id: "savings", label: "Savings", pct: 10, fixed: false, color: "#6D3BE0" },
  { id: "investments_1", label: "Investments", pct: 10, fixed: false, color: "#8657E8" },
  { id: "solo_401k", label: "Retirement", pct: 15, fixed: false, color: "#9A72F0" },
  { id: "hobbies", label: "Hobbies", pct: 5, fixed: false, color: "#C4A9FA" },
];

export default function MoneySimulatorPublicClient() {
  const router = useRouter();

  const goToSignupWith = (rows) => {
    router.push(`/signup?sim=${encodeSim(rows)}`);
  };

  return (
    <div style={BLOOM_TOKENS}>
      <PublicHeader />
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "48px clamp(18px, 4vw, 40px) 80px" }}>
        <h1
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(38px, 4.6vw, 54px)",
            fontWeight: 800,
            lineHeight: 1.04,
            letterSpacing: "-0.035em",
            margin: "0 0 14px",
          }}
        >
          Income Distribution Simulator
        </h1>
        <p style={{ fontSize: 19, lineHeight: 1.6, maxWidth: "46em", color: "var(--color-neutral-800)", margin: "0 0 32px" }}>
          Enter what you make, set percentages for taxes, savings, and everything else, and add a real goal with a
          date. Free to use, no account needed. When you're ready, you can carry it straight into a real PriorityPay
          setup and it will automatically route your money according to the rules you set below.
        </p>
        <MoneySimulator
          initialIncome={10000}
          initialRows={DEFAULT_ROWS}
          initialGoals={DEMO_GOALS}
          secondaryCtaLabel="Set up my real accounts"
          secondaryCtaHelp="Like this split even without a specific goal? Carry it into a real PriorityPay account."
          onSetUpReal={goToSignupWith}
        />
      </div>
      <PublicFooter />
    </div>
  );
}
