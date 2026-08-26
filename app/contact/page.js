import ContactPageClient from "@/components/ContactPageClient";

export const metadata = {
  title: "Contact | PriorityPay",
  description: "Get in touch with the PriorityPay team.",
  alternates: { canonical: "https://www.prioritypay.co/contact" },
};

export default function ContactPage() {
  return <ContactPageClient />;
}
