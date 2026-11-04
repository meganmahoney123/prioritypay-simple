import RetirementCalculatorPublicClient from "./RetirementCalculatorPublicClient";

export const metadata = {
  title: "Free Solo 401k Calculator | PrioritySave",
  description:
    "See exactly how much you can contribute to a Solo 401k based on your 2026 self-employment or business income, and track what you've put in so far. Free, no account needed.",
  alternates: {
    canonical: "https://www.prioritysave.com/calculators/retirementcalculator",
  },
  openGraph: {
    type: "website",
    title: "Free Solo 401k Calculator",
    url: "https://www.prioritysave.com/calculators/retirementcalculator",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RetirementCalculatorPage() {
  return <RetirementCalculatorPublicClient />;
}
