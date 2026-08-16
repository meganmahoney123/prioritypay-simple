"use client";

import { useEffect, useState } from "react";
import { Card, PrimaryButton } from "@/components/ui";
import { LEDGER_TOKENS, ledgerInputStyle, ledgerSelectStyle } from "@/lib/ledgerTheme";

export default function SettingsPage() {
  const [profile, setProfile] = useState(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/profile").then((r) => r.json()).then((d) => {
      setProfile(d.profile);
      setLoading(false);
    });
  }, []);

  const save = async () => {
    await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    setSaved(true);
  };

  if (loading || !profile) return <p className="text-sm text-neutral-500">Loading…</p>;

  return (
    <div className="max-w-2xl space-y-6" style={LEDGER_TOKENS}>
      <Card className="p-6" style={{ maxWidth: "40em" }}>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 400, margin: "0 0 6px" }}>Business profile</h2>
        <div style={{ height: 1, background: "var(--color-divider)", marginBottom: 24 }} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label
              style={{ display: "block", fontFamily: "var(--font-heading)", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 60%, transparent)", marginBottom: 10 }}
            >
              Business name
            </label>
            <input
              value={profile.businessName || ""}
              onChange={(e) => { setSaved(false); setProfile((p) => ({ ...p, businessName: e.target.value })); }}
              style={ledgerInputStyle({ fontSize: 16, padding: "11px 2px" })}
            />
          </div>
          <div>
            <label
              style={{ display: "block", fontFamily: "var(--font-heading)", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 60%, transparent)", marginBottom: 10 }}
            >
              Entity type
            </label>
            <select
              value={profile.entityType || ""}
              onChange={(e) => { setSaved(false); setProfile((p) => ({ ...p, entityType: e.target.value })); }}
              style={ledgerSelectStyle({ fontSize: 16, padding: "11px 2px" })}
            >
              <option>Sole proprietor / freelancer</option>
              <option>LLC</option>
              <option>S-Corp</option>
              <option>C-Corp</option>
            </select>
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-4">
        <PrimaryButton onClick={save}>Save</PrimaryButton>
        {saved && <span style={{ fontFamily: "var(--font-heading)", fontSize: 14, fontStyle: "italic", color: "var(--color-accent-700)" }}>Saved.</span>}
      </div>
    </div>
  );
}
