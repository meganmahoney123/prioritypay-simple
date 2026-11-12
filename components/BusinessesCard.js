"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, PrimaryButton, GhostButton } from "@/components/ui";
import { bloomInputStyle, bloomSelectStyle } from "@/lib/bloomTheme";
import { ENTITY_OPTIONS, SOLE_PROP, drawNote, joinEntities } from "@/lib/entityCopy";

const muted = { fontSize: 15, lineHeight: 1.6, color: "#4A3F63" };

// "Your businesses" in Settings: every business the person earns through and
// its type (sole proprietor, LLC, S corp and so on). Split My Deposits and
// Close Out use this list to attribute income and expenses and to apply the
// right rules for each business type. Changes save as they are made.
export default function BusinessesCard({ embedded = false }) {
  const [loaded, setLoaded] = useState(false);
  const [list, setList] = useState([]);
  const [name, setName] = useState("");
  const [type, setType] = useState(SOLE_PROP);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [confirmId, setConfirmId] = useState(null);

  useEffect(() => {
    fetch("/api/businesses").then((r) => r.json()).then((d) => { setList(d.businesses || []); setLoaded(true); }).catch(() => setLoaded(true));
  }, []);

  const call = async (url, method, body) => {
    setBusy(true); setErr("");
    try {
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.error || "Couldn't save that."); return false; }
      setList(d.businesses || []);
      return true;
    } finally { setBusy(false); }
  };

  const add = async () => {
    if (!name.trim()) return setErr("Give the business a name.");
    if (await call("/api/businesses", "POST", { name, entityType: type })) { setName(""); setType(SOLE_PROP); }
  };

  // Arriving from "Open Settings" links elsewhere (#businesses): scroll here
  // and flash the card so people land right on the businesses list.
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (!loaded || typeof window === "undefined" || window.location.hash !== "#businesses") return;
    const t = setTimeout(() => {
      document.getElementById("businesses")?.scrollIntoView({ behavior: "smooth", block: "start" });
      setFlash(true);
      setTimeout(() => setFlash(false), 2200);
    }, 350);
    return () => clearTimeout(t);
  }, [loaded]);

  if (!loaded) return null;
  const note = drawNote(joinEntities(list.map((b) => b.entityType)));

  if (embedded) {
    return (
      <div id="businesses" style={{ scrollMarginTop: 90, borderRadius: 24, boxShadow: flash ? "0 0 0 4px #9A72F0" : "none", transition: "box-shadow .4s" }}>
      <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4E22B8", display: "block", margin: "18px 0 8px" }}>Your businesses</span>
      <p style={{ ...muted, margin: "0 0 14px" }}>
        Add each business you earn through and mark its type (sole proprietor, LLC, S corp and more). When you split a deposit you pick which business it belongs to, and Close Out shows profit for each one.
      </p>

      {list.length === 0 ? (
        <p style={{ ...muted, margin: "0 0 14px", fontStyle: "italic" }}>No businesses added yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
          {list.map((b) => (
            <div key={b.id} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <input
                defaultValue={b.name}
                maxLength={80}
                aria-label="Business name"
                onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== b.name) call(`/api/businesses/${b.id}`, "PATCH", { name: v }); else e.target.value = b.name; }}
                style={bloomInputStyle({ flex: "1 1 180px", width: "auto" })}
              />
              <select value={b.entityType || SOLE_PROP} aria-label="Business type" disabled={busy} onChange={(e) => call(`/api/businesses/${b.id}`, "PATCH", { entityType: e.target.value })} style={bloomSelectStyle({ flex: "1 1 200px", width: "auto" })}>
                {ENTITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {confirmId === b.id ? (
                <span style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>
                  Past deposits stay, just not tied to it.
                  <GhostButton type="button" onClick={async () => { await call(`/api/businesses/${b.id}`, "DELETE"); setConfirmId(null); }}>Remove</GhostButton>
                  <GhostButton type="button" onClick={() => setConfirmId(null)}>Keep</GhostButton>
                </span>
              ) : (
                <GhostButton type="button" onClick={() => setConfirmId(b.id)}>Remove</GhostButton>
              )}
            </div>
          ))}
        </div>
      )}

      {note && <p style={{ ...muted, fontSize: 13.5, margin: "0 0 14px" }}>{note}</p>}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <input value={name} onChange={(e) => { setErr(""); setName(e.target.value); }} placeholder="Business name" maxLength={80} style={bloomInputStyle({ flex: "1 1 180px", width: "auto" })} />
        <select value={type} onChange={(e) => setType(e.target.value)} style={bloomSelectStyle({ flex: "1 1 200px", width: "auto" })}>
          {ENTITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <PrimaryButton type="button" onClick={add} disabled={busy}>+ Add a business</PrimaryButton>
      </div>
      {err && <p style={{ color: "#b3261e", fontSize: 13.5, margin: "10px 0 0" }}>{err}</p>}

      </div>
    );
  }

  return (
    <div id="businesses" style={{ scrollMarginTop: 90, borderRadius: 24, boxShadow: flash ? "0 0 0 4px #9A72F0" : "none", transition: "box-shadow .4s" }}>
    <Card className="p-6" style={{ maxWidth: "40em", borderRadius: 22, border: "2px solid #9A72F0", background: "#fff", padding: "26px 30px" }}>
      <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 26, fontWeight: 800, margin: "0 0 6px" }}>Your businesses</h2>
      <div style={{ height: 2, background: "#E7DEFA", marginBottom: 16 }} />
      <p style={{ ...muted, margin: "0 0 14px" }}>
        Add each business you earn through and mark its type (sole proprietor, LLC, S corp and more). When you split a deposit you pick which business it belongs to, and Close Out shows profit for each one.
      </p>

      {list.length === 0 ? (
        <p style={{ ...muted, margin: "0 0 14px", fontStyle: "italic" }}>No businesses added yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
          {list.map((b) => (
            <div key={b.id} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <input
                defaultValue={b.name}
                maxLength={80}
                aria-label="Business name"
                onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== b.name) call(`/api/businesses/${b.id}`, "PATCH", { name: v }); else e.target.value = b.name; }}
                style={bloomInputStyle({ flex: "1 1 180px", width: "auto" })}
              />
              <select value={b.entityType || SOLE_PROP} aria-label="Business type" disabled={busy} onChange={(e) => call(`/api/businesses/${b.id}`, "PATCH", { entityType: e.target.value })} style={bloomSelectStyle({ flex: "1 1 200px", width: "auto" })}>
                {ENTITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {confirmId === b.id ? (
                <span style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>
                  Past deposits stay, just not tied to it.
                  <GhostButton type="button" onClick={async () => { await call(`/api/businesses/${b.id}`, "DELETE"); setConfirmId(null); }}>Remove</GhostButton>
                  <GhostButton type="button" onClick={() => setConfirmId(null)}>Keep</GhostButton>
                </span>
              ) : (
                <GhostButton type="button" onClick={() => setConfirmId(b.id)}>Remove</GhostButton>
              )}
            </div>
          ))}
        </div>
      )}

      {note && <p style={{ ...muted, fontSize: 13.5, margin: "0 0 14px" }}>{note}</p>}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <input value={name} onChange={(e) => { setErr(""); setName(e.target.value); }} placeholder="Business name" maxLength={80} style={bloomInputStyle({ flex: "1 1 180px", width: "auto" })} />
        <select value={type} onChange={(e) => setType(e.target.value)} style={bloomSelectStyle({ flex: "1 1 200px", width: "auto" })}>
          {ENTITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <PrimaryButton type="button" onClick={add} disabled={busy}>+ Add a business</PrimaryButton>
      </div>
      {err && <p style={{ color: "#b3261e", fontSize: 13.5, margin: "10px 0 0" }}>{err}</p>}
    </Card>
    </div>
  );
}
