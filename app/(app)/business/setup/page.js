"use client";

// Free walkthrough of the Business plan: confirm your businesses, sort your
// accounts into them, then see the finished layout behind the upgrade button.
// Nothing is created until they upgrade; the choices are kept in this browser
// (lib/businessDraft.js) and applied on the Business page after checkout.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, PrimaryButton, GhostButton } from "@/components/ui";
import { bloomInputStyle, bloomSelectStyle } from "@/lib/bloomTheme";
import { BusinessColumns } from "@/components/BusinessUpgradeCard";
import { ENTITY_OPTIONS, ENTITY_SHORT, businessesFromOnboarding } from "@/lib/entityCopy";
import { loadBusinessDraft, saveBusinessDraft } from "@/lib/businessDraft";

const TYPE_CHOICES = ENTITY_OPTIONS.filter((o) => o.value !== "Not sure");
const STEPS = ["Your businesses", "Your accounts", "Your setup"];

function Steps({ step }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
      {STEPS.map((s, i) => (
        <span key={s} style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", padding: "5px 12px", borderRadius: 999,
          background: i === step ? "var(--color-accent)" : "var(--color-surface)", color: i === step ? "#fff" : "color-mix(in srgb, var(--color-text) 55%, transparent)",
          border: "1px solid var(--color-divider)" }}>
          {i + 1}. {s}
        </span>
      ))}
    </div>
  );
}

