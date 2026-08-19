import DebtPayoffPublicClient from "./DebtPayoffPublicClient";

export const metadata = {
  title: "Free Debt Payoff Calculator (Snowball vs. Avalanche) | PriorityPay",
  description:
    "See exactly how long it'll take to be debt-free and how much interest you'll pay, comparing the snowball and avalanche payoff strategies. Free, no account needed.",
};

export default function DebtPayoffPage() {
  return <DebtPayoffPublicClient />;
}
