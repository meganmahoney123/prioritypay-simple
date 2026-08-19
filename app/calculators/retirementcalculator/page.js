import RetirementCalculatorPublicClient from "./RetirementCalculatorPublicClient";

export const metadata = {
  title: "Free Solo 401k vs SEP IRA Calculator | PriorityPay",
  description:
    "See exactly how much you can contribute to a Solo 401k vs a SEP IRA based on your 2026 self-employment or business income -- compared side by side. Free, no account needed.",
};

export default function RetirementCalculatorPage() {
  return <RetirementCalculatorPublicClient />;
}
