// Quick-connect shortcuts for other apps money can land in (Venmo, Cash
// App, PayPal, etc.) have been removed: Plaid can't actually pull or move
// money from those apps, so the buttons were non-functional in production.
// Left as an empty export (rather than deleting the file) since both
// onboarding's Connect Accounts step and the ongoing Accounts tab still
// import APP_CONNECT_OPTIONS -- this keeps both call sites working with
// zero quick-connect buttons rendered, without touching either component.
export const APP_CONNECT_OPTIONS = [];