export default function BusinessSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [businesses, setBusinesses] = useState([]); // [{ id, name, entityType }]
  const [accounts, setAccounts] = useState([]);
  const [assign, setAssign] = useState({}); // accountId -> business id | "personal"
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [p, a] = await Promise.all([
          fetch("/api/profile").then((r) => r.json()),
          fetch("/api/accounts").then((r) => r.json()),
        ]);
        if (p.profile?.billing?.isBusiness) { router.replace("/business"); return; }
        try {
          const { isNativeApp } = await import("@/lib/native");
          if (await isNativeApp()) { router.replace("/settings"); return; }
        } catch {}
        setAccounts((a.accounts || []).filter((x) => x.account_type !== "credit"));
        const draft = loadBusinessDraft();
        if (draft) {
          setBusinesses(draft.businesses);
          setAssign(draft.assign || {});
        } else {
          const fromOnboarding = businessesFromOnboarding(p.profile?.entityType, p.profile?.businessName);
          setBusinesses(
            (fromOnboarding.length ? fromOnboarding : [{ name: "My business", entityType: ENTITY_OPTIONS[0].value }]).map((b, i) => ({
              id: `b${i + 1}`, name: b.name, entityType: b.entityType,
            }))
          );
        }
      } catch {
        setError("Couldn't load your info, please refresh.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  // Keep the draft current so nothing is lost on the way to checkout.
  useEffect(() => {
    if (!loading && businesses.length) saveBusinessDraft({ businesses, assign });
  }, [loading, businesses, assign]);

  const updateBiz = (id, patch) => setBusinesses((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const addBiz = () => setBusinesses((prev) => [...prev, { id: `b${Date.now()}`, name: "", entityType: ENTITY_OPTIONS[1].value }]);
  const removeBiz = (id) => {
    setBusinesses((prev) => prev.filter((b) => b.id !== id));
    setAssign((prev) => Object.fromEntries(Object.entries(prev).filter(([, v]) => v !== id)));
  };

  const namedBusinesses = businesses.filter((b) => b.name.trim());
  const accountLabel = (a) => a.institution_name || a.account_name || "Account";

  const columns = [
    ...namedBusinesses.map((b) => ({
      name: b.name.trim(),
      typeLabel: ENTITY_SHORT[b.entityType] || b.entityType,
      accounts: accounts.filter((a) => assign[a.id] === b.id).map(accountLabel),
      placeholder: false,
    })),
    {
      name: "Personal",
      typeLabel: "You",
      personal: true,
      accounts: accounts.filter((a) => !assign[a.id] || assign[a.id] === "personal" || !namedBusinesses.some((b) => b.id === assign[a.id])).map(accountLabel),
      placeholder: false,
    },
  ];

  const upgrade = async () => {
    setBusy(true);
    setError(null);
    saveBusinessDraft({ businesses, assign });
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

  if (loading) return <p className="text-sm text-neutral-500">Loading…</p>;

  return (
    <div className="max-w-3xl space-y-4">
      <Steps step={step} />
      {error && <p style={{ fontSize: 14, color: "#b3261e", margin: 0 }}>{error}</p>}

      {step === 0 && (
        <Card className="p-6">
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 400, margin: "0 0 6px" }}>Which businesses do you run?</h2>
          <p style={{ fontSize: 14, margin: "0 0 18px", color: "color-mix(in srgb, var(--color-text) 65%, transparent)" }}>
            We started with what you told us. Rename, change, add or remove any of them.
          </p>
          <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
            {businesses.map((b) => (
              <div key={b.id} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <input value={b.name} onChange={(e) => updateBiz(b.id, { name: e.target.value })} placeholder="Business name" style={bloomInputStyle({ flex: "2 1 200px" })} />
                <select value={b.entityType} onChange={(e) => updateBiz(b.id, { entityType: e.target.value })} style={bloomSelectStyle({ flex: "1 1 200px" })}>
                  {TYPE_CHOICES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {businesses.length > 1 && <GhostButton onClick={() => removeBiz(b.id)}>Remove</GhostButton>}
              </div>
            ))}
          </div>
          <GhostButton onClick={addBiz}>+ Add another business</GhostButton>
          <div style={{ marginTop: 20 }}>
            <PrimaryButton onClick={() => setStep(1)} disabled={!namedBusinesses.length}>Next</PrimaryButton>
          </div>
        </Card>
      )}

      {step === 1 && (
        <Card className="p-6">
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 400, margin: "0 0 6px" }}>Which account belongs to which?</h2>
          <p style={{ fontSize: 14, margin: "0 0 18px", color: "color-mix(in srgb, var(--color-text) 65%, transparent)" }}>
            Pick a home for each connected account. Anything you leave on Personal stays in your regular PrioritySave setup.
          </p>
          {accounts.length === 0 ? (
            <p style={{ fontSize: 14 }}>You haven&apos;t connected any accounts yet. You can still continue and assign them later.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {accounts.map((a) => (
                <div key={a.id} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{accountLabel(a)}{a.mask ? ` ···${a.mask}` : ""}</span>
                  <select value={assign[a.id] || "personal"} onChange={(e) => setAssign((prev) => ({ ...prev, [a.id]: e.target.value }))} style={bloomSelectStyle({ minWidth: 200 })}>
                    <option value="personal">Personal</option>
                    {namedBusinesses.map((b) => <option key={b.id} value={b.id}>{b.name.trim()}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
            <GhostButton onClick={() => setStep(0)}>Back</GhostButton>
            <PrimaryButton onClick={() => setStep(2)}>See my setup</PrimaryButton>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card className="p-6" style={{ position: "relative", overflow: "hidden" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 400, margin: "0 0 6px" }}>Your businesses, organized</h2>
          <p style={{ fontSize: 14, margin: "0 0 18px", color: "color-mix(in srgb, var(--color-text) 65%, transparent)" }}>
            Each business gets its own accounts, its own QuickBooks connection and a monthly profit check.
          </p>
          <div style={{ position: "relative" }}>
            <div aria-hidden="true" style={{ filter: "blur(7px)", pointerEvents: "none", userSelect: "none" }}>
              <BusinessColumns columns={columns} />
            </div>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, textAlign: "center", padding: 16,
              background: "color-mix(in srgb, var(--color-surface) 55%, transparent)" }}>
              <div style={{ fontSize: 28 }} aria-hidden="true">🔒</div>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 18, maxWidth: 320 }}>Your organized setup is ready</div>
              <PrimaryButton onClick={upgrade} disabled={busy}>{busy ? "Loading…" : "Unlock it · $39.99/mo"}</PrimaryButton>
              <div style={{ fontSize: 12, color: "color-mix(in srgb, var(--color-text) 60%, transparent)" }}>
                Your choices are saved. We&apos;ll set everything up the moment you upgrade.
              </div>
            </div>
          </div>
          <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
            <GhostButton onClick={() => setStep(1)}>Back</GhostButton>
            <GhostButton onClick={() => router.push("/dashboard")}>Not now</GhostButton>
          </div>
        </Card>
      )}
    </div>
  );
}
