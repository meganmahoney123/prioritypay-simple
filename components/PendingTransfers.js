"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, PrimaryButton } from "./ui";
import { bloomAccentCardStyle } from "@/lib/bloomTheme";
import { resolveBankLoginUrl } from "@/lib/bankLinks";
import { ExternalLink, Clock, ChevronDown, ChevronRight, Pencil, AlertCircle } from "lucide-react";

// The "Transfers to make" checklist on the Dashboard: ONE grand-totals card
// (Nov 2026). PrioritySave never moves money; every row is a transfer the
// user makes in their own bank, then marks as transferred.
//
//  - Header: where the money came from. Each pending deposit's name, date
//    and amount with Skip (removes it from every total), the combined total
//    when there's more than one, and recently skipped deposits with Undo.
//  - One row per category (label + from/to accounts), combining that
//    category's pending lines across every pending deposit: the total, each
//    deposit's own amount under it (hidden when only one deposit is
//    pending), where it goes, and two identical buttons, "Transfer $X Now"
//    and "Mark as Transferred" (50/50 full width on phones).
//  - "Transfer $X Now" opens a sheet asking which bank to open: where the
//    money currently is (the account the deposit landed in) or where it's
//    going (the destination). It only opens the bank.
//  - Categories that stay in the account the deposit landed in, and
//    Guilt-Free Spending (the part of each deposit not assigned to any
//    category), say "No transfer needed (stays in [account])".
//  - No "Approve all" shortcut (removed Nov 2026): people mark each transfer
//    as transferred themselves so balances only change for real transfers.
//  - "On the way (N)", collapsed by default: lines marked as transferred but
//    not seen landing yet, with "It already landed" and the near-miss
//    "Is this your transfer?" prompt.
//
// Data: GET /api/transfers/deposits. Actions: /api/transfer-allocations/
// confirm-batch, /api/transfer-allocations/[id]/(settle|amount|candidate/*),
// /api/transfers/approve-all, /api/transfers/[id]/(skip|unskip).

export const GUILT_FREE_LABEL = "Guilt-Free Spending";
const SKIP_REASONS = ["Not business income", "Refund or reimbursement", "Transfer between my accounts", "Other"];

// "$720" for whole dollars, "$175.50" otherwise.
export function money(n) {
  const v = Number(n) || 0;
  const whole = Math.abs(v - Math.round(v)) < 0.005;
  return v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  });
}

// Always with cents, for the sheet's reminder line ("Transfer $1,296.00 to Tax Reserve").
function fullMoney(n) {
  return (Number(n) || 0).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pctOf(part, whole) {
  return whole ? Math.round((part / whole) * 1000) / 10 : 0;
}

function formatDate(iso, withYear = false) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", ...(withYear ? { year: "numeric" } : {}) });
}

function accountLabel(acc, fallbackLabel) {
  if (acc) return `${acc.institution_name} ${acc.account_name} •••• ${acc.mask}`;
  // The account may be gone (disconnected/replaced); dest/source_account_label
  // snapshot what it was called when the line was written (PHASE U,
  // supabase/schema.sql).
  if (fallbackLabel) return `${fallbackLabel} (disconnected)`;
  return "an account that has since been disconnected";
}

function institutionFor(acc, fallbackLabel) {
  if (acc?.institution_name) return acc.institution_name;
  return (fallbackLabel || "").split(" ")[0] || null;
}

function depositTitle(d) {
  if (d.name) return d.name;
  if (d.trigger === "closeout") return "Close-Out transfer";
  if (d.trigger === "manual") return "Manual split";
  return "Deposit";
}

export const needsTransfer = (l) => !l.reserved_only && l.status !== "reserved";

// Kept for components/AppShell.js (browser-tab reminder), which still reads
// GET /api/transfers/pending.
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
        calculatedAmount: 0,
        ids: [],
      });
    }
    const g = map.get(key);
    g.amount += Number(a.amount) || 0;
    g.calculatedAmount += Number(a.calculated_amount ?? a.amount) || 0;
    g.ids.push(a.id);
    if (!g.dest_account_label && a.dest_account_label) g.dest_account_label = a.dest_account_label;
    if (!g.source_account_label && a.source_account_label) g.source_account_label = a.source_account_label;
  });
  return Array.from(map.values());
}

