"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, PrimaryButton } from "@/components/ui";
import { bloomInputStyle, bloomSelectStyle } from "@/lib/bloomTheme";
import { cancelLinkFor } from "@/lib/cancelLinks";
import { COMMON_BILLS } from "@/lib/commonBills";
import { FREQUENCIES, frequencyLabel, occurrencesBetween, upcoming, toIso, parseIso } from "@/lib/bills";

const muted = "color-mix(in srgb, var(--color-text) 68%, transparent)";
const h2 = { fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 400, margin: "0 0 6px" };
const eyebrow = { fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: muted };
const num = { fontFamily: "var(--font-mono, ui-monospace, monospace)", fontWeight: 700 };

const currency = (n) => {
  const v = Number(n) || 0;
  const whole = Math.abs(v - Math.round(v)) < 0.005;
  return v.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 });
};
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const fmtDate = (iso) => parseIso(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

const panel = {
  background: "#fff",
  border: "2px solid color-mix(in srgb, var(--color-accent) 45%, white)",
  borderRadius: 24,
  padding: "18px 22px",
};
const mono = { fontFamily: "var(--font-mono, ui-monospace, monospace)", fontWeight: 700 };
const Panel = ({ children, style }) => <div style={{ ...panel, ...style }}>{children}</div>;
const outlineBtn = {
  fontFamily: "var(--font-body)", fontSize: 15, fontWeight: 800, cursor: "pointer", padding: "10px 20px", borderRadius: 999,
  border: "2px solid color-mix(in srgb, var(--color-accent) 55%, white)", background: "#fff", color: "var(--color-text)",
};
function OutlineButton({ children, onClick, disabled, small }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{ ...outlineBtn, ...(small ? { padding: "6px 14px", fontSize: 13.5 } : {}), opacity: disabled ? 0.6 : 1 }}>
      {children}
    </button>
  );
}

