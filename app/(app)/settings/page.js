"use client";

import { useEffect, useState } from "react";
import { Card, PrimaryButton } from "@/components/ui";

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
    <div className="max-w-2xl space-y-6">
      <Card className="p-5">
        <h2 className="text-sm font-semibold mb-1">Business profile</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
          <div>
            <label className="text-xs font-medium text-neutral-600">Business name</label>
            <input
              value={profile.businessName || ""}
              onChange={(e) => { setSaved(false); setProfile((p) => ({ ...p, businessName: e.target.value })); }}
              className="mt-1 w-full text-sm border border-neutral-200 rounded-xl px-3 py-2"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-600">Entity type</label>
            <select
              value={profile.entityType || ""}
              onChange={(e) => { setSaved(false); setProfile((p) => ({ ...p, entityType: e.target.value })); }}
              className="mt-1 w-full text-sm border border-neutral-200 rounded-xl px-3 py-2"
            >
              <option>Sole proprietor / freelancer</option>
              <option>LLC</option>
              <option>S-Corp</option>
              <option>C-Corp</option>
            </select>
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <PrimaryButton onClick={save}>Save</PrimaryButton>
        {saved && <span className="text-sm text-emerald-700 font-medium">Saved</span>}
      </div>
    </div>
  );
}
