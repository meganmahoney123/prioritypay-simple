"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isNativeApp } from "@/lib/native";

// Implements the free/paid app split described in the Aug 2026 planning doc:
// the iOS app is the same webview as the website (capacitor.config.json's
// server.url points at prioritypay.co with no startPath), so a logged-out
// visitor normally lands on the marketing Homepage -- fine for the web, but
// an App Store reviewer (or a curious first-time app user) doesn't need
// marketing copy, they need something to actually try. This renders nothing
// on the web (isNativeApp() resolves false there, so it's a no-op) and, on
// native only, immediately routes a logged-out user to /welcome -- a small
// branded screen (app/welcome) offering the free public money simulator (no
// login, no Plaid, no account required) or a log in link for existing paid
// users. Real interactive functionality behind that first screen is also
// what keeps the app from reading as a bare "brochureware" wrapper for
// Apple review purposes.
//
// This only ever mounts alongside Homepage (see app/page.js), which itself
// only renders for logged-out users -- a signed-in user on native gets
// redirected server-side to /dashboard or /onboarding before this ever has
// a chance to run, so there's no risk of yanking a paid user back to the
// welcome screen.
export default function NativeHomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    isNativeApp().then((native) => {
      if (native && !cancelled) {
        router.replace("/welcome");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
