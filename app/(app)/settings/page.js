"use client";

import { useEffect, useState } from "react";
import { Card, Badge, PrimaryButton } from "@/components/ui";

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

  const updateRP = (patch) => {
    setSaved(false);
    setProfile((p) => ({ ...p, retirementProfile: { ...p.retirementProfile, ...patch } }));
  };

  const save = async () => {
    await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    setSaved(true);
  };

  if (loading || !profile) return <p className="text-sm text-neutral-500">Loading…</p>;
  const rp = profile.retirementProfile;

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

      <Card className="p-5">
        <h2 className="text-sm font-semibold mb-1">Retirement</h2>
        <p className="text-xs text-neutral-500 mb-4">
          Used to size your Solo 401k / SEP IRA catch-up contribution room accurately. Not tax advice.
          PriorityPay is built exclusively for self-employed income -- there&apos;s no employer 401(k)
          setting here, since a W2 plan sharing the same IRS elective-deferral limit as your Solo 401k
          would throw off this math.
        </p>
        <div>
          <label className="text-xs font-semibold text-neutral-600">Your age</label>
          <select value={rp.ageBracket || "under50"} onChange={(e) => updateRP({ ageBracket: e.target.value })} className="mt-1 w-full text-sm border border-neutral-200 rounded-lg px-2 py-1.5 sm:w-64">
            <option value="under50">Under 50</option>
            <option value="50to59_64plus">50–59 or 64+</option>
            <option value="60to63">60–63</option>
          </select>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold mb-1">Integrations</h2>
        <p className="text-xs text-neutral-500 mb-2">Running in sandbox mode.</p>
        <div className="flex items-center justify-between py-2 border-b border-neutral-100">
          <span className="text-sm">Plaid</span>
          <Badge>Sandbox</Badge>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm">Dwolla</span>
          <Badge>Sandbox</Badge>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold mb-1">Protecting money for autopay bills</h2>
        <div className="space-y-3 mt-3">
          <div className="flex gap-3">
            <Badge tone="emerald">Now</Badge>
            <p className="text-xs text-neutral-500">Autopay-linked categories are reserved, not moved — mark them on the Fixed Costs screen.</p>
          </div>
          <div className="flex gap-3">
            <Badge tone="amber">Post-launch</Badge>
            <p className="text-xs text-neutral-500">Dedicated locked sub-accounts, with a guided flow to redirect the biller.</p>
          </div>
          <div className="flex gap-3">
            <Badge tone="neutral">Future</Badge>
            <p className="text-xs text-neutral-500">PriorityPay originates the bill payment directly.</p>
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
