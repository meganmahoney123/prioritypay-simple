import "./globals.css";

export const metadata = {
  title: "PriorityPay Simple",
  description: "Route your money before you spend it.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="text-neutral-900">{children}</body>
    </html>
  );
}
