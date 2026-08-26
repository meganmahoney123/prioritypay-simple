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
  const pushRegistered = useRef(false);

  const attemptUnlock = async () => {
    setVerifying(true);
    const ok = await verifyBiometric();
    setVerifying(false);
    setLocked(!ok);
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

  if (!ready) return null;

  if (!locked) return children;

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
