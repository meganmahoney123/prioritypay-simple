"use client";

const PLANS = {
  simple: { name: "PriorityPay Simple", price: "$12.99" },
  business: { name: "PriorityPay Business", price: "$39.99" },
};

const linkStyle = {
  color: "var(--color-accent-700)",
  textDecoration: "underline",
};

export default function SubscriptionDisclosure({ plan = "simple", isNative }) {
  if (!isNative) return null;
  const p = PLANS[plan] || PLANS.simple;
  return (
    <div
      style={{
        marginTop: 12,
        fontSize: 12.5,
        lineHeight: 1.6,
        color: "color-mix(in srgb, var(--color-text) 62%, transparent)",
      }}
    >
      <p style={{ margin: "0 0 6px" }}>
        <strong>{p.name}</strong> — monthly subscription (1 month), {p.price}/month.
        Payment is charged to your Apple ID at confirmation. The subscription renews
        automatically each month at {p.price} unless cancelled at least 24 hours
        before the end of the current period. Manage or cancel in iOS Settings &gt;
        Apple ID &gt; Subscriptions.
      </p>
      <p style={{ margin: 0 }}>
        <a href="https://www.prioritypay.co/terms" target="_blank" rel="noopener noreferrer" style={linkStyle}>Terms of Use (EULA)</a>
        {" · "}
        <a href="https://www.prioritypay.co/privacy" target="_blank" rel="noopener noreferrer" style={linkStyle}>Privacy Policy</a>
      </p>
    </div>
  );
}
