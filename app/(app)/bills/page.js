"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, PrimaryButton, GhostButton, currency } from "@/components/ui";
import { bloomInputStyle, bloomSelectStyle } from "@/lib/bloomTheme";
import { FREQUENCIES, frequencyLabel, occurrencesBetween, upcoming, toIso, parseIso } from "@/lib/bills";

const muted = "color-mix(in srgb, var(--color-text) 68%, transparent)";
const h2 = { fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 400, margin: "0 0 6px" };
const eyebrow = { fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: muted };
const num = { fontFamily: "var(--font-mono, ui-monospace, monospace)", fontWeight: 700 };

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const fmtDate = (iso) => parseIso(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

function Pill({ tone, children }) {
  const tones = {
    on: { bg: "color-mix(in srgb, var(--color-accent) 12%, transparent)", fg: "var(--color-accent-700)" },
    hand: { bg: "color-mix(in srgb, var(--color-text) 8%, transparent)", fg: "var(--color-text)" },
    ok: { bg: "#FFF6DB", fg: "#8A6A00" },
  };
  const t = tones[tone] || tones.hand;
  return (
    <span style={{ fontSize: 12.5, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: t.bg, color: t.fg, whiteSpace: "nowrap" }}>
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
        width: 42, height: 24, borderRadius: 999, border: "none", cursor: "pointer", padding: 2, flex: "none",
        background: on ? "var(--color-accent)" : "color-mix(in srgb, var(--color-text) 22%, transparent)",
        display: "flex", justifyContent: on ? "flex-end" : "flex-start",
      }}
    >
      <span style={{ width: 20, height: 20, borderRadius: 999, background: "#fff" }} />
    </button>
  );
}

