"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { Card, PrimaryButton, GhostButton } from "@/components/ui";
import { ledgerInputStyle } from "@/lib/ledgerTheme";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

// Optional two-factor authentication (TOTP, via any authenticator app) --
// this is what makes "Yes - Non-phishing-resistant MFA is performed" an
// honest answer on Plaid's security questionnaire instead of "No". Opt-in
// per user, enforced at the session level by middleware.js (see
// MFA_EXEMPT_PREFIXES there) rather than here -- this component only
// handles enrolling/removing the factor itself. Supabase's own
// auth.mfa.* API manages the underlying factor rows; nothing here touches
// our own schema.
export default function MfaSettings() {
  const [loading, setLoading] = useState(true);
  const [factor, setFactor] = useState(null); // verified factor, if any
  const [enrolling, setEnrolling] = useState(null); // { factorId, qrCode, secret }
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const refresh = async () => {
    const supabase = supabaseBrowser();
    const { data, error: listError } = await supabase.auth.mfa.listFactors();
    if (!listError) {
      setFactor(data?.totp?.find((f) => f.status === "verified") || null);
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const startEnroll = async () => {
    setBusy(true);
    setError(null);
    const supabase = supabaseBrowser();
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    setBusy(false);
    if (enrollError) {
      setError(enrollError.message);
      return;
    }
    setEnrolling({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
  };

  const confirmEnroll = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = supabaseBrowser();
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrolling.factorId,
      code: code.trim(),
    });
    setBusy(false);
    if (verifyError) {
      setError("That code didn't work. Check your authenticator app and try again.");
      return;
    }
    setEnrolling(null);
    setCode("");
    await refresh();
  };

  const cancelEnroll = async () => {
    // Clean up the half-finished factor so it doesn't linger unverified.
    if (enrolling) {
      const supabase = supabaseBrowser();
      await supabase.auth.mfa.unenroll({ factorId: enrolling.factorId }).catch(() => {});
    }
    setEnrolling(null);
    setCode("");
    setError(null);
  };

  const removeFactor = async () => {
    setBusy(true);
    setError(null);
    const supabase = supabaseBrowser();
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    setBusy(false);
    if (unenrollError) {
      setError(unenrollError.message);
      return;
    }
    setConfirmingRemove(false);
    await refresh();
  };

  if (loading) return null;

  return (
    <Card className="p-6" style={{ maxWidth: "40em" }}>
      <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 400, margin: "0 0 6px" }}>
        Two-factor authentication
      </h2>
      <div style={{ height: 1, background: "var(--color-divider)", marginBottom: 20 }} />

      {factor ? (
        <>
          <p style={{ fontSize: 15, lineHeight: 1.6, margin: "0 0 20px", display: "flex", alignItems: "center", gap: 8 }}>
            <ShieldCheck size={18} style={{ color: "var(--color-accent-700)", flexShrink: 0 }} />
            Enabled -- you'll be asked for a code from your authenticator app each time you sign in.
          </p>
          {confirmingRemove ? (
            <div>
              <p style={{ fontSize: 14, marginBottom: 14 }}>
                Turn off two-factor authentication? You'll only need your password to sign in after this.
              </p>
              <div className="flex items-center gap-3">
                <PrimaryButton onClick={removeFactor} disabled={busy}>
                  {busy ? "Removing…" : "Yes, turn it off"}
                </PrimaryButton>
                <GhostButton onClick={() => setConfirmingRemove(false)} disabled={busy}>
                  Cancel
                </GhostButton>
              </div>
            </div>
          ) : (
            <GhostButton onClick={() => setConfirmingRemove(true)}>Turn off</GhostButton>
          )}
        </>
      ) : enrolling ? (
        <form onSubmit={confirmEnroll} style={{ display: "grid", gap: 18 }}>
          <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>
            Scan this with an authenticator app (Google Authenticator, Authy, 1Password, etc.), then enter the
            6-digit code it shows you.
          </p>
          {enrolling.qrCode && (
            // Supabase returns this as an inline SVG data URI -- safe to
            // drop straight into an <img> src, no extra rendering needed.
            <img src={enrolling.qrCode} alt="Scan with your authenticator app" width={180} height={180} style={{ borderRadius: 8 }} />
          )}
          <details>
            <summary style={{ fontSize: 13, cursor: "pointer", color: "color-mix(in srgb, var(--color-text) 60%, transparent)" }}>
              Can't scan it? Enter this code manually
            </summary>
            <code style={{ display: "block", marginTop: 8, fontSize: 13, wordBreak: "break-all" }}>{enrolling.secret}</code>
          </details>
          <div style={{ maxWidth: 220 }}>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="123456"
              style={ledgerInputStyle({ fontSize: 18, letterSpacing: "0.2em", textAlign: "center", padding: "11px 2px" })}
            />
          </div>
          {error && <p style={{ fontSize: 13.5, color: "#7a2f2a", margin: 0 }}>{error}</p>}
          <div className="flex items-center gap-3">
            <PrimaryButton type="submit" disabled={busy || code.length !== 6}>
              {busy && <Loader2 size={14} className="animate-spin" style={{ marginRight: 6 }} />}
              Confirm
            </PrimaryButton>
            <GhostButton onClick={cancelEnroll} disabled={busy}>
              Cancel
            </GhostButton>
          </div>
        </form>
      ) : (
        <>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "color-mix(in srgb, var(--color-text) 68%, transparent)", margin: "0 0 20px" }}>
            Add an authenticator app as a second step when you sign in, on top of your password.
          </p>
          {error && <p style={{ fontSize: 13.5, color: "#7a2f2a", margin: "0 0 16px" }}>{error}</p>}
          <PrimaryButton onClick={startEnroll} disabled={busy}>
            {busy ? "Loading…" : "Set up two-factor authentication"}
          </PrimaryButton>
        </>
      )}
    </Card>
  );
}
