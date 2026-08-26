// Thin wrapper around the Capacitor plugins added for the iOS app wrapper
// (see capacitor.config.json + ios/). Every function here is a safe no-op
// on the web (prioritypay.co in a regular browser) -- Capacitor.isNativePlatform()
// is false there, so none of this ever runs outside the actual iOS app.
// Keeping this in one file means the web app and the app share one codebase
// (per the "one codebase, one place to make changes" decision in the
// Capacitor scoping doc) with zero native-only imports leaking into pages
// that also render on the web.

let capacitorCore = null;
async function core() {
  if (!capacitorCore) capacitorCore = await import("@capacitor/core");
  return capacitorCore;
}

export async function isNativeApp() {
  if (typeof window === "undefined") return false;
  try {
    const { Capacitor } = await core();
    return Capacitor.isNativePlatform();
  } catch {
    // @capacitor/core not resolvable (e.g. this file got pulled into a
    // server bundle) -- treat as web, never let this throw.
    return false;
  }
}

// --- App-lock (Face ID / Touch ID) ---------------------------------------
// This is a LOCAL device gate, not a replacement for Supabase auth -- the
// person is already logged in (cookie session, unchanged) by the time this
// runs. It just re-confirms it's really them before showing account data,
// the same pattern most banking apps use for "unlock with Face ID" after
// the OS backgrounds/foregrounds the app. Preference key lives in
// @capacitor/preferences (device-local key/value storage), not the server,
// so turning it on/off never touches simple_profiles or any other table.
const LOCK_ENABLED_KEY = "pp_biometric_lock_enabled";

export async function getBiometricLockEnabled() {
  if (!(await isNativeApp())) return false;
  try {
    const { Preferences } = await import("@capacitor/preferences");
    const { value } = await Preferences.get({ key: LOCK_ENABLED_KEY });
    return value === "true";
  } catch {
    return false;
  }
}

export async function setBiometricLockEnabled(enabled) {
  if (!(await isNativeApp())) return;
  const { Preferences } = await import("@capacitor/preferences");
  await Preferences.set({ key: LOCK_ENABLED_KEY, value: enabled ? "true" : "false" });
}

// Returns { available, biometryType } -- used to only show the Settings
// toggle when the device actually has Face ID/Touch ID enrolled, instead of
// showing a switch that just fails when someone flips it.
export async function checkBiometricAvailable() {
  if (!(await isNativeApp())) return { available: false };
  try {
    const { NativeBiometric } = await import("capacitor-native-biometric");
    const result = await NativeBiometric.isAvailable();
    return { available: Boolean(result?.isAvailable), biometryType: result?.biometryType };
  } catch {
    return { available: false };
  }
}

// Prompts Face ID/Touch ID (falls back to device passcode automatically --
// that's OS behavior, not something this code controls) and resolves true/
// false. Never throws -- a cancelled or failed prompt just means "stay
// locked," handled by the caller (components/AppLockGate.js).
export async function verifyBiometric() {
  if (!(await isNativeApp())) return true;
  try {
    const { NativeBiometric } = await import("capacitor-native-biometric");
    await NativeBiometric.verifyIdentity({
      reason: "Unlock PriorityPay",
      title: "PriorityPay",
      subtitle: "Confirm it's you",
    });
    return true;
  } catch {
    return false;
  }
}

// --- Push notifications ---------------------------------------------------
// Replaces the Twilio SMS deposit alert (lib/sms.js) with a real push
// notification for anyone using the app -- see app/api/push/register.
// Registration only requests an iOS device token here; actually SENDING a
// push still needs an Apple Push Notification service key/cert, which is
// Phase 3 (App Store Connect) work, not something this sandbox can set up.
// Until that's wired server-side, SMS alerts keep working unchanged for
// everyone -- this is additive, not a replacement, until Phase 3 lands.
export async function registerForPushNotifications() {
  if (!(await isNativeApp())) return;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const permStatus = await PushNotifications.checkPermissions();
    let granted = permStatus.receive === "granted";
    if (!granted) {
      const req = await PushNotifications.requestPermissions();
      granted = req.receive === "granted";
    }
    if (!granted) return;

    await PushNotifications.register();

    PushNotifications.addListener("registration", async (token) => {
      try {
        await fetch("/api/push/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: token.value, platform: "ios" }),
        });
      } catch {
        // Best-effort -- a failed registration just means this device
        // won't get pushes yet; SMS alerts (if configured) still work.
      }
    });

    PushNotifications.addListener("registrationError", (err) => {
      console.warn("[push] registration failed", err);
    });
  } catch (err) {
    console.warn("[push] setup failed", err);
  }
}
