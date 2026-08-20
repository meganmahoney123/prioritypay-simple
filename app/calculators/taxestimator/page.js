import TaxEstimatorPublicClient from "./TaxEstimatorPublicClient";

export const metadata = {
  title: "Free Tax Reserve Estimator | PriorityPay",
  description:
    "Estimate your 2026 federal tax bill so you know how much to set aside for taxes if you're self employed or a business owner.",
};

export default function TaxEstimatorPage() {
  return <TaxEstimatorPublicClient />;
}
