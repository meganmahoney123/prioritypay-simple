import MoneySimulatorPublicClient from "./MoneySimulatorPublicClient";

export const metadata = {
  title: "Free Income Distribution Simulator | PriorityPay",
  description:
    "Model your monthly income against percentage-based savings, tax, and investment buckets, and see exactly what a goal like a wedding or a down payment takes each month to reach.",
  alternates: {
    canonical: "https://www.prioritypay.co/calculators/moneysimulator",
  },
  openGraph: {
    type: "website",
    title: "Free Income Distribution Simulator",
    url: "https://www.prioritypay.co/calculators/moneysimulator",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function MoneySimulatorPage() {
  return <MoneySimulatorPublicClient />;
}
