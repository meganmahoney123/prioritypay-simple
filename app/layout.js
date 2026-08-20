import "./globals.css";

// metadataBase makes every child page's canonical/OG URL resolve
// correctly even where a page only supplies a relative one; the
// default title/description here only shows up on the handful of pages
// that don't set their own (mainly the authenticated app screens, which
// aren't public/indexable anyway). openGraph/twitter defaults give every
// page a sane social-preview fallback even before it sets its own.

// Next.js keeps viewport out of the `metadata` export on purpose (it
// warns/deprecates viewport-in-metadata as of 14.x) -- this was missing
// entirely before, which meant mobile browsers had nothing telling them
// "render at the device's actual width." Without it, mobile Safari/
// Chrome fall back to a virtual ~980px desktop layout viewport and just
// shrink-to-fit the whole page, which is why nothing here has actually
// been responsive on a real phone: JS breakpoints (window.innerWidth)
// were reading that fake ~980px width, not the device's real one, so
// mobile-only UI (like AppShell's hamburger menu) never triggered.
export const viewport = {
  width: "device-width",
  initialScale: 1,
};

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
