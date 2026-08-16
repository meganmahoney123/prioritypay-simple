import "./globals.css";

export const metadata = {
  title: "PriorityPay Simple",
  description: "Route your money before you spend it.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Cormorant Garamond + Lora power the homepage's "Ledger" design
            (components/Homepage.js). Loaded globally rather than via
            next/font so it works the same way it did in the original
            exported design and doesn't depend on a build-time font fetch. */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400;1,600&family=Lora:ital,wght@0,400;0,600;1,400;1,600&display=swap"
        />
      </head>
      <body className="text-neutral-900">{children}</body>
    </html>
  );
}
