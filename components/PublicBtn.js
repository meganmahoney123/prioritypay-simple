"use client";

import Link from "next/link";

// Small shared nav/CTA button used on every public (logged-out) page --
// Homepage, and now PublicHeader. Kept in its own file purely so
// PublicHeader doesn't have to import from Homepage.js (a page-shaped
// component) just to reuse this.
export default function Btn({ href, variant, style, children }) {
  return (
    <Link href={href} className={`pp-btn pp-btn-${variant}`} style={style}>
      {children}
    </Link>
  );
}
