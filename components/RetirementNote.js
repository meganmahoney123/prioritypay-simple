// Shared across Split Rules and onboarding's Percentage Splits step,
// wherever a Retirement sub-account (Solo 401k, SEP IRA, or one a person
// adds themselves) needs its account-connection caveat explained: connect
// a plain savings account here for now -- not the real retirement account.
// The real Solo 401k/SEP IRA gets opened and funded separately at each
// month's close-out, once net income is confirmed (see lib/closeoutTransfer.js
// and the Close Out flow) -- never straight from a deposit, so a bad month
// can't leave you having over-contributed.
export default function RetirementNote({ label }) {
  return (
    <p className="text-[11px] text-neutral-400 leading-snug">
      Connect a plain savings account here for now, not your real {label} -- PriorityPay holds this money until
      month-end close-out, when you confirm your real net income and send exactly what you can afford to your
      actual {label}. This avoids over (and under) contributing.
    </p>
  );
}
