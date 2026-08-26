"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, PrimaryButton } from "@/components/ui";
import { bloomInputStyle, bloomSelectStyle, bloomWarningCardStyle, bloomNoticeCardStyle } from "@/lib/bloomTheme";
import MfaSettings from "@/components/MfaSettings";
import AppLockSettingsCard from "@/components/AppLockSettingsCard";
import DeleteAccountCard from "@/components/DeleteAccountCard";

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
              style={bloomInputStyle({ fontSize: 16, padding: "11px 2px" })}
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
              style={bloomSelectStyle({ fontSize: 16, padding: "11px 2px" })}
            >
              <option>Sole proprietor / freelancer</option>
              <option>LLC</option>
              <option>S-Corp</option>
              <option>C-Corp</option>
            </select>
          </div>
        </div>
        {profile.entityType && profile.entityType !== "Sole proprietor / freelancer" && (
          <p style={{ marginTop: 20, fontSize: 13.5, color: "var(--color-neutral-700)" }}>
            Running a separate entity means PriorityPay only sees your personal accounts, not your real business
            numbers. <a href="/business-financials" style={{ color: "var(--color-accent-700)", fontWeight: 600 }}>Add your business financials</a> so
            your Tax Summary and reserve calculations reflect the complete picture.
          </p>
        )}
      </Card>

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

      <Card className="p-6" style={{ maxWidth: "40em" }}>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 400, margin: "0 0 6px" }}>Deposit text alerts</h2>
        <div style={{ height: 1, background: "var(--color-divider)", marginBottom: 16 }} />
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "color-mix(in srgb, var(--color-text) 68%, transparent)", margin: "0 0 20px" }}>
          PriorityPay texts you the moment a qualifying deposit lands, with a link straight to your split
          checklist — this is on by default once you add a phone number below, since it&apos;s how you&apos;ll
          know there&apos;s something waiting on you, but you can turn it off anytime.
        </p>
        <label className="flex items-center gap-2.5" style={{ marginBottom: 20, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={!!profile.notifications?.smsEnabled}
            onChange={(e) => {
              setSaved(false);
              setProfile((p) => ({ ...p, notifications: { ...p.notifications, smsEnabled: e.target.checked } }));
            }}
            style={{ width: 16, height: 16 }}
          />
          <span style={{ fontSize: 15 }}>Text me when a deposit crosses my threshold</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label
              style={{ display: "block", fontFamily: "var(--font-heading)", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 60%, transparent)", marginBottom: 10 }}
            >
              Phone number
            </label>
            <input
              type="tel"
              placeholder="+15551234567"
              value={profile.notifications?.phoneNumber || ""}
              onChange={(e) => {
                setSaved(false);
                setProfile((p) => ({ ...p, notifications: { ...p.notifications, phoneNumber: e.target.value } }));
              }}
              style={bloomInputStyle({ fontSize: 16, padding: "11px 2px" })}
            />
          </div>
          <div>
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
        </div>
      </Card>

      <AppLockSettingsCard />

      <div className="flex items-center gap-4">
        <PrimaryButton onClick={save}>Save</PrimaryButton>
        {saved && <span style={{ fontFamily: "var(--font-heading)", fontSize: 14, fontStyle: "italic", color: "var(--color-accent-700)" }}>Saved.</span>}
      </div>

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
