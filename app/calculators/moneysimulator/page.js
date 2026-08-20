import MoneySimulatorPublicClient from "./MoneySimulatorPublicClient";

export const metadata = {
  title: "Free Income Distribution Simulator | PriorityPay",
  description:
    "Model your monthly income against percentage-based savings, tax, and investment buckets, and see exactly what a goal like a wedding or a down payment takes each month to reach.",
};

export default function MoneySimulatorPage() {
  return <MoneySimulatorPublicClient />;
}
