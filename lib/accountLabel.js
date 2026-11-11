// One place that builds the "Bank Account •••• 1234" label, so an account
// without last digits never renders as "•••• null" or "•••• undefined".
export function accountLabel(a) {
  if (!a) return "";
  const base = [a.institution_name, a.account_name].filter(Boolean).join(" ");
  return a.mask ? `${base} •••• ${a.mask}` : base;
}
