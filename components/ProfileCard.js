"use client";

import { useEffect, useState } from "react";
import { Card, PrimaryButton, GhostButton } from "@/components/ui";
import { bloomInputStyle } from "@/lib/bloomTheme";
import BusinessesCard from "@/components/BusinessesCard";
import ChipCheckboxes from "@/components/ChipCheckboxes";
import { WORK_OPTIONS, runsBusiness } from "@/lib/profileWork";

const muted = { fontSize: 15, lineHeight: 1.6, color: "#4A3F63" };
const label = { fontSize: 13, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4E22B8", margin: "18px 0 8px", display: "block" };

// "Your profile" in Settings: how the person earns money right now. Update it
// when life changes (new job, quit a job, opened an LLC, retired). Saving never
// changes a split percentage; it only changes which deposit types are offered
// and which questions the app asks next.
export default function ProfileCard({ onChanged }) {
  const [loaded, setLoaded] = useState(false);
  const [picks, setPicks] = useState([]);
  const [employer, setEmployer] = useState("");
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
        setHasEmployees(runsBusiness(d.workPicks || []) ? !!d.hasEmployees : null);
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
  };

  const save = async () => {
    setSaving(true); touch();
    try {
      const res = await fetch("/api/profile/work", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workPicks: picks, employerName: employer, hasEmployees }),
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
    <Card className="p-6" style={{ maxWidth: "40em", borderRadius: 22, border: "2px solid #9A72F0", background: "#fff", padding: "26px 30px" }}>
      <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 26, fontWeight: 800, margin: "0 0 6px" }}>Your profile</h2>
      <div style={{ height: 2, background: "#E7DEFA", marginBottom: 16 }} />
      <p style={{ ...muted, margin: 0 }}>
        How you earn money right now. Change it whenever life does: a new job, a job you left, an LLC you opened.
        This decides which deposit types you&apos;re offered on Split My Deposits. It never changes your split percentages.
      </p>

      <span style={label}>How do you earn money? Pick all that apply.</span>
      <ChipCheckboxes pill options={WORK_OPTIONS} selected={picks} onToggle={togglePick} />

      {picks.includes("w2") && (
        <>
          <span style={label}>Employer name (optional)</span>
          <input value={employer} onChange={(e) => { touch(); setEmployer(e.target.value); }} placeholder="Where you work" maxLength={80} style={bloomInputStyle()} />
        </>
      )}

      {runs && (
        <>
          <div style={{ height: 2, background: "#E7DEFA", margin: "22px 0 0" }} />
          <BusinessesCard embedded />

          <span style={label}>Do you have employees (other than a spouse or your kids)?</span>
          <ChipCheckboxes
            pill
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
