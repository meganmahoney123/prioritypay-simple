export default function RetirementNote({ label }) {
  return (
    <p className="text-[11px] text-neutral-400 leading-snug">
      Connect a regular savings account here, not your real {label}. PriorityPay holds this money until the month
      end, when you confirm your real net income from that month. Then, you&apos;ll confirm how much you want to
      contribute to your {label} and we&apos;ll send it to your account. This process avoids over (and under)
      contributing.
    </p>
  );
}
