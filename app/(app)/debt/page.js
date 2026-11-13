"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, PrimaryButton, GhostButton, currency } from "@/components/ui";
import PlaidLinkButton from "@/components/PlaidLinkButton";
import { bloomInputStyle, bloomSelectStyle } from "@/lib/bloomTheme";
import { DEBT_TYPES, buildPlan, debtTypeLabel, extraOptions, payoffLabel, suggestions, HIGH_APR } from "@/lib/debtPayoff";

const muted = "color-mix(in srgb, var(--color-text) 68%, transparent)";
const h2 = { fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 400, margin: "0 0 6px" };
const eyebrow = { fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: muted };
const num = { fontFamily: "var(--font-mono, ui-monospace, monospace)", fontWeight: 600 };

function Chip({ on, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600, cursor: "pointer", padding: "7px 14px", borderRadius: 999,
        border: `1.5px solid ${on ? "var(--color-accent)" : "var(--color-divider)"}`,
        background: on ? "color-mix(in srgb, var(--color-accent) 9%, transparent)" : "transparent",
        color: on ? "var(--color-accent-700)" : "var(--color-text)",
      }}
    >
      {children}
    </button>
  );
}

const EMPTY = { name: "", debtType: "credit_card", balance: "", apr: "", minPayment: "" };

function DebtForm({ initial = EMPTY, submitLabel, onSubmit, onCancel, busy }) {
  const [f, setF] = useState({ ...initial, balance: initial.balance ?? "", apr: initial.apr ?? "", minPayment: initial.minPayment ?? "" });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const field = (label, input) => (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 130px", minWidth: 0 }}>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: muted }}>{label}</span>
      {input}
    </label>
  );
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end", padding: "12px 0" }}>
      {field("Name", <input value={f.name} onChange={set("name")} placeholder="Visa card" maxLength={60} style={bloomInputStyle({ padding: "10px 12px" })} />)}
      {field("Type", (
        <select value={f.debtType} onChange={set("debtType")} style={bloomSelectStyle({ padding: "10px 12px" })}>
          {DEBT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      ))}
      {field("You owe ($)", <input value={f.balance} onChange={set("balance")} inputMode="decimal" placeholder="4200" style={bloomInputStyle({ padding: "10px 12px" })} />)}
      {field("Interest rate (APR %)", <input value={f.apr} onChange={set("apr")} inputMode="decimal" placeholder="22.9" style={bloomInputStyle({ padding: "10px 12px" })} />)}
      {field("Minimum per month ($)", <input value={f.minPayment} onChange={set("minPayment")} inputMode="decimal" placeholder="95" style={bloomInputStyle({ padding: "10px 12px" })} />)}
      <div style={{ display: "flex", gap: 8 }}>
        <PrimaryButton onClick={() => onSubmit(f)} disabled={busy}>{submitLabel}</PrimaryButton>
        {onCancel && <GhostButton onClick={onCancel}>Cancel</GhostButton>}
      </div>
    </div>
  );
}

