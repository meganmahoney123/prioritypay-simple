"use client";

import { useMemo, useState } from "react";
import { Card, PrimaryButton, currency } from "./ui";
import { bloomAccentCardStyle } from "@/lib/bloomTheme";
import { resolveBankLoginUrl } from "@/lib/bankLinks";
import { CheckCircle2, ExternalLink } from "lucide-react";

function accountLabel(acc) {
  if (!acc) return "an account that's since been disconnected or renamed";
  return `${acc.institution_name} ${acc.account_name} •••• ${acc.mask}`;
}

// One deposit PriorityPay detected and calculated a split for, but hasn't
// moved any money itself -- see TRANSFER_EXECUTION_MODE in lib/runSplit.js.
// PriorityPay isn't approved by any bank/ACH provider to originate
// transfers on a user's behalf yet, so instead of touching money at all,
// it tells the user exactly what to send and where, and lets them confirm
// each line once they've made that transfer themselves in their own bank
// or app. This is what keeps the product working across ANY connected
// bank today, with zero standing transfer authority (see
// PROJECT_HANDOFF.md).
function TransferGroup({ transfer, accountsById, onConfirm, confirmingId }) {
  const allocations = transfer.simple_transfer_allocations || [];
  const pending = allocations.filter((a) => a.status === "needs_approval");
  const done = allocations.filter((a) => a.status !== "needs_approval");

  return (
    <Card className="p-5" style={{ borderRadius: 24 }}>
      <div className="flex items-baseline justify-between gap-3 flex-wrap" style={{ marginBottom: 14 }}>
        <div style={{ fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 700 }}>
          {currency(transfer.source_amount)} deposit — split ready
        </div>
        <div className="text-xs" style={{ color: "var(--color-neutral-700)" }}>
          {new Date(transfer.created_at).toLocaleDateString("en-US", { dateStyle: "medium" })}
        </div>
      </div>

      <div className="space-y-2">
        {pending.map((a) => {
          const destAccount = accountsById[a.dest_account_id];
          const bankUrl = destAccount ? resolveBankLoginUrl(destAccount.institution_name) : null;
          return (
            <div
              key={a.id}
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
                    {a.label} — {currency(a.amount)}
                    <ExternalLink size={13} style={{ color: "var(--color-accent-700)", flexShrink: 0 }} />
                  </a>
                ) : (
                  <div style={{ fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 700 }}>
                    {a.label} — {currency(a.amount)}
                  </div>
                )}
                <div className="text-xs truncate" style={{ fontSize: 15, color: "var(--color-neutral-700)" }}>
                  {bankUrl ? "Click the amount to open " : "Send to "}
                  {accountLabel(destAccount)}
                </div>
              </div>
              <PrimaryButton
                onClick={() => onConfirm(a.id)}
                disabled={confirmingId === a.id}
                style={{ padding: "10px 20px", fontSize: 15, fontWeight: 700, borderRadius: 999 }}
              >
                {confirmingId === a.id ? "Marking…" : "I sent this"}
              </PrimaryButton>
            </div>
          );
        })}
        {done.map((a) => (
          <div
            key={a.id}
            className="flex items-center gap-2 text-sm"
            style={{ padding: "6px 16px", color: "var(--color-neutral-700)" }}
          >
            <CheckCircle2 size={15} style={{ color: "var(--color-accent-700)", flexShrink: 0 }} />
            <span style={{ textDecoration: "line-through" }}>
              {a.label} — {currency(a.amount)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// `transfers` comes from GET /api/transfers/pending; `accounts` is the same
// list the Dashboard already fetches from /api/accounts, passed straight
// through so this stays purely presentational (same pattern as
// AccountBalances). Renders nothing at all once there's no pending
// transfer -- this section should disappear the moment a user is fully
// caught up.
export default function PendingTransfers({ transfers, accounts, onConfirmed }) {
  const [confirmingId, setConfirmingId] = useState(null);
  const accountsById = useMemo(() => Object.fromEntries((accounts || []).map((a) => [a.id, a])), [accounts]);

  if (!transfers || transfers.length === 0) return null;

  const confirm = async (allocationId) => {
    setConfirmingId(allocationId);
    try {
      const res = await fetch(`/api/transfer-allocations/${allocationId}/confirm`, { method: "POST" });
      if (res.ok) onConfirmed();
    } finally {
      setConfirmingId(null);
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
          PriorityPay calculated these splits but can&apos;t move the money yet — click an amount below to open that
          account&apos;s bank and send it yourself, then check it off. Once confirmed, it counts toward your totals
          below.
        </p>
      </Card>
      {transfers.map((t) => (
        <TransferGroup key={t.id} transfer={t} accountsById={accountsById} onConfirm={confirm} confirmingId={confirmingId} />
      ))}
    </div>
  );
}