// Transfer rows grouped by destination account: one transfer per account.
export function groupByDestination(rows) {
  const map = new Map();
  rows
    .filter((r) => r.kind === "transfer")
    .forEach((r) => {
      const key = `to::${r.dest_account_id || r.dest_account_label || ""}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          dest_account_id: r.dest_account_id,
          dest_account_label: r.dest_account_label,
          source_account_id: r.source_account_id,
          source_account_label: r.source_account_label,
          rows: [],
          ids: [],
          total: 0,
        });
      }
      const g = map.get(key);
      g.rows.push(r);
      g.ids.push(...r.ids);
      g.total = Math.round((g.total + r.total) * 100) / 100;
      if (!g.dest_account_label && r.dest_account_label) g.dest_account_label = r.dest_account_label;
      if (!g.source_account_id && r.source_account_id) g.source_account_id = r.source_account_id;
      if (!g.source_account_label && r.source_account_label) g.source_account_label = r.source_account_label;
    });
  return Array.from(map.values());
}

// Per-deposit view model.
export function buildDeposit(d) {
  const lines = (d.lines || []).filter((l) => l.status !== "failed");
  const calculatedSum = lines.reduce((s, l) => s + (Number(l.calculated_amount ?? l.amount) || 0), 0);
  const sourceLine = lines.find((l) => l.source_account_id || l.source_account_label) || {};
  return {
    ...d,
    title: depositTitle(d),
    lines,
    guiltFree: Math.max(0, Math.round((d.sourceAmount - calculatedSum) * 100) / 100),
    sourceAccountId: sourceLine.source_account_id || null,
    sourceAccountLabel: sourceLine.source_account_label || null,
    waitingCount: lines.filter((l) => needsTransfer(l) && l.status === "needs_approval").length,
  };
}

// Category rows across every pending deposit.
export function buildRows(pendingDeposits) {
  const map = new Map();
  const add = (key, base, part) => {
    if (!map.has(key)) map.set(key, { key, ...base, total: 0, parts: [], ids: [] });
    const row = map.get(key);
    row.total += part.amount;
    row.parts.push(part);
    if (part.line && row.kind === "transfer") row.ids.push(part.line.id);
    if (!row.dest_account_label && part.line?.dest_account_label) row.dest_account_label = part.line.dest_account_label;
    if (!row.source_account_label && part.sourceLabel) row.source_account_label = part.sourceLabel;
  };

  pendingDeposits.forEach((d) => {
    d.lines.forEach((l) => {
      const transfer = needsTransfer(l);
      if (transfer && l.status !== "needs_approval") return; // marked, landed or removed: not pending
      if (!transfer && l.status !== "reserved") return;
      const kind = transfer ? "transfer" : "stay";
      const key = `${kind}::${l.label}::${l.dest_account_id || ""}::${l.source_account_id || ""}`;
      add(
        key,
        { kind, label: l.label, dest_account_id: l.dest_account_id, source_account_id: l.source_account_id, dest_account_label: null, source_account_label: null },
        {
          deposit: d,
          line: l,
          amount: Number(l.amount) || 0,
          pct: pctOf(Number(l.calculated_amount ?? l.amount) || 0, d.sourceAmount),
          sourceLabel: l.source_account_label,
        }
      );
    });
    if (d.guiltFree > 0) {
      add(
        `guiltfree::${d.sourceAccountId || d.sourceAccountLabel || ""}`,
        { kind: "stay", guiltFree: true, label: GUILT_FREE_LABEL, dest_account_id: null, source_account_id: d.sourceAccountId, dest_account_label: null, source_account_label: null },
        { deposit: d, line: null, amount: d.guiltFree, pct: pctOf(d.guiltFree, d.sourceAmount), sourceLabel: d.sourceAccountLabel }
      );
    }
  });

  const rows = Array.from(map.values()).map((r) => {
    const pcts = new Set(r.parts.map((p) => p.pct));
    return { ...r, total: Math.round(r.total * 100) / 100, sharedPct: pcts.size === 1 ? r.parts[0].pct : null };
  });
  // Guilt-Free Spending last; everything else in first-seen order.
  return [...rows.filter((r) => !r.guiltFree), ...rows.filter((r) => r.guiltFree)];
}

const mutedText = { fontSize: 13, color: "var(--color-neutral-700)", lineHeight: 1.5 };
const linkButtonStyle = {
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
  color: "var(--color-neutral-700)",
  fontSize: 13,
  textDecoration: "underline",
};
const smallPrimary = { padding: "8px 16px", fontSize: 13, fontWeight: 700, borderRadius: 999 };
const rowDivider = { padding: "12px 0", borderTop: "1px solid var(--color-divider)" };
// "Transfer $X Now" and "Mark as Transferred": identical size and style.
const pairButton = { padding: "11px 12px", fontSize: 14, fontWeight: 700, borderRadius: 999, minHeight: 48, lineHeight: 1.25, textAlign: "center" };

export default function PendingTransfers({ accounts, refreshKey, onChanged, showEmpty = false }) {
  const [data, setData] = useState({ deposits: [], skipped: [] });
  const [loaded, setLoaded] = useState(false);
  const [busyKey, setBusyKey] = useState(null);
  const [error, setError] = useState(null);
  const [skipOpenFor, setSkipOpenFor] = useState(null);
  const [skipReason, setSkipReason] = useState(SKIP_REASONS[0]);
  const [editing, setEditing] = useState(null); // allocation id
  const [draft, setDraft] = useState("");
  const [onTheWayOpen, setOnTheWayOpen] = useState(false);
  const [confirmGroup, setConfirmGroup] = useState(null); // group being marked as transferred
  const [confirmDifferent, setConfirmDifferent] = useState(false);
  const [sheetRow, setSheetRow] = useState(null); // category row whose "Transfer $X Now" sheet is open

  const accountsById = useMemo(() => Object.fromEntries((accounts || []).map((a) => [a.id, a])), [accounts]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/transfers/deposits");
      const body = await res.json();
      if (res.ok) setData({ deposits: body.deposits || [], skipped: body.skipped || [] });
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  useEffect(() => {
    if (!sheetRow) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setSheetRow(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetRow]);

  const deposits = useMemo(() => data.deposits.map(buildDeposit), [data.deposits]);
  const pendingDeposits = useMemo(() => deposits.filter((d) => d.waitingCount > 0), [deposits]);
  const rows = useMemo(() => buildRows(pendingDeposits), [pendingDeposits]);
  const showParts = pendingDeposits.length > 1;
  // One group per destination account: the category rows going there, one grand total.
  const groups = useMemo(() => groupByDestination(rows), [rows]);
  const stayRows = useMemo(() => rows.filter((r) => r.kind === "stay"), [rows]);
  const pendingTotal = useMemo(() => pendingDeposits.reduce((s, d) => s + d.sourceAmount, 0), [pendingDeposits]);
  const skipped = useMemo(() => data.skipped.map((s) => ({ ...s, title: depositTitle(s) })), [data.skipped]);

  const onTheWay = useMemo(() => {
    const items = [];
    deposits.forEach((d) =>
      d.lines.forEach((l) => {
        if (needsTransfer(l) && l.status === "in_transit") items.push({ deposit: d, line: l });
      })
    );
    return items;
  }, [deposits]);

  const run = async (key, fn) => {
    setBusyKey(key);
    setError(null);
    try {
      const res = await fn();
      if (res && !res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "Something went wrong. Please try again.");
      }
      await load();
      onChanged?.();
    } finally {
      setBusyKey(null);
    }
  };

  const post = (url, body) =>
    fetch(url, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });

  const markGroup = (g) => run(`row:${g.key}`, () => post("/api/transfer-allocations/confirm-batch", { allocationIds: g.ids }));
  const unmark = (ids) => run(`undo:${ids.join(",")}`, () => post("/api/transfer-allocations/unmark", { allocationIds: ids }));
  const settleLine = (id) => run(`line:${id}`, () => post(`/api/transfer-allocations/${id}/settle`));
  const candidate = (id, action) => run(`line:${id}`, () => post(`/api/transfer-allocations/${id}/candidate/${action}`));
  const skipDeposit = (id) =>
    run(`dep:${id}`, async () => {
      const res = await post(`/api/transfers/${id}/skip`, { reason: skipReason });
      setSkipOpenFor(null);
      return res;
    });
  const undoSkip = (id) => run(`dep:${id}`, () => post(`/api/transfers/${id}/unskip`));

  const saveAmount = async (line) => {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Enter an amount greater than $0.");
      return;
    }
    await run(`line:${line.id}`, () =>
      fetch(`/api/transfer-allocations/${line.id}/amount`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parsed }),
      })
    );
    setEditing(null);
  };

  if (!loaded) return null;
  if (!pendingDeposits.length && !onTheWay.length && !skipped.length) {
    if (!showEmpty) return null;
    return (
      <Card style={bloomAccentCardStyle({ padding: "28px 24px", borderRadius: 24, background: "var(--color-surface)" })}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text)", marginBottom: 4 }}>You&apos;re all caught up</div>
        <p style={{ ...mutedText, margin: 0, fontSize: 15 }}>
          When a new deposit comes in, it shows up here with the transfers to make, and a notification appears on your Dashboard.
        </p>
      </Card>
    );
  }

  // Click-to-edit amount for one pending line; plain text otherwise.
  const amountFor = (line, amount, { bold = false } = {}) => {
    const style = { fontFamily: "var(--font-mono)", fontWeight: bold ? 700 : 500 };
    if (!line || line.status !== "needs_approval" || !needsTransfer(line)) return <span style={style}>{money(amount)}</span>;
    if (editing === line.id) {
      return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          $
          <input
            type="number"
            step="0.01"
            min="0.01"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => saveAmount(line)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") setEditing(null);
            }}
            style={{
              width: 90,
              fontFamily: "var(--font-mono)",
              border: "1px solid var(--color-divider)",
              borderRadius: 8,
              padding: "2px 6px",
              background: "var(--color-neutral-100)",
              color: "var(--color-text)",
            }}
          />
        </span>
      );
    }
    const overridden = line.calculated_amount != null && Math.abs(line.calculated_amount - line.amount) > 0.005;
    return (
      <button
        type="button"
        title="Change this amount"
        onClick={() => {
          setEditing(line.id);
          setDraft(Number(line.amount).toFixed(2));
        }}
        style={{ ...style, background: "none", border: "none", padding: 0, cursor: "pointer", color: "inherit", display: "inline-flex", alignItems: "center", whiteSpace: "nowrap" }}
      >
        <span style={{ textDecoration: "underline dotted", textUnderlineOffset: 3 }}>{money(amount)}</span>
        <Pencil size={13} aria-hidden="true" style={{ marginLeft: 6, verticalAlign: "-1px", opacity: 0.75 }} />
        <span style={{ position: "absolute", left: -9999 }}> Edit amount</span>
        {overridden && <span style={{ fontWeight: 500, fontSize: 11, marginLeft: 6 }}>(calculated {money(line.calculated_amount)})</span>}
      </button>
    );
  };

  // One category line inside a destination-account group: label, shared %,
  // editable amount, and each deposit's own part when several are combined.
  // No buttons here: they live once, at the bottom of the group.
  const renderLine = (row) => {
    const singleLine = row.parts.length === 1 ? row.parts[0].line : null;
    const title = `${row.label}${row.sharedPct != null ? ` (${row.sharedPct}%)` : ""}`;
    return (
      <div key={row.key} style={rowDivider}>
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text)" }}>{title}</div>
          <div style={{ fontSize: 15 }}>{amountFor(singleLine, row.total)}</div>
        </div>
        {showParts && (
          <div style={{ margin: "4px 0 2px 12px" }}>
            {row.parts.map((p) => (
              <div key={`${row.key}:${p.deposit.id}`} className="flex items-baseline justify-between gap-3" style={mutedText}>
                <span style={{ minWidth: 0 }}>
                  {p.deposit.title} ({formatDate(p.deposit.createdAt)}){row.sharedPct == null ? ` · ${p.pct}%` : ""}
                </span>
                <span>{amountFor(p.line, p.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // One "Send to <account>" group: its category lines, then ONE grand total
  // with ONE "Transfer $X Now" and ONE "Mark as Transferred".
  const renderGroup = (g) => {
    const busy = busyKey === `row:${g.key}`;
    const destName = accountLabel(accountsById[g.dest_account_id], g.dest_account_label);
    const sheetTarget = {
      key: g.key,
      total: g.total,
      label: destName,
      dest_account_id: g.dest_account_id,
      dest_account_label: g.dest_account_label,
      source_account_id: g.source_account_id,
      source_account_label: g.source_account_label,
    };
    return (
      <div key={g.key} style={{ padding: "16px 0 8px", borderTop: "1px solid var(--color-divider)" }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>Send to</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text)", marginBottom: 4 }}>{destName}</div>
        {g.rows.map(renderLine)}
        <div className="flex items-baseline justify-between gap-3" style={{ borderTop: "2px solid var(--color-divider)", paddingTop: 12, marginTop: 4 }}>
          <span style={{ ...mutedText, fontWeight: 600 }}>Total to send</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700 }}>{money(g.total)}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end" style={{ marginTop: 10 }}>
          <PrimaryButton onClick={() => setSheetRow(sheetTarget)} disabled={busy || busyKey === "all"} className="w-full sm:w-52" style={pairButton}>
            Transfer {money(g.total)} Now
          </PrimaryButton>
          <PrimaryButton onClick={() => { setConfirmDifferent(false); setConfirmGroup(g); }} disabled={busy || busyKey === "all"} className="w-full sm:w-52" style={pairButton}>
            {busy ? "Saving..." : "Mark as Transferred"}
          </PrimaryButton>
        </div>
      </div>
    );
  };

  // Bottom tie-out: transfers + what stays = total deposits.
  const renderTieOut = () => {
    const transfersTotal = groups.reduce((t, g) => t + g.total, 0);
    return (
      <div style={{ borderTop: "1px solid var(--color-divider)", marginTop: 8, paddingTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
        <div className="flex justify-between gap-3" style={mutedText}>
          <span>Transfers above ({groups.length})</span>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{money(transfersTotal)}</span>
        </div>
        {stayRows.map((r) => (
          <div key={r.key} className="flex justify-between gap-3" style={mutedText}>
            <span style={{ minWidth: 0 }}>
              {r.label}
              {r.sharedPct != null ? ` (${r.sharedPct}%)` : ""}, stays in {accountLabel(accountsById[r.source_account_id], r.source_account_label)}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{money(r.total)}</span>
          </div>
        ))}
        <div className="flex justify-between gap-3" style={{ fontWeight: 700, color: "var(--color-text)", borderTop: "1px solid var(--color-divider)", paddingTop: 6 }}>
          <span>Total deposits</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 16 }}>{money(pendingTotal)}</span>
        </div>
      </div>
    );
  };

  // Top of the card: where the money came from. Each pending deposit's name,
  // date and amount with Skip, the combined total when there's more than
  // one, and recently skipped deposits with Undo.
  const renderHeader = () => (
    <div style={{ padding: "8px 0 12px" }}>
      {pendingDeposits.length > 0 && (
        <div style={{ ...mutedText, fontWeight: 600, marginBottom: 2 }}>{pendingDeposits.length > 1 ? "Deposits included" : "Deposit included"}</div>
      )}
      {pendingDeposits.map((d) => {
        const busy = busyKey === `dep:${d.id}`;
        return (
          <div key={d.id} style={{ padding: "4px 0" }}>
            <div className="flex items-baseline justify-between gap-3">
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text)", minWidth: 0 }}>{d.title}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700 }}>{money(d.sourceAmount)}</span>
            </div>
            <div className="flex items-baseline justify-between gap-3" style={mutedText}>
              <span>{formatDate(d.createdAt, true)}</span>
              {skipOpenFor !== d.id && (
                <button
                  onClick={() => {
                    setSkipOpenFor(d.id);
                    setSkipReason(SKIP_REASONS[0]);
                  }}
                  style={linkButtonStyle}
                >
                  Remove
                </button>
              )}
            </div>
            {skipOpenFor === d.id && (
              <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: 4 }}>
                <label style={mutedText} htmlFor={`skip-${d.id}`}>
                  Reason
                </label>
                <select
                  id={`skip-${d.id}`}
                  value={skipReason}
                  onChange={(e) => setSkipReason(e.target.value)}
                  style={{ fontSize: 13, padding: "4px 8px", borderRadius: 8, border: "1px solid var(--color-divider)", background: "var(--color-surface)", color: "var(--color-text)" }}
                >
                  {SKIP_REASONS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
                <button onClick={() => skipDeposit(d.id)} disabled={busy} style={{ ...linkButtonStyle, fontWeight: 700, color: "var(--color-text)" }}>
                  {busy ? "Removing..." : "Remove deposit"}
                </button>
                <button onClick={() => setSkipOpenFor(null)} style={linkButtonStyle}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        );
      })}
      {pendingDeposits.length > 1 && (
        <div className="flex items-baseline justify-between gap-3" style={{ borderTop: "1px solid var(--color-divider)", marginTop: 6, paddingTop: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text)" }}>Total deposits</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 800 }}>{money(pendingTotal)}</span>
        </div>
      )}
      {skipped.map((s) => {
        const busy = busyKey === `dep:${s.id}`;
        return (
          <div key={s.id} className="flex items-baseline justify-between gap-3" style={{ ...mutedText, padding: "6px 0 0", opacity: 0.75 }}>
            <span style={{ minWidth: 0 }}>
              {s.title} · {formatDate(s.createdAt)} · {money(s.sourceAmount)} · Removed ({s.skipReason || "Other"}), not counted in any totals
            </span>
            <button onClick={() => undoSkip(s.id)} disabled={busy} style={{ ...linkButtonStyle, fontWeight: 700, color: "var(--color-accent-700)" }}>
              {busy ? "Restoring..." : "Add back"}
            </button>
          </div>
        );
      })}
    </div>
  );

  // "Transfer $X Now" sheet: pick which bank to open. PrioritySave only
  // opens the bank; the user makes the transfer there.
  const renderSheet = () => {
    if (!sheetRow) return null;
    const fromAccount = accountsById[sheetRow.source_account_id];
    const toAccount = accountsById[sheetRow.dest_account_id];
    const options = [
      { heading: "Where Your Money Currently Is", acc: fromAccount, fallback: sheetRow.source_account_label },
      { heading: "Where Your Money Is Going", acc: toAccount, fallback: sheetRow.dest_account_label },
    ];
    return (
      <div
        className="fixed inset-0 flex items-end sm:items-center justify-center"
        style={{ zIndex: 60, background: "rgba(20, 12, 32, 0.45)" }}
        onClick={() => setSheetRow(null)}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="transfer-sheet-title"
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl"
          style={{
            background: "var(--color-surface)",
            color: "var(--color-text)",
            padding: "22px 20px calc(20px + env(safe-area-inset-bottom, 0px))",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <h2 id="transfer-sheet-title" style={{ fontFamily: "var(--font-heading)", fontSize: 18, fontWeight: 700, margin: 0 }}>
            Which bank account would you like to open?
          </h2>
          <p style={{ fontSize: 15, fontWeight: 600, margin: "8px 0 2px" }}>
            Transfer {fullMoney(sheetRow.total)} to {sheetRow.label}
          </p>
          <p style={{ ...mutedText, margin: "0 0 14px" }}>Opens your bank. PrioritySave doesn&apos;t move the money.</p>

          {options.map((o) => {
            const institution = institutionFor(o.acc, o.fallback);
            const url = institution ? resolveBankLoginUrl(institution) : null;
            const name = o.acc ? `${o.acc.institution_name} · ${o.acc.account_name} ••${o.acc.mask}` : `${o.fallback || "Unknown account"} (disconnected)`;
            return (
              <div key={o.heading} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-neutral-700)", marginBottom: 6 }}>
                  {o.heading}
                </div>
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setSheetRow(null)}
                    className="flex items-center justify-between gap-3"
                    style={{
                      border: "1px solid var(--color-divider)",
                      borderRadius: 16,
                      padding: "14px 16px",
                      fontSize: 15,
                      fontWeight: 600,
                      color: "var(--color-text)",
                      textDecoration: "none",
                      background: "var(--color-neutral-100)",
                    }}
                  >
                    <span style={{ minWidth: 0 }}>{name}</span>
                    <ExternalLink size={16} style={{ opacity: 0.6, flexShrink: 0 }} />
                  </a>
                ) : (
                  <div style={{ ...mutedText, border: "1px solid var(--color-divider)", borderRadius: 16, padding: "14px 16px" }}>{name}</div>
                )}
              </div>
            );
          })}

          <button
            onClick={() => setSheetRow(null)}
            className="w-full"
            style={{
              marginTop: 4,
              padding: "12px 16px",
              borderRadius: 999,
              border: "1px solid var(--color-divider)",
              background: "transparent",
              color: "var(--color-text)",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  // Asked every time "Mark as Transferred" is tapped, so the amount recorded
  // is the amount actually sent. A different amount means editing the lines
  // first, so the category balances only ever change by what really moved.
  const renderConfirm = () => {
    if (!confirmGroup) return null;
    const g = confirmGroup;
    const destName = accountLabel(accountsById[g.dest_account_id], g.dest_account_label);
    const close = () => setConfirmGroup(null);
    return (
      <div className="fixed inset-0 flex items-end sm:items-center justify-center" style={{ zIndex: 60, background: "rgba(20, 12, 32, 0.45)" }} onClick={close}>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-sent-title"
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl"
          style={{ background: "var(--color-surface)", color: "var(--color-text)", padding: "22px 20px calc(20px + env(safe-area-inset-bottom, 0px))", boxShadow: "var(--shadow-lg)" }}
        >
          <h2 id="confirm-sent-title" style={{ fontFamily: "var(--font-heading)", fontSize: 18, fontWeight: 700, margin: 0 }}>
            Did you send exactly {money(g.total)}?
          </h2>
          <p style={{ ...mutedText, margin: "8px 0 14px", fontSize: 15 }}>To {destName}</p>
          {confirmDifferent ? (
            <>
              <p style={{ fontSize: 15, lineHeight: 1.5, margin: "0 0 14px" }}>
                No problem. Close this, tap the amount of each category you sent to change it so the total matches what you sent, then tap Mark as Transferred again.
              </p>
              <PrimaryButton onClick={close} className="w-full" style={pairButton}>
                Got it, I&apos;ll update the amounts
              </PrimaryButton>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <PrimaryButton
                onClick={() => {
                  close();
                  markGroup(g);
                }}
                className="w-full"
                style={pairButton}
              >
                Yes, I sent {money(g.total)}
              </PrimaryButton>
              <button
                type="button"
                onClick={() => setConfirmDifferent(true)}
                className="w-full"
                style={{ ...pairButton, background: "var(--color-surface)", border: "1.5px solid var(--color-accent)", color: "var(--color-accent-700)", cursor: "pointer" }}
              >
                I sent a different amount
              </button>
              <button type="button" onClick={close} style={{ ...linkButtonStyle, alignSelf: "center", marginTop: 4 }}>
                Not yet
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderOnTheWay = () => {
    const smallBtn = {
      minHeight: 44,
      padding: "0 16px",
      borderRadius: 12,
      fontSize: 15,
      fontWeight: 800,
      cursor: "pointer",
      border: "2px solid #4E22B8",
    };
    return (
      <Card className="p-5 space-y-3" style={{ borderRadius: 24 }}>
        <button
          onClick={() => setOnTheWayOpen((v) => !v)}
          aria-expanded={onTheWayOpen}
          className="flex items-center gap-2 font-bold text-lg"
          style={{ minHeight: 44, background: "transparent", border: "none", padding: 0, cursor: "pointer", color: "var(--color-text)" }}
        >
          {onTheWayOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          On the way ({onTheWay.length})
        </button>
        {onTheWayOpen && (
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: "#4A3F63" }}>
            You marked these as sent. Once the money shows up in the account, tap <b>It landed</b>. For accounts we can see, this
            happens on its own.
          </p>
        )}
        {onTheWayOpen && onTheWay.length > 1 && (
          <div>
            <button onClick={() => unmark(onTheWay.map((i) => i.line.id))} disabled={busyKey?.startsWith("undo:")} style={linkButtonStyle}>
              Undo all ({onTheWay.length}): none of these were sent
            </button>
          </div>
        )}
        {onTheWayOpen &&
          onTheWay.map(({ deposit, line }) => {
            const busy = busyKey === `line:${line.id}`;
            const destAccount = accountsById[line.dest_account_id];
            const watching = !!destAccount?.hasPlaidConnection;
            return (
              <div key={line.id} style={{ background: "#F8F5FF", border: "2px solid #D9C9FF", borderRadius: 18, padding: "14px 16px", display: "grid", gap: 8 }}>
                <div className="flex items-baseline justify-between gap-3">
                  <span style={{ fontSize: 18, fontWeight: 800, color: "#241337" }}>{line.label}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 19, fontWeight: 700, color: "#241337" }}>{money(line.amount)}</span>
                </div>
                <div style={{ fontSize: 15, color: "#4A3F63", lineHeight: 1.45 }}>
                  <div>From: {deposit.title}</div>
                  <div>To: {accountLabel(destAccount, line.dest_account_label)}</div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 14,
                      fontWeight: 800,
                      color: watching ? "#0F6B4F" : "#8A4B00",
                      background: watching ? "#E3F5EE" : "#FFF1DE",
                      borderRadius: 999,
                      padding: "5px 12px",
                    }}
                  >
                    <Clock size={14} /> {watching ? "Watching for it to land" : "Waiting for you to confirm"}
                  </span>
                  <span style={{ fontSize: 14, color: "#4A3F63" }}>Marked sent {formatDate(line.confirmed_at)}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: 2 }}>
                  <button onClick={() => settleLine(line.id)} disabled={busy} style={{ ...smallBtn, background: "#4E22B8", color: "#fff" }}>
                    It landed
                  </button>
                  <button onClick={() => unmark([line.id])} disabled={busy} style={{ ...smallBtn, background: "#fff", color: "#4E22B8" }}>
                    I didn&apos;t send this
                  </button>
                </div>
                {line.candidate_transaction_id && line.candidate_amount != null && (
                  <div style={{ background: "#FFF1DE", border: "1.5px solid #E8B77A", borderRadius: 12, padding: "10px 12px", fontSize: 15, lineHeight: 1.5, color: "#5C3200" }}>
                    <AlertCircle size={15} style={{ display: "inline", verticalAlign: "-3px", marginRight: 6 }} />
                    We saw {money(line.candidate_amount)} land in {accountLabel(destAccount, line.dest_account_label)}
                    {line.candidate_date ? ` on ${line.candidate_date}` : ""}, which doesn&apos;t match. Is this your {line.label} transfer?
                    <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: 8 }}>
                      <button onClick={() => candidate(line.id, "confirm")} disabled={busy} style={{ ...smallBtn, background: "#4E22B8", color: "#fff" }}>
                        Yes, that&apos;s it
                      </button>
                      <button onClick={() => candidate(line.id, "dismiss")} disabled={busy} style={{ ...smallBtn, background: "#fff", color: "#4E22B8" }}>
                        No, that&apos;s not it
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </Card>
    );
  };

  const showMainCard = pendingDeposits.length > 0 || skipped.length > 0;

  return (
    <div className="space-y-4">
      {showMainCard && (
        <Card style={bloomAccentCardStyle({ padding: "20px 24px", borderRadius: 24, background: "var(--color-surface)" })}>
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
            Split My Deposits
          </div>
          <p style={{ margin: "0 0 4px", fontSize: 15, lineHeight: 1.6, color: "var(--color-text)" }}>
            {pendingDeposits.length
              ? `${pendingDeposits.length} ${pendingDeposits.length === 1 ? "deposit is" : "deposits are"} ready to split. PrioritySave never moves your money: make each transfer in your bank, then mark it as transferred so your category balances stay accurate.`
              : "Nothing needs approval right now."}
          </p>
          {renderHeader()}
          {error && <p style={{ margin: "4px 0", fontSize: 14, color: "#b42318" }}>{error}</p>}

          {pendingDeposits.length > 0 && (
            <p style={{ ...mutedText, margin: "0 0 6px" }}>
              Remove a deposit to leave it out of these transfers (like a refund or a personal transfer). You can add it back any time.
            </p>
          )}
          {pendingDeposits.length > 1 && (
            <p style={{ margin: "10px 0 4px", fontSize: 14, color: "var(--color-accent-800)" }}>
              <b>Split as one: </b>all deposits are combined, so you make just one transfer per account.
            </p>
          )}
          {pendingDeposits.length > 0 && (
            <div className="flex items-baseline justify-between gap-3" style={{ marginTop: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>
                Your {money(pendingTotal)} split
              </span>
              <span style={mutedText}>
                {groups.length} {groups.length === 1 ? "transfer" : "transfers"} to make
              </span>
            </div>
          )}
          {pendingDeposits.length > 0 && (
            <p style={{ ...mutedText, margin: "4px 0 0" }}>
              These amounts come from your splits. Tap any amount to change what you send. Your total updates.
            </p>
          )}
          {groups.map(renderGroup)}
          {pendingDeposits.length > 0 && renderTieOut()}
        </Card>
      )}

      {onTheWay.length > 0 && renderOnTheWay()}
      {renderSheet()}
      {renderConfirm()}
    </div>
  );
}
