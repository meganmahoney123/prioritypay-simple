"use client";

import { useEffect, useState } from "react";
import { Card, Badge, currency } from "@/components/ui";

// Transaction history -- required by Dwolla's app-approval review, which
// expects end users to be able to access at least two years of
// transaction history in-app (date, amount, status, and enough detail to
// identify what each transaction was). This reads the same
// simple_transfers/simple_transfer_allocations rows that already power
// the Dashboard's month/year totals, just rendered per-transaction
// instead of aggregated, and with no date-range limit (so it naturally
// covers the account's full history, not just a recent window).
function formatDate(iso) {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusTone(status) {
  if (status === "completed" || status === "processed") return "emerald";
  if (status === "failed" || status === "cancelled") return "neutral";
  return "amber"; // pending / reserved / processing
}

function TriggerLabel({ trigger }) {
  if (trigger === "manual") return "Manual split";
  if (trigger === "plaid_webhook" || trigger === "webhook") return "Automatic (deposit detected)";
  return trigger || "Split";
}

export default function HistoryPage() {
  const [transfers, setTransfers] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/transfers")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setTransfers(data.transfers || []);
      })
      .catch(() => setError("Couldn't load transaction history."));
  }, []);

  if (error) {
    return (
      <Card className="p-4 text-sm" style={{ color: "#7a2f2a" }}>
        {error}
      </Card>
    );
  }

  if (!transfers) {
    return <p className="text-sm text-neutral-500">Loading…</p>;
  }

  if (transfers.length === 0) {
    return (
      <Card className="p-4 text-sm" style={{ color: "var(--color-text)" }}>
        No transactions yet. Once a deposit lands in a linked account and gets split, it&apos;ll show up here.
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {transfers.map((t) => (
        <Card key={t.id} className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
            <div style={{ minWidth: 160 }}>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 15 }}>{currency(t.source_amount)} split</div>
              <div style={{ fontSize: 12.5, color: "color-mix(in srgb, var(--color-text) 60%, transparent)" }}>
                {formatDate(t.created_at)} · <TriggerLabel trigger={t.trigger} />
              </div>
            </div>
            <Badge tone={statusTone(t.status)}>{t.status}</Badge>
          </div>

          {Array.isArray(t.simple_transfer_allocations) && t.simple_transfer_allocations.length > 0 && (
            <div
              style={{
                marginTop: 12,
                paddingTop: 10,
                borderTop: "1px solid var(--color-divider)",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {t.simple_transfer_allocations.map((a, i) => (
                <div key={i} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 13.5 }}>
                  <span>{a.label}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span>{currency(a.amount)}</span>
                    <Badge tone={statusTone(a.status)}>{a.reserved_only ? "reserved" : a.status}</Badge>
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
