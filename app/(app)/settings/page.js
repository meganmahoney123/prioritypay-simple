"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, PrimaryButton } from "@/components/ui";
import { bloomInputStyle, bloomWarningCardStyle, bloomNoticeCardStyle } from "@/lib/bloomTheme";
import MfaSettings from "@/components/MfaSettings";
import AppLockSettingsCard from "@/components/AppLockSettingsCard";
import DeleteAccountCard from "@/components/DeleteAccountCard";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

// The persona-switch testing panel below (see /api/dev/set-persona, which
// enforces the same allowlist server-side -- this client-side check is
// just so the button doesn't render as a dead end for anyone else) is
// only ever meant for Megan's own account, never a real customer's --
// it resets whoever clicks it's split rules to a different persona's
// defaults, which would be a genuinely bad surprise on a live account.
const DEV_TESTING_EMAILS = new Set(["megan@ignitemysite.com"]);

function daysLeft(trialEndsAt) {
  if (!trialEndsAt) return null;
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function SettingsPageInner() {
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [billingBusy, setBillingBusy] = useState(false);
  const billingRedirect = searchParams.get("billing");
  // Testing-only: lets you switch your OWN account between the four
  // onboarding personas (see BUSINESS_TYPES, app/onboarding/page.js)
  // without creating a second account -- resets your split rules to that
  // persona's defaults via /api/dev/set-persona, same insert/delete
  // pattern as /api/dev/reset-split-rules. Real accounts wouldn't need
  // this button and could have it removed later; harmless to leave in the
  // meantime since it only ever touches the signed-in user's own data.
  const [personaSwitchBusy, setPersonaSwitchBusy] = useState(null);
  const [canSwitchPersona, setCanSwitchPersona] = useState(false);

  useEffect(() => {
    supabaseBrowser()
      .auth.getUser()
      .then(({ data }) => {
        const email = (data?.user?.email || "").toLowerCase();
        setCanSwitchPersona(DEV_TESTING_EMAILS.has(email));
      });
  }, []);

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

  const subscribe = async () => {
    setBillingBusy(true);
    const res = await fetch("/api/billing/checkout", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setBillingBusy(false);
  };

  const manageBilling = async () => {
    setBillingBusy(true);
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setBillingBusy(false);
  };

  const switchPersona = async (persona) => {
    setPersonaSwitchBusy(persona);
    const res = await fetch("/api/dev/set-persona", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ persona }),
    });
    const data = await res.json();
    setPersonaSwitchBusy(null);
    if (!res.ok || data.error) {
      alert(data.error || "Could not switch persona.");
      return;
    }
    // Split rules and dashboard/close-out copy both read from the DB fresh
    // on load -- a full reload is the simplest way to see the new
    // persona's defaults everywhere at once, same as actually finishing
    // onboarding would.
    window.location.href = "/dashboard";
  };

  if (loading || !profile) return <p className="text-sm text-neutral-500">Loading…</p>;

  const billing = profile.billing || {};
  const remaining = daysLeft(billing.trialEndsAt);
  const isActive = billing.subscriptionStatus === "active";

  return (
    <div className="max-w-2xl space-y-6">
      <Card className="p-6" style={{ maxWidth: "40em" }}>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 400, margin: "0 0 6px" }}>Billing</h2>
        <div style={{ height: 1, background: "var(--color-divider)", marginBottom: 20 }} />

        {billingRedirect === "success" && (
          <p style={{ fontSize: 14, color: "var(--color-accent-700)", marginBottom: 16 }}>
            Subscription started — thanks for subscribing to PriorityPay.
          </p>
        )}
        {billingRedirect === "cancelled" && (
          <p style={{ fontSize: 14, color: "color-mix(in srgb, var(--color-text) 60%, transparent)", marginBottom: 16 }}>
            Checkout cancelled — no charge was made.
          </p>
        )}

        {isActive ? (
          <>
            <p style={{ fontSize: 15, margin: "0 0 16px" }}>
              You&apos;re subscribed to PriorityPay — <strong>$7/month</strong>.
            </p>
            <PrimaryButton onClick={manageBilling} disabled={billingBusy}>
              {billingBusy ? "Loading…" : "Manage billing"}
            </PrimaryButton>
          </>
        ) : billing.readOnly ? (
          <>
            <div className="text-sm" style={{ ...bloomWarningCardStyle(), padding: 16, margin: "0 0 16px" }}>
              Your 30-day free trial ended{billing.trialEndsAt ? ` on ${formatDate(billing.trialEndsAt)}` : ""}.
              You can still see your split rules and history, but connecting new accounts and moving money are
              paused until you subscribe.
            </div>
            <PrimaryButton onClick={subscribe} disabled={billingBusy}>
              {billingBusy ? "Loading…" : "Subscribe — $7/month"}
            </PrimaryButton>
          </>
        ) : (
          <>
            <div className="text-sm" style={{ ...bloomNoticeCardStyle(), padding: 16, margin: "0 0 16px" }}>
              {remaining === null
                ? "You're on PriorityPay's 30-day free trial."
                : `${remaining} day${remaining === 1 ? "" : "s"} left in your free trial`}
              {billing.trialEndsAt ? ` (ends ${formatDate(billing.trialEndsAt)})` : ""}. $7/month after that.
            </div>
            <PrimaryButton onClick={subscribe} disabled={billingBusy}>
              {billingBusy ? "Loading…" : "Subscribe now"}
            </PrimaryButton>
          </>
        )}
      </Card>

      <MfaSettings />

      <Card className="p-6" style={{ maxWidth: "40em" }}>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 400, margin: "0 0 6px" }}>Deposit splitting</h2>
        <div style={{ height: 1, background: "var(--color-divider)", marginBottom: 16 }} />
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "color-mix(in srgb, var(--color-text) 68%, transparent)", margin: "0 0 20px" }}>
          Deposits below this amount (a refund, a reimbursement) won&apos;t trigger a split at all — $100 is the
          lowest you can set it.
        </p>
        <div style={{ maxWidth: 220 }}>
          <label
            style={{ display: "block", fontFamily: "var(--font-heading)", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 60%, transparent)", marginBottom: 10 }}
          >
            Minimum deposit to split ($)
          </label>
          <input
            type="number"
            onFocus={(e) => e.target.select()}
            min="100"
            step="1"
            value={profile.minDepositThreshold ?? 100}
            onChange={(e) => {
              setSaved(false);
              const v = e.target.value === "" ? "" : Number(e.target.value);
              setProfile((p) => ({ ...p, minDepositThreshold: v }));
            }}
            onBlur={(e) => {
              const v = Math.max(100, Number(e.target.value) || 100);
              setProfile((p) => ({ ...p, minDepositThreshold: v }));
            }}
            style={bloomInputStyle({ fontSize: 16, padding: "11px 2px" })}
          />
        </div>
      </Card>

      {/* Text alerts are temporarily on hold while Twilio's business
          verification is stuck (see SMS_ALERTS_ENABLED, lib/runSplit.js)
          -- this card asked for a phone number + smsEnabled toggle
          before; that state/logic is untouched elsewhere (see
          profile.notifications?.smsEnabled/phoneNumber, still read/written
          by /api/profile), just not exposed in this UI right now. Email
          alerts stand in below, sharing the same smsThreshold dollar
          figure. Bringing text alerts back is restoring this card's JSX
          from git history plus flipping SMS_ALERTS_ENABLED, not a rebuild. */}
      <Card className="p-6" style={{ maxWidth: "40em" }}>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 400, margin: "0 0 6px" }}>Deposit email alerts</h2>
        <div style={{ height: 1, background: "var(--color-divider)", marginBottom: 16 }} />
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "color-mix(in srgb, var(--color-text) 68%, transparent)", margin: "0 0 20px" }}>
          PriorityPay emails you the moment a qualifying deposit lands, with a link straight to your split
          checklist — sent to your account email, on by default, and you can turn it off anytime.
        </p>
        <label className="flex items-center gap-2.5" style={{ marginBottom: 20, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={!!profile.notifications?.emailEnabled}
            onChange={(e) => {
              setSaved(false);
              setProfile((p) => ({ ...p, notifications: { ...p.notifications, emailEnabled: e.target.checked } }));
            }}
            style={{ width: 16, height: 16 }}
          />
          <span style={{ fontSize: 15 }}>Email me when a deposit crosses my threshold</span>
        </label>
        <div style={{ maxWidth: 220 }}>
          <label
            style={{ display: "block", fontFamily: "var(--font-heading)", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 60%, transparent)", marginBottom: 10 }}
          >
            Threshold ($)
          </label>
          <input
            type="number"
            onFocus={(e) => e.target.select()}
            min="0"
            step="1"
            placeholder="500"
            value={profile.notifications?.smsThreshold ?? ""}
            onChange={(e) => {
              setSaved(false);
              const v = e.target.value === "" ? "" : Number(e.target.value);
              setProfile((p) => ({ ...p, notifications: { ...p.notifications, smsThreshold: v } }));
            }}
            style={bloomInputStyle({ fontSize: 16, padding: "11px 2px" })}
          />
        </div>
      </Card>

      <AppLockSettingsCard />

      <div className="flex items-center gap-4">
        <PrimaryButton onClick={save}>Save</PrimaryButton>
        {saved && <span style={{ fontFamily: "var(--font-heading)", fontSize: 14, fontStyle: "italic", color: "var(--color-accent-700)" }}>Saved.</span>}
      </div>

      {canSwitchPersona && (
      <Card className="p-6" style={{ maxWidth: "40em" }}>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 400, margin: "0 0 6px" }}>Testing: switch persona</h2>
        <div style={{ height: 1, background: "var(--color-divider)", marginBottom: 16 }} />
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "color-mix(in srgb, var(--color-text) 68%, transparent)", margin: "0 0 16px" }}>
          Instantly switches your own account to a different onboarding persona and resets your split rules to
          that persona&apos;s defaults — no need to sign up a second account to see how Dashboard, Close Out, and
          Split Rules look for each one. Currently: <strong>{profile.persona || "not set"}</strong>.
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            "Self Employed (No Employees)",
            "Business Owner (With Employees)",
            "W2 Employee (With Side Hustle/Business)",
            "W2 Employee (No Side Hustle/Business)",
          ].map((p) => (
            <button
              key={p}
              onClick={() => switchPersona(p)}
              disabled={!!personaSwitchBusy}
              className="text-xs"
              style={{
                padding: "8px 14px",
                borderRadius: "var(--radius-pill)",
                border: `1px solid ${profile.persona === p ? "var(--color-accent-700)" : "var(--color-divider)"}`,
                background: profile.persona === p ? "color-mix(in srgb, var(--color-accent) 10%, transparent)" : "transparent",
                fontWeight: 600,
                color: "var(--color-text)",
                cursor: personaSwitchBusy ? "not-allowed" : "pointer",
                opacity: personaSwitchBusy && personaSwitchBusy !== p ? 0.5 : 1,
              }}
            >
              {personaSwitchBusy === p ? "Switching…" : p}
            </button>
          ))}
        </div>
      </Card>
      )}

      <DeleteAccountCard />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsPageInner />
    </Suspense>
  );
}
