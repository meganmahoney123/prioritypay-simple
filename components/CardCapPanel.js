"use client";

import { useState } from "react";
import { currency } from "@/components/ui";

// Monthly spending cap for one credit card, plus what was charged on it this month
// by category. A guide only: nothing is blocked and no money moves.
const INK = "#1F1636";
const MUTED = "#5E5575";
const HAIR = "#E6E1F0";
const ACC = "#5B3FD1";
const MONO = "var(--font-mono, 'IBM Plex Mono', monospace)";

const btn = (primary) => ({
  padding: "8px 16px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer",
  border: primary ? "1px solid " + ACC : "1px solid " + HAIR, background: primary ? ACC : "#fff", color: primary ? "#fff" : INK,
});

// Plain-language reason a card's spending could not be read.
function reasonText(code) {
  if (code === "no_link") return "This card is not linked to a bank connection, so its spending cannot be read.";
  if (code === "PRODUCT_NOT_READY") return "Your bank is still preparing this card's transactions. Check back in a few minutes.";
  if (code === "ITEM_LOGIN_REQUIRED") return "Reconnect this card to see its spending.";
  return `Spending could not be read${code ? ` (code: ${code})` : ""}.`;
}

export default function CardCapPanel({ card, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [showCats, setShowCats] = useState(false);

  const save = async (body) => {
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/cards/spending", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId: card.accountId, ...body }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.error || "Could not save."); return; }
      setEditing(false);
      setValue("");
      onChanged && onChanged();
    } catch {
      setErr("Could not save.");
    } finally {
      setBusy(false);
    }
  };

  const hasCap = card.cap > 0;
  const sug = card.suggestion;
  const showSuggestion = !hasCap && !card.dismissed && sug && card.tracked;
  const pct = hasCap && card.spent !== null ? Math.min(100, Math.round((card.spent / card.cap) * 100)) : 0;
  const barColor = card.status === "over" ? "#B3261E" : card.status === "near" ? "#C98A12" : ACC;

  const capInput = (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
      <span style={{ fontSize: 14, color: MUTED }}>$</span>
      <input
        type="number" min="1" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Monthly cap" aria-label="Monthly cap"
        style={{ width: 130, padding: "8px 10px", borderRadius: 10, border: "1px solid " + HAIR, fontFamily: MONO, fontSize: 15, color: INK }}
      />
      <button type="button" disabled={busy || !(Number(value) > 0)} onClick={() => save({ cap: Number(value) })} style={{ ...btn(true), opacity: busy || !(Number(value) > 0) ? 0.5 : 1 }}>Save cap</button>
      <button type="button" disabled={busy} onClick={() => { setEditing(false); setValue(""); setErr(""); }} style={btn(false)}>Cancel</button>
    </div>
  );

  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid " + HAIR, color: INK }}>
      {showSuggestion && !editing && (
        <div style={{ padding: "14px 16px", borderRadius: 12, background: "#F7F6FA" }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Set a monthly spending cap?</div>
          <div style={{ fontSize: 13.5, color: MUTED, marginTop: 4, lineHeight: 1.5 }}>
            {sug.monthsUsed === 3 ? "Over the last 3 months" : `Over the last ${sug.monthsUsed} ${sug.monthsUsed === 1 ? "month" : "months"} of history`} you charged about{" "}
            <b style={{ color: INK, fontFamily: MONO }}>{currency(sug.average)}</b> a month on this card ({sug.months.map((m) => `${m.label} ${currency(m.amount)}`).join(", ")}).
            A cap of <b style={{ color: INK, fontFamily: MONO }}>{currency(sug.amount)}</b> would keep you at your usual level. You will get a heads-up as you get close. Nothing is blocked.
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button type="button" disabled={busy} onClick={() => save({ cap: sug.amount })} style={btn(true)}>Use {currency(sug.amount)}</button>
            <button type="button" disabled={busy} onClick={() => { setEditing(true); setValue(String(sug.amount)); }} style={btn(false)}>Pick my own</button>
            <button type="button" disabled={busy} onClick={() => save({ dismiss: true })} style={btn(false)}>Not now</button>
          </div>
        </div>
      )}

      {!card.tracked && card.reason && <div style={{ fontSize: 13, color: MUTED, marginBottom: 10 }}>{reasonText(card.reason)}</div>}

      {!hasCap && !showSuggestion && !editing && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13.5, color: MUTED }}>No monthly spending cap{card.tracked ? "" : ""}.</span>
          <button type="button" onClick={() => { setEditing(true); setValue(sug ? String(sug.amount) : ""); }} style={{ ...btn(false), padding: "6px 12px", fontSize: 13 }}>Set a cap</button>
        </div>
      )}

      {editing && capInput}

      {hasCap && !editing && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Monthly cap</span>
            <span style={{ fontSize: 13, display: "flex", gap: 12 }}>
              <button type="button" onClick={() => { setEditing(true); setValue(String(card.cap)); }} style={{ color: ACC, fontWeight: 600, background: "none", border: 0, cursor: "pointer", padding: 0 }}>Edit cap</button>
              <button type="button" disabled={busy} onClick={() => save({ cap: null })} style={{ color: MUTED, background: "none", border: 0, cursor: "pointer", padding: 0 }}>Remove</button>
            </span>
          </div>
          {card.tracked && card.spent !== null ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 14 }}>
                <span style={{ fontFamily: MONO }}><b>{currency(card.spent)}</b> of {currency(card.cap)}</span>
                <span style={{ fontSize: 13, color: card.status === "over" ? "#B3261E" : MUTED }}>
                  {card.status === "over" ? `${currency(card.spent - card.cap)} over` : `${currency(card.cap - card.spent)} left`}{card.daysLeft !== null ? `, ${card.daysLeft} ${card.daysLeft === 1 ? "day" : "days"} to go` : ""}
                </span>
              </div>
              <div style={{ height: 8, borderRadius: 99, background: "#EDE9F6", margin: "8px 0 6px" }}>
                <i style={{ display: "block", height: 8, borderRadius: 99, background: barColor, width: `${pct}%` }} />
              </div>
              {sug && <div style={{ fontSize: 13, color: MUTED }}>{sug.monthsUsed === 3 ? "3-month average" : `${sug.monthsUsed}-month average`}: {currency(sug.average)}</div>}
            </>
          ) : (
            <div style={{ fontSize: 13, color: MUTED, marginTop: 6 }}>Spending on this card is not tracked, so there is no progress to show.</div>
          )}
        </div>
      )}

      {err && <div style={{ fontSize: 13, color: "#B3261E", marginTop: 8 }}>{err}</div>}

      {card.tracked && card.categories.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <button type="button" onClick={() => setShowCats((v) => !v)} aria-expanded={showCats} style={{ background: "none", border: 0, padding: 0, cursor: "pointer", fontSize: 14, fontWeight: 600, color: INK }}>
            Spending by category this month {showCats ? "▴" : "▾"}
          </button>
          {showCats && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: MUTED, padding: "4px 0" }}>
                <span>Category</span>
                <span style={{ display: "flex", gap: 18 }}><span style={{ width: 80, textAlign: "right" }}>This month</span><span style={{ width: 80, textAlign: "right" }}>3-mo avg</span></span>
              </div>
              {card.categories.map((c) => (
                <div key={c.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: "1px solid " + HAIR, fontSize: 14 }}>
                  <span>{c.label}</span>
                  <span style={{ display: "flex", gap: 18, fontFamily: MONO }}>
                    <span style={{ width: 80, textAlign: "right", fontWeight: 600 }}>{currency(c.amount)}</span>
                    <span style={{ width: 80, textAlign: "right", color: MUTED }}>{c.average > 0 ? currency(c.average) : "none"}</span>
                  </span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid " + INK, fontSize: 14, fontWeight: 700 }}>
                <span>Total</span>
                <span style={{ fontFamily: MONO, width: 80, textAlign: "right", marginRight: 98 }}>{currency(card.categories.reduce((s, c) => s + c.amount, 0))}</span>
              </div>
              <div style={{ fontSize: 12.5, color: MUTED, marginTop: 6 }}>Categories come from your bank. Payments and transfers are not counted, refunds are subtracted.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
