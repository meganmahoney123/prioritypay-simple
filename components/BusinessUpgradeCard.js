"use client";

// Dashboard card that offers the Business plan to people who told us in
// onboarding that they run a separate business (LLC, S-corp, etc.) or more
// than one. Shows, visually, how their businesses and accounts would be
// organized. Web only; dismissible (hidden for 30 days after dismissing).
import { useEffect, useState } from "react";
import { X, Check } from "lucide-react";
import { Card, PrimaryButton } from "@/components/ui";
import { businessesFromOnboarding } from "@/lib/entityCopy";

const DISMISS_KEY = "ps_business_pitch_dismissed_at";
const DISMISS_DAYS = 30;
const COLORS = ["#7c3aed", "#0ea5e9", "#f59e0b", "#14b8a6", "#ef4444"];

function wasDismissedRecently() {
  try {
    const t = Number(window.localStorage.getItem(DISMISS_KEY));
    return t && Date.now() - t < DISMISS_DAYS * 86400000;
  } catch {
    return false;
  }
}

function Chip({ children, dashed }) {
  return (
    <span
      style={{
        fontSize: 12.5, fontWeight: 600, padding: "5px 10px", borderRadius: 999,
        border: dashed ? "1.5px dashed var(--color-divider)" : "1px solid var(--color-divider)",
        background: dashed ? "transparent" : "var(--color-surface)",
        color: dashed ? "color-mix(in srgb, var(--color-text) 50%, transparent)" : "var(--color-text)",
        overflowWrap: "anywhere", lineHeight: 1.3,
      }}
    >
      {children}
    </span>
  );
}

function Tag({ children }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 700, color: "var(--color-accent-700)" }}>
      <Check size={12} /> {children}
    </span>
  );
}

export default function BusinessUpgradeCard({ entityType, businessName, accounts = [] }) {
  const [hidden, setHidden] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => { setHidden(wasDismissedRecently()); }, []);
  if (hidden) return null;

  const businesses = businessesFromOnboarding(entityType, businessName);
  if (!businesses.length) return null;

  // Real account names, dealt out round-robin across the businesses and a
  // personal column, purely as an illustration (the person chooses for real).
  const names = accounts.filter((a) => a.account_type !== "credit").map((a) => a.institution_name || a.account_name).filter(Boolean);
  const columns = [...businesses.map((b) => ({ ...b })), { name: "Personal", typeLabel: "You", personal: true }];
  const slots = columns.map(() => []);
  names.forEach((n, i) => slots[i % columns.length].push(n));

  const dismiss = () => {
    try { window.localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setHidden(true);
  };

  const upgrade = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/business-checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; return; }
      setError(data.error || "Could not start checkout.");
    } catch {
      setError("Could not start checkout.");
    }
    setBusy(false);
  };

  const count = businesses.length;
  return (
    <Card className="p-5 sm:p-6" style={{ position: "relative" }}>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        style={{ position: "absolute", top: 12, right: 12, background: "transparent", border: 0, cursor: "pointer", color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}
      >
        <X size={18} />
      </button>
      <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 400, margin: "0 28px 4px 0" }}>
        {count > 1 ? `You mentioned you run ${count} businesses.` : "You mentioned you run a business."} Want PrioritySave to organize {count > 1 ? "them" : "it"} for you?
      </h3>
      <p style={{ fontSize: 14, margin: "0 0 18px", color: "color-mix(in srgb, var(--color-text) 65%, transparent)" }}>
        Here&apos;s what the Business plan does with your accounts:
      </p>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_2fr] gap-4 items-stretch">
        <div style={{ border: "1.5px dashed var(--color-divider)", borderRadius: 14, padding: 14 }}>
          <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
            Today: one big pile
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(names.length ? names : ["Checking", "Savings", "Business checking"]).map((n, i) => <Chip key={i}>{n}</Chip>)}
          </div>
        </div>

        <div className="hidden md:flex items-center" style={{ fontSize: 26, color: "var(--color-accent-700)" }}>→</div>

        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(150px, 1fr))` }}>
          {columns.map((c, i) => (
            <div key={i} style={{ border: "1px solid var(--color-divider)", borderTop: `4px solid ${c.personal ? "#a3a3a3" : COLORS[i % COLORS.length]}`, borderRadius: 14, padding: 12, background: "var(--color-surface)", minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5, overflowWrap: "anywhere" }}>{c.name}</div>
              <div style={{ fontSize: 12, marginBottom: 10, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>{c.typeLabel}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                {slots[i].map((n, j) => <Chip key={j}>{n}</Chip>)}
                <Chip dashed>+ assign an account</Chip>
              </div>
              {!c.personal && (
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <Tag>Own QuickBooks</Tag>
                  <Tag>Monthly profit check</Tag>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <p style={{ fontSize: 12, margin: "10px 0 16px", color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}>
        Example layout: you choose which account goes where.
      </p>

      {error && <p style={{ fontSize: 13, color: "#b3261e", margin: "0 0 10px" }}>{error}</p>}
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <PrimaryButton onClick={upgrade} disabled={busy}>
          {busy ? "Loading…" : `Set up my ${count > 1 ? "businesses" : "business"} · $39.99/mo`}
        </PrimaryButton>
        <button onClick={dismiss} style={{ background: "transparent", border: 0, cursor: "pointer", fontSize: 14, textDecoration: "underline", color: "color-mix(in srgb, var(--color-text) 60%, transparent)" }}>
          Not now
        </button>
      </div>
    </Card>
  );
}
