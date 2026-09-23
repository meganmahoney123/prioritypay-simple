// Single source of truth for how PriorityPay handles transfers: it only
// calculates the split and tells the user exactly what to send, where --
// it never originates a real bank transfer itself. Kept as its own
// exported constant (rather than a hardcoded literal in each caller) so
// every place that currently checks `EXECUTION_MODE === "manual_approval"`
// (lib/runSplit.js, the Plaid link-token routes, etc.) keeps working
// exactly as it already does, and so this is the one place to change if
// that ever needs to become configurable again.
//
// Pulled into its own tiny module (rather than living only inside
// runSplit.js) so lightweight route handlers -- the Plaid link-token
// routes, exchange-public-token -- can check it without pulling in
// runSplit's heavier allocations/sms imports.
export const TRANSFER_EXECUTION_MODE = "manual_approval";
