"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BLOOM_TOKENS } from "@/lib/bloomTheme";
import PriorityPayLogo from "@/components/PriorityPayLogo";
import {
  isNativeApp,
  getBiometricLockEnabled,
  verifyBiometric,
  registerForPushNotifications,
  getPushPermissionStatus,
  openNotificationSettings,
} from "@/lib/native";

// Wraps every authenticated screen (see AppShell.js). On the web this is a
// pure pass-through -- isNativeApp() is false, so `locked` never becomes
// true and children render immediately, same as before this file existed.
//
// In the iOS app, if the person has turned on "Require Face ID to open app"
// (Settings, see the toggle wired through lib/native.js), this shows a lock
// screen on first mount AND every time the app returns to the foreground
// (App.addListener("appStateChange")) -- the same behavior banking apps use
// so a phone left unlocked on a table doesn't leave account data exposed.
// It does NOT touch the underlying Supabase session at all -- that's still
// the existing cookie-based auth (see lib/supabaseServer.js); this is only
// ever a local re-confirmation layer on top of it.
export default function AppLockGate({ children }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [notifDenied, setNotifDenied] = useState(false);
  const pushRegistered = useRef(false);

  const attemptUnlock = async () => {
    setVerifying(true);
    const ok = await verifyBiometric();
    setVerifying(false);
    setLocked(!ok);
  };

  // iOS only ever shows its own "Allow Notifications" dialog once per
  // install -- once someone taps "Don't Allow" there's no API to make that
  // dialog reappear, so calling requestPermissions() again on a later
  // launch just silently resolves "denied" with nothing shown. This is the
  // practical substitute for "keep asking every time until they allow":
  // re-check the actual OS permission status on every launch and every
  // foreground, and keep showing our own reminder (with a button straight
  // into Settings) for as long as it's still denied -- it disappears the
  // moment they flip it on and come back.
  const refreshNotifBanner = async () => {
    const status = await getPushPermissionStatus();
    setNotifDenied(status === "denied");
  };

  useEffect(() => {
    (async () => {
      const native = await isNativeApp();
      if (!native) {
        setReady(true);
        return;
      }

      if (!pushRegistered.current) {
        pushRegistered.current = true;
        // Deep-links to wherever the tapped notification points (currently
        // always /dashboard -- see sendDepositAlertPush in lib/push.js) --
        // this is a no-op today since APNs isn't configured yet (no key
        // means no pushes are ever actually delivered to tap), but it's
        // ready the moment that changes rather than needing a separate app
        // update just for tap handling.
        registerForPushNotifications((path) => router.push(path));
      }

      // Give registerForPushNotifications a moment to run its own
      // checkPermissions/requestPermissions flow above before reading the
      // status back out -- avoids briefly flashing the banner while the
      // very first native prompt is still on screen.
      setTimeout(refreshNotifBanner, 1500);

      const lockEnabled = await getBiometricLockEnabled();
      if (!lockEnabled) {
        setReady(true);
        return;
      }

      setReady(true);
      setLocked(true);
      await attemptUnlock();

      try {
        const { App } = await import("@capacitor/app");
        App.addListener("appStateChange", async ({ isActive }) => {
          if (!isActive) return;
          refreshNotifBanner();
          const stillEnabled = await getBiometricLockEnabled();
          if (stillEnabled) {
            setLocked(true);
            await attemptUnlock();
          }
        });
      } catch {
        // @capacitor/app not available -- lock still works on initial
        // launch, just skips the "re-lock on foreground" behavior.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Also re-check on foreground even when the biometric lock is off (the
  // listener above only gets set up when lockEnabled is true) -- this is
  // the one that catches someone flipping notifications on in Settings and
  // switching straight back to the app.
  useEffect(() => {
    (async () => {
      if (!(await isNativeApp())) return;
      try {
        const { App } = await import("@capacitor/app");
        const sub = await App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) refreshNotifBanner();
        });
        return () => sub.remove();
      } catch {
        // no-op
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) return null;

  if (locked) {
    return (
      <div
        style={{
          ...BLOOM_TOKENS,
          position: "fixed",
          inset: 0,
          zIndex: 100,
          background: "var(--color-bg)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 22,
          padding: 24,
          textAlign: "center",
        }}
      >
        <PriorityPayLogo size={26} />
        <p style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "color-mix(in srgb, var(--color-text) 70%, transparent)", margin: 0, maxWidth: 260 }}>
          {verifying ? "Confirming it's you…" : "Unlock PriorityPay to continue."}
        </p>
        {!verifying && (
          <button onClick={attemptUnlock} className="pp-btn pp-btn-primary" style={{ padding: "12px 26px" }}>
            Try again
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      {notifDenied && (
        <div
          style={{
            ...BLOOM_TOKENS,
            position: "sticky",
            top: 0,
            zIndex: 90,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "10px 16px",
            background: "var(--color-accent, #111)",
            color: "#fff",
            fontFamily: "var(--font-body)",
            fontSize: 13,
          }}
        >
          <span>Turn on notifications to get alerted the moment a deposit comes in.</span>
          <button
            onClick={openNotificationSettings}
            style={{
              flexShrink: 0,
              background: "rgba(255,255,255,0.16)",
              border: "none",
              borderRadius: 8,
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              padding: "6px 12px",
              cursor: "pointer",
            }}
          >
            Open Settings
          </button>
        </div>
      )}
      {children}
    </>
  );
}
