export default function RetirementNote({ label, theme }) {
  const text = (
    <>
      Connect a regular savings account here, not your real {label}. PriorityPay holds this money until the month
      end, when you confirm your real net income from that month. Then, you&apos;ll confirm how much you want to
      contribute to your {label} and we&apos;ll send it to your account. This process avoids over (and under)
      contributing.
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
