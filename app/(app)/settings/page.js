"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, PrimaryButton, GhostButton } from "@/components/ui";
import { bloomInputStyle, bloomWarningCardStyle, bloomNoticeCardStyle } from "@/lib/bloomTheme";
import MfaSettings from "@/components/MfaSettings";
import AppLockSettingsCard from "@/components/AppLockSettingsCard";
import DeleteAccountCard from "@/components/DeleteAccountCard";
import CancelSubscriptionCard from "@/components/CancelSubscriptionCard";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { isNativeApp } from "@/lib/native";
import { PERSONA_SELF_EMPLOYED, PERSONA_BUSINESS_OWNER, PERSONA_W2_WITH_SIDE_HUSTLE } from "@/lib/allocations";

// The Business upsell (below) only makes sense for personas that actually
// run a business/side income -- a plain W2 employee with no side hustle
// (PERSONA_W2_NO_SIDE_HUSTLE, deliberately left out of this set) has
// nothing for separate-entity tracking or QuickBooks sync to apply to.
const BUSINESS_UPGRADE_PERSONAS = new Set([PERSONA_SELF_EMPLOYED, PERSONA_BUSINESS_OWNER, PERSONA_W2_WITH_SIDE_HUSTLE]);

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
  const [billingError, setBillingError] = useState("");
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
  // native app has to go through Apple's In-App Purchase, not a Stripe
  // checkout redirect -- so the Subscribe/Upgrade buttons below only render
  // on the web. Managing or canceling an EXISTING subscription (below) is
  // fine natively and stays untouched.
  const [isNative, setIsNative] = useState(false);
  useEffect(() => {
    isNativeApp().then(setIsNative);
  }, []);

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
      {/* Feeds the Dashboard's "Good morning/afternoon/evening, <name>"
          greeting (see app/(app)/dashboard/page.js) -- optional, and left
          blank the Dashboard just guesses a first name from the account's
          login email instead (see supabase/migrations/
          20260926_profile_display_name.sql). */}
      <Card className="p-6" style={{ maxWidth: "40em" }}>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 400, margin: "0 0 6px" }}>Your name</h2>
        <div style={{ height: 1, background: "var(--color-divider)", marginBottom: 16 }} />
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "color-mix(in srgb, var(--color-text) 68%, transparent)", margin: "0 0 20px" }}>
          Used for the greeting on your Dashboard. Optional -- leave it blank and we'll guess a first name from
          your account email instead.
        </p>
        <div style={{ maxWidth: 280 }}>
          <label
            style={{ display: "block", fontFamily: "var(--font-heading)", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 60%, transparent)", marginBottom: 10 }}
          >
            Name
          </label>
          <input
            type="text"
            value={profile.displayName || ""}
            onChange={(e) => {
              setSaved(false);
              setProfile((p) => ({ ...p, displayName: e.target.value }));
            }}
            placeholder="e.g. Megan"
            style={bloomInputStyle({ fontSize: 16, padding: "11px 2px" })}
          />
        </div>
      </Card>

      <Card className="p-6" style={{ maxWidth: "40em" }}>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 400, margin: "0 0 6px" }}>Billing</h2>
        <div style={{ height: 1, background: "var(--color-divider)", marginBottom: 20 }} />

        {billingRedirect === "success" && (
          <p style={{ fontSize: 14, color: "var(--color-accent-700)", marginBottom: 16 }}>
            Subscription started, thanks for subscribing to PriorityPay.
          </p>
        )}
        {billingRedirect === "cancelled" && (
          <p style={{ fontSize: 14, color: "color-mix(in srgb, var(--color-text) 60%, transparent)", marginBottom: 16 }}>
            Checkout cancelled, no charge was made.
          </p>
        )}

        {isActive ? (
          <>
            <p style={{ fontSize: 15, margin: "0 0 16px" }}>
              You&apos;re subscribed to PriorityPay, <strong>$12/month</strong>.
            </p>
            {/* Wrapped in its own block (rather than letting the button
                sit inline right before CancelSubscriptionCard's "Cancel
                subscription" link) so the two never crowd onto the same
                line -- previously they were adjacent inline-level elements
                with only a few px between them. */}
            <div style={{ marginBottom: 4 }}>
              <PrimaryButton onClick={manageBilling} disabled={billingBusy}>
                {billingBusy ? "Loading…" : "Manage billing"}
              </PrimaryButton>
            </div>
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
        ) : billing.readOnly ? (
          <>
            <div className="text-sm" style={{ ...bloomWarningCardStyle(), padding: 16, margin: "0 0 16px" }}>
              Your 30-day free trial ended{billing.trialEndsAt ? ` on ${formatDate(billing.trialEndsAt)}` : ""}.
              You can still see your split rules and history, but connecting new accounts and moving money are
              paused until you subscribe.
            </div>
            {isNative ? (
              <p style={{ fontSize: 14, margin: 0, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                To subscribe, visit prioritypay.co from a web browser.
              </p>
            ) : (
              <PrimaryButton onClick={subscribe} disabled={billingBusy}>
                {billingBusy ? "Loading…" : "Subscribe, $12/month"}
              </PrimaryButton>
            )}
          </>
        ) : (
          <>
            <div className="text-sm" style={{ ...bloomNoticeCardStyle(), padding: 16, margin: "0 0 16px" }}>
              {remaining === null
                ? "You're on PriorityPay's 30-day free trial."
                : `${remaining} day${remaining === 1 ? "" : "s"} left in your free trial`}
              {billing.trialEndsAt ? ` (ends ${formatDate(billing.trialEndsAt)})` : ""}. $12/month after that.
            </div>
            {isNative ? (
              <p style={{ fontSize: 14, margin: 0, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                To subscribe, visit prioritypay.co from a web browser.
              </p>
            ) : (
              <PrimaryButton onClick={subscribe} disabled={billingBusy}>
                {billingBusy ? "Loading…" : "Subscribe now"}
              </PrimaryButton>
            )}
          </>
        )}

        {/* PHASE T: Business-tier upsell / status. The /business nav item is
            hidden for Simple-plan users, so this is their entry point to
            upgrade; Business-plan users get a pointer to the hub instead.
            The upsell itself (not the "you're already on Business" status,
            which stays visible no matter what -- someone who already paid
            for it should always see how to manage it) is gated to personas
            that actually have a business/side income to apply it to; see
            BUSINESS_UPGRADE_PERSONAS above. */}
        {(billing.isBusiness || BUSINESS_UPGRADE_PERSONAS.has(profile.persona)) && (
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--color-divider)" }}>
            {billing.isBusiness ? (
              <p style={{ fontSize: 14, margin: 0 }}>
                You&apos;re on the <strong>Business</strong> plan. Manage businesses and QuickBooks from the{" "}
                <a href="/business" style={{ color: "var(--color-accent-700)" }}>Business</a> page.
              </p>
            ) : (
              <>
                <p style={{ fontSize: 14, margin: "0 0 12px" }}>
                  Running multiple businesses? <strong>PriorityPay Business</strong> adds separate entities, QuickBooks
                  sync, and a monthly profit true-up.
                </p>
                {isNative ? (
                  <p style={{ fontSize: 14, margin: 0, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                    To upgrade, visit prioritypay.co from a web browser.
                  </p>
                ) : (
                  <GhostButton onClick={upgradeToBusiness} disabled={billingBusy}>
                    {billingBusy ? "Loading…" : "Upgrade to Business"}
                  </GhostButton>
                )}
              </>
            )}
          </div>
        )}
      </Card>

      <MfaSettings />

      <Card className="p-6" style={{ maxWidth: "40em" }}>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 400, margin: "0 0 6px" }}>Deposit splitting</h2>
        <div style={{ height: 1, background: "var(--color-divider)", marginBottom: 16 }} />
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "color-mix(in srgb, var(--color-text) 68%, transparent)", margin: "0 0 20px" }}>
          Deposits below this amount (a refund, a reimbursement) won&apos;t trigger a split at all, $100 is the
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

      {/* PHASE W: restored (see supabase/schema.sql PHASE W) as a genuine
          opt-in checkbox -- unchecked/off by default, matching the
          sms_notifications_enabled column default, per the toll-free
          verification opt-in workflow submitted to Telnyx. This
          intentionally does NOT restore the old "on by default" copy/
          behavior from PHASE M -- a carrier requires an affirmative,
          unchecked-until-clicked opt-in, not a default-on toggle. */}
      <Card className="p-6" style={{ maxWidth: "40em" }}>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 400, margin: "0 0 6px" }}>Deposit text alerts</h2>
        <div style={{ height: 1, background: "var(--color-divider)", marginBottom: 16 }} />
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "color-mix(in srgb, var(--color-text) 68%, transparent)", margin: "0 0 20px" }}>
          PriorityPay texts you the moment a qualifying deposit lands, with a link straight to your split
          checklist. Off by default, check the box and add your number below to turn it on. Msg &amp; data
          rates may apply. Reply STOP to opt out, HELP for help.
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
        {!!profile.notifications?.smsEnabled && (
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
        )}
      </Card>

      <Card className="p-6" style={{ maxWidth: "40em" }}>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 400, margin: "0 0 6px" }}>Deposit email alerts</h2>
        <div style={{ height: 1, background: "var(--color-divider)", marginBottom: 16 }} />
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "color-mix(in srgb, var(--color-text) 68%, transparent)", margin: "0 0 20px" }}>
          PriorityPay emails you the moment a qualifying deposit lands, with a link straight to your split
          checklist, sent to your account email, on by default, and you can turn it off anytime.
        </p>
        {/* New sending domains often get their first few emails filtered to
            spam by Gmail/Outlook regardless of correct SPF/DKIM setup --
            this is a known, common cold-start pattern, not a sign
            something's broken. Marking one "Not spam" is the fastest way
            for an individual recipient to fix it going forward, so we
            surface that here rather than leaving people to stumble onto
            their spam folder on their own (see the deposit-alert-email
            spam report in user feedback, Sep 2026). */}
        <div className="text-sm" style={{ ...bloomNoticeCardStyle(), padding: 14, margin: "0 0 20px" }}>
          Tip: the first alert email sometimes lands in spam while your provider learns PriorityPay is a real
          sender. If you don&apos;t see it in your inbox, check spam and mark it &quot;Not spam&quot; — that
          teaches your inbox to deliver future ones normally.
        </div>
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
        {!!profile.notifications?.emailEnabled && (
          <div style={{ maxWidth: 340, marginBottom: 20 }}>
            <label
              style={{ display: "block", fontFamily: "var(--font-heading)", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 60%, transparent)", marginBottom: 10 }}
            >
              Send alerts to
            </label>
            <input
              type="email"
              // Shows the account's real login email as a visible default
              // the moment alertEmail is unset, instead of leaving the box
              // blank while the backend secretly falls back to the same
              // address (see GET /api/profile) -- someone should be able to
              // SEE where alerts are going without already knowing that
              // fact from the caption below. Still fully editable; typing
              // a different address here is what actually sets alertEmail.
              value={profile.notifications?.alertEmail ?? profile.email ?? ""}
              onChange={(e) => {
                setSaved(false);
                setProfile((p) => ({ ...p, notifications: { ...p.notifications, alertEmail: e.target.value } }));
              }}
              placeholder="you@example.com"
              style={bloomInputStyle({ fontSize: 16, padding: "11px 2px" })}
            />
            <p style={{ fontSize: 13, lineHeight: 1.6, color: "color-mix(in srgb, var(--color-text) 60%, transparent)", margin: "8px 0 0" }}>
              Defaults to your account email, shown above. Change it if you&apos;d rather alerts go somewhere else,
              like a bookkeeper or assistant&apos;s inbox.
            </p>
          </div>
        )}
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
          that persona&apos;s defaults, no need to sign up a second account to see how Dashboard, Close Out, and
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
