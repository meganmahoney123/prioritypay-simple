import CompoundInterestPublicClient from "./CompoundInterestPublicClient";

export const metadata = {
  title: "Free Compound Interest Calculator | PrioritySave",
  description:
    "See what investing a set amount every year could grow into over time, with a year-by-year breakdown of contributions vs. growth. Free, no account needed.",
  alternates: {
    canonical: "https://www.prioritysave.com/calculators/compoundinterest",
  },
};

export default function CompoundInterestPage() {
  return <CompoundInterestPublicClient />;
}
