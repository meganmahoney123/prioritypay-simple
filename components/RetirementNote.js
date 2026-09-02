// `isEmployer` (added Sept 2026) -- true for the W2 workplace lineup
// (401k/IRA/HSA, usually already funded via payroll deduction), false for
// Solo 401k/SEP IRA (self-employment income with no payroll deduction to
// piggyback on). Employer accounts get the OPPOSITE instruction from the
// self-employed ones below: connect the REAL account directly (Plaid Link
// is scoped to it -- see create-retirement-link-token/isEmployerRetirementRow)
// so its balance shows growing here, rather than a savings account holding
// money for a later manual transfer.
export default function RetirementNote({ label, theme, isEmployer }) {
  const text = isEmployer ? (
    <>
      Connect your real {label} here so PriorityPay can show its balance growing over time. If your employer
      already routes money to it through payroll, you don&apos;t need to send anything here for that -- just
      double-check with HR/payroll so you don&apos;t end up over-contributing.
    </>
  ) : (
    <>
      Connect a regular savings account here, <strong>not your real {label}</strong>. The account (ideally savings) you connect
      here will hold this money. At the end of the month, when you confirm your net income, you can transfer it to
      your {label}. This process avoids over (and under) contributing.
    </>
  );

  if (theme === "ledger") {
    return (
      <p
        style={{
          fontSize: 13.5,
          lineHeight: 1.7,
          color: "color-mix(in srgb, var(--color-text) 55%, transparent)",
          margin: "12px 0 0",
          maxWidth: "40em",
        }}
      >
        {text}
      </p>
    );
  }

  return <p className="text-[11px] text-neutral-400 leading-snug">{text}</p>;
}