function Pill({ tone, children }) {
  const tones = {
    on: { bg: "#E3F6EC", fg: "#0F6B4F" },
    hand: { bg: "#FFF6DB", fg: "#8A6A00" },
    ok: { bg: "color-mix(in srgb, var(--color-accent) 12%, white)", fg: "var(--color-accent-700)" },
  };
  const t = tones[tone] || tones.hand;
  return (
    <span style={{ fontSize: 12.5, fontWeight: 800, padding: "3px 10px", borderRadius: 999, background: t.bg, color: t.fg, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function Switch({ on, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      style={{
        width: 44, height: 26, borderRadius: 999, border: "none", cursor: "pointer", padding: 3, flex: "none",
        background: on ? "var(--color-accent)" : "color-mix(in srgb, var(--color-accent) 20%, white)",
        display: "flex", justifyContent: on ? "flex-end" : "flex-start",
      }}
    >
      <span style={{ width: 20, height: 20, borderRadius: 999, background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.2)" }} />
    </button>
  );
}

function Check({ on, onChange, label }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      style={{
        width: 24, height: 24, borderRadius: 7, flex: "none", cursor: "pointer", padding: 0,
        border: "2px solid color-mix(in srgb, var(--color-accent) 60%, white)",
        background: on ? "var(--color-accent)" : "#fff", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {on && (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2.5 7.5l3 3 6-7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      )}
    </button>
  );
}

function Chip({ on, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 700, cursor: "pointer", padding: "5px 14px", borderRadius: 999,
        border: `2px solid ${on ? "var(--color-accent)" : "color-mix(in srgb, var(--color-accent) 35%, white)"}`,
        background: on ? "color-mix(in srgb, var(--color-accent) 9%, transparent)" : "transparent",
        color: on ? "var(--color-accent-700)" : "var(--color-text)",
      }}
    >
      {children}
    </button>
  );
}

// Month grids from this month through the month 30 days out, with each
// payment on the day it is due.
function CalendarView({ bills, today }) {
  const end = toIso(new Date(parseIso(today).getTime() + 30 * 86400000));
  const confirmed = bills.filter((b) => b.status !== "dismissed");
  const byDay = {};
  confirmed.forEach((b) => occurrencesBetween(b, today.slice(0, 8) + "01", end).forEach((d) => { (byDay[d] = byDay[d] || []).push(b); }));
  const months = [];
  let y = Number(today.slice(0, 4));
  let m = Number(today.slice(5, 7)) - 1;
  const endY = Number(end.slice(0, 4));
  const endM = Number(end.slice(5, 7)) - 1;
  while (y < endY || (y === endY && m <= endM)) { months.push([y, m]); m += 1; if (m > 11) { m = 0; y += 1; } }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {months.map(([yy, mm]) => {
        const first = new Date(Date.UTC(yy, mm, 1));
        const days = new Date(Date.UTC(yy, mm + 1, 0)).getUTCDate();
        const cells = [...Array(first.getUTCDay()).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
        return (
          <div key={`${yy}-${mm}`}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>{first.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4 }}>
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i} style={{ fontSize: 11.5, color: muted, textAlign: "center" }}>{d}</div>)}
              {cells.map((d, i) => {
                const iso = d ? toIso(new Date(Date.UTC(yy, mm, d))) : null;
                const list = iso ? byDay[iso] || [] : [];
                return (
                  <div key={i} style={{ minHeight: 52, padding: 4, borderRadius: 8, background: list.length ? "color-mix(in srgb, var(--color-accent) 10%, transparent)" : "transparent", border: d ? "1px solid var(--color-divider)" : "none", overflow: "hidden" }}>
                    {d && <div style={{ fontSize: 12, fontWeight: 700 }}>{d}</div>}
                    {list.map((b) => <div key={b.id} style={{ fontSize: 10.5, lineHeight: 1.2, overflowWrap: "anywhere" }}>{b.name}</div>)}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CommonBills({ onPick }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 8 }}>Common bills that are easy to miss</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {COMMON_BILLS.map((c) => (
          <button
            key={c.name}
            type="button"
            onClick={() => onPick(c)}
            style={{ fontFamily: "var(--font-body)", fontSize: 13.5, fontWeight: 700, cursor: "pointer", padding: "6px 12px", borderRadius: 999, border: "1.5px solid color-mix(in srgb, var(--color-accent) 40%, white)", background: "#fff", color: "var(--color-text)" }}
          >
            + {c.name} · {frequencyLabel(c.frequency).toLowerCase()}
          </button>
        ))}
      </div>
    </div>
  );
}

function AddForm({ accounts, onAdd, busy, initial }) {
  const [f, setF] = useState({ name: initial?.name || "", amount: "", frequency: initial?.frequency || "monthly", nextDue: "", accountId: "", autopay: false });
  const [err, setErr] = useState("");
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const field = (label, input) => (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 150px", minWidth: 0 }}>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: muted }}>{label}</span>
      {input}
    </label>
  );
  const submit = async () => {
    setErr("");
    if (!f.name.trim()) return setErr("Give this payment a name.");
    if (!(Number(f.amount) > 0)) return setErr("Enter the amount.");
    if (!f.nextDue) return setErr("Choose the next payment date.");
    const ok = await onAdd({ ...f, amount: Number(f.amount), accountId: f.accountId || null });
    if (ok) setF({ name: "", amount: "", frequency: "monthly", nextDue: "", accountId: "", autopay: false });
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {field("Name", <input value={f.name} onChange={set("name")} placeholder="Car insurance" maxLength={80} style={bloomInputStyle({ padding: "10px 12px" })} />)}
        {field("Amount ($)", <input value={f.amount} onChange={set("amount")} inputMode="decimal" placeholder="140" style={bloomInputStyle({ padding: "10px 12px" })} />)}
        {field("How often", (
          <select value={f.frequency} onChange={set("frequency")} style={bloomSelectStyle({ padding: "10px 12px" })}>
            {FREQUENCIES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
          </select>
        ))}
        {field("Next payment", <input type="date" value={f.nextDue} onChange={set("nextDue")} style={bloomInputStyle({ padding: "10px 12px" })} />)}
        {field("Paid from", (
          <select value={f.accountId} onChange={set("accountId")} style={bloomSelectStyle({ padding: "10px 12px" })}>
            <option value="">Not sure</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
        ))}
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
        <Switch on={f.autopay} onChange={(v) => setF((p) => ({ ...p, autopay: v }))} label="This is on autopay" />
        This one is on autopay
      </label>
      {err && <div style={{ color: "#B3261E", fontSize: 14 }}>{err}</div>}
      <div><PrimaryButton onClick={submit} disabled={busy}>Add payment</PrimaryButton></div>
    </div>
  );
}

export default function BillsPage() {
  const [bills, setBills] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectNote, setDetectNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [skipped, setSkipped] = useState(false);
  const [keep, setKeep] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [prefill, setPrefill] = useState(null);
  const [view, setView] = useState("list");
  const [canSeed, setCanSeed] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/bills");
    const d = await r.json().catch(() => ({}));
    if (d.needsSetup) { setNeedsSetup(true); return null; }
    if (!r.ok) { setError(d.error || "Couldn't load your bills."); return null; }
    setBills(d.bills || []);
    setAccounts(d.accounts || []);
    setCanSeed(Boolean(d.canSeed));
    return d;
  }, []);

  const detect = useCallback(async (quiet) => {
    setDetecting(true);
    setDetectNote("");
    try {
      const r = await fetch("/api/bills/detect", { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (d.needsSetup) { setNeedsSetup(true); return; }
      if (!r.ok) throw new Error(d.error || "failed");
      await load();
      if (!quiet) {
        setDetectNote(d.found ? `Found ${d.found} new recurring payment${d.found === 1 ? "" : "s"}.` : d.failed ? "We couldn't check one of your accounts. Try again in a bit." : "Nothing new found.");
      }
    } catch {
      if (!quiet) setDetectNote("We couldn't look for recurring payments right now.");
    } finally {
      setDetecting(false);
    }
  }, [load]);

  useEffect(() => {
    (async () => {
      const d = await load();
      setLoading(false);
      if (d && !(d.bills || []).length) await detect(true);
    })();
  }, [load, detect]);

  const pending = useMemo(() => bills.filter((b) => b.status === "pending"), [bills]);
  const confirmed = useMemo(() => bills.filter((b) => b.status === "confirmed"), [bills]);
  const accountById = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a])), [accounts]);

  const patch = async (id, body) => {
    const r = await fetch(`/api/bills/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) { const d = await r.json().catch(() => ({})); setError(d.error || "Couldn't save that."); return false; }
    return true;
  };
  const remove = async (id) => {
    const r = await fetch(`/api/bills/${id}`, { method: "DELETE" });
    if (!r.ok) { setError("Couldn't remove that."); return false; }
    return true;
  };
  const add = async (body) => {
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/bills", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d.error || "Couldn't add that."); return false; }
      await load();
      return true;
    } finally { setBusy(false); }
  };
  const toggleAutopay = async (b, v) => {
    setBills((p) => p.map((x) => (x.id === b.id ? { ...x, autopay: v } : x)));
    if (!(await patch(b.id, { autopay: v }))) load();
  };
  const saveFound = async () => {
    setBusy(true); setError("");
    try {
      for (const b of pending) {
        if (!isKept(b)) await remove(b.id);
        else await patch(b.id, { status: "confirmed" });
      }
      await load();
    } finally { setBusy(false); }
  };

  const today = todayIso();
  const next30 = useMemo(() => upcoming(bills, today, 30), [bills, today]);
  const total30 = next30.reduce((s, x) => s + Number(x.bill.amount), 0);
  const notOnAutopay = confirmed.filter((b) => !b.autopay).length;
  const byAccount = useMemo(() => {
    const m = new Map();
    next30.forEach(({ bill }) => {
      const key = bill.account_id || "none";
      m.set(key, (m.get(key) || 0) + Number(bill.amount));
    });
    return [...m.entries()].filter(([id]) => id !== "none").map(([id, amt]) => ({ id, amt, acc: accountById[id] })).sort((x, y) => y.amt - x.amt);
  }, [next30, accountById]);
  const noteOf = (b) => String(b.note || "").replace(/^demo:/, "");
  const seed = async (mode) => {
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/dev/seed-bills-demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d.error || "Couldn't load sample data."); return; }
      setSkipped(false); setKeep({});
      await load();
    } finally { setBusy(false); }
  };
  const biggest = next30.reduce((m, x) => (!m || Number(x.bill.amount) > Number(m.bill.amount) ? x : m), null);
  const topAccount = byAccount.find((x) => x.acc && x.acc.balance != null);
  const accountNames = [...new Set(next30.map((x) => accountById[x.bill.account_id]?.label).filter(Boolean))];

  if (loading) return <div style={{ padding: 24, color: muted }}>Loading your bills...</div>;
  if (needsSetup) {
    return (
      <div style={{ maxWidth: 720 }}>
        <Card><h2 style={h2}>Almost ready</h2><p style={{ color: muted, margin: 0 }}>This page needs one database update before it can save your bills. Run the latest SQL migration in Supabase, then refresh.</p></Card>
      </div>
    );
  }

  const confirmScreen = pending.length > 0 && confirmed.length === 0 && !skipped;
  const defaultOff = (b) => b.frequency === "weekly" || /venmo|zelle|cash app|paypal/i.test(b.name);
  const isKept = (b) => (keep[b.id] === undefined ? !defaultOff(b) : keep[b.id]);
  const keptCount = pending.filter(isKept).length;

  const COLS = "52px minmax(0, 1.7fr) 96px minmax(0, 1.4fr) 150px 120px";
  const th = { fontSize: 11.5, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: muted };

  return (
    <div style={{ maxWidth: 940, display: "flex", flexDirection: "column", gap: 16 }}>
      {error && <div style={{ color: "#B3261E", fontSize: 14 }}>{error}</div>}

      {confirmScreen ? (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 6px" }}>We found {pending.length} recurring payment{pending.length === 1 ? "" : "s"}</h1>
            <p style={{ color: muted, margin: 0, fontSize: 14.5 }}>Keep the ones that are real bills. You can change this any time.</p>
          </div>
            <PrimaryButton onClick={saveFound} disabled={busy}>Save These Auto Payments</PrimaryButton>
          </div>
          <div>
            <div style={{ ...eyebrow, marginBottom: 6 }}>Once you save, this fills in</div>
            <Panel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
                {[
                  ["Next 30 days", "what will leave your accounts"],
                  ["Next up", "your next bill and its date"],
                  ["By account", "which account each one pulls from"],
                  ["Not on autopay", "the bills you pay by hand"],
                ].map(([label, sub]) => (
                  <div key={label} style={{ flex: "1 1 170px" }}>
                    <div style={eyebrow}>{label}</div>
                    <div style={{ ...mono, fontSize: 24, margin: "2px 0", color: muted }}>-</div>
                    <div style={{ color: muted, fontSize: 13 }}>{sub}</div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
          <Panel style={{ padding: "14px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 260px" }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>Add a Recurring Payment</div>
                <div style={{ fontSize: 14, color: muted, marginTop: 2 }}>Add a bill we missed, like rent paid with Zelle, a check or a card, with its due date and the account it comes from.</div>
              </div>
              <OutlineButton small onClick={() => setShowAdd((v) => !v)}>{showAdd ? "Close" : "+ Add a bill"}</OutlineButton>
            </div>
            <CommonBills onPick={(c) => { setPrefill({ ...c, k: Date.now() }); setShowAdd(true); }} />
            {showAdd && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1.5px solid var(--color-divider)" }}>
                <AddForm key={prefill?.k || "blank"} initial={prefill} accounts={accounts} onAdd={async (b) => { const ok = await add(b); if (ok) { setShowAdd(false); setPrefill(null); } return ok; }} busy={busy} />
              </div>
            )}
          </Panel>
          <Panel style={{ padding: "6px 22px" }}>
            {pending.map((b, i) => {
              const on = isKept(b);
              const acc = accountById[b.account_id];
              return (
                <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderTop: i ? "1.5px solid var(--color-divider)" : "none" }}>
                  <Check on={on} onChange={(v) => setKeep((p) => ({ ...p, [b.id]: v }))} label={`Keep ${b.name}`} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 15.5, overflowWrap: "anywhere" }}>{b.name}</div>
                    <div style={{ fontSize: 12.5, color: muted }}>{frequencyLabel(b.frequency)}{acc ? ` · ${acc.label}` : ""}</div>
                  </div>
                  <div style={{ ...mono, fontSize: 15 }}>{currency(b.amount)}</div>
                </div>
              );
            })}
          </Panel>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <PrimaryButton onClick={saveFound} disabled={busy}>Save These Auto Payments</PrimaryButton>
            <OutlineButton onClick={() => setSkipped(true)}>Skip for now</OutlineButton>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <p style={{ color: muted, margin: 0, fontSize: 14.5 }}>Detected from your linked accounts, plus anything you add.</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <OutlineButton small onClick={() => detect(false)} disabled={detecting}>{detecting ? "Looking..." : "Look for new payments"}</OutlineButton>
              <OutlineButton onClick={() => setShowAdd((v) => !v)}>{showAdd ? "Close" : "+ Add a bill"}</OutlineButton>
            </div>
          </div>
          {detectNote && <div style={{ fontSize: 14, color: muted }}>{detectNote}</div>}

          {showAdd && (
            <Panel>
              <AddForm key={prefill?.k || "blank"} initial={prefill} accounts={accounts} onAdd={async (b) => { const ok = await add(b); if (ok) { setShowAdd(false); setPrefill(null); } return ok; }} busy={busy} />
              <CommonBills onPick={(c) => setPrefill({ ...c, k: Date.now() })} />
            </Panel>
          )}

          {confirmed.length > 0 && (
            <Panel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
                <div style={{ flex: "1 1 170px" }}>
                  <div style={eyebrow}>Next 30 days</div>
                  <div style={{ ...mono, fontSize: 24, margin: "2px 0" }}>{currency(total30)}</div>
                  <div style={{ color: muted, fontSize: 13 }}>leaving across {next30.length} payment{next30.length === 1 ? "" : "s"}</div>
                </div>
                <div style={{ flex: "1 1 170px" }}>
                  <div style={eyebrow}>Next up</div>
                  {next30[0] ? (
                    <>
                      <div style={{ ...mono, fontSize: 24, margin: "2px 0", color: "#8A6A00" }}>{fmtDate(next30[0].date)}</div>
                      <div style={{ color: muted, fontSize: 13, overflowWrap: "anywhere" }}>{next30[0].bill.name} · {currency(next30[0].bill.amount)}</div>
                    </>
                  ) : <div style={{ color: muted }}>Nothing in the next 30 days</div>}
                </div>
                <div style={{ flex: "1 1 170px" }}>
                  <div style={eyebrow}>By account</div>
                  <div style={{ ...mono, fontSize: 24, margin: "2px 0" }}>{accountNames.length}</div>
                  <div style={{ color: muted, fontSize: 13 }}>{accountNames.join(" · ") || "No account chosen yet"}</div>
                </div>
                <div style={{ flex: "1 1 170px" }}>
                  <div style={eyebrow}>Not on autopay</div>
                  <div style={{ ...mono, fontSize: 24, margin: "2px 0", color: notOnAutopay ? "#8A6A00" : undefined }}>{notOnAutopay}</div>
                  <div style={{ color: muted, fontSize: 13 }}>{notOnAutopay === 1 ? "you pay this one by hand" : "you pay these by hand"}</div>
                </div>
              </div>
            </Panel>
          )}

          {bills.length === 0 ? (
            <Panel>
              <h2 style={h2}>No bills yet</h2>
              <p style={{ color: muted, margin: 0 }}>We didn&apos;t find recurring payments in your linked accounts yet. Add one by hand, or link an account on the Accounts page and look again.</p>
            </Panel>
          ) : (
            <Panel>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8, flexWrap: "wrap" }}>
                <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 800, margin: 0 }}>Coming up</h2>
                <div style={{ display: "flex", gap: 8 }}>
                  <Chip on={view === "list"} onClick={() => setView("list")}>List</Chip>
                  <Chip on={view === "calendar"} onClick={() => setView("calendar")}>Calendar</Chip>
                </div>
              </div>
              {view === "calendar" ? (
                <CalendarView bills={bills} today={today} />
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <div style={{ minWidth: 760 }}>
                    <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 12, padding: "4px 0 8px" }}>
                      <div style={th}>Date</div>
                      <div style={th}>Payment</div>
                      <div style={{ ...th, textAlign: "right" }}>Amount</div>
                      <div style={th}>Pulls from</div>
                      <div style={th}>Status</div>
                      <div style={{ ...th, textAlign: "right" }}>Autopay</div>
                    </div>
                    {[...bills]
                      .sort((x, y) => (x.next_due < y.next_due ? -1 : 1))
                      .map((b) => {
                        const isPending = b.status === "pending";
                        const acc = accountById[b.account_id];
                        const d = parseIso(b.next_due);
                        return (
                          <div key={b.id} style={{ display: "grid", gridTemplateColumns: COLS, gap: 12, alignItems: "center", padding: "12px 0", borderTop: "1.5px solid var(--color-divider)" }}>
                            <div>
                              <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: muted }}>{d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })}</div>
                              <div style={{ ...mono, fontSize: 20, lineHeight: 1.1 }}>{d.getUTCDate()}</div>
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 800, fontSize: 15.5, overflowWrap: "anywhere" }}>{b.name}</div>
                              <div style={{ fontSize: 12.5, color: muted }}>{frequencyLabel(b.frequency)}{noteOf(b) ? ` · ${noteOf(b)}` : ""}</div>
                            </div>
                            <div style={{ ...mono, fontSize: 15, textAlign: "right" }}>{currency(b.amount)}</div>
                            <div style={{ fontSize: 14, lineHeight: 1.3 }}>
                              <div>{acc ? acc.label : "Not detected"}</div>
                              <div style={{ fontSize: 12.5, color: muted }}>{frequencyLabel(b.frequency)}</div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                              <Pill tone={isPending ? "ok" : b.autopay ? "on" : "hand"}>{isPending ? "Needs your OK" : b.autopay ? "Autopay on" : "You pay by hand"}</Pill>
                              {(() => {
                                const c = cancelLinkFor(b.name);
                                return c ? (
                                  <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--color-accent-700)", textDecoration: "underline" }}>
                                    {c.exact ? "Cancel or manage" : "How to cancel"}
                                  </a>
                                ) : null;
                              })()}
                            </div>
                            {isPending ? (
                              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                                <OutlineButton small onClick={async () => { if (await patch(b.id, { status: "confirmed" })) load(); }}>Keep</OutlineButton>
                                <button type="button" aria-label={`Not a bill: ${b.name}`} onClick={async () => { if (await remove(b.id)) load(); }} style={{ border: "none", background: "transparent", color: muted, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
                              </div>
                            ) : (
                              <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "flex-end" }}>
                                <Switch on={!!b.autopay} onChange={(v) => toggleAutopay(b, v)} label={`Autopay for ${b.name}`} />
                                <button type="button" aria-label={`Remove ${b.name}`} onClick={async () => { if (await remove(b.id)) load(); }} style={{ border: "none", background: "transparent", color: muted, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </Panel>
          )}

          {byAccount.length > 0 && (
            <Panel>
              <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 800, margin: "0 0 12px" }}>Money leaving each account in the next 30 days</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {byAccount.map(({ id, amt, acc }) => {
                  const bal = acc?.balance;
                  const pct = bal > 0 ? Math.min(100, Math.round((amt / bal) * 100)) : 100;
                  const short = bal != null && amt > bal;
                  return (
                    <div key={id}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 15, flexWrap: "wrap", fontWeight: 800 }}>
                        <span>{acc ? acc.label : "Account not chosen"}</span>
                        <span style={{ ...mono, fontSize: 14.5 }}>{currency(amt)}{bal != null ? ` of ${currency(bal)} balance` : ""}</span>
                      </div>
                      <div style={{ height: 12, borderRadius: 999, background: "color-mix(in srgb, var(--color-accent) 14%, white)", marginTop: 6 }}>
                        <div style={{ width: `${bal == null ? 0 : pct}%`, height: "100%", borderRadius: 999, background: short ? "#B3261E" : "var(--color-accent)" }} />
                      </div>
                      {short && <div style={{ color: "#B3261E", fontSize: 13, marginTop: 4 }}>These payments are more than what&apos;s in this account.</div>}
                    </div>
                  );
                })}
              </div>
              {biggest && topAccount && (
                <div style={{ color: muted, fontSize: 13.5, marginTop: 12 }}>
                  {biggest.bill.name} is the biggest payment. About {currency(Math.max(0, topAccount.acc.balance - topAccount.amt))} stays in {topAccount.acc.label} after these payments.
                </div>
              )}
            </Panel>
          )}

          <p style={{ color: muted, fontSize: 13.5, margin: 0, maxWidth: 760, lineHeight: 1.55 }}>
            Detected means we saw the payment repeat in your account history. It does not mean the lender has autopay turned on, so you tell us which ones are. Payments made through Zelle, Venmo, checks or a card may not show up, so you can add them by hand. Cancel links open the company's own page. We never cancel or move money for you.
          </p>
        </>
      )}
      {canSeed && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", paddingTop: 8 }}>
          <span style={{ fontSize: 12.5, color: muted }}>Demo account:</span>
          <OutlineButton small onClick={() => seed("main")} disabled={busy}>Load sample data</OutlineButton>
          <OutlineButton small onClick={() => seed("confirm")} disabled={busy}>Load first-time sample</OutlineButton>
        </div>
      )}
    </div>
  );
}
