"use client";

import { useMemo, useState } from "react";
import { Card, PrimaryButton, currency } from "./ui";
import { bloomAccentCardStyle } from "@/lib/bloomTheme";
import { resolveBankLoginUrl } from "@/lib/bankLinks";
import { ExternalLink, Clock } from "lucide-react";

function accountLabel(acc, fallbackLabel) {
  if (acc) return `${acc.institution_name} ${acc.account_name} •••• ${acc.mask}`;
  // The account row itself may be gone (disconnected/replaced), but
  // dest_account_label (see lib/runSplit.js) snapshots what it was called
  // when this allocation was written, so this can still say exactly where
  // the money needs to go instead of a dead end -- see PHASE U,
  // supabase/schema.sql.
  if (fallbackLabel) return `${fallbackLabel} (disconnected, reconnect it, or send manually)`;
  return "an account that's since been disconnected or renamed, with no record of which one";
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
export function groupByCategory(rows) {
  const map = new Map();
  rows.forEach((a) => {
    const key = `${a.label}::${a.dest_account_id || ""}::${a.source_account_id || ""}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: a.label,
        dest_account_id: a.dest_account_id,
        dest_account_label: null,
        source_account_id: a.source_account_id || null,
        source_account_label: null,
        amount: 0,
        ids: [],
      });
    }
    const g = map.get(key);
    g.amount += Number(a.amount) || 0;
    g.ids.push(a.id);
    // Any row in the group carrying a snapshotted label is as good as any
    // other -- they all share the same dest_account_id/source_account_id
    // key, so the labels (taken at write time -- see lib/runSplit.js and
    // lib/closeoutTransfer.js) should already agree.
    if (!g.dest_account_label && a.dest_account_label) g.dest_account_label = a.dest_account_label;
    if (!g.source_account_label && a.source_account_label) g.source_account_label = a.source_account_label;
  });
  return Array.from(map.values());
}

// One more level up from groupByCategory: someone can easily have several
// categories all funded from the same real source account into the same
// real destination account (e.g. Barn Roof, Property Taxes, and Emergency
// Fund all routing Truist Checking -> Capital One Savings). Categorically
// those need to stay separate for bookkeeping, but at the bank, it's one
// real transfer -- so this groups category-groups by
// source_account_id::dest_account_id and sums them into a single amount
// to actually send, while keeping the individual category rows for
// display. Per Megan's call (Sep 2026 feedback review): categories should
// stay the visually prominent thing, with the combined total just one
// more line, not a hero number -- and the whole group gets exactly one
// "I sent $X" action instead of one per category, so confirming a lump-sum
// transfer is a single click covering every allocation id underneath it.
export function groupByAccountPair(categoryGroups) {
  const map = new Map();
  categoryGroups.forEach((g) => {
    const key = `${g.source_account_id || ""}::${g.dest_account_id || ""}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        dest_account_id: g.dest_account_id,
        dest_account_label: g.dest_account_label,
        source_account_id: g.source_account_id,
        source_account_label: g.source_account_label,
        categories: [],
        total: 0,
        ids: [],
      });
    }
    const p = map.get(key);
    p.categories.push(g);
    p.total += g.amount;
    p.ids.push(...g.ids);
    if (!p.dest_account_label && g.dest_account_label) p.dest_account_label = g.dest_account_label;
    if (!p.source_account_label && g.source_account_label) p.source_account_label = g.source_account_label;
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
  // Account-pair keys currently expanded into their old one-row-per-
  // category view, for the person who can only send part of a combined
  // total right now and needs to confirm/skip categories individually.
  const [separateKeys, setSeparateKeys] = useState(() => new Set());
  const accountsById = useMemo(() => Object.fromEntries((accounts || []).map((a) => [a.id, a])), [accounts]);

  const pendingByCategory = useMemo(
    () => groupByCategory((allocations || []).filter((a) => a.status === "needs_approval")),
    [allocations]
  );
  const pendingByAccountPair = useMemo(() => groupByAccountPair(pendingByCategory), [pendingByCategory]);
  const inTransit = useMemo(
    () => groupByCategory((allocations || []).filter((a) => a.status === "in_transit")),
    [allocations]
  );

  if (!pendingByAccountPair.length && !inTransit.length) return null;

  const callAll = async (ids, path) => {
    const results = await Promise.all(ids.map((id) => fetch(`/api/transfer-allocations/${id}/${path}`, { method: "POST" })));
    if (results.some((r) => r.ok)) onConfirmed();
  };

  const confirmIds = async (key, ids) => {
    setBusyKey(key);
    setBusyAction("confirm");
    try {
      await callAll(ids, "confirm");
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

  const toggleSeparate = (key) => {
    setSeparateKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
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
          Your splits are ready! Go send the total below, then mark it sent so your category balances stay accurate.
        </p>
      </Card>

      {pendingByAccountPair.length > 0 && (
        <Card className="p-5" style={{ borderRadius: 24 }}>
          <div className="space-y-3">
            {pendingByAccountPair.map((pair) => {
              const destAccount = accountsById[pair.dest_account_id];
              const sourceAccount = accountsById[pair.source_account_id];
              const sourceInstitution = sourceAccount?.institution_name || (pair.source_account_label || "").split(" ")[0];
              const destInstitution = destAccount?.institution_name || (pair.dest_account_label || "").split(" ")[0];
              const sourceBankUrl = sourceInstitution ? resolveBankLoginUrl(sourceInstitution) : null;
              const destBankUrl = destInstitution ? resolveBankLoginUrl(destInstitution) : null;
              const destLabel = accountLabel(destAccount, pair.dest_account_label);
              const sourceLabel = accountLabel(sourceAccount, pair.source_account_label);
              const busy = busyKey === pair.key;
              const separate = separateKeys.has(pair.key);

              return (
                <div
                  key={pair.key}
                  style={{
                    padding: "16px 18px",
                    border: "1px solid var(--color-divider)",
                    borderRadius: 18,
                    background: "var(--color-neutral-100)",
                  }}
                >
                  <div
                    className="truncate"
                    style={{
                      fontSize: 12.5,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      color: "var(--color-neutral-700)",
                      marginBottom: 10,
                    }}
                  >
                    {sourceLabel} &rarr; {destLabel}
                  </div>

                  {separate ? (
                    // Fallback for someone who can only send part of the
                    // total right now -- same one-row-per-category
                    // confirm/delete this component used to always show,
                    // scoped to just this account pair.
                    <div className="space-y-2">
                      {pair.categories.map((g) => (
                        <div
                          key={g.key}
                          className="flex items-center justify-between gap-3 flex-wrap"
                          style={{ padding: "8px 0", borderBottom: "1px solid var(--color-divider)" }}
                        >
                          <div style={{ fontSize: 16, fontWeight: 700 }}>
                            {g.label}
                            {g.ids.length > 1 ? ` (${g.ids.length} deposits)` : ""}, {currency(g.amount)}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => skip(g)}
                              disabled={busyKey === g.key}
                              title="Remove this split from your checklist (doesn't delete the category)"
                              style={{
                                padding: "8px 14px",
                                fontSize: 13,
                                fontWeight: 600,
                                borderRadius: 999,
                                background: "transparent",
                                border: "1px solid var(--color-divider)",
                                color: "var(--color-neutral-700)",
                                cursor: busyKey === g.key ? "default" : "pointer",
                              }}
                            >
                              {busyKey === g.key && busyAction === "skip" ? "Removing…" : "Delete"}
                            </button>
                            <PrimaryButton
                              onClick={() => confirmIds(g.key, g.ids)}
                              disabled={busyKey === g.key}
                              style={{ padding: "8px 16px", fontSize: 14, fontWeight: 700, borderRadius: 999 }}
                            >
                              {busyKey === g.key && busyAction === "confirm" ? "Marking…" : "I sent this"}
                            </PrimaryButton>
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => toggleSeparate(pair.key)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-accent-700)", fontSize: 12.5, textDecoration: "underline", padding: "6px 0 0" }}
                      >
                        Combine these back into one transfer
                      </button>
                    </div>
                  ) : (
                    <>
                      {pair.categories.map((g) => (
                        <div key={g.key} className="flex items-center justify-between" style={{ padding: "5px 0", fontSize: 16, fontWeight: 700, color: "var(--color-text)" }}>
                          <span>
                            {g.label}
                            {g.ids.length > 1 ? ` (${g.ids.length} deposits)` : ""}
                          </span>
                          <span style={{ fontFamily: "var(--font-mono)" }}>{currency(g.amount)}</span>
                        </div>
                      ))}
                      <div
                        className="flex items-center justify-between"
                        style={{ marginTop: 6, paddingTop: 8, borderTop: "1px solid var(--color-divider)" }}
                      >
                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-neutral-700)" }}>Total to send</span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: "var(--color-accent-800)" }}>
                          {currency(pair.total)}
                        </span>
                      </div>

                      <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px dashed var(--color-divider)" }}>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: "var(--color-accent-600)",
                            marginBottom: 6,
                          }}
                        >
                          Step 1 &mdash; go send it
                        </div>
                        <div className="flex items-center gap-4 flex-wrap">
                          {sourceBankUrl && (
                            <a
                              href={sourceBankUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1"
                              style={{ fontSize: 14, fontWeight: 700, color: "var(--color-accent-700)", textDecoration: "none" }}
                            >
                              {sourceInstitution || "Sending bank"}
                              <ExternalLink size={12} style={{ opacity: 0.6 }} />
                            </a>
                          )}
                          {destBankUrl && destInstitution !== sourceInstitution && (
                            <a
                              href={destBankUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1"
                              style={{ fontSize: 14, fontWeight: 700, color: "var(--color-accent-700)", textDecoration: "none" }}
                            >
                              {destInstitution || "Receiving bank"}
                              <ExternalLink size={12} style={{ opacity: 0.6 }} />
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 flex-wrap" style={{ marginTop: 14 }}>
                        {pair.categories.length > 1 ? (
                          <button
                            onClick={() => toggleSeparate(pair.key)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-neutral-600)", fontSize: 12, textDecoration: "underline" }}
                          >
                            Send these separately instead
                          </button>
                        ) : (
                          <span />
                        )}
                        <PrimaryButton
                          onClick={() => confirmIds(pair.key, pair.ids)}
                          disabled={busy}
                          style={{ padding: "11px 22px", fontSize: 14, fontWeight: 700, borderRadius: 999 }}
                        >
                          {busy && busyAction === "confirm" ? "Marking…" : `I sent ${currency(pair.total)}`}
                        </PrimaryButton>
                      </div>
                      <p style={{ fontSize: 12, color: "var(--color-neutral-700)", lineHeight: 1.5, margin: "10px 0 0" }}>
                        Be sure to mark it as &quot;Sent&quot; after executing the transfer. This ensures the categories in your
                        dashboard are always accurate.
                      </p>
                    </>
                  )}
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
                        {g.label}, {currency(g.amount)}
                      </div>
                      <div className="text-xs truncate" style={{ color: "var(--color-neutral-700)" }}>
                        On its way to {accountLabel(destAccount, g.dest_account_label)}, we&apos;ll mark this settled automatically once it
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
