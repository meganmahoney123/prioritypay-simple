"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

// Self-service account deletion (see app/api/account/delete/route.js) --
// required by Apple for App Review, and just the right thing to offer
// regardless of platform. Deliberately the last card on the Settings page
// and deliberately the only one styled as a warning -- this is the one
// action here that can't be undone.
export default function DeleteAccountCard() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const canConfirm = confirmText.trim().toUpperCase() === "DELETE";

  const handleDelete = async () => {
    if (!canConfirm) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Something went wrong deleting your account.");
        setBusy(false);
        return;
      }
      // The account (and its session) is already gone server-side --
      // signOut() here just clears the local Supabase client's cached
      // session/cookies so the browser doesn't hang onto a stale token.
      await supabaseBrowser().auth.signOut();
      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong deleting your account. Please try again.");
      setBusy(false);
    }
  };

  return (
    <Card className="p-6" style={{ maxWidth: "40em", borderColor: "color-mix(in srgb, #C0392B 35%, var(--color-divider))" }}>
      <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 400, margin: "0 0 6px", color: "#C0392B" }}>
        Delete account
      </h2>
      <div style={{ height: 1, background: "var(--color-divider)", marginBottom: 16 }} />
      <p style={{ fontSize: 14, lineHeight: 1.6, color: "color-mix(in srgb, var(--color-text) 68%, transparent)", margin: "0 0 20px" }}>
        Permanently deletes your PriorityPay account and all associated data — split rules, transfer history,
        close-outs, linked account references, and your profile. This cannot be undone. If you have an active
        subscription, it&apos;s canceled automatically as part of this.
      </p>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="pp-btn"
          style={{ padding: "10px 20px", background: "transparent", border: "1px solid #C0392B", color: "#C0392B", borderRadius: "var(--radius-sm)", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600 }}
        >
          Delete my account
        </button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 360 }}>
          <label style={{ fontSize: 13, color: "color-mix(in srgb, var(--color-text) 70%, transparent)" }}>
            Type <strong>DELETE</strong> to confirm.
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            disabled={busy}
            style={{ padding: "10px 12px", border: "1px solid var(--color-divider)", borderRadius: "var(--radius-sm)", fontFamily: "var(--font-body)", fontSize: 15 }}
          />
          {error && (
            <p style={{ fontSize: 13, color: "#C0392B", margin: 0 }}>{error}</p>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={handleDelete}
              disabled={!canConfirm || busy}
              style={{
                padding: "10px 18px",
                background: canConfirm ? "#C0392B" : "color-mix(in srgb, #C0392B 35%, var(--color-neutral-300))",
                color: "#fff",
                border: 0,
                borderRadius: "var(--radius-sm)",
                cursor: canConfirm && !busy ? "pointer" : "not-allowed",
                fontFamily: "var(--font-body)",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {busy ? "Deleting…" : "Permanently delete"}
            </button>
            <button
              onClick={() => {
                setOpen(false);
                setConfirmText("");
                setError("");
              }}
              disabled={busy}
              style={{ padding: "10px 18px", background: "transparent", border: "1px solid var(--color-divider)", borderRadius: "var(--radius-sm)", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 14 }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
