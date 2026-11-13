"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, currency } from "@/components/ui";

// Dashboard prompt for people who never chose "Debt Payoff": if a connected
// credit card shows a balance, offer a payoff plan. Hidden once they have a
// Debt Payoff category or any debt, and "Not now" hides it on this browser.
const KEY = "ps-debt-nudge-dismissed";

export default function DebtNudgeCard({ hasCategory }) {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    if (hasCategory) return;
    try { if (localStorage.getItem(KEY)) return; } catch {}
    let live = true;
    (async () => {
      try {
        const d = await fetch("/api/debts").then((r) => r.json());
        if (d.error || !d.hasCards || (d.debts || []).length > 0 || d.hasCategory) return;
        const c = await fetch("/api/debts/cards-check").then((r) => r.json());
        if (live && !c.error && c.owed > 0) setInfo(c);
      } catch {}
    })();
    return () => { live = false; };
  }, [hasCategory]);
  if (hasCategory || !info) return null;
  const dismiss = () => {
    try { localStorage.setItem(KEY, "1"); } catch {}
    setInfo(null);
  };
  return (
    <Card className="p-4" style={{ border: "1.5px solid var(--color-accent)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ maxWidth: 560 }}>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 600 }}>Want a plan to pay down your card?</div>
          <div style={{ fontSize: 14, color: "color-mix(in srgb, var(--color-text) 68%, transparent)" }}>
            Your connected {info.cardsWithBalance === 1 ? "card shows" : "cards show"} {currency(info.owed)} owed. We can pull in the balance and interest rate and show a payoff date.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button type="button" onClick={dismiss} style={{ fontSize: 14, background: "none", border: 0, cursor: "pointer", color: "color-mix(in srgb, var(--color-text) 68%, transparent)" }}>Not now</button>
          <Link href="/debt" style={{ fontSize: 14, fontWeight: 600, color: "var(--color-accent-700)", textDecoration: "none" }}>Set up my payoff plan ›</Link>
        </div>
      </div>
    </Card>
  );
}
