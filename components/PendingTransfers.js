"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, PrimaryButton } from "./ui";
import { bloomAccentCardStyle } from "@/lib/bloomTheme";
import { resolveBankLoginUrl } from "@/lib/bankLinks";
import { ExternalLink, Clock, Check } from "lucide-react";

// The "Transfers to make" checklist, grouped by DEPOSIT (Nov 2026 redesign;
// it used to group by account pair, which hid each deposit's own split).
//
// PrioritySave never moves money. Every line here is a transfer the user
// makes themselves in their own bank, then marks as transferred:
//  - one card per deposit: name, date, amount, then one line per category
//    ("Solo 401k (15%): $720") plus Guilt-Free Spending (the part of the
//    deposit not assigned to any category);
//  - a line whose category account is the account the deposit landed in
//    needs no transfer and says so, with no link or button;
//  - "Go to [bank]" opens the bank the deposit landed in (where the
//    transfer starts), via lib/bankLinks.js;
//  - "Approve split" marks every remaining line on one deposit;
//  - "Skip this deposit" removes it from every total and can be undone;
//  - with 2+ deposits waiting, a summary on top totals each category across
//    them, with every deposit's own card still listed below. Marking a
//    summary line confirms each underlying line (one shared batch id), so
//    each deposit keeps its own record.
//
// Data: GET /api/transfers/deposits. Actions: /api/transfer-allocations/
// [id]/(confirm|skip|settle|amount|candidate/*), /api/transfer-allocations/
// confirm-batch, /api/transfers/[id]/(approve|skip|unskip).

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

function pctLabel(part, whole) {
  if (!whole) return "0%";
  return `${Math.round((part / whole) * 1000) / 10}%`;
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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

// Kept for components/AppShell.js (browser-tab reminder), which still reads
// GET /api/transfers/pending: combines lines that share a category label
// and source/destination account across every open deposit.
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
        rows: [],
      });
    }
    const g = map.get(key);
    g.amount += Number(a.amount) || 0;
    g.calculatedAmount += Number(a.calculated_amount ?? a.amount) || 0;
    g.ids.push(a.id);
    g.rows.push(a);
    if (!g.dest_account_label && a.dest_account_label) g.dest_account_label = a.dest_account_label;
    if (!g.source_account_label && a.source_account_label) g.source_account_label = a.source_account_label;
  });
  return Array.from(map.values());
}

// Per-deposit view model: lines that need a transfer, lines that stay put,
// and the Guilt-Free Spending remainder.
function buildDeposit(d) {
  const lines = d.lines || [];
  const counted = lines.filter((l) => l.status !== "failed");
  const calculatedSum = counted.reduce((s, l) => s + (Number(l.calculated_amount ?? l.amount) || 0), 0);
  const guiltFree = Math.max(0, Math.round((d.sourceAmount - calculatedSum) * 100) / 100);
  const sourceLine = lines.find((l) => l.source_account_id || l.source_account_label) || {};
  const needsTransfer = (l) => !l.reserved_only && l.status !== "reserved";
  const transferLines = counted.filter((l) => needsTransfer(l) && l.status !== "skipped");
  const waiting = transferLines.filter((l) => l.status === "needs_approval");
  return {
    ...d,
    title: depositTitle(d),
    lines: counted,
    guiltFree,
    sourceAccountId: sourceLine.source_account_id || null,
    sourceAccountLabel: sourceLine.source_account_label || null,
    transferCount: transferLines.length,
    waitingCount: waiting.length,
    needsTransfer,
  };
}

const sectionLabelStyle = {
  fontFamily: "var(--font-heading)",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--color-neutral-700)",
};
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

function BankLink({ institution }) {
  if (!institution) return null;
  const url = resolveBankLoginUrl(institution);
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1"
      style={{ fontSize: 13, fontWeight: 700, color: "var(--color-accent-700)", textDecoration: "none" }}
    >
      Go to {institution}
      <ExternalLink size={12} style={{ opacity: 0.6 }} />
    </a>
  );
}

