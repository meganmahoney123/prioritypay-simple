import "./globals.css";

// metadataBase makes every child page's canonical/OG URL resolve
// correctly even where a page only supplies a relative one; the
// default title/description here only shows up on the handful of pages
// that don't set their own (mainly the authenticated app screens, which
// aren't public/indexable anyway). openGraph/twitter defaults give every
// page a sane social-preview fallback even before it sets its own.
export const metadata = {
  metadataBase: new URL("https://www.prioritypay.co"),
  title: "PriorityPay Simple",
  description: "Route your money before you spend it.",
  openGraph: {
    siteName: "PriorityPay",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
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
