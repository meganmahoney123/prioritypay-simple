"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { currency } from "@/components/ui";

// Dashboard heads-ups for cards with a monthly cap: one at 80% and one past the cap.
// Each shows once per card, month and level, and "Dismiss" hides it on this browser.
export default function CardCapAlerts() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const d = await fetch("/api/cards/spending").then((r) => r.json());
        if (!live || d.error) return;
        const list = (d.cards || [])
          .filter((c) => c.cap > 0 && c.tracked && (c.status === "near" || c.status === "over"))
          .map((c) => ({ ...c, key: `ps-cardcap-${c.accountId}-${c.month}-${c.status}` }))
          .filter((c) => { try { return !localStorage.getItem(c.key); } catch { return true; } });
        setItems(list);
      } catch {}
    })();
    return () => { live = false; };
  }, []);
  if (!items.length) return null;
  const dismiss = (key) => {
    try { localStorage.setItem(key, "1"); } catch {}
    setItems((cur) => cur.filter((c) => c.key !== key));
  };
  return (
    <>
      {items.map((c) => {
        const over = c.status === "over";
        return (
          <div key={c.key} style={{ background: over ? "#FDF0F0" : "#FFF8E8", border: `1px solid ${over ? "#F0CFCF" : "#F0DDB0"}`, borderRadius: 14, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: over ? "#9B2C2C" : "#8A5A00" }}>
                {over
                  ? `${c.name} is ${currency(c.spent - c.cap)} over your ${currency(c.cap)} cap`
                  : `${c.name} is at ${currency(c.spent)} of your ${currency(c.cap)} cap`}
              </div>
              <div style={{ fontSize: 13, color: "#5E5575", marginTop: 2 }}>
                {over
                  ? "You can keep spending. This is only a heads-up. Raise the cap any time."
                  : `${currency(c.cap - c.spent)} left${c.daysLeft > 0 ? ` and ${c.daysLeft} ${c.daysLeft === 1 ? "day" : "days"} to go. At this pace you would end the month near ${currency(c.projected)}.` : "."}`}
              </div>
            </div>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <Link href="/accounts" style={{ fontSize: 13.5, fontWeight: 600, color: "#5B3FD1", whiteSpace: "nowrap", textDecoration: "none" }}>See card ›</Link>
              <button type="button" onClick={() => dismiss(c.key)} style={{ fontSize: 13, color: "#5E5575", background: "none", border: 0, cursor: "pointer" }}>Dismiss</button>
            </div>
          </div>
        );
      })}
    </>
  );
}
