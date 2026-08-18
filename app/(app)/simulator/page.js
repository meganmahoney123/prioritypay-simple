"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MoneySimulator from "@/components/MoneySimulator";
import { LEDGER_TOKENS } from "@/lib/ledgerTheme";
import { isCoreRow } from "@/lib/allocations";
import { encodeSim } from "@/lib/simSharing";

// Dashboard tab version -- unlike the public one under Resources (see
// app/calculators/moneysimulator/), this seeds from the person's ACTUAL
// split rules and last month's confirmed net income, not generic
// defaults, so "what if" questions are answered against their real
// numbers. Each real percent row keeps a reference to itself (`real`) so
// applying a change back to Split Rules (see toPercentRules in
// lib/simSharing.js) never loses an already-connected account -- only
// pct/label can change here.
function toSimRows(percent) {
  return (percent || []).map((r) => ({
    id: r.id,
    label: r.label,
    pct: r.pct,
    fixed: r.id === "tax_reserve" || r.id === "opex",
    color: r.color,
    custom: !isCoreRow(r),
    real: r,
  }));
}

export default function MoneySimulatorDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [income, setIncome] = useState(0);
  const [rows, setRows] = useState([]);
  const [incomeSource, setIncomeSource] = useState(null);

  useEffect(() => {
    (async () => {
      const rulesPromise = fetch("/api/split-rules").then((r) => r.json());
      // Last month's net income only exists once that month's close-out
      // has actually been confirmed (see simple_monthly_closeouts.net_income
      // in supabase/schema.sql) -- checking /status first avoids silently
      // triggering a fresh Plaid pull / draft close-out just to open this
      // tab. If it isn't confirmed yet, income starts at 0 and stays fully
      // editable -- no guess is better than a wrong one.
      const statusPromise = fetch("/api/closeout/status").then((r) => r.json());

      const [rulesRes, statusRes] = await Promise.all([rulesPromise, statusPromise]);
      setRows(toSimRows(rulesRes.splitRules?.percent));

      if (statusRes?.status === "confirmed" && statusRes?.period) {
        try {
          const closeoutRes = await fetch(`/api/closeout/${statusRes.period}`).then((r) => r.json());
          if (typeof closeoutRes?.closeout?.net_income === "number") {
            setIncome(closeoutRes.closeout.net_income);
            setIncomeSource(`Pulled from your confirmed net income for ${statusRes.period}. Edit anytime.`);
          }
        } catch {
          // Fall through to the 0/editable default below.
        }
      }
      if (!incomeSource) setIncomeSource("Enter your typical monthly income -- last month's confirmed net income wasn't available yet.");
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToSplitsWith = (nextRows) => {
    router.push(`/splits?sim=${encodeSim(nextRows)}`);
  };

  return (
    <div className="max-w-4xl space-y-6" style={LEDGER_TOKENS}>
      <div>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(26px, 3.4vw, 34px)", fontWeight: 400, margin: "0 0 8px" }}>
          Money Simulator
        </h2>
        <div style={{ height: 1, background: "var(--color-divider)", margin: "0 0 16px" }} />
        <p className="text-sm" style={{ color: "color-mix(in srgb, var(--color-text) 76%, transparent)" }}>
          Started from your real split rules and last month's income. Try changes here first -- nothing updates
          your actual accounts until you apply it.
        </p>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
          Loading your real numbers…
        </p>
      ) : (
        <MoneySimulator
          initialIncome={income}
          initialRows={rows}
          incomeNote={incomeSource}
          secondaryCtaLabel="Update my real split rules"
          secondaryCtaHelp="Like these changes even without a specific goal? Carry them into your real Split Rules."
          onStartSavingForGoal={goToSplitsWith}
          onSetUpReal={goToSplitsWith}
        />
      )}
    </div>
  );
}