export default function PendingTransfers({ accounts, refreshKey, onChanged }) {
  const [data, setData] = useState({ deposits: [], skipped: [] });
  const [loaded, setLoaded] = useState(false);
  const [busyKey, setBusyKey] = useState(null);
  const [error, setError] = useState(null);
  const [skipOpenFor, setSkipOpenFor] = useState(null);
  const [skipReason, setSkipReason] = useState(SKIP_REASONS[0]);
  const [editing, setEditing] = useState(null); // allocation id
  const [draft, setDraft] = useState("");
  const [amountError, setAmountError] = useState(null);

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

  const deposits = useMemo(() => data.deposits.map(buildDeposit), [data.deposits]);
  const waitingDeposits = deposits.filter((d) => d.waitingCount > 0);

  // Summary groups: lines still waiting, combined by category + accounts
  // across every waiting deposit.
  const summary = useMemo(() => {
    if (waitingDeposits.length < 2) return null;
    const byLineId = {};
    const waitingLines = [];
    waitingDeposits.forEach((d) =>
      d.lines.forEach((l) => {
        if (l.status === "needs_approval") {
          byLineId[l.id] = d;
          waitingLines.push(l);
        }
      })
    );
    const groups = groupByCategory(waitingLines).map((g) => ({
      ...g,
      covers: g.rows.map((r) => ({ id: r.id, deposit: byLineId[r.id], amount: Number(r.amount) || 0 })),
    }));
    const stays = {};
    waitingDeposits.forEach((d) => {
      d.lines.filter((l) => !d.needsTransfer(l)).forEach((l) => {
        stays[l.label] = (stays[l.label] || 0) + (Number(l.amount) || 0);
      });
      if (d.guiltFree > 0) stays[GUILT_FREE_LABEL] = (stays[GUILT_FREE_LABEL] || 0) + d.guiltFree;
    });
    const sourceIds = new Set(waitingDeposits.map((d) => d.sourceAccountId || d.sourceAccountLabel));
    const first = waitingDeposits[0];
    const staysWhere =
      sourceIds.size === 1
        ? `stays in ${accountLabel(accountsById[first.sourceAccountId], first.sourceAccountLabel)}`
        : "stays in the account each deposit landed in";
    return { groups, stays, staysWhere };
  }, [waitingDeposits, accountsById]);

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

  const markLine = (id) => run(`line:${id}`, () => post(`/api/transfer-allocations/${id}/confirm`));
  const removeLine = (id) => run(`line:${id}`, () => post(`/api/transfer-allocations/${id}/skip`));
  const settleLine = (id) => run(`line:${id}`, () => post(`/api/transfer-allocations/${id}/settle`));
  const candidate = (id, action) => run(`line:${id}`, () => post(`/api/transfer-allocations/${id}/candidate/${action}`));
  const approveDeposit = (id) => run(`dep:${id}`, () => post(`/api/transfers/${id}/approve`));
  const skipDeposit = (id) =>
    run(`dep:${id}`, async () => {
      const res = await post(`/api/transfers/${id}/skip`, { reason: skipReason });
      setSkipOpenFor(null);
      return res;
    });
  const undoSkip = (id) => run(`dep:${id}`, () => post(`/api/transfers/${id}/unskip`));
  const markGroup = (g) => run(`grp:${g.key}`, () => post("/api/transfer-allocations/confirm-batch", { allocationIds: g.ids }));

  const saveAmount = async (line) => {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setAmountError("Enter an amount greater than $0.");
      return;
    }
    setAmountError(null);
    await run(`line:${line.id}`, () =>
      fetch(`/api/transfer-allocations/${line.id}/amount`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parsed }),
      })
    );
    setEditing(null);
  };

  if (!loaded || (!deposits.length && !data.skipped.length)) return null;

  const renderAmount = (line) => {
    const overridden = line.calculated_amount != null && Math.abs(line.calculated_amount - line.amount) > 0.005;
    if (line.status !== "needs_approval") return <span style={{ fontFamily: "var(--font-mono)" }}>{money(line.amount)}</span>;
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
    return (
      <button
        type="button"
        title="Change this amount"
        onClick={() => {
          setEditing(line.id);
          setDraft(Number(line.amount).toFixed(2));
          setAmountError(null);
        }}
        style={{
          fontFamily: "var(--font-mono)",
          fontWeight: 700,
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          color: "inherit",
          textDecoration: "underline dotted",
          textUnderlineOffset: 3,
        }}
      >
        {money(line.amount)}
        {overridden && <span style={{ fontWeight: 500, fontSize: 11, marginLeft: 6 }}>(calculated {money(line.calculated_amount)})</span>}
      </button>
    );
  };

  const renderLine = (d, line) => {
    const pct = pctLabel(Number(line.calculated_amount ?? line.amount) || 0, d.sourceAmount);
    const busy = busyKey === `line:${line.id}`;
    const sourceAccount = accountsById[line.source_account_id];
    const destAccount = accountsById[line.dest_account_id];
    const header = (
      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text)" }}>
        {line.label} ({pct}): {renderAmount(line)}
      </div>
    );

    if (!d.needsTransfer(line)) {
      return (
        <div key={line.id} style={{ padding: "10px 0", borderTop: "1px solid var(--color-divider)" }}>
          {header}
          <div style={mutedText}>No transfer needed (stays in {accountLabel(sourceAccount, line.source_account_label)})</div>
        </div>
      );
    }

    if (line.status === "skipped") {
      return (
        <div key={line.id} style={{ padding: "10px 0", borderTop: "1px solid var(--color-divider)", opacity: 0.6 }}>
          {header}
          <div style={mutedText}>Removed. Not counted in your totals.</div>
        </div>
      );
    }

    const destText = `To ${accountLabel(destAccount, line.dest_account_label)}`;
    return (
      <div key={line.id} style={{ padding: "10px 0", borderTop: "1px solid var(--color-divider)" }}>
        {header}
        <div style={mutedText}>{destText}</div>

        {line.status === "needs_approval" && (
          <div className="flex items-center gap-3 flex-wrap" style={{ marginTop: 8 }}>
            <BankLink institution={institutionFor(sourceAccount, line.source_account_label)} />
            <PrimaryButton onClick={() => markLine(line.id)} disabled={busy} style={smallPrimary}>
              {busy ? "Saving..." : "Mark as transferred"}
            </PrimaryButton>
            <button onClick={() => removeLine(line.id)} disabled={busy} style={linkButtonStyle} title="Leave this category out of this deposit">
              Remove
            </button>
          </div>
        )}

        {line.status === "in_transit" && (
          <div style={{ marginTop: 6 }}>
            <div className="inline-flex items-center gap-1" style={mutedText}>
              <Clock size={13} /> Marked as transferred {formatDate(line.confirmed_at)}. Waiting for it to land.
              <button onClick={() => settleLine(line.id)} disabled={busy} style={{ ...linkButtonStyle, marginLeft: 6 }}>
                It already landed
              </button>
            </div>
            {line.candidate_transaction_id && line.candidate_amount != null && (
              <div style={{ ...mutedText, marginTop: 6 }}>
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
        )}

        {line.status === "completed" && (
          <div className="inline-flex items-center gap-1" style={{ ...mutedText, marginTop: 6 }}>
            <Check size={13} /> Landed
          </div>
        )}
      </div>
    );
  };

  const renderDeposit = (d) => {
    const busy = busyKey === `dep:${d.id}`;
    const status =
      d.waitingCount > 0
        ? `Needs approval · ${d.transferCount - d.waitingCount} of ${d.transferCount} transfers marked as transferred`
        : "Approved · waiting for transfers to land";
    return (
      <Card key={d.id} className="p-5" style={{ borderRadius: 24 }}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 700, color: "var(--color-text)" }}>{d.title}</div>
            <div style={mutedText}>
              {formatDate(d.createdAt)} · landed in {accountLabel(accountsById[d.sourceAccountId], d.sourceAccountLabel)}
            </div>
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700 }}>{money(d.sourceAmount)}</div>
        </div>
        <div style={{ ...mutedText, margin: "8px 0 4px", fontWeight: 600 }}>{status}</div>

        <div>
          {d.lines.map((l) => renderLine(d, l))}
          {d.guiltFree > 0 && (
            <div style={{ padding: "10px 0", borderTop: "1px solid var(--color-divider)" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text)" }}>
                {GUILT_FREE_LABEL} ({pctLabel(d.guiltFree, d.sourceAmount)}): <span style={{ fontFamily: "var(--font-mono)" }}>{money(d.guiltFree)}</span>
              </div>
              <div style={mutedText}>
                No transfer needed (stays in {accountLabel(accountsById[d.sourceAccountId], d.sourceAccountLabel)})
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap" style={{ marginTop: 12 }}>
          {skipOpenFor === d.id ? (
            <div className="flex items-center gap-2 flex-wrap">
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
          ) : (
            <button
              onClick={() => {
                setSkipOpenFor(d.id);
                setSkipReason(SKIP_REASONS[0]);
              }}
              style={linkButtonStyle}
            >
              Skip this deposit
            </button>
          )}
          {d.waitingCount > 0 && (
            <PrimaryButton onClick={() => approveDeposit(d.id)} disabled={busy} style={{ ...smallPrimary, padding: "10px 20px", fontSize: 14 }}>
              {busy ? "Saving..." : "Approve split"}
            </PrimaryButton>
          )}
        </div>
        {d.waitingCount > 0 && (
          <p style={{ ...mutedText, fontSize: 12, margin: "8px 0 0" }}>
            Approve split marks every remaining line on this deposit as transferred. Use it after you&apos;ve made those transfers in your bank.
          </p>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <Card style={bloomAccentCardStyle({ padding: "20px 24px", borderRadius: 24, background: "var(--color-accent-200)", border: "none" })}>
        <div style={{ ...sectionLabelStyle, fontSize: 13, fontWeight: 800, letterSpacing: "0.14em", color: "var(--color-accent-700)", marginBottom: 6 }}>
          Transfers to make
        </div>
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, color: "var(--color-accent-800)" }}>
          {waitingDeposits.length
            ? `${waitingDeposits.length} ${waitingDeposits.length === 1 ? "deposit needs" : "deposits need"} approval. PrioritySave never moves your money: make each transfer in your bank, then mark it as transferred so your category balances stay accurate.`
            : "Everything is approved. These transfers are on their way."}
        </p>
        {error && <p style={{ margin: "8px 0 0", fontSize: 14, color: "#b42318" }}>{error}</p>}
        {amountError && <p style={{ margin: "8px 0 0", fontSize: 14, color: "#b42318" }}>{amountError}</p>}
      </Card>

      {summary && (
        <Card className="p-5" style={{ borderRadius: 24 }}>
          <div style={sectionLabelStyle}>Totals across {waitingDeposits.length} deposits</div>
          <p style={{ ...mutedText, margin: "4px 0 8px" }}>
            Make one transfer per category for the combined amount. Each deposit&apos;s own breakdown is listed below.
          </p>
          {summary.groups.map((g) => {
            const busy = busyKey === `grp:${g.key}`;
            const sourceAccount = accountsById[g.source_account_id];
            return (
              <div key={g.key} style={{ padding: "10px 0", borderTop: "1px solid var(--color-divider)" }}>
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{g.label}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{money(g.amount)}</div>
                </div>
                <div style={mutedText}>To {accountLabel(accountsById[g.dest_account_id], g.dest_account_label)}</div>
                <div style={mutedText}>Covers: {g.covers.map((c) => `${c.deposit.title} ${money(c.amount)}`).join(", ")}</div>
                <div className="flex items-center gap-3 flex-wrap" style={{ marginTop: 8 }}>
                  <BankLink institution={institutionFor(sourceAccount, g.source_account_label)} />
                  <PrimaryButton onClick={() => markGroup(g)} disabled={busy} style={smallPrimary}>
                    {busy ? "Saving..." : "Mark as transferred"}
                  </PrimaryButton>
                </div>
              </div>
            );
          })}
          {Object.keys(summary.stays).length > 0 && (
            <div style={{ padding: "10px 0 0", borderTop: "1px solid var(--color-divider)", ...mutedText }}>
              No transfer needed ({summary.staysWhere}):{" "}
              {Object.entries(summary.stays)
                .map(([label, amt]) => `${label} ${money(amt)}`)
                .join(", ")}
            </div>
          )}
        </Card>
      )}

      {deposits.map(renderDeposit)}

      {data.skipped.length > 0 && (
        <Card className="p-5" style={{ borderRadius: 24 }}>
          <div style={sectionLabelStyle}>Skipped deposits (not counted in any totals)</div>
          {data.skipped.map((s) => {
            const busy = busyKey === `dep:${s.id}`;
            return (
              <div key={s.id} className="flex items-center justify-between gap-3 flex-wrap" style={{ padding: "10px 0", borderTop: "1px solid var(--color-divider)" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>
                    {depositTitle(s)} · {money(s.sourceAmount)}
                  </div>
                  <div style={mutedText}>
                    {formatDate(s.createdAt)} · {s.skipReason || "Skipped"}
                  </div>
                </div>
                <button onClick={() => undoSkip(s.id)} disabled={busy} style={{ ...linkButtonStyle, fontWeight: 700, color: "var(--color-accent-700)" }}>
                  {busy ? "Restoring..." : "Undo"}
                </button>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
