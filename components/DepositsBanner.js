"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buildDeposit, buildRows, groupByDestination, money } from "./PendingTransfers";

// Dashboard notification: deposits waiting to be split. A snapshot only (how
// many, how much was deposited, how much needs transferring); clicking it
// opens the "Split My Deposits" tab, where the real checklist lives. Renders
// nothing when no deposit is waiting.
export default function DepositsBanner({ refreshKey }) {
  const [deposits, setDeposits] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/transfers/deposits")
      .then((r) => r.json())
      .then((b) => alive && setDeposits(b.deposits || []))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [refreshKey]);

  const info = useMemo(() => {
    const pending = (deposits || []).map(buildDeposit).filter((d) => d.waitingCount > 0);
    if (!pending.length) return null;
    const groups = groupByDestination(buildRows(pending));
    return {
      count: pending.length,
      deposited: pending.reduce((s, d) => s + d.sourceAmount, 0),
      toTransfer: groups.reduce((s, g) => s + g.total, 0),
      accounts: groups.length,
    };
  }, [deposits]);

  if (!info) return null;
  return (
    <Link
      href="/deposits"
      className="flex items-center justify-between gap-4 flex-wrap"
      style={{
        background: "var(--color-surface)",
        border: "2px solid var(--color-accent)",
        borderRadius: 24,
        padding: "18px 22px",
        textDecoration: "none",
        color: "var(--color-text)",
        boxShadow: "var(--shadow-md, 0 6px 20px rgba(109,59,224,0.14))",
      }}
    >
      <div className="flex items-center gap-4" style={{ minWidth: 0 }}>
        <div
          style={{
            flex: "none",
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "var(--color-accent)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            fontWeight: 700,
          }}
        >
          {info.count}
        </div>
        <div>
          <div style={{ fontSize: 19, fontWeight: 700 }}>
            {info.count} {info.count === 1 ? "deposit is" : "deposits are"} ready to split
          </div>
          <div style={{ fontSize: 15, color: "var(--color-neutral-700)" }}>
            {money(info.deposited)} deposited · <b style={{ color: "var(--color-text)" }}>{money(info.toTransfer)} to transfer</b> across {info.accounts}{" "}
            {info.accounts === 1 ? "account" : "accounts"}
          </div>
        </div>
      </div>
      <span
        className="inline-flex items-center gap-2 w-full sm:w-auto justify-center"
        style={{ height: 48, padding: "0 24px", borderRadius: 999, background: "var(--color-accent)", color: "#fff", fontSize: 16, fontWeight: 700 }}
      >
        Review and transfer <ArrowRight size={16} />
      </span>
    </Link>
  );
}
