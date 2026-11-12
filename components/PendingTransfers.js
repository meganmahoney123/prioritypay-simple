"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, PrimaryButton } from "./ui";
import { bloomAccentCardStyle } from "@/lib/bloomTheme";
import { resolveBankLoginUrl } from "@/lib/bankLinks";
import { ExternalLink, Clock, ChevronDown, ChevronRight, Pencil, AlertCircle, Check } from "lucide-react";

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
  const [data, setData] = useState({ deposits: [], skipped: [], typeOptions: [], typeLabels: {}, businesses: [], effects: {} });
  // Deposits where Biz income was just picked and a business is still needed.
  const [bizPending, setBizPending] = useState({});
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
  const [rules, setRules] = useState([]); // split rules, to spot categories with no bank account
  const [linkChoice, setLinkChoice] = useState({}); // ruleId -> chosen account id
  const [linkingId, setLinkingId] = useState(null);
  const [linkedNote, setLinkedNote] = useState(null);
  const [w401kChoice, setW401kChoice] = useState("");
  const [w401kDismissed, setW401kDismissed] = useState(false);
  const [w401kBusy, setW401kBusy] = useState(false);

  const accountsById = useMemo(() => Object.fromEntries((accounts || []).map((a) => [a.id, a])), [accounts]);

  const load = useCallback(async () => {
    try {
      const [res, rulesRes] = await Promise.all([fetch("/api/transfers/deposits"), fetch("/api/split-rules").catch(() => null)]);
      const body = await res.json();
      if (res.ok) setData({ deposits: body.deposits || [], skipped: body.skipped || [], typeOptions: body.typeOptions || [], typeLabels: body.typeLabels || {}, businesses: body.businesses || [], effects: body.effects || {} });
      if (rulesRes?.ok) {
        const rb = await rulesRes.json().catch(() => ({}));
        setRules(rb?.splitRules?.percent || []);
      }
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

  // Categories with a percentage but no bank account yet.
  const unlinked = useMemo(
    () =>
      rules
        .filter((r) => (Number(r.pct) || 0) > 0 && !r.accountId)
        .map((r) => {
          const stay = rows.find((x) => x.kind === "stay" && !x.guiltFree && x.label === r.label);
          return { ...r, amount: stay ? stay.total : Math.round(pendingTotal * (Number(r.pct) || 0)) / 100, stayLabel: stay?.source_account_label || null, stayAccountId: stay?.source_account_id || null };
        }),
    [rules, rows, pendingTotal]
  );
  const unlinkedLabels = useMemo(() => new Set(unlinked.map((u) => u.label)), [unlinked]);
  const sourceIds = useMemo(() => new Set(pendingDeposits.map((d) => d.sourceAccountId).filter(Boolean)), [pendingDeposits]);

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
  const linkCategory = async (rule) => {
    const accountId = linkChoice[rule.id];
    if (!accountId) return;
    setLinkingId(rule.id);
    setError(null);
    try {
      const res = await post("/api/split-rules/link-account", { ruleId: rule.id, accountId });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || "Could not link that account. Please try again.");
      } else {
        const acc = accountsById[accountId];
        setLinkedNote(`${rule.label} is now linked to ${accountLabel(acc, null)}. Updated in Deposit Splits and everywhere else.`);
        setTimeout(() => setLinkedNote(null), 12000);
        await load();
        onChanged?.();
      }
    } finally {
      setLinkingId(null);
    }
  };
  // First time a deposit is a W-2 paycheck and there's no workplace 401k/IRA/HSA
  // row yet: ask once, add the row, then re-split that deposit.
  const w2Deposit = pendingDeposits.find((d) => d.depositType === "w2" && (d.lines || []).every((l) => ["needs_approval", "reserved"].includes(l.status)));
  const hasWorkplaceRow = rules.some((r) => ["traditional_401k", "traditional_ira", "hsa"].includes(r.retirementType));
  const showW401k = Boolean(w2Deposit) && !hasWorkplaceRow && !w401kDismissed;
  const add401k = async (deposit) => {
    setW401kBusy(true);
    setError(null);
    try {
      const res = await post("/api/split-rules/add-workplace-401k", { accountId: w401kChoice || null });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || "Could not add your 401k. Please try again.");
        return;
      }
      await post(`/api/transfers/${deposit.id}/deposit-type`, { depositType: "w2" });
      setLinkedNote("Your 401k was added to your splits. W-2 paychecks send a share to it, and nothing else touches it.");
      setTimeout(() => setLinkedNote(null), 12000);
      await load();
      onChanged?.();
    } finally {
      setW401kBusy(false);
    }
  };
  const renderW401k = () => {
    const options = accounts || [];
    return (
      <Card style={bloomAccentCardStyle({ padding: "16px 22px 18px", borderRadius: 24, background: "var(--color-surface)" })}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>One quick question</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "var(--color-text)", marginTop: 2 }}>Do you have a 401k through this job?</div>
        <p style={{ ...mutedText, margin: "6px 0 10px" }}>
          We will add it to your splits so each paycheck can send a share to it. It never mixes with a Solo 401k or SEP IRA.
        </p>
        <label style={mutedText} htmlFor="w401k-account">Pick the account it lives in, if it&apos;s connected</label>
        <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: 4 }}>
          <select
            id="w401k-account"
            value={w401kChoice}
            onChange={(e) => setW401kChoice(e.target.value)}
            style={{ fontSize: 14, padding: "8px 10px", borderRadius: 10, border: "1px solid var(--color-accent-500, #9A72F0)", maxWidth: "100%" }}
          >
            <option value="">Not connected yet</option>
            {options.map((a) => (
              <option key={a.id} value={a.id}>{accountLabel(a, null)}</option>
            ))}
          </select>
          <a href="/accounts" style={{ color: "var(--color-accent-700)", fontWeight: 700, fontSize: 14, textDecoration: "underline" }}>+ Connect a different account</a>
        </div>
        <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: 12 }}>
          <PrimaryButton onClick={() => add401k(w2Deposit)} disabled={w401kBusy} style={{ padding: "11px 24px", minHeight: 48 }}>
            {w401kBusy ? "Adding..." : "Yes, add my 401k"}
          </PrimaryButton>
          <button type="button" onClick={() => setW401kDismissed(true)} disabled={w401kBusy} style={{ ...linkButtonStyle, fontSize: 15, fontWeight: 700, minHeight: 48, padding: "0 16px" }}>
            No 401k
          </button>
        </div>
        <p style={{ ...mutedText, margin: "10px 0 0", fontSize: 12 }}>New row: 401k · 5% · W-2 paychecks only</p>
      </Card>
    );
  };
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
    // Biz income needs a business before any money is marked as moved.
    const needsBiz = pendingDeposits.some((d) => (d.typeSaved && (d.depositType === "self_employed" || d.depositType === "owner_draw") && !d.businessId) || bizPending[d.id]);
    // With more than one deposit type on offer, each deposit needs one picked first.
    const needsType = (data.typeOptions || []).length > 1 && pendingDeposits.some((d) => !d.typeSaved && !bizPending[d.id]);
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
          <PrimaryButton onClick={() => setSheetRow(sheetTarget)} disabled={busy || busyKey === "all" || needsBiz || needsType} className="w-full sm:w-52" style={pairButton}>
            Transfer {money(g.total)} Now
          </PrimaryButton>
          <PrimaryButton onClick={() => { setConfirmDifferent(false); setConfirmGroup(g); }} disabled={busy || busyKey === "all" || needsBiz || needsType} className="w-full sm:w-52" style={pairButton}>
            {busy ? "Saving..." : "Mark as Transferred"}
          </PrimaryButton>
        </div>
        {needsType ? (
          <div style={{ ...mutedText, fontSize: 13, textAlign: "right", marginTop: 6 }}>Choose a type for each deposit above to continue.</div>
        ) : needsBiz ? (
          <div style={{ ...mutedText, fontSize: 13, textAlign: "right", marginTop: 6 }}>Pick a business for each Biz Income/Owners Draw deposit above to continue.</div>
        ) : null}
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
              {unlinkedLabels.has(r.label) ? " until you link it" : ""}
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

  // Top card, "Splitting together": every waiting deposit is combined into
  // one grand total. Each deposit is a row (name, date, Business/Other tag,
  // amount) that can be removed from the split, and removed deposits stay
  // listed, greyed out, with "Add back".
  // Deposit type: a dropdown while the deposit's lines can still change, a
  // plain tag otherwise. The effect line says what the chosen type does.
  const typeLabel = (v) => (v === "self_employed" || v === "owner_draw" ? "Biz Income/Owners Draw" : data.typeLabels?.[v] || "Miscellaneous");
  const isBiz = (v) => v === "self_employed" || v === "owner_draw";
  const bizName = (id) => (data.businesses || []).find((b) => b.id === id)?.name;
  const sourceTag = (d, editable) => {
    const tagStyle = {
      fontSize: 12,
      fontWeight: 800,
      borderRadius: 999,
      padding: "1px 9px",
      background: "var(--color-accent-100, #EDE6FF)",
      color: "var(--color-accent-700)",
    };
    const canEdit = editable && (d.lines || []).every((l) => ["needs_approval", "reserved"].includes(l.status));
    if (!canEdit) return <span style={tagStyle}>{typeLabel(d.depositType)}{isBiz(d.depositType) && bizName(d.businessId) ? ` · ${bizName(d.businessId)}` : ""}</span>;
    const options = [...(data.typeOptions || [])];
    // Until a type is picked the dropdown says Select; the guessed type is not shown.
    const unchosen = !d.typeSaved && !bizPending[d.id];
    const shown = unchosen ? "" : isBiz(d.depositType) || bizPending[d.id] ? "biz" : d.depositType;
    if (shown && !options.some((o) => o.value === shown)) options.push({ value: shown, label: typeLabel(shown) });
    const busyType = busyKey === `type:${d.id}`;
    const businesses = data.businesses || [];
    const needsBusiness = shown === "biz" && (!d.businessId || bizPending[d.id]);
    const selectStyle = {
      fontSize: 13,
      fontWeight: 700,
      color: "var(--color-accent-700)",
      background: "var(--color-accent-100, #EDE6FF)",
      border: "1px solid var(--color-accent-500, #9A72F0)",
      borderRadius: 8,
      padding: "3px 6px",
      maxWidth: "100%",
      cursor: busyType ? "not-allowed" : "pointer",
    };
    const chooseBusiness = (businessId) => {
      setBizPending((p) => ({ ...p, [d.id]: false }));
      return run(`type:${d.id}`, () => post(`/api/transfers/${d.id}/deposit-type`, { depositType: "biz", businessId }));
    };
    return (
      <span style={{ display: "inline-flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
        <select
          aria-label={`Deposit type for ${d.title}`}
          value={shown}
          disabled={busyType}
          onChange={(e) => {
            const v = e.target.value;
            if (v !== "biz") {
              setBizPending((p) => ({ ...p, [d.id]: false }));
              return run(`type:${d.id}`, () => post(`/api/transfers/${d.id}/deposit-type`, { depositType: v }));
            }
            if (businesses.length === 1) return chooseBusiness(businesses[0].id);
            setBizPending((p) => ({ ...p, [d.id]: true }));
          }}
          style={selectStyle}
        >
          {unchosen && <option value="" disabled>Select...</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {shown === "biz" && businesses.length > 0 && (
          <select
            aria-label={`Which business is ${d.title} for`}
            value={bizPending[d.id] ? "" : d.businessId || ""}
            disabled={busyType}
            onChange={(e) => e.target.value && chooseBusiness(e.target.value)}
            style={{ ...selectStyle, ...(needsBusiness ? { borderColor: "#B3261E", color: "#B3261E", background: "#fff" } : {}) }}
          >
            {needsBusiness && <option value="">Which business? (required)</option>}
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
      </span>
    );
  };
  const renderEffect = (d) => {
    if (!d.typeSaved && !bizPending[d.id]) return null;
    if (bizPending[d.id] || (isBiz(d.depositType) && !d.businessId)) {
      const none = (data.businesses || []).length === 0;
      return (
        <div style={{ marginTop: 6, fontSize: 13.5, background: "#FFF6DB", border: "1.5px solid #E8C766", borderRadius: 12, padding: "8px 12px", color: "#5C4600" }}>
          {none ? (
            <>
              <b>No businesses added yet.</b> Add each business in Settings and pick its type (sole proprietor, LLC, S corp and more), then come back to pick one.{" "}
              <a href="/settings#businesses" style={{ color: "var(--color-accent-700)", fontWeight: 800 }}>Open Settings</a>
            </>
          ) : (
            <b>Pick which business this deposit is for so it counts toward that business's profit.</b>
          )}
        </div>
      );
    }
    const e = data.effects?.[d.depositType] || (data.typeOptions || []).find((o) => o.value === d.depositType)?.effect;
    if (!e) return null;
    return (
      <div style={{ ...mutedText, marginTop: 4, fontSize: 13 }}>
        <b style={{ color: e.tone === "green" ? "#0F6B4F" : "var(--color-accent-700)" }}>{e.lead}</b>
        {e.rest}
        {d.typeSaved ? "" : " (suggested)"}
        {e.note && <div style={{ marginTop: 4 }}>{e.note}</div>}
      </div>
    );
  };
  const checkBox = (on, onClick, label, disabled) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={on}
      style={{
        width: 22,
        height: 22,
        borderRadius: 7,
        flex: "none",
        padding: 0,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        border: on ? "none" : "2px solid var(--color-accent-300, #9A72F0)",
        background: on ? "var(--color-accent, #6D3BE0)" : "var(--color-surface)",
        color: "#fff",
      }}
    >
      {on && <Check size={14} strokeWidth={3.4} aria-hidden="true" />}
    </button>
  );
  const openSkip = (id) => {
    setSkipOpenFor(id);
    setSkipReason(SKIP_REASONS[0]);
  };

  // "Needs a bank account": categories with a percentage but nowhere to send
  // it. Choosing an account saves it to the split rule (so it updates
  // everywhere) and turns the waiting money into a transfer to that account.
  const renderUnlinked = () => {
    const amber = "#8A6A00";
    const options = (accounts || []).filter((a) => !sourceIds.has(a.id));
    return (
      <div style={{ background: "#FFF6DB", border: "2px solid #E8C766", borderRadius: 24, padding: "16px 22px 18px" }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: amber }}>Needs a bank account</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "var(--color-text)", marginTop: 2 }}>
          {unlinked.length === 1 ? "1 category isn't linked yet" : `${unlinked.length} categories aren't linked yet`}
        </div>
        {unlinked.map((u) => {
          const busy = linkingId === u.id;
          const stayName = u.stayLabel || accountLabel(accountsById[u.stayAccountId], null);
          return (
            <div key={u.id} style={{ marginTop: 14 }}>
              <div className="flex items-center justify-between gap-3" style={{ fontSize: 17, fontWeight: 700, color: "var(--color-text)" }}>
                <span className="flex items-center gap-2">
                  <AlertCircle size={18} aria-hidden="true" style={{ color: amber, flex: "none" }} />
                  {u.label} ({u.pct}%)
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{money(u.amount)}</span>
              </div>
              <div style={{ ...mutedText, fontSize: 14, margin: "6px 0 10px" }}>
                This money is staying in {u.stayLabel || u.stayAccountId ? stayName : "the account your deposit landed in"}. Choose where it should go.
              </div>
              <div className="flex gap-2 items-stretch flex-wrap">
                <select
                  aria-label={`Bank account for ${u.label}`}
                  value={linkChoice[u.id] || ""}
                  onChange={(e) => setLinkChoice((c) => ({ ...c, [u.id]: e.target.value }))}
                  style={{
                    flex: "1 1 220px",
                    minWidth: 0,
                    border: "2px solid var(--color-accent, #6D3BE0)",
                    borderRadius: 14,
                    padding: "11px 14px",
                    fontSize: 16,
                    fontWeight: 700,
                    background: "var(--color-surface)",
                    color: "var(--color-text)",
                  }}
                >
                  <option value="">Choose an account</option>
                  {options.map((a) => (
                    <option key={a.id} value={a.id}>
                      {accountLabel(a, null)}
                    </option>
                  ))}
                </select>
                <PrimaryButton onClick={() => linkCategory(u)} disabled={!linkChoice[u.id] || busy} style={{ ...pairButton, padding: "11px 24px", minHeight: 48 }}>
                  {busy ? "Linking..." : "Link it"}
                </PrimaryButton>
              </div>
            </div>
          );
        })}
        <div style={{ ...mutedText, marginTop: 10 }}>
          Saved to your Deposit Splits, so it updates everywhere.{" "}
          <a href="/accounts" style={{ color: "var(--color-accent-700)", fontWeight: 700, textDecoration: "underline" }}>
            Connect a new bank account
          </a>
        </div>
      </div>
    );
  };

  const renderHeader = () => {
    const n = pendingDeposits.length;
    return (
      <Card style={bloomAccentCardStyle({ padding: "18px 22px 8px", borderRadius: 24, background: "var(--color-surface)" })}>
        <div className="flex items-end justify-between gap-3" style={{ paddingBottom: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>
              {n > 0 ? "Splitting together" : "Split My Deposits"}
            </div>
            <div style={{ fontSize: 21, fontWeight: 800, color: "var(--color-text)", marginTop: 4 }}>
              {n > 1 ? `${n} deposits · grand total` : n === 1 ? "1 deposit" : "No deposits in this split"}
            </div>
            {n > 0 && <div style={{ ...mutedText, marginTop: 4 }}>Each deposit has a type. The type decides which splits apply to it.</div>}
          </div>
          {n > 0 && <div style={{ fontFamily: "var(--font-mono)", fontSize: 30, fontWeight: 700, color: "var(--color-accent-700)" }}>{money(pendingTotal)}</div>}
        </div>
        {pendingDeposits.map((d) => {
          const busy = busyKey === `dep:${d.id}`;
          return (
            <div key={d.id} style={{ padding: "12px 0", borderTop: "1px solid var(--color-divider)" }}>
              <div className="flex items-center gap-3">
                {checkBox(true, () => openSkip(d.id), `Remove ${d.title} from this split`, busy)}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text)", overflowWrap: "anywhere" }}>{d.title}</div>
                  <div style={{ ...mutedText, marginTop: 2 }}>{formatDate(d.createdAt, true)}</div>
                  {renderEffect(d)}
                </div>
                {sourceTag(d, true)}
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700 }}>{money(d.sourceAmount)}</div>
                {skipOpenFor !== d.id && (
                  <button onClick={() => openSkip(d.id)} style={{ ...linkButtonStyle, fontSize: 14 }}>
                    Remove
                  </button>
                )}
              </div>
              {skipOpenFor === d.id && (
                <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: 8, marginLeft: 34 }}>
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
                    {busy ? "Removing..." : "Remove from split"}
                  </button>
                  <button onClick={() => setSkipOpenFor(null)} style={linkButtonStyle}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {skipped.map((s) => {
          const busy = busyKey === `dep:${s.id}`;
          return (
            <div key={s.id} className="flex items-center gap-3" style={{ padding: "12px 0", borderTop: "1px solid var(--color-divider)", opacity: 0.7 }}>
              {checkBox(false, () => undoSkip(s.id), `Add ${s.title} back to this split`, busy)}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text)", textDecoration: "line-through", overflowWrap: "anywhere" }}>{s.title}</div>
                <div className="flex items-center gap-2 flex-wrap" style={{ ...mutedText, marginTop: 2 }}>
                  <span>{formatDate(s.createdAt, true)}</span>
                  {sourceTag(s)}
                  <span style={{ fontWeight: 700 }}>Not in this split ({s.skipReason || "Other"})</span>
                </div>
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, textDecoration: "line-through" }}>{money(s.sourceAmount)}</div>
              <button onClick={() => undoSkip(s.id)} disabled={busy} style={{ ...linkButtonStyle, fontSize: 14, fontWeight: 700, color: "var(--color-accent-700)" }}>
                {busy ? "Adding..." : "Add back"}
              </button>
            </div>
          );
        })}
      </Card>
    );
  };

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
            You marked these as sent. Accounts that are connected are watched for you and clear on their own. For any account we
            can&apos;t see, tap <b>It landed</b> once the money arrives.
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
            // No bank account on the line (e.g. cash): nothing to watch, so it is just "Done".
            const isCash = !line.dest_account_id && !destAccount;
            const pillGreen = watching || isCash;
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
                      color: pillGreen ? "#0F6B4F" : "#8A4B00",
                      background: pillGreen ? "#E3F5EE" : "#FFF1DE",
                      borderRadius: 999,
                      padding: "5px 12px",
                    }}
                  >
                    <Clock size={14} />{" "}
                    {watching ? "Watching for it to land" : isCash ? "Cash: nothing to watch" : "We can\u2019t see this account. Tap It landed once it arrives."}
                  </span>
                  <span style={{ fontSize: 14, color: "#4A3F63" }}>Marked sent {formatDate(line.confirmed_at)}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: 2 }}>
                  <button onClick={() => settleLine(line.id)} disabled={busy} style={{ ...smallBtn, background: "#4E22B8", color: "#fff" }}>
                    {isCash ? "Done" : "It landed"}
                  </button>
                  <button onClick={() => unmark([line.id])} disabled={busy} style={{ ...smallBtn, background: "#fff", color: "#4E22B8" }}>
                    I didn&apos;t send this
                  </button>
                </div>
                {!watching && !isCash && (
                  <div style={{ fontSize: 14, color: "#4A3F63" }}>
                    Not connected.{" "}
                    <a href="/accounts" style={{ color: "#4E22B8", fontWeight: 800, textDecoration: "underline" }}>
                      Connect this account
                    </a>{" "}
                    and we&apos;ll watch for it to land.
                  </div>
                )}
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
        <>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: "var(--color-neutral-700)" }}>
            {pendingDeposits.length
              ? "Your deposits are combined into one split. PrioritySave never moves your money: make each transfer in your bank, then mark it as transferred."
              : "Nothing needs approval right now."}
          </p>
          {renderHeader()}
          {linkedNote && (
            <div className="flex items-center gap-2" style={{ fontSize: 14, fontWeight: 700, color: "#0F6B4F", background: "#E8F7F3", borderRadius: 14, padding: "10px 14px" }}>
              <Check size={18} aria-hidden="true" style={{ flex: "none" }} />
              {linkedNote}
            </div>
          )}
          {pendingDeposits.length > 0 && unlinked.length > 0 && renderUnlinked()}
          {showW401k && renderW401k()}
          {error && <p style={{ margin: 0, fontSize: 14, color: "#b42318" }}>{error}</p>}
          {pendingDeposits.length > 0 && (
            <Card style={bloomAccentCardStyle({ padding: "8px 22px 18px", borderRadius: 24, background: "var(--color-surface)" })}>
              <p style={{ ...mutedText, margin: "10px 0 2px" }}>
                These amounts come from your splits. Tap any amount to change what you send. Your total updates.
              </p>
              {groups.map(renderGroup)}
              {renderTieOut()}
            </Card>
          )}
        </>
      )}

      {onTheWay.length > 0 && renderOnTheWay()}
      {renderSheet()}
      {renderConfirm()}
    </div>
  );
}
