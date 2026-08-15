// Quick-connect shortcuts for the fintech apps money most often lands in.
// Shared between onboarding's Connect Accounts step and the ongoing
// Accounts tab, so someone isn't limited to adding Venmo/PayPal/Cash App
// only during initial signup -- they can add more of these any time from
// inside the dashboard too. Zelle isn't included on purpose -- it has no
// account/routing number of its own, it's a feature layered onto whatever
// bank account someone already registered with it, so there's nothing for
// Plaid to connect to.
export const APP_CONNECT_OPTIONS = [
  { key: "paypal", name: "PayPal", color: "#0070ba", hoverColor: "#005ea6" },
  { key: "venmo", name: "Venmo", color: "#3D95CE", hoverColor: "#2f7dad" },
  { key: "cashapp", name: "Cash App", color: "#00D632", hoverColor: "#00b82b" },
];
