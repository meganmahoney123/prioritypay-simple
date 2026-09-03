"use client";

import { useEffect, useState } from "react";
import { Card, currency } from "@/components/ui";
import { bloomBadgeStyle, bloomWarningCardStyle } from "@/lib/bloomTheme";

function formatDate(iso) {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusTone(status) {
  if (status === "completed" || status === "processed") return "accent";
  if (status === "failed" || status === "cancelled") return "neutral";
  return "accent"; // pending / reserved / processing / needs_approval
}

function StatusPill({ tone = "accent", children }) {
  const tones = {
    accent: {},
    neutral: { color: "var(--color-neutral-700)", background: "var(--color-neutral-200)" },
  };
  return <span style={bloomBadgeStyle(tones[tone])}>{children}</span>;
}

function statusLabel(status) {
  if (status === "needs_approval") return "awaiting you";
  if (status === "in_transit") return "in transition";
  if (status === "skipped") return "removed";
  return status;
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
      <Card className="p-4 text-sm" style={bloomWarningCardStyle()}>
        {error}
      </Card>
    );
  }

  if (!transfers) {
    return <p className="text-sm" style={{ color: "var(--color-neutral-700)" }}>Loading…</p>;
  }

  if (transfers.length === 0) {
    return (
      <Card className="p-4 text-sm" style={{ color: "var(--color-neutral-700)" }}>
        No transactions yet. Once a deposit lands in a linked account and gets split, it&apos;ll show up here.
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {transfers.map((t) => (
        <Card key={t.id} className="p-4" style={{ borderRadius: 20 }}>
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
            <div style={{ minWidth: 160 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 15, color: "var(--color-accent-700)" }}>
                {currency(t.source_amount)} split
              </div>
              <div style={{ fontSize: 12.5, color: "var(--color-neutral-700)" }}>
                {formatDate(t.created_at)} · <TriggerLabel trigger={t.trigger} />
              </div>
            </div>
            <StatusPill tone={statusTone(t.status)}>{statusLabel(t.status)}</StatusPill>
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
                    <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-text)" }}>{currency(a.amount)}</span>
                    <StatusPill tone={statusTone(a.status)}>{a.reserved_only ? "reserved" : statusLabel(a.status)}</StatusPill>
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
