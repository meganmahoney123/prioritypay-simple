"use client";

import { useState } from "react";

// PHASE V: the "cancel my subscription but keep my account" flow, distinct
// from DeleteAccountCard.js (which is destructive -- data and all). Lives
// inline in the Billing card next to the "Manage billing" button, same
// "expand in place rather than a separate modal" pattern DeleteAccountCard
// uses.
//
// Three states:
//  - idle: just the "Cancel subscription" link.
//  - offer: the one-time discount screen (skipped entirely if
//    retentionOfferUsed is already true -- straight to confirm instead).
//  - confirm: the actual cancellation confirmation, states the exact date
//    access continues through.
//
// onChanged() is called after any successful action (accept offer, confirm
// cancel, resume) so the parent Settings page can refetch /api/profile and
// pick up the new billing.cancelAtPeriodEnd/currentPeriodEnd/etc.
export default function CancelSubscriptionCard({ currentPeriodEnd, cancelAtPeriodEnd, retentionOfferUsed, formatDate, onChanged }) {
  const [step, setStep] = useState("idle"); // idle | offer | confirm
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setStep("idle");
    setError("");
  };

  const startCancelFlow = () => {
    setError("");
    setStep(retentionOfferUsed ? "confirm" : "offer");
  };

  const acceptOffer = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/billing/retention-offer", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Couldn't apply the discount.");
        setBusy(false);
        return;
      }
      setBusy(false);
      reset();
      onChanged?.();
    } catch {
      setError("Couldn't apply the discount. Please try again.");
      setBusy(false);
    }
  };

  const confirmCancel = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/billing/cancel", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Couldn't cancel your subscription.");
        setBusy(false);
        return;
      }
      setBusy(false);
      reset();
      onChanged?.();
    } catch {
      setError("Couldn't cancel your subscription. Please try again.");
      setBusy(false);
    }
  };

  const resume = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/billing/resume", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Couldn't resume your subscription.");
        setBusy(false);
        return;
      }
      setBusy(false);
      onChanged?.();
    } catch {
      setError("Couldn't resume your subscription. Please try again.");
      setBusy(false);
    }
  };

  // Already scheduled to cancel -- show the "ending on" banner + Resume,
  // regardless of which step state happens to be sitting in (a page
  // refresh always lands here first via the cancelAtPeriodEnd prop).
  if (cancelAtPeriodEnd) {
    return (
      <div style={{ marginTop: 16 }}>
        <div className="text-sm" style={{ padding: 14, borderRadius: "var(--radius-sm)", border: "1px solid color-mix(in srgb, #C0392B 30%, var(--color-divider))", background: "color-mix(in srgb, #C0392B 6%, transparent)", marginBottom: 12 }}>
          Your subscription is set to cancel{currentPeriodEnd ? ` on ${formatDate(currentPeriodEnd)}` : ""}. You&apos;ll
          keep full access until then, and your account and data are safe either way.
        </div>
        {error && <p style={{ fontSize: 13, color: "#C0392B", margin: "0 0 10px" }}>{error}</p>}
        <button
          onClick={resume}
          disabled={busy}
          style={{ padding: "9px 16px", background: "transparent", border: "1px solid var(--color-divider)", borderRadius: "var(--radius-sm)", cursor: busy ? "not-allowed" : "pointer", fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600 }}
        >
          {busy ? "Resuming…" : "Resume subscription"}
        </button>
      </div>
    );
  }

  if (step === "idle") {
    return (
      <button
        onClick={startCancelFlow}
        style={{ marginTop: 12, background: "none", border: 0, padding: 0, cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 13, color: "color-mix(in srgb, var(--color-text) 55%, transparent)", textDecoration: "underline" }}
      >
        Cancel subscription
      </button>
    );
  }

  if (step === "offer") {
    return (
      <div style={{ marginTop: 16, maxWidth: 420 }}>
        <div className="text-sm" style={{ padding: 16, borderRadius: "var(--radius-sm)", border: "1px solid var(--color-accent-300)", background: "var(--color-accent-100)", marginBottom: 12 }}>
          Before you go — would 50% off your next 3 months change your mind?
        </div>
        {error && <p style={{ fontSize: 13, color: "#C0392B", margin: "0 0 10px" }}>{error}</p>}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={acceptOffer}
            disabled={busy}
            style={{ padding: "10px 18px", background: "var(--color-accent-600)", color: "#fff", border: 0, borderRadius: "var(--radius-sm)", cursor: busy ? "not-allowed" : "pointer", fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600 }}
          >
            {busy ? "Applying…" : "Yes, apply the discount"}
          </button>
          <button
            onClick={() => { setError(""); setStep("confirm"); }}
            disabled={busy}
            style={{ padding: "10px 18px", background: "transparent", border: "1px solid var(--color-divider)", borderRadius: "var(--radius-sm)", cursor: busy ? "not-allowed" : "pointer", fontFamily: "var(--font-body)", fontSize: 14 }}
          >
            No thanks, continue canceling
          </button>
        </div>
      </div>
    );
  }

  // step === "confirm"
  return (
    <div style={{ marginTop: 16, maxWidth: 420 }}>
      <div className="text-sm" style={{ padding: 16, borderRadius: "var(--radius-sm)", border: "1px solid color-mix(in srgb, #C0392B 30%, var(--color-divider))", background: "color-mix(in srgb, #C0392B 6%, transparent)", marginBottom: 12 }}>
        You&apos;ll keep full access{currentPeriodEnd ? ` through ${formatDate(currentPeriodEnd)}` : " until the end of your current billing period"},
        then your subscription won&apos;t renew. Your account and data stay exactly as they are — this only stops billing.
      </div>
      {error && <p style={{ fontSize: 13, color: "#C0392B", margin: "0 0 10px" }}>{error}</p>}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          onClick={confirmCancel}
          disabled={busy}
          style={{ padding: "10px 18px", background: "#C0392B", color: "#fff", border: 0, borderRadius: "var(--radius-sm)", cursor: busy ? "not-allowed" : "pointer", fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600 }}
        >
          {busy ? "Canceling…" : "Confirm cancellation"}
        </button>
        <button
          onClick={reset}
          disabled={busy}
          style={{ padding: "10px 18px", background: "transparent", border: "1px solid var(--color-divider)", borderRadius: "var(--radius-sm)", cursor: busy ? "not-allowed" : "pointer", fontFamily: "var(--font-body)", fontSize: 14 }}
        >
          Never mind, keep my subscription
        </button>
      </div>
    </div>
  );
}