function Chip({ on, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 700, cursor: "pointer", padding: "6px 14px", borderRadius: 999,
        border: `1.5px solid ${on ? "var(--color-accent)" : "var(--color-divider)"}`,
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

function AddForm({ accounts, onAdd, busy }) {
  const [f, setF] = useState({ name: "", amount: "", frequency: "monthly", nextDue: "", accountId: "", autopay: false });
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

  return (
    <div style={{ maxWidth: 900, display: "flex", flexDirection: "column", gap: 18 }}>
      {error && <div style={{ color: "#B3261E", fontSize: 14 }}>{error}</div>}

      {confirmScreen ? (
        <>
          <div>
            <h1 style={{ ...h2, fontSize: 28 }}>We found {pending.length} recurring payment{pending.length === 1 ? "" : "s"}</h1>
            <p style={{ color: muted, margin: 0, maxWidth: 620 }}>
              These repeat in your linked accounts. Keep the ones that are real bills. You can change this any time. Nothing here moves money.
            </p>
          </div>
          <Card>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {pending.map((b) => {
                const on = isKept(b);
                return (
                  <label key={b.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--color-divider)", cursor: "pointer" }}>
                    <input type="checkbox" checked={on} onChange={(e) => setKeep((p) => ({ ...p, [b.id]: e.target.checked }))} style={{ width: 18, height: 18, accentColor: "var(--color-accent)" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, overflowWrap: "anywhere" }}>{b.name}</div>
                      <div style={{ fontSize: 13, color: muted }}>{frequencyLabel(b.frequency)} · next {fmtDate(b.next_due)}{accountById[b.account_id] ? ` · ${accountById[b.account_id].label}` : ""}</div>
                    </div>
                    <div style={num}>{currency(b.amount)}</div>
                  </label>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
              <PrimaryButton onClick={saveFound} disabled={busy}>Save these {keptCount}</PrimaryButton>
              <GhostButton onClick={() => setSkipped(true)}>Skip for now</GhostButton>
            </div>
          </Card>
          <Card>
            <h2 style={h2}>Don't see something?</h2>
            <p style={{ color: muted, margin: "0 0 14px" }}>Add it by hand. Rent paid by check, Zelle or Venmo often won't show up on its own.</p>
            <AddForm accounts={accounts} onAdd={add} busy={busy} />
          </Card>
        </>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
            <p style={{ color: muted, margin: 0 }}>Detected from your linked accounts, plus anything you add.</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <GhostButton onClick={() => detect(false)} disabled={detecting}>{detecting ? "Looking..." : "Look for new payments"}</GhostButton>
              <PrimaryButton onClick={() => setShowAdd((v) => !v)}>{showAdd ? "Close" : "+ Add a bill"}</PrimaryButton>
            </div>
          </div>
          {detectNote && <div style={{ fontSize: 14, color: muted }}>{detectNote}</div>}

          {showAdd && (
            <Card><AddForm accounts={accounts} onAdd={async (b) => { const ok = await add(b); if (ok) setShowAdd(false); return ok; }} busy={busy} /></Card>
          )}

          {confirmed.length > 0 && (
            <Card>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
                <div style={{ flex: "1 1 170px" }}>
                  <div style={eyebrow}>Next 30 days</div>
                  <div style={{ ...num, fontSize: 30 }}>{currency(total30)}</div>
                  <div style={{ color: muted, fontSize: 13 }}>leaving across {next30.length} payment{next30.length === 1 ? "" : "s"}</div>
                </div>
                <div style={{ flex: "1 1 170px" }}>
                  <div style={eyebrow}>Next up</div>
                  {next30[0] ? (
                    <>
                      <div style={{ fontWeight: 800, fontSize: 28, color: "#8A6A00" }}>{fmtDate(next30[0].date)}</div>
                      <div style={{ color: muted, fontSize: 13, overflowWrap: "anywhere" }}>{next30[0].bill.name} · {currency(next30[0].bill.amount)}</div>
                    </>
                  ) : <div style={{ color: muted }}>Nothing in the next 30 days</div>}
                </div>
                <div style={{ flex: "1 1 170px" }}>
                  <div style={eyebrow}>By account</div>
                  <div style={{ ...num, fontSize: 30 }}>{accountNames.length}</div>
                  <div style={{ color: muted, fontSize: 13 }}>{accountNames.join(" · ") || "No account chosen yet"}</div>
                </div>
                <div style={{ flex: "1 1 170px" }}>
                  <div style={eyebrow}>Not on autopay</div>
                  <div style={{ ...num, fontSize: 30, color: notOnAutopay ? "#8A6A00" : undefined }}>{notOnAutopay}</div>
                  <div style={{ color: muted, fontSize: 13 }}>{notOnAutopay === 1 ? "you pay this one by hand" : "you pay these by hand"}</div>
                </div>
              </div>
            </Card>
          )}

          {bills.length === 0 ? (
            <Card>
              <h2 style={h2}>No bills yet</h2>
              <p style={{ color: muted, margin: 0 }}>We didn't find recurring payments in your linked accounts yet. Add one by hand, or link an account on the Accounts page and look again.</p>
            </Card>
          ) : (
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 8, flexWrap: "wrap" }}>
                <h2 style={{ ...h2, margin: 0 }}>Coming up</h2>
                <div style={{ display: "flex", gap: 8 }}>
                  <Chip on={view === "list"} onClick={() => setView("list")}>List</Chip>
                  <Chip on={view === "calendar"} onClick={() => setView("calendar")}>Calendar</Chip>
                </div>
              </div>
              {view === "calendar" ? (
                <CalendarView bills={bills} today={today} />
              ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {[...bills]
                  .sort((x, y) => (x.next_due < y.next_due ? -1 : 1))
                  .map((b) => {
                    const isPending = b.status === "pending";
                    const acc = accountById[b.account_id];
                    const d = parseIso(b.next_due);
                    return (
                      <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderTop: "1px solid var(--color-divider)", flexWrap: "wrap" }}>
                        <div style={{ width: 46, textAlign: "center", flex: "none" }}>
                          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: muted }}>{d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })}</div>
                          <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{d.getUTCDate()}</div>
                        </div>
                        <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                          <div style={{ fontWeight: 700, overflowWrap: "anywhere" }}>{b.name}</div>
                          <div style={{ fontSize: 13, color: muted }}>{frequencyLabel(b.frequency)}{noteOf(b) ? ` · ${noteOf(b)}` : ""}</div>
                        </div>
                        <div style={{ ...num, minWidth: 70, textAlign: "right" }}>{currency(b.amount)}</div>
                        <div style={{ flex: "1 1 150px", fontSize: 13.5, color: muted }}>{acc ? acc.label : "Not detected"}</div>
                        {isPending ? (
                          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                            <Pill tone="ok">Needs your OK</Pill>
                            <GhostButton onClick={async () => { if (await patch(b.id, { status: "confirmed" })) load(); }}>Keep</GhostButton>
                            <GhostButton onClick={async () => { if (await remove(b.id)) load(); }}>Not a bill</GhostButton>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <Pill tone={b.autopay ? "on" : "hand"}>{b.autopay ? "Autopay on" : "You pay by hand"}</Pill>
                            <Switch on={!!b.autopay} onChange={(v) => toggleAutopay(b, v)} label={`Autopay for ${b.name}`} />
                            <button type="button" aria-label={`Remove ${b.name}`} onClick={async () => { if (await remove(b.id)) load(); }} style={{ border: "none", background: "transparent", color: muted, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
              )}
            </Card>
          )}

          {byAccount.length > 0 && (
            <Card>
              <h2 style={h2}>Money leaving each account in the next 30 days</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
                {byAccount.map(({ id, amt, acc }) => {
                  const bal = acc?.balance;
                  const pct = bal > 0 ? Math.min(100, Math.round((amt / bal) * 100)) : 100;
                  const short = bal != null && amt > bal;
                  return (
                    <div key={id}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 15, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700 }}>{acc ? acc.label : "Account not chosen"}</span>
                        <span style={num}>{currency(amt)}{bal != null ? <span style={{ color: muted, fontWeight: 400 }}> of {currency(bal)} balance</span> : null}</span>
                      </div>
                      <div style={{ height: 10, borderRadius: 999, background: "color-mix(in srgb, var(--color-text) 10%, transparent)", marginTop: 6 }}>
                        <div style={{ width: `${bal == null ? 0 : pct}%`, height: "100%", borderRadius: 999, background: short ? "#B3261E" : "var(--color-accent)" }} />
                      </div>
                      {short && <div style={{ color: "#B3261E", fontSize: 13, marginTop: 4 }}>These payments are more than what's in this account.</div>}
                    </div>
                  );
                })}
              </div>
              {biggest && topAccount && (
                <div style={{ color: muted, fontSize: 13.5, marginTop: 12 }}>
                  {biggest.bill.name} is the biggest payment. About {currency(Math.max(0, topAccount.acc.balance - topAccount.amt))} stays in {topAccount.acc.label} after these payments.
                </div>
              )}
            </Card>
          )}

          <p style={{ color: muted, fontSize: 13, margin: 0, maxWidth: 680 }}>
            We find these by spotting payments that repeat in your linked accounts, so a payment is not necessarily on autopay at the lender. You tell us which ones are. Payments made by Zelle, Venmo, check or from an account that isn't linked may not show up, so add those by hand.
          </p>
        </>
      )}
      {canSeed && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", paddingTop: 8 }}>
          <span style={{ fontSize: 12.5, color: muted }}>Demo account:</span>
          <GhostButton onClick={() => seed("main")} disabled={busy}>Load sample data</GhostButton>
          <GhostButton onClick={() => seed("confirm")} disabled={busy}>Load first-time sample</GhostButton>
        </div>
      )}
    </div>
  );
}
