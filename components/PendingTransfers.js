"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, PrimaryButton } from "./ui";
import { bloomAccentCardStyle } from "@/lib/bloomTheme";
import { resolveBankLoginUrl } from "@/lib/bankLinks";
import { ExternalLink, Clock, ChevronDown, ChevronRight } from "lucide-react";

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
//  - "Approve all splits" marks every pending line, one category at a time.
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
function money(n) {
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

const needsTransfer = (l) => !l.reserved_only && l.status !== "reserved";

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

// Per-deposit view model.
function buildDeposit(d) {
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
function buildRows(pendingDeposits) {
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

export default function PendingTransfers({ accounts, refreshKey, onChanged }) {
  const [data, setData] = useState({ deposits: [], skipped: [] });
  const [loaded, setLoaded] = useState(false);
  const [busyKey, setBusyKey] = useState(null);
  const [error, setError] = useState(null);
  const [skipOpenFor, setSkipOpenFor] = useState(null);
  const [skipReason, setSkipReason] = useState(SKIP_REASONS[0]);
  const [editing, setEditing] = useState(null); // allocation id
  const [draft, setDraft] = useState("");
  const [onTheWayOpen, setOnTheWayOpen] = useState(false);
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

  const markRow = (row) => run(`row:${row.key}`, () => post("/api/transfer-allocations/confirm-batch", { allocationIds: row.ids }));
  const approveAll = () => run("all", () => post("/api/transfers/approve-all"));
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

  if (!loaded || (!pendingDeposits.length && !onTheWay.length && !skipped.length)) return null;

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
        style={{ ...style, background: "none", border: "none", padding: 0, cursor: "pointer", color: "inherit", textDecoration: "underline dotted", textUnderlineOffset: 3 }}
      >
        {money(amount)}
        {overridden && <span style={{ fontWeight: 500, fontSize: 11, marginLeft: 6 }}>(calculated {money(line.calculated_amount)})</span>}
      </button>
    );
  };

  const renderRow = (row) => {
    const busy = busyKey === `row:${row.key}`;
    const sourceAccount = accountsById[row.source_account_id];
    const singleLine = row.parts.length === 1 ? row.parts[0].line : null;
    const title = `${row.label}${row.sharedPct != null ? ` (${row.sharedPct}%)` : ""}`;
    return (
      <div key={row.key} style={rowDivider}>
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text)" }}>{title}</div>
          <div style={{ fontSize: 16 }}>{amountFor(singleLine, row.total, { bold: true })}</div>
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

        {row.kind === "transfer" ? (
          <>
            <div style={mutedText}>To {accountLabel(accountsById[row.dest_account_id], row.dest_account_label)}</div>
            {/* Same style and size for both; 50/50 full width on phones, an equal-width pair on the right on wider screens. */}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end" style={{ marginTop: 10 }}>
              <PrimaryButton onClick={() => setSheetRow(row)} disabled={busy || busyKey === "all"} className="w-full sm:w-52" style={pairButton}>
                Transfer {money(row.total)} Now
              </PrimaryButton>
              <PrimaryButton onClick={() => markRow(row)} disabled={busy || busyKey === "all"} className="w-full sm:w-52" style={pairButton}>
                {busy ? "Saving..." : "Mark as Transferred"}
              </PrimaryButton>
            </div>
          </>
        ) : (
          <div style={mutedText}>No transfer needed (stays in {accountLabel(sourceAccount, row.source_account_label)})</div>
        )}
      </div>
    );
  };

  // Top of the card: where the money came from. Each pending deposit's name,
  // date and amount with Skip, the combined total when there's more than
  // one, and recently skipped deposits with Undo.
  const renderHeader = () => (
    <div style={{ padding: "8px 0 12px" }}>
      {pendingDeposits.length > 0 && (
        <div style={{ ...mutedText, fontWeight: 600, marginBottom: 2 }}>{pendingDeposits.length > 1 ? "From these deposits" : "From this deposit"}</div>
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
                  Skip
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
                  {busy ? "Skipping..." : "Skip deposit"}
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
              {s.title} · {formatDate(s.createdAt)} · {money(s.sourceAmount)} · Skipped ({s.skipReason || "Other"}), not counted in any totals
            </span>
            <button onClick={() => undoSkip(s.id)} disabled={busy} style={{ ...linkButtonStyle, fontWeight: 700, color: "var(--color-accent-700)" }}>
              {busy ? "Restoring..." : "Undo"}
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

  const renderOnTheWay = () => (
    <Card className="p-5" style={{ borderRadius: 24 }}>
      <button
        onClick={() => setOnTheWayOpen((v) => !v)}
        aria-expanded={onTheWayOpen}
        className="inline-flex items-center gap-1"
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 15, fontWeight: 700, color: "var(--color-text)" }}
      >
        {onTheWayOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        On the way ({onTheWay.length})
      </button>
      {onTheWayOpen &&
        onTheWay.map(({ deposit, line }) => {
          const busy = busyKey === `line:${line.id}`;
          const destAccount = accountsById[line.dest_account_id];
          return (
            <div key={line.id} style={rowDivider}>
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {line.label} · {deposit.title}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{money(line.amount)}</div>
              </div>
              <div style={mutedText}>To {accountLabel(destAccount, line.dest_account_label)}</div>
              <div className="inline-flex items-center gap-1 flex-wrap" style={mutedText}>
                <Clock size={13} /> Marked as transferred {formatDate(line.confirmed_at)}. Waiting for it to land.
                <button onClick={() => settleLine(line.id)} disabled={busy} style={{ ...linkButtonStyle, marginLeft: 6 }}>
                  It already landed
                </button>
              </div>
              {line.candidate_transaction_id && line.candidate_amount != null && (
                <div style={{ ...mutedText, marginTop: 4 }}>
                  We saw {money(line.candidate_amount)} land in {accountLabel(destAccount, line.dest_account_label)}
                  {line.candidate_date ? ` on ${line.candidate_date}` : ""}. Is this your {line.label} transfer?{" "}
                  <button onClick={() => candidate(line.id, "confirm")} disabled={busy} style={linkButtonStyle}>
                    Yes, that&apos;s it
                  </button>{" "}
                  <button onClick={() => candidate(line.id, "dismiss")} disabled={busy} style={linkButtonStyle}>
                    No, that&apos;s not it
                  </button>
                </div>
              )}
            </div>
          );
        })}
    </Card>
  );

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
            Transfers to make
          </div>
          <p style={{ margin: "0 0 4px", fontSize: 15, lineHeight: 1.6, color: "var(--color-text)" }}>
            {pendingDeposits.length
              ? `${pendingDeposits.length} ${pendingDeposits.length === 1 ? "deposit needs" : "deposits need"} approval. PrioritySave never moves your money: make each transfer in your bank, then mark it as transferred so your category balances stay accurate.`
              : "Nothing needs approval right now."}
          </p>
          {renderHeader()}
          {error && <p style={{ margin: "4px 0", fontSize: 14, color: "#b42318" }}>{error}</p>}

          {rows.map(renderRow)}

          {pendingDeposits.length > 0 && (
            <div className="flex sm:justify-end" style={{ marginTop: 12 }}>
              <PrimaryButton onClick={approveAll} disabled={busyKey === "all"} className="w-full sm:w-auto" style={{ ...smallPrimary, padding: "12px 22px", fontSize: 14 }}>
                {busyKey === "all" ? "Saving..." : "Approve all splits"}
              </PrimaryButton>
            </div>
          )}
          {pendingDeposits.length > 0 && (
            <p style={{ ...mutedText, fontSize: 12, margin: "8px 0 0", textAlign: "right" }}>
              Approve all splits marks every transfer above as transferred. Use it after you&apos;ve made them in your bank.
            </p>
          )}
        </Card>
      )}

      {onTheWay.length > 0 && renderOnTheWay()}
      {renderSheet()}
    </div>
  );
}
