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
// notification for anyone using the app -- see app/api/push/register and,
// server-side, lib/push.js (Phase 3, adds APNs sending -- registration here
// was already wired up in Phase 2, before APNs was). Until an Apple
// Developer org account is approved and an APNs key is configured (see
// .env.example's APNS_* block), lib/push.js's sendDepositAlertPush() stays a
// silent no-op and SMS alerts (if configured) keep working unchanged --
// this has always been additive, never a replacement.
//
// onNotificationTap is optional -- called with the deep-link path (e.g.
// "/dashboard") when someone taps a delivered push, so the caller can
// router.push() straight there instead of just opening the app cold. Every
// push lib/push.js sends includes a full dashboardUrl in its payload's
// top-level `url` field (see sendDepositAlertPush) -- this pulls the
// pathname back out so the caller doesn't need to parse it itself. Skipped
// entirely (never throws, never calls back) if the payload has no `url` or
// registration never got this far, e.g. on the web.
export async function registerForPushNotifications(onNotificationTap) {
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

    // Fires when someone taps a delivered notification (including one that
    // launched the app from cold/background) -- not when it's merely
    // received while foregrounded, which iOS shows as a banner on its own
    // without any of this code running.
    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      if (!onNotificationTap) return;
      const rawUrl = action?.notification?.data?.url;
      if (!rawUrl) return;
      try {
        onNotificationTap(new URL(rawUrl).pathname);
      } catch {
        // Malformed/unexpected url shape -- ignore rather than crash the
        // tap handler over a notification whose deep link didn't parse.
      }
    });
  } catch (err) {
    console.warn("[push] setup failed", err);
  }
}

// --- Apple In-App Purchase (Guideline 3.1.1 fix) ---------------------------
// Replaces the "visit prioritypay.co from a web browser to subscribe"
// placeholder that used to run on iOS (Stripe Checkout isn't allowed as the
// ONLY way to pay for a subscription sold through an iOS app -- see
// supabase/migrations/20261012_apple_iap.sql). Web/other platforms are
// completely unaffected -- they never call any of this, since isNativeApp()
// is false there and the Stripe checkout buttons still render as before.
//
// Uses RevenueCat (@revenuecat/purchases-capacitor) rather than talking to
// StoreKit directly -- it handles receipt validation and keeps
// simple_profiles in sync via its own webhook (app/api/revenuecat/webhook),
// the same role Stripe's webhook plays for web subscribers. See
// lib/revenuecat.js for the server-side half of this.
//
// RevenueCat's app_user_id is set to this app's own Supabase user id (the
// `userId` param below) so a RevenueCat subscriber IS a PriorityPay user --
// no separate id-mapping table needed, same reasoning as lib/revenuecat.js.
const PRODUCT_IDS = {
  simple: "co.prioritypay.simple.monthly",
  business: "co.prioritypay.business.monthly",
};

let purchasesConfigured = false;

// Configures the RevenueCat SDK once per app session (idempotent -- safe
// to call from both the onboarding payment step and Settings). Must run
// before purchaseProducts() or getOfferings() -- RevenueCat throws if used
// unconfigured.
async function configurePurchases(userId) {
  if (!(await isNativeApp())) return null;
  const { Purchases, LOG_LEVEL } = await import("@revenuecat/purchases-capacitor");
  if (!purchasesConfigured) {
    await Purchases.setLogLevel({ level: LOG_LEVEL.WARN });
    await Purchases.configure({
      apiKey: process.env.NEXT_PUBLIC_REVENUECAT_IOS_API_KEY,
      appUserID: userId,
    });
    purchasesConfigured = true;
  } else {
    // Someone could in theory hit this after switching accounts in the
    // same app session (sign out / sign in as someone else) -- logIn swaps
    // the active RevenueCat subscriber without needing a fresh configure().
    await Purchases.logIn({ appUserID: userId });
  }
  return Purchases;
}

// Rejects if `promise` hasn't settled within `ms`. Used only for the setup
// steps that precede Apple's purchase sheet (configure + product lookup),
// which can hang forever with no error when StoreKit/RevenueCat can't reach
// Apple -- the person would otherwise sit on "Processing..." indefinitely.
// Deliberately NOT applied to purchaseStoreProduct itself: people take as
// long as they like on Apple's own sheet.
function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Buys the given plan ("simple" or "business") via Apple In-App Purchase.
// Returns { ok: true } on success, { ok: false, cancelled: true } if the
// person dismissed Apple's purchase sheet (not an error -- callers should
// just silently stop, not show an error message), or { ok: false, error }
// for anything else. Does NOT touch simple_profiles itself -- the caller
// is expected to call POST /api/billing/iap/confirm right after, same
// "confirm immediately, don't wait for the webhook" pattern as the existing
// Stripe onboarding flow (app/api/onboarding/confirm-payment).
export async function purchasePlan(plan, userId) {
  if (!(await isNativeApp())) return { ok: false, error: "Not running in the iOS app." };
  try {
    const timeoutMsg = "Couldn't reach the App Store. Check your connection and try again.";
    const Purchases = await withTimeout(configurePurchases(userId), 20000, timeoutMsg);
    const productId = PRODUCT_IDS[plan];
    const { products } = await withTimeout(
      Purchases.getProducts({ productIdentifiers: [productId] }),
      20000,
      timeoutMsg
    );
    const product = products?.[0];
    if (!product) {
      return { ok: false, error: "This plan isn't available for purchase right now. Please try again shortly." };
    }
    await Purchases.purchaseStoreProduct({ product });
    return { ok: true };
  } catch (err) {
    // RevenueCat's Capacitor plugin sets userCancelled on the thrown error
    // when someone dismisses Apple's native purchase sheet themselves --
    // that's an expected, silent outcome, not a failure to surface.
    if (err?.userCancelled) return { ok: false, cancelled: true };
    console.warn("[iap] purchase failed", err);
    return { ok: false, error: err?.message || "Purchase failed. Please try again." };
  }
}

// Required by Apple Guideline 3.1.1 for any app selling auto-renewable
// subscriptions: a way to re-sync existing App Store purchases without
// paying again (reinstall, new device, or a purchase that didn't confirm
// server-side the first time). Re-syncs StoreKit's receipt with RevenueCat
// -- since RevenueCat's appUserID is already this user's Supabase id (see
// configurePurchases above), a prior purchase under this same account is
// usually already reflected, but this forces a fresh check with Apple
// rather than relying on cached state. Same return shape as purchasePlan()
// minus `cancelled` (restoring has nothing to cancel). Caller is expected
// to call POST /api/billing/iap/confirm right after, same as purchasePlan().
export async function restorePurchases(userId) {
  if (!(await isNativeApp())) return { ok: false, error: "Not running in the iOS app." };
  try {
    const Purchases = await configurePurchases(userId);
    const { customerInfo } = await Purchases.restorePurchases();
    const hasActiveEntitlement = Object.keys(customerInfo?.entitlements?.active || {}).length > 0;
    if (!hasActiveEntitlement) {
      return { ok: false, error: "No previous purchase found for this Apple ID." };
    }
    return { ok: true };
  } catch (err) {
    console.warn("[iap] restore failed", err);
    return { ok: false, error: err?.message || "Couldn't restore purchases. Please try again." };
  }
}
