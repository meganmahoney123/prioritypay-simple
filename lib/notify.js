// Non-blocking replacement for window.alert(): shows a toast (see
// components/Toaster.js, mounted once in the root layout).
export function notify(message) {
  if (typeof window === "undefined" || !message) return;
  window.dispatchEvent(new CustomEvent("ps-toast", { detail: String(message) }));
}
