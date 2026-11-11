"use client";

import { Suspense, useEffect, useState } from "react";
import { SOLE_PROP, drawNote } from "@/lib/entityCopy";
import EntityPicker from "@/components/EntityPicker";
import { useSearchParams } from "next/navigation";
import { Card, PrimaryButton, GhostButton } from "@/components/ui";
import { bloomInputStyle, bloomWarningCardStyle, bloomNoticeCardStyle } from "@/lib/bloomTheme";
import MfaSettings from "@/components/MfaSettings";
import AppLockSettingsCard from "@/components/AppLockSettingsCard";
import DeleteAccountCard from "@/components/DeleteAccountCard";
import CancelSubscriptionCard from "@/components/CancelSubscriptionCard";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { isNativeApp, purchasePlan, restorePurchases } from "@/lib/native";
import SubscriptionDisclosure from "@/components/SubscriptionDisclosure";

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

  // Apple Guideline 3.1.1: starting a NEW paid subscription from inside the
  // native app has to go through Apple's In-App Purchase (purchasePlan() in
  // lib/native.js), not a Stripe checkout redirect -- so the Subscribe/
  // Upgrade buttons below call that instead when running natively.
  // Managing or canceling an EXISTING subscription is a different question
  // (handled by the subscriptionSource-based branches further down) and
  // stays untouched here.
  const [isNative, setIsNative] = useState(false);
  useEffect(() => {
    isNativeApp().then(setIsNative);
  }, []);
  const [userId, setUserId] = useState(null);
  useEffect(() => {
    supabaseBrowser()
      .auth.getUser()
      .then(({ data }) => setUserId(data?.user?.id || null));
  }, []);
  const [billingError, setBillingError] = useState("");

  useEffect(() => {
    supabaseBrowser()
      .auth.getUser()
      .then(({ data }) => {
        const email = (data?.user?.email || "").toLowerCase();
        setCanSwitchPersona(DEV_TESTING_EMAILS.has(email));
      });
  }, []);

  // PHASE V: shared by the initial load and by CancelSubscriptionCard's
  // onChanged callback (after canceling/resuming/accepting the retention
  // offer) so Settings reflects the new billing.cancelAtPeriodEnd/
  // currentPeriodEnd/retentionOfferUsed without a full page reload.
  const loadProfile = () => fetch("/api/profile").then((r) => r.json()).then((d) => {
    setProfile(d.profile);
    setLoading(false);
  });

  useEffect(() => {
    loadProfile();
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

  // Native counterpart to subscribe() -- buys the Simple plan through
  // Apple In-App Purchase (purchasePlan() in lib/native.js) instead of a
  // Stripe Checkout redirect, then confirms with RevenueCat via
  // /api/billing/iap/confirm (no onboarding flag here -- this is an
  // existing account upgrading from read-only, not the onboarding flow).
  const subscribeNative = async () => {
    setBillingBusy(true);
    setBillingError("");
    const purchase = await purchasePlan("simple", userId);
    if (!purchase.ok) {
      setBillingBusy(false);
      if (!purchase.cancelled) setBillingError(purchase.error || "Purchase failed. Please try again.");
      return;
    }
    try {
      const res = await fetch("/api/billing/iap/confirm", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setBillingError(data.error || "Your purchase went through, but we couldn't confirm it yet. Please try again.");
        setBillingBusy(false);
        return;
      }
    } catch {
      setBillingError("Your purchase went through, but we couldn't confirm it yet. Please try again.");
      setBillingBusy(false);
      return;
    }
    await loadProfile();
    setBillingBusy(false);
  };

  const manageBilling = async () => {
    setBillingBusy(true);
    setBillingError("");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setBillingError(data.error || "Could not open the billing portal.");
    } catch {
      setBillingError("Could not open the billing portal.");
    }
    setBillingBusy(false);
  };

  // PHASE T: start the Business-plan Stripe checkout. Separate Price/route
  // from subscribe() above (see /api/billing/business-checkout). On success
  // Stripe returns to /settings?billing=success and the webhook flips
  // plan -> business, which is what makes the Business nav item + /business
  // hub appear.
  const upgradeToBusiness = async () => {
    setBillingBusy(true);
    const res = await fetch("/api/billing/business-checkout", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setBillingBusy(false);
  };

  // Native counterpart to upgradeToBusiness() -- same Apple IAP path as
  // subscribeNative(), buying the Business product id instead.
  const upgradeToBusinessNative = async () => {
    setBillingBusy(true);
    setBillingError("");
    const purchase = await purchasePlan("business", userId);
    if (!purchase.ok) {
      setBillingBusy(false);
      if (!purchase.cancelled) setBillingError(purchase.error || "Purchase failed. Please try again.");
      return;
    }
    try {
      const res = await fetch("/api/billing/iap/confirm", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setBillingError(data.error || "Your purchase went through, but we couldn't confirm it yet. Please try again.");
        setBillingBusy(false);
        return;
      }
    } catch {
      setBillingError("Your purchase went through, but we couldn't confirm it yet. Please try again.");
      setBillingBusy(false);
      return;
    }
    await loadProfile();
    setBillingBusy(false);
  };

  // Required by Apple Guideline 3.1.1 -- someone who reinstalled the app or
  // signed back in should be able to pick their existing subscription back
  // up here without paying again. Mirrors subscribeNative()'s shape but
  // calls restorePurchases() (lib/native.js) instead of purchasePlan().
  const restoreNative = async () => {
    setBillingBusy(true);
    setBillingError("");
    const restored = await restorePurchases(userId);
    if (!restored.ok) {
      setBillingBusy(false);
      setBillingError(restored.error || "Couldn't restore purchases. Please try again.");
      return;
    }
    try {
      const res = await fetch("/api/billing/iap/confirm", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setBillingError(data.error || "We found a purchase but couldn't confirm it yet. Please try again.");
        setBillingBusy(false);
        return;
      }
    } catch {
      setBillingError("We found a purchase but couldn't confirm it yet. Please try again.");
      setBillingBusy(false);
      return;
    }
    await loadProfile();
    setBillingBusy(false);
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
            Subscription started. Thanks for subscribing to PrioritySave.
          </p>
        )}
        {billingRedirect === "cancelled" && (
          <p style={{ fontSize: 14, color: "color-mix(in srgb, var(--color-text) 60%, transparent)", marginBottom: 16 }}>
            Checkout cancelled. No charge was made.
          </p>
        )}

        {isActive ? (
          <>
            <p style={{ fontSize: 15, margin: "0 0 16px" }}>
              You&apos;re subscribed to PrioritySave{billing.isBusiness ? " Business" : ""}:{" "}
              <strong>
                {billing.subscriptionSource === "apple"
                  ? billing.isBusiness ? "$39.99/month" : "$12.99/month"
                  : billing.isBusiness ? "$39.99/month" : "$12.99/month"}
              </strong>
              .
            </p>
            {billing.subscriptionSource === "apple" ? (
              // Apple doesn't let a third party manage or cancel an IAP
              // subscription on a subscriber's behalf (no Stripe portal
              // equivalent) -- point them at the one place that can,
              // whether they're on native or checking from the web.
              <p style={{ fontSize: 14, margin: 0, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                Subscribed through Apple. To manage or cancel, go to iOS Settings &gt; Apple ID &gt; Subscriptions.
              </p>
            ) : (
              <>
                <PrimaryButton onClick={manageBilling} disabled={billingBusy}>
                  {billingBusy ? "Loading…" : "Manage billing"}
                </PrimaryButton>
                {billingError && (
                  <p style={{ fontSize: 13, color: "#C0392B", margin: "8px 0 0" }}>{billingError}</p>
                )}
                <CancelSubscriptionCard
                  cancelAtPeriodEnd={billing.cancelAtPeriodEnd}
                  currentPeriodEnd={billing.currentPeriodEnd}
                  retentionOfferUsed={billing.retentionOfferUsed}
                  formatDate={formatDate}
                  onChanged={loadProfile}
                />
              </>
            )}
          </>
        ) : billing.readOnly ? (
          <>
            <div className="text-sm" style={{ ...bloomWarningCardStyle(), padding: 16, margin: "0 0 16px" }}>
              Your 30-day free trial ended{billing.trialEndsAt ? ` on ${formatDate(billing.trialEndsAt)}` : ""}.
              You can still see your split rules and history, but connecting new accounts and moving money are
              paused until you subscribe.
            </div>
            <PrimaryButton onClick={isNative ? subscribeNative : subscribe} disabled={billingBusy}>
              {billingBusy ? "Loading…" : "Subscribe ($12.99/month)"}
            </PrimaryButton>
            <SubscriptionDisclosure plan="simple" isNative={isNative} />
            {billingError && (
              <p style={{ fontSize: 13, color: "#C0392B", margin: "8px 0 0" }}>{billingError}</p>
            )}
            {isNative && (
              <button
                type="button"
                onClick={restoreNative}
                disabled={billingBusy}
                style={{ display: "block", marginTop: 10, background: "none", border: "none", color: "var(--color-accent-700)", textDecoration: "underline", fontSize: 13, cursor: "pointer", padding: 0 }}
              >
                Restore Purchases
              </button>
            )}
          </>
        ) : (
          <>
            <div className="text-sm" style={{ ...bloomNoticeCardStyle(), padding: 16, margin: "0 0 16px" }}>
              {remaining === null
                ? "You're on PrioritySave's 30-day free trial."
                : `${remaining} day${remaining === 1 ? "" : "s"} left in your free trial`}
              {billing.trialEndsAt ? ` (ends ${formatDate(billing.trialEndsAt)})` : ""}.{" "}
              $12.99/month after that.
            </div>
            <PrimaryButton onClick={isNative ? subscribeNative : subscribe} disabled={billingBusy}>
              {billingBusy ? "Loading…" : "Subscribe now"}
            </PrimaryButton>
            <SubscriptionDisclosure plan="simple" isNative={isNative} />
            {billingError && (
              <p style={{ fontSize: 13, color: "#C0392B", margin: "8px 0 0" }}>{billingError}</p>
            )}
            {isNative && (
              <button
                type="button"
                onClick={restoreNative}
                disabled={billingBusy}
                style={{ display: "block", marginTop: 10, background: "none", border: "none", color: "var(--color-accent-700)", textDecoration: "underline", fontSize: 13, cursor: "pointer", padding: 0 }}
              >
                Restore Purchases
              </button>
            )}
          </>
        )}

        {/* The Business hub page is hidden for now (/business redirects to the
            dashboard), so the pointer to it is hidden too. Existing Business
            subscribers still see their plan line above. */}
      </Card>

      <MfaSettings />

      <Card className="p-6" style={{ maxWidth: "40em" }}>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 400, margin: "0 0 6px" }}>How your business is set up</h2>
        <div style={{ height: 1, background: "var(--color-divider)", marginBottom: 16 }} />
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "color-mix(in srgb, var(--color-text) 68%, transparent)", margin: "0 0 16px" }}>
          This decides whether PrioritySave splits every deposit (sole proprietors) or each owner&apos;s draw
          (LLCs, partnerships and corporations). Select every kind of business you have.
        </p>
        <EntityPicker
          value={profile.entityType || SOLE_PROP}
          onChange={(v) => {
            setSaved(false);
            setProfile((p) => ({ ...p, entityType: v }));
          }}
        />
        {drawNote(profile.entityType) && (
          <p style={{ fontSize: 13.5, lineHeight: 1.65, color: "color-mix(in srgb, var(--color-text) 70%, transparent)", margin: "10px 0 0" }}>
            {drawNote(profile.entityType)}
          </p>
        )}
      </Card>

      <Card className="p-6" style={{ maxWidth: "40em" }}>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 400, margin: "0 0 6px" }}>Deposit splitting</h2>
        <div style={{ height: 1, background: "var(--color-divider)", marginBottom: 16 }} />
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "color-mix(in srgb, var(--color-text) 68%, transparent)", margin: "0 0 20px" }}>
          Deposits below this amount (a refund, a reimbursement) won&apos;t trigger a split at all. $100 is the
          lowest you can set it.
        </p>
      </Card>

      <Card className="p-6" style={{ maxWidth: "40em" }}>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 400, margin: "0 0 6px" }}>How often should we notify you?</h2>
        <div style={{ height: 1, background: "var(--color-divider)", marginBottom: 16 }} />
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "color-mix(in srgb, var(--color-text) 68%, transparent)", margin: "0 0 16px" }}>
          Applies to text, email and app notifications. Deposits under your minimum deposit above never send a notification.
        </p>
        {[
          { value: "instant", label: "Each time a deposit arrives", hint: "The moment it lands, with a link to your split checklist." },
          { value: "weekly", label: "One summary each week", hint: "A single message every Monday listing the deposits still waiting to be split. Nothing is sent if nothing is waiting." },
        ].map((o) => (
          <label key={o.value} className="flex items-start gap-2.5" style={{ marginBottom: 14, cursor: "pointer" }}>
            <input
              type="radio"
              name="notification-frequency"
              checked={(profile.notifications?.frequency || "instant") === o.value}
              onChange={() => {
                setSaved(false);
                setProfile((p) => ({ ...p, notifications: { ...p.notifications, frequency: o.value } }));
              }}
              style={{ width: 16, height: 16, marginTop: 3 }}
            />
            <span>
              <span style={{ fontSize: 15, fontWeight: 600, display: "block" }}>{o.label}</span>
              <span style={{ fontSize: 13, lineHeight: 1.5, color: "color-mix(in srgb, var(--color-text) 60%, transparent)" }}>{o.hint}</span>
            </span>
          </label>
        ))}
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
          that persona&apos;s defaults, so there's no need to sign up a second account to see how Dashboard, Close Out, and
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