export default function DebtPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [paying, setPaying] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [customExtra, setCustomExtra] = useState("");
  const [method, setMethod] = useState("avalanche");
  const [extra, setExtra] = useState(0);
  const [recordWithdrawal, setRecordWithdrawal] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncNote, setSyncNote] = useState("");
  const [needsConsent, setNeedsConsent] = useState([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/debts");
    const d = await res.json();
    if (!res.ok) {
      setError(d.needsSetup ? "Debt Payoff needs a one-time database update before it can be used." : d.error || "Couldn't load your debts.");
      setData({ debts: [] });
      return;
    }
    setData(d);
    setMethod(d.method);
    setExtra(d.extra ?? d.suggestedExtra);
  }, []);
  useEffect(() => { load(); }, [load]);

  const syncCards = useCallback(async (quiet) => {
    setSyncing(true);
    if (!quiet) { setSyncNote(""); setError(""); }
    try {
      const res = await fetch("/api/debts/sync", { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { if (!quiet) setError(d.needsSetup ? "Importing debts needs a one-time database update first." : d.error || "Couldn't update from your cards."); return; }
      setNeedsConsent(d.needsConsent || []);
      if (!quiet) {
        const parts = [];
        if (d.added) parts.push(`${d.added} added`);
        if (d.updated) parts.push(`${d.updated} updated`);
        setSyncNote(parts.length ? `Cards checked: ${parts.join(", ")}.` : (d.needsConsent || []).length ? "" : "Your cards are up to date.");
      }
      if (d.added || d.updated) load();
    } finally { setSyncing(false); }
  }, [load]);

  // Quietly refresh card debts when the page opens (at most about twice a day).
  useEffect(() => {
    if (!data || !data.hasCards) return;
    const newest = (data.debts || []).filter((d) => d.fromCard && d.syncedAt).map((d) => new Date(d.syncedAt).getTime());
    const stale = !newest.length || Date.now() - Math.max(...newest) > 12 * 3600 * 1000;
    if (stale) syncCards(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.hasCards]);

  const call = async (url, opts) => {
    setBusy(true); setError("");
    try {
      const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...opts });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || "Something went wrong."); return false; }
      return true;
    } finally { setBusy(false); }
  };

  const active = useMemo(() => (data?.debts || []).filter((d) => d.balance > 0), [data]);
  const paidOff = useMemo(() => (data?.debts || []).filter((d) => d.balance <= 0), [data]);
  const info = useMemo(() => buildPlan(active, extra, method), [active, extra, method]);
  const opts = useMemo(() => extraOptions(extra, data?.suggestedExtra), [extra, data]);
  const notes = useMemo(() => suggestions(active, extra), [active, extra]);

  const saveSettings = async (patch) => { await call("/api/debts", { method: "PUT", body: JSON.stringify(patch) }); };
  const pickMethod = (m) => { setMethod(m); saveSettings({ method: m }); };
  const pickExtra = (n) => { setExtra(n); setCustomExtra(""); saveSettings({ extra: n }); };

  if (!data) return <div style={{ padding: 24, color: muted }}>Loading…</div>;

  const plan = info.plan;
  const interestSaved = info.minimumsOnly.neverPaysOff || plan.neverPaysOff ? null : Math.round(info.minimumsOnly.totalInterest - plan.totalInterest);
  const otherDiff = plan.neverPaysOff || info.other.neverPaysOff ? null : Math.round(info.other.totalInterest - plan.totalInterest);
  const lastMonths = Math.max(1, ...active.map((d) => plan.payoff[d.id] || 0));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: "52em" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <Link href="/dashboard" style={{ fontSize: 14, fontWeight: 600, color: "var(--color-accent-700)", textDecoration: "none" }}>‹ Dashboard</Link>
          <div style={{ fontSize: 14, color: muted }}>{active.length ? `${active.length} ${active.length === 1 ? "debt" : "debts"}` : "Add your debts to see a payoff date"}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {data.hasCards && <GhostButton onClick={() => syncCards(false)} disabled={syncing}>{syncing ? "Checking your cards…" : "Update from my cards"}</GhostButton>}
          {!adding && <GhostButton onClick={() => { setAdding(true); setEditing(null); }}>+ Add a debt</GhostButton>}
        </div>
      </div>
      {syncNote && <div style={{ fontSize: 14, color: muted }}>{syncNote}</div>}
      {needsConsent.length > 0 && (
        <Card className="p-4">
          <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 4 }}>Share your card&apos;s rate and minimum payment</div>
          <p style={{ fontSize: 13.5, color: muted, margin: "0 0 10px" }}>These cards were connected before debt details were available. Approve it once and the interest rate, minimum payment and due date fill in on their own.</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {needsConsent.map((c) => (
              <PlaidLinkButton key={c.accountId} mode="update" accountId={c.accountId} product="liabilities" label={`Approve for ${c.name}`} onUpdated={() => syncCards(false)} />
            ))}
          </div>
        </Card>
      )}

      {error && <Card className="p-4" style={{ border: "1.5px solid #E8A09A" }}><span style={{ color: "#B3261E", fontSize: 14 }}>{error}</span></Card>}

      {active.length > 0 && (
        <Card className="p-6">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 20, fontWeight: 600 }}>
              {plan.neverPaysOff ? "These payments don't pay off every debt" : `Debt-free by ${payoffLabel(plan.months)}`}
            </div>
            <div style={{ fontSize: 14, color: muted }}>Total owed <span style={num}>{currency(info.totalOwed)}</span></div>
          </div>
          {plan.neverPaysOff && <p style={{ fontSize: 14, color: "#B3261E", margin: "8px 0 0" }}>At this monthly payment the interest is as large as the payments. Add a minimum payment to each debt or raise the extra amount.</p>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 16, borderTop: "1.5px solid var(--color-divider)", marginTop: 14, paddingTop: 14 }}>
            <div><div style={eyebrow}>Monthly payment</div><div style={{ ...num, fontSize: 24 }}>{currency(info.minimums + extra)}</div><div style={{ fontSize: 12.5, color: muted }}>{currency(info.minimums)} minimums + {currency(extra)} extra</div></div>
            <div><div style={eyebrow}>Interest to pay</div><div style={{ ...num, fontSize: 24, color: "#0F6B4F" }}>{plan.neverPaysOff ? "-" : currency(plan.totalInterest)}</div><div style={{ fontSize: 12.5, color: muted }}>{info.minimumsOnly.neverPaysOff ? "minimums alone never pay it off" : `vs ${currency(info.minimumsOnly.totalInterest)} with minimums only`}</div></div>
            <div><div style={eyebrow}>Months to go</div><div style={{ ...num, fontSize: 24 }}>{plan.months ?? "-"}</div><div style={{ fontSize: 12.5, color: muted }}>{info.minimumsOnly.months ? `vs ${info.minimumsOnly.months} with minimums only` : ""}</div></div>
          </div>
          {interestSaved !== null && interestSaved > 0 && <p style={{ fontSize: 13.5, color: muted, margin: "12px 0 0" }}>The extra amount saves about {currency(interestSaved)} in interest. These are estimates that assume your rates and payments stay the same.</p>}
        </Card>
      )}

      <Card className="p-6">
        <h2 style={h2}>Your debts</h2>
        <div style={{ height: 1, background: "var(--color-divider)", marginBottom: 12 }} />
        {adding && (
          <DebtForm
            submitLabel="Add debt" busy={busy} onCancel={() => setAdding(false)}
            onSubmit={async (f) => { if (await call("/api/debts", { method: "POST", body: JSON.stringify(f) })) { setAdding(false); load(); } }}
          />
        )}
        {!active.length && !adding && <p style={{ fontSize: 14, color: muted, margin: "4px 0 12px" }}>Add each debt with what you owe, its interest rate (APR) and its minimum payment. Your lender&apos;s statement has all three.</p>}
        {active.length > 0 && (
          <>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "2px 0 8px" }}>
              <Chip on={method === "avalanche"} onClick={() => pickMethod("avalanche")}>Avalanche: highest rate first</Chip>
              <Chip on={method === "snowball"} onClick={() => pickMethod("snowball")}>Snowball: smallest balance first</Chip>
            </div>
            <p style={{ fontSize: 13.5, color: muted, margin: "0 0 10px" }}>
              Avalanche usually costs the least interest. Snowball gives faster early wins.
              {otherDiff !== null && otherDiff !== 0 && ` Here, ${method === "avalanche" ? "snowball" : "avalanche"} would cost about ${currency(Math.abs(otherDiff))} ${otherDiff > 0 ? "more" : "less"}.`}
            </p>
            {info.payoffOrder.map((d, i) => (
              <div key={d.id} style={{ borderTop: "1.5px solid var(--color-divider)", padding: "10px 0" }}>
                {editing === d.id ? (
                  <DebtForm
                    initial={d} submitLabel="Save" busy={busy} onCancel={() => setEditing(null)}
                    onSubmit={async (f) => { if (await call(`/api/debts/${d.id}`, { method: "PATCH", body: JSON.stringify({ name: f.name, debtType: f.debtType, balance: f.balance, apr: f.apr, minPayment: f.minPayment }) })) { setEditing(null); load(); } }}
                  />
                ) : (
                  <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ width: 26, height: 26, borderRadius: 99, background: "var(--color-accent)", color: "#fff", fontWeight: 600, fontSize: 13, display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none" }}>{i + 1}</span>
                    <div style={{ flex: "1 1 160px", minWidth: 0 }}>
                      <div style={{ fontSize: 15.5, fontWeight: 600 }}>{d.name}</div>
                      <div style={{ fontSize: 12.5, color: muted }}>
                        {debtTypeLabel(d.debtType)}
                        {d.fromCard ? ` · From your card${d.syncedAt ? `, updated ${new Date(d.syncedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : ""}` : ""}
                        {d.dueDate ? ` · Due ${new Date(`${d.dueDate}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 18, alignItems: "baseline", flexWrap: "wrap" }}>
                      <span style={{ ...num, fontSize: 15 }}>{currency(d.balance)}</span>
                      <span style={{ ...num, fontSize: 15, color: d.apr >= HIGH_APR ? "#B3261E" : undefined }}>{d.apr}%</span>
                      <span style={{ ...num, fontSize: 15 }}>{currency(d.minPayment)}/mo</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-accent-700)" }}>{payoffLabel(plan.payoff[d.id])}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <GhostButton onClick={() => { setPaying(paying === d.id ? null : d.id); setPayAmount(""); }}>Log a payment</GhostButton>
                      <GhostButton onClick={() => { setEditing(d.id); setAdding(false); }}>Edit</GhostButton>
                    </div>
                  </div>
                )}
                {paying === d.id && (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
                    <input value={payAmount} onChange={(e) => setPayAmount(e.target.value)} inputMode="decimal" placeholder="Amount you paid" style={bloomInputStyle({ width: 180, padding: "10px 12px" })} />
                    <PrimaryButton disabled={busy || !(Number(payAmount) > 0)} onClick={async () => { if (await call(`/api/debts/${d.id}`, { method: "PATCH", body: JSON.stringify({ payment: payAmount, recordWithdrawal }) })) { setPaying(null); load(); } }}>Save payment</PrimaryButton>
                    <GhostButton onClick={() => call(`/api/debts/${d.id}`, { method: "DELETE" }).then((ok) => ok && load())}>Remove debt</GhostButton>
                    <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13.5, flexBasis: "100%" }}>
                      <input type="checkbox" checked={recordWithdrawal} onChange={(e) => setRecordWithdrawal(e.target.checked)} />
                      Also record it as a withdrawal{data.hasCategory ? " from Debt Payoff" : ""}
                    </label>
                    <span style={{ fontSize: 12.5, color: muted }}>This lowers what you owe here. It doesn&apos;t move any money.</span>
                  </div>
                )}
              </div>
            ))}
          </>
        )}
        {paidOff.length > 0 && (
          <div style={{ borderTop: "1.5px solid var(--color-divider)", paddingTop: 10, marginTop: 4, fontSize: 14, color: muted }}>
            Paid off: {paidOff.map((d) => d.name).join(", ")}
          </div>
        )}
      </Card>

      {active.length > 0 && (
        <Card className="p-6">
          <h2 style={h2}>How much extra each month?</h2>
          <div style={{ height: 1, background: "var(--color-divider)", marginBottom: 12 }} />
          <p style={{ fontSize: 14, color: muted, margin: "0 0 12px" }}>
            Minimums come first. This is the extra on top.
            {data.hasCategory && data.categoryPct !== null ? ` Your Debt Payoff category gets ${data.categoryPct}% of each deposit.` : ""}
            {data.suggestedExtra ? ` Based on your recent deposits, ${currency(data.suggestedExtra)} a month is about 10%.` : ""}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
            {opts.map((n) => {
              const s = buildPlan(active, n, method).plan;
              return (
                <button key={n} type="button" onClick={() => pickExtra(n)} style={{ textAlign: "left", cursor: "pointer", padding: "12px 14px", borderRadius: 14, border: `${n === extra ? 2.5 : 1.5}px solid ${n === extra ? "var(--color-accent)" : "var(--color-divider)"}`, background: n === extra ? "color-mix(in srgb, var(--color-accent) 9%, transparent)" : "transparent", color: "var(--color-text)", fontFamily: "var(--font-body)" }}>
                  <div style={{ ...num, fontSize: 18 }}>+{currency(n)}/mo</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-accent-700)", marginTop: 4 }}>{payoffLabel(s.months)}</div>
                  <div style={{ fontSize: 12.5, color: muted }}>{s.neverPaysOff ? "never at this payment" : `${currency(s.totalInterest)} interest`}</div>
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
            <input value={customExtra} onChange={(e) => setCustomExtra(e.target.value)} inputMode="decimal" placeholder="Another amount" style={bloomInputStyle({ width: 170, padding: "10px 12px" })} />
            <GhostButton disabled={!(Number(customExtra) >= 0) || customExtra === ""} onClick={() => pickExtra(Number(customExtra))}>Use this amount</GhostButton>
          </div>
        </Card>
      )}

      {active.length > 0 && !plan.neverPaysOff && (
        <Card className="p-6">
          <h2 style={h2}>Payoff timeline</h2>
          <div style={{ height: 1, background: "var(--color-divider)", marginBottom: 10 }} />
          {info.payoffOrder.map((d) => (
            <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 0" }}>
              <span style={{ width: 110, fontSize: 14, fontWeight: 600, flex: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
              <div style={{ flex: 1, background: "color-mix(in srgb, var(--color-accent) 9%, transparent)", borderRadius: 99, height: 14 }}>
                <div style={{ width: `${Math.round(((plan.payoff[d.id] || 0) / lastMonths) * 100)}%`, height: 14, borderRadius: 99, background: "var(--color-accent)" }} />
              </div>
              <span style={{ width: 78, textAlign: "right", fontSize: 13.5, fontWeight: 600, color: "var(--color-accent-700)", flex: "none" }}>{payoffLabel(plan.payoff[d.id])}</span>
            </div>
          ))}
          <div style={{ fontSize: 13, color: muted, marginTop: 8 }}>As each debt is paid off, its minimum rolls into the next one.</div>
        </Card>
      )}

      <Card className="p-6">
        <div style={eyebrow}>Things to know</div>
        <div style={{ display: "grid", gap: 8, marginTop: 8, fontSize: 14.5, lineHeight: 1.5 }}>
          {notes.map((n, i) => <div key={i}>• <b>{n.title}</b> {n.text}</div>)}
        </div>
        <div style={{ fontSize: 12.5, color: muted, marginTop: 12, borderTop: "1.5px solid var(--color-divider)", paddingTop: 10 }}>
          General information, not financial advice. Payoff dates are estimates. Confirm balances and payoff amounts with your lender.
        </div>
      </Card>
    </div>
  );
}
