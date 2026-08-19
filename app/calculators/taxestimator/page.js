import TaxEstimatorPublicClient from "./TaxEstimatorPublicClient";

export const metadata = {
  title: "Free Self-Employment & Income Tax Estimator | PriorityPay",
  description:
    "Estimate your federal income tax -- and self-employment tax if you're a freelancer or business owner -- for 2026. See exactly what percentage to set aside from every payment.",
};

export default function TaxEstimatorPage() {
  return <TaxEstimatorPublicClient />;
}
