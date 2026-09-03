"use client";

import { useMemo, useState } from "react";
import { Card, PrimaryButton, currency } from "./ui";
import { bloomAccentCardStyle } from "@/lib/bloomTheme";
import { resolveBankLoginUrl } from "@/lib/bankLinks";
import { ExternalLink, Clock } from "lucide-react";

function accountLabel(acc) {
  if (!acc) return "an account that's since been disconnected or renamed";
  return `${acc.institution_name} ${acc.account_name} •••• ${acc.mask}`;
}

// Groups allocations that share the same category label + destination
// account across EVERY still-open deposit, not just one -- so if a $1,000
// deposit puts $100 toward Savings and, two days later, a $2,000 deposit
// puts another $200 toward Savings before either gets confirmed, this
// shows one "Savings — $300" line instead of two separate ones. Most
// people don't want to go make a bank transfer for every single deposit;
// this lets them let a few pile up and send one transfer for the combined
// total. Confirming/deleting the combined line acts on every allocation id
// underneath it at once.
function groupByCategory(rows) {
  const map = new Map();
  rows.forEach((a) => {
    const key = `${a.label}::${a.dest_account_id || ""}`;
    if (!map.has(key)) {
      map.set(key, { key, label: a.label, dest_account_id: a.dest_account_id, amount: 0, ids: [] });
    }
    const g = map.get(key);
    g.amount += Number(a.amount) || 0;
    g.ids.push(a.id);
  });
  return Array.from(map.values());
}

