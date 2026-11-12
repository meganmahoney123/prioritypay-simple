"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui";
import { buildPlan, payoffLabel } from "@/lib/debtPayoff";
import { currency } from "@/components/ui";

// Shown on the dashboard only for people who have a "Debt Payoff" category.
// Before they add debts it invites them to set up the plan; after, it shows the
// debt-free month and opens the plan.
export default function DebtPayoffCard({ hasCategory }) {
  const [d, setD] = useState(null);
  useEffect(() => {
    if (!hasCategory) return;
    fetch("/api/debts").then((r) => r.json()).then((x) => { if (!x.error) setD(x); }).catch(() => {});
  }, [hasCategory]);
  if (!hasCategory || !d) return null;
  const active = d.debts.filter((x) => x.balance > 0);
  const info = active.length ? buildPlan(active, d.extra ?? d.suggestedExtra, d.method) : null;
  return (
    <Link href="/debt" style={{ textDecoration: "none", color: "var(--color-text)" }}>
      <Card className="p-4" style={{ border: "1.5px solid var(--color-accent)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 600 }}>Debt Payoff</div>
            <div style={{ fontSize: 14, color: "color-mix(in srgb, var(--color-text) 68%, transparent)" }}>
              {info
                ? info.plan.neverPaysOff
                  ? `${active.length} debts · ${currency(info.totalOwed)} · adjust your payment to see a payoff date`
                  : `${active.length} ${active.length === 1 ? "debt" : "debts"} · ${currency(info.totalOwed)} · debt-free ${payoffLabel(info.plan.months)}`
                : "Add your debts to get a payoff date."}
            </div>
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-accent-700)" }}>{info ? "Open plan ›" : "Set up your payoff plan ›"}</span>
        </div>
      </Card>
    </Link>
  );
}
