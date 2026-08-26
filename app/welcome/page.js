import WelcomeClient from "./WelcomeClient";

// Native-app-only landing screen -- see components/NativeHomeRedirect.js,
// which sends a logged-out visitor here instead of the marketing Homepage
// only when running inside the iOS app (Capacitor.isNativePlatform()). A
// direct web visit to /welcome renders the exact same thing; there's
// nothing native-specific about the page itself, only about how someone
// ends up here. Kept out of the sitemap/robots indexing since it's not a
// page meant to be found by search -- the equivalent web page is "/".
export const metadata = {
  title: "PriorityPay",
  robots: { index: false, follow: false },
};

export default function WelcomePage() {
  return <WelcomeClient />;
}
