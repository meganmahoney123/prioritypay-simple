"use client";

import { useEffect, useState } from "react";
import { Card, PrimaryButton, GhostButton } from "@/components/ui";
import { bloomInputStyle, bloomSelectStyle } from "@/lib/bloomTheme";
import ChipCheckboxes from "@/components/ChipCheckboxes";
import { ENTITY_OPTIONS, SOLE_PROP, drawNote, joinEntities } from "@/lib/entityCopy";
import { WORK_OPTIONS, runsBusiness } from "@/lib/profileWork";

const muted = { fontSize: 14, lineHeight: 1.6, color: "color-mix(in srgb, var(--color-text) 68%, transparent)" };
const label = { fontSize: 13.5, fontWeight: 600, margin: "18px 0 8px", display: "block" };

// "Your profile" in Settings: how the person earns money right now. Update it
// when life changes (new job, quit a job, opened an LLC, retired). Saving never
// changes a split percentage; it only changes which deposit types are offered
// and which questions the app asks next.
export default function ProfileCard({ onChanged }) {
  const [loaded, setLoaded] = useState(false);
  const [picks, setPicks] = useState([]);
  const [employer, setEmployer] = useState("");
  const [businesses, setBusinesses] = useState([]);
  const [hasEmployees, setHasEmployees] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/profile/work")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) return;
        setPicks(d.workPicks || []);
        setEmployer(d.employerName || "");
        setBusinesses(d.businesses || []);
        setHasEmployees(d.businesses?.length ? !!d.hasEmployees : null);
        setLoaded(true);
      })
      .catch(() => {});
  }, []);

  if (!loaded) return null;

  const runs = runsBusiness(picks);
  const touch = () => { setMsg(""); setErr(""); };

  const togglePick = (v) => {
    touch();
    const next = picks.includes(v) ? picks.filter((p) => p !== v) : [...picks, v];
    // Retired and between jobs stand alone; the others can combine.
    const cleaned = v === "retired" || v === "between" ? (next.includes(v) ? [v] : next) : next.filter((p) => p !== "retired" && p !== "between");
    setPicks(cleaned);
    if (runsBusiness(cleaned) && !businesses.length) setBusinesses([{ name: "", entityType: SOLE_PROP }]);
  };

  const setBiz = (i, patch) => { touch(); setBusinesses((list) => list.map((b, j) => (j === i ? { ...b, ...patch } : b))); };

  const save = async () => {
    setSaving(true); touch();
    try {
      const res = await fetch("/api/profile/work", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workPicks: picks, employerName: employer, businesses, hasEmployees }),
      });
      const d = await res.json();
      if (!res.ok) { setErr(d.error || "Couldn't save your profile."); return; }
      const bits = [];
      if (d.added?.length) bits.push(`Now offered as a deposit type: ${d.added.join(", ")}.`);
      if (d.removed?.length) bits.push(`No longer offered: ${d.removed.join(", ")}.`);
      setMsg(["Profile saved. Your split percentages didn't change.", ...bits].join(" "));
      onChanged?.();
    } catch {
      setErr("Couldn't save your profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6" style={{ maxWidth: "40em" }}>
      <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 400, margin: "0 0 6px" }}>Your profile</h2>
      <div style={{ height: 1, background: "var(--color-divider)", marginBottom: 16 }} />
      <p style={{ ...muted, margin: 0 }}>
        How you earn money right now. Change it whenever life does: a new job, a job you left, an LLC you opened.
        This decides which deposit types you&apos;re offered on Split My Deposits. It never changes your split percentages.
      </p>

      <span style={label}>How do you earn money? Pick all that apply.</span>
      <ChipCheckboxes options={WORK_OPTIONS} selected={picks} onToggle={togglePick} />

      {picks.includes("w2") && (
        <>
          <span style={label}>Employer name (optional)</span>
          <input value={employer} onChange={(e) => { touch(); setEmployer(e.target.value); }} placeholder="Where you work" maxLength={80} style={bloomInputStyle()} />
        </>
      )}

      {runs && (
        <>
          <span style={label}>Your businesses</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {businesses.map((b, i) => (
              <div key={i} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                <input value={b.name} onChange={(e) => setBiz(i, { name: e.target.value })} placeholder="Business name" maxLength={80} style={bloomInputStyle({ flex: "1 1 180px", width: "auto" })} />
                <select value={b.entityType} onChange={(e) => setBiz(i, { entityType: e.target.value })} style={bloomSelectStyle({ flex: "1 1 200px", width: "auto" })}>
                  {ENTITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {businesses.length > 1 && (
                  <GhostButton type="button" onClick={() => { touch(); setBusinesses((l) => l.filter((_, j) => j !== i)); }}>Remove</GhostButton>
                )}
              </div>
            ))}
          </div>
          {businesses.length < 10 && (
            <div style={{ marginTop: 10 }}>
              <GhostButton type="button" onClick={() => { touch(); setBusinesses((l) => [...l, { name: "", entityType: SOLE_PROP }]); }}>+ Add a business</GhostButton>
            </div>
          )}
          {drawNote(joinEntities(businesses.map((b) => b.entityType))) && (
            <p style={{ ...muted, fontSize: 13.5, margin: "10px 0 0" }}>{drawNote(joinEntities(businesses.map((b) => b.entityType)))}</p>
          )}

          <span style={label}>Do you have employees (other than a spouse or your kids)?</span>
          <ChipCheckboxes
            options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]}
            selected={hasEmployees === true ? ["yes"] : hasEmployees === false ? ["no"] : []}
            onToggle={(v) => { touch(); setHasEmployees(v === "yes"); }}
          />
        </>
      )}

      <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <PrimaryButton type="button" onClick={save} disabled={saving || !picks.length || (runs && hasEmployees === null)}>
          {saving ? "Saving…" : "Save profile"}
        </PrimaryButton>
        {msg && <span style={{ fontSize: 13.5, color: "var(--color-accent-700)" }}>{msg}</span>}
        {err && <span style={{ fontSize: 13.5, color: "#b3261e" }}>{err}</span>}
      </div>
    </Card>
  );
}
