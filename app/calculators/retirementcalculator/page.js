import RetirementCalculatorPublicClient from "./RetirementCalculatorPublicClient";

export const metadata = {
  title: "Free Solo 401k vs SEP IRA Calculator | PriorityPay",
  description:
    "See exactly how much you can contribute to a Solo 401k vs a SEP IRA based on your 2026 self-employment or business income -- compared side by side. Free, no account needed.",
  alternates: {
    canonical: "https://www.prioritypay.co/calculators/retirementcalculator",
  },
  openGraph: {
    type: "website",
    title: "Free Solo 401k vs SEP IRA Calculator",
    url: "https://www.prioritypay.co/calculators/retirementcalculator",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RetirementCalculatorPage() {
  return <RetirementCalculatorPublicClient />;
}
