import EmergencyFundPublicClient from "./EmergencyFundPublicClient";

export const metadata = {
  title: "Free Emergency Fund Calculator | PriorityPay",
  description:
    "Figure out how big your emergency fund should actually be -- self-employed and business owners need a bigger cushion than a steady W2 paycheck does. Free, no account needed.",
};

export default function EmergencyFundPage() {
  return <EmergencyFundPublicClient />;
}