// `allocations` comes from GET /api/transfers/pending (flat allocation
// rows, not transfers -- see that route's comment for why); `accounts` is
// the same list the Dashboard already fetches from /api/accounts, passed
// straight through so this stays purely presentational. Renders nothing at
// all once there's nothing pending or in transition -- this section should
// disappear the moment a user is fully caught up.
export default function PendingTransfers({ allocations, accounts, onConfirmed }) {
  const [busyKey, setBusyKey] = useState(null);
  const [busyAction, setBusyAction] = useState(null);
  const accountsById = useMemo(() => Object.fromEntries((accounts || []).map((a) => [a.id, a])), [accounts]);

  const pending = useMemo(
    () => groupByCategory((allocations || []).filter((a) => a.status === "needs_approval")),
    [allocations]
  );
  const inTransit = useMemo(
    () => groupByCategory((allocations || []).filter((a) => a.status === "in_transit")),
    [allocations]
  );

  if (!pending.length && !inTransit.length) return null;

  const callAll = async (ids, path) => {
    const results = await Promise.all(ids.map((id) => fetch(`/api/transfer-allocations/${id}/${path}`, { method: "POST" })));
    if (results.some((r) => r.ok)) onConfirmed();
  };

  const confirm = async (group) => {
    setBusyKey(group.key);
    setBusyAction("confirm");
    try {
      await callAll(group.ids, "confirm");
    } finally {
      setBusyKey(null);
      setBusyAction(null);
    }
  };

  const skip = async (group) => {
    setBusyKey(group.key);
    setBusyAction("skip");
    try {
      await callAll(group.ids, "skip");
    } finally {
      setBusyKey(null);
      setBusyAction(null);
    }
  };

  const settle = async (group) => {
    setBusyKey(group.key);
    setBusyAction("settle");
    try {
      await callAll(group.ids, "settle");
    } finally {
      setBusyKey(null);
      setBusyAction(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card style={bloomAccentCardStyle({ padding: "20px 24px", borderRadius: 24, background: "var(--color-accent-200)", border: "none" })}>
        <div
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--color-accent-700)",
            marginBottom: 6,
          }}
        >
          Transfers waiting on you
        </div>
        <p className="text-sm" style={{ margin: 0, fontSize: 16, lineHeight: 1.6, color: "var(--color-accent-800)" }}>
          Your splits are ready! Click an amount below to open that account&apos;s bank and transfer the money
          yourself. Then, check it off to ensure your category balances are accurate.
        </p>
      </Card>

      {pending.length > 0 && (
        <Card className="p-5" style={{ borderRadius: 24 }}>
          <div className="space-y-2">
            {pending.map((g) => {
              const destAccount = accountsById[g.dest_account_id];
              const bankUrl = destAccount ? resolveBankLoginUrl(destAccount.institution_name) : null;
              const busy = busyKey === g.key;
              return (
                <div
                  key={g.key}
                  className="flex items-center justify-between gap-3 flex-wrap"
                  style={{
                    padding: "12px 16px",
                    border: "1px solid var(--color-divider)",
                    borderRadius: 18,
                    background: "var(--color-neutral-100)",
                  }}
                >
                  <div className="min-w-0">
                    {bankUrl ? (
                      <a
                        href={bankUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5"
                        style={{ fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 700, color: "var(--color-text)", textDecoration: "none" }}
                      >
                        {g.label} — {currency(g.amount)}
                        <ExternalLink size={13} style={{ color: "var(--color-accent-700)", flexShrink: 0 }} />
                      </a>
                    ) : (
                      <div style={{ fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 700 }}>
                        {g.label} — {currency(g.amount)}
                      </div>
                    )}
                    <div className="text-xs truncate" style={{ fontSize: 15, color: "var(--color-neutral-700)" }}>
                      {bankUrl ? "Click the amount to open " : "Send to "}
                      {accountLabel(destAccount)}
                      {g.ids.length > 1 ? ` — combined from ${g.ids.length} deposits` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => skip(g)}
                      disabled={busy}
                      title="Remove this split from your checklist (doesn't delete the category)"
                      style={{
                        padding: "10px 16px",
                        fontSize: 14,
                        fontWeight: 600,
                        borderRadius: 999,
                        background: "transparent",
                        border: "1px solid var(--color-divider)",
                        color: "var(--color-neutral-700)",
                        cursor: busy ? "default" : "pointer",
                      }}
                    >
                      {busy && busyAction === "skip" ? "Removing…" : "Delete"}
                    </button>
                    <PrimaryButton
                      onClick={() => confirm(g)}
                      disabled={busy}
                      style={{ padding: "10px 20px", fontSize: 15, fontWeight: 700, borderRadius: 999 }}
                    >
                      {busy && busyAction === "confirm" ? "Marking…" : "I sent this"}
                    </PrimaryButton>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {inTransit.length > 0 && (
        <Card className="p-5" style={{ borderRadius: 24 }}>
          <div
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--color-neutral-700)",
              marginBottom: 12,
            }}
          >
            In transition
          </div>
          <div className="space-y-2">
            {inTransit.map((g) => {
              const destAccount = accountsById[g.dest_account_id];
              const busy = busyKey === g.key;
              return (
                <div
                  key={g.key}
                  className="flex items-center justify-between gap-3 flex-wrap"
                  style={{ padding: "10px 16px", borderRadius: 16, background: "var(--color-neutral-100)" }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Clock size={15} style={{ color: "var(--color-accent-700)", flexShrink: 0 }} />
                    <div className="min-w-0">
                      <div style={{ fontSize: 15, fontWeight: 600 }}>
                        {g.label} — {currency(g.amount)}
                      </div>
                      <div className="text-xs truncate" style={{ color: "var(--color-neutral-700)" }}>
                        On its way to {accountLabel(destAccount)} — we&apos;ll mark this settled automatically once it
                        shows up there.
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => settle(g)}
                    disabled={busy}
                    title="Mark as already landed, without waiting for it to be detected automatically"
                    style={{
                      padding: "8px 14px",
                      fontSize: 13,
                      fontWeight: 600,
                      borderRadius: 999,
                      background: "transparent",
                      border: "1px solid var(--color-divider)",
                      color: "var(--color-accent-700)",
                      cursor: busy ? "default" : "pointer",
                      flexShrink: 0,
                    }}
                  >
                    {busy && busyAction === "settle" ? "Marking…" : "It already landed"}
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
