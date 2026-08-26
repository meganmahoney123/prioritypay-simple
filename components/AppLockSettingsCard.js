"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { isNativeApp, checkBiometricAvailable, getBiometricLockEnabled, setBiometricLockEnabled } from "@/lib/native";

// Renders nothing on the web (prioritypay.co in a browser) and nothing on a
// device without Face ID/Touch ID enrolled -- only shows up inside the iOS
// app, on a device that can actually use it. This toggle is entirely
// device-local (see lib/native.js) -- it doesn't touch simple_profiles or
// any other server-side setting, so it has nothing to "Save" and no loading
// state tied to the rest of this page's profile fetch.
export default function AppLockSettingsCard() {
  const [visible, setVisible] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const native = await isNativeApp();
      if (!native) return;
      const { available } = await checkBiometricAvailable();
      if (!available) return;
      setVisible(true);
      setEnabled(await getBiometricLockEnabled());
    })();
  }, []);

  if (!visible) return null;

  const toggle = async (checked) => {
    setBusy(true);
    await setBiometricLockEnabled(checked);
    setEnabled(checked);
    setBusy(false);
  };

  return (
    <Card className="p-6" style={{ maxWidth: "40em" }}>
      <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 400, margin: "0 0 6px" }}>App lock</h2>
      <div style={{ height: 1, background: "var(--color-divider)", marginBottom: 16 }} />
      <p style={{ fontSize: 14, lineHeight: 1.6, color: "color-mix(in srgb, var(--color-text) 68%, transparent)", margin: "0 0 20px" }}>
        Require Face ID or Touch ID to open PriorityPay, in addition to your regular login. This only protects
        this device — it never changes how you sign in on the web.
      </p>
      <label className="flex items-center gap-2.5" style={{ cursor: busy ? "wait" : "pointer" }}>
        <input
          type="checkbox"
          checked={enabled}
          disabled={busy}
          onChange={(e) => toggle(e.target.checked)}
          style={{ width: 16, height: 16 }}
        />
        <span style={{ fontSize: 15 }}>Require Face ID / Touch ID to open the app</span>
      </label>
    </Card>
  );
}
