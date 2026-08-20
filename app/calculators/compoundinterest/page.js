import CompoundInterestPublicClient from "./CompoundInterestPublicClient";

export const metadata = {
  title: "Free Compound Interest Calculator | PriorityPay",
  description:
    "See what investing a set amount every year could grow into over time, with a year-by-year breakdown of contributions vs. growth. Free, no account needed.",
  alternates: {
    canonical: "https://www.prioritypay.co/calculators/compoundinterest",
  },
};

export default function CompoundInterestPage() {
  return <CompoundInterestPublicClient />;
}
