export default function RetirementNote({ label, theme }) {
  const text = (
    <>
      Connect a regular savings account here, not your real {label}. The account (ideally savings) you connect
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
