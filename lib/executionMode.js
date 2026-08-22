// Single source of truth for whether PriorityPay originates real Dwolla
// transfers ('dwolla_auto') or only calculates the split and tells the user
// what to send themselves ('manual_approval', the default -- see
// lib/runSplit.js for the full explanation of why this mode exists).
//
// Pulled into its own tiny module (rather than living only inside
// runSplit.js) so lightweight route handlers -- the Plaid link-token routes,
// exchange-public-token -- can check it without pulling in runSplit's
// heavier Dwolla/allocations/sms imports.
//
// This also drives a real cost decision: Plaid's Auth product ($1.50 per
// account, one-time) and Dwolla's funding-source attachment only matter if
// PriorityPay is actually going to originate a transfer to/from that
// account. In manual_approval mode it never does -- the user sends every
// transfer themselves -- so requesting Auth and attaching a Dwolla funding
// source right now is pure unused cost (see create-link-token,
// create-retirement-link-token, and exchange-public-token, all of which
// check this constant). When Dwolla production access comes through and
// this flips to 'dwolla_auto', accounts linked before the flip pick up Auth
// the same way they already pick up Transactions today -- through
// create-update-link-token's `additional_consented_products` flow -- so no
// account needs to be unlinked/relinked to make the switch.
export const TRANSFER_EXECUTION_MODE =
  process.env.TRANSFER_EXECUTION_MODE === "dwolla_auto" ? "dwolla_auto" : "manual_approval";
