import RetirementCalculatorPublicClient from "./RetirementCalculatorPublicClient";

export const metadata = {
  title: "Free Solo 401k + SEP IRA Calculator | PrioritySave",
  description:
    "See exactly how much you can contribute to a Solo 401k and a SEP IRA based on your 2026 self-employment or business income, compared side by side, tracking what you've put into each. Free, no account needed.",
  alternates: {
    canonical: "https://www.prioritysave.com/calculators/retirementcalculator",
  },
  openGraph: {
    type: "website",
    title: "Free Solo 401k + SEP IRA Calculator",
    url: "https://www.prioritysave.com/calculators/retirementcalculator",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RetirementCalculatorPage() {
  return <RetirementCalculatorPublicClient />;
}
