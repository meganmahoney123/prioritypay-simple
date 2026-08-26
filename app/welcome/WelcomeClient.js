"use client";

import { BLOOM_TOKENS, bloomPrimaryButtonStyle, bloomGhostButtonStyle } from "@/lib/bloomTheme";
import PriorityPayLogo from "@/components/PriorityPayLogo";

// First screen a free-tier app user sees on cold launch (see
// components/NativeHomeRedirect.js). Two honest options, no dark patterns:
// try the real product with fake numbers, or log in if you already paid.
// "Get started" is intentionally the quieter of the two ghost-button links
// below the primary CTA, not a big filled button -- the point of this
// screen is to let someone try the simulator before asking for anything,
// not to push signup on first launch.
export default function WelcomeClient() {
  return (
    <div
      style={{
        ...BLOOM_TOKENS,
        minHeight: "100vh",
        background: "var(--color-bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px 64px",
        textAlign: "center",
      }}
    >
      <PriorityPayLogo size={24} layout="stack" style={{ marginBottom: 40 }} />

      <h1
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "clamp(30px, 8vw, 40px)",
          fontWeight: 800,
          lineHeight: 1.08,
          letterSpacing: "-0.035em",
          margin: "0 0 14px",
          maxWidth: "14em",
        }}
      >
        Know your split before you spend it
      </h1>
      <p
        style={{
          fontSize: 17,
          lineHeight: 1.6,
          color: "var(--color-neutral-700)",
          margin: "0 0 36px",
          maxWidth: "26em",
        }}
      >
        Try the free simulator with a sample paycheck -- no account, no bank connection. Connect your real accounts
        whenever you're ready.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%", maxWidth: "22em" }}>
        <a
          href="/calculators/moneysimulator?from=app"
          style={bloomPrimaryButtonStyle({ width: "100%", padding: "16px 26px", fontSize: 17, boxSizing: "border-box" })}
        >
          Try the free simulator
        </a>
        <a
          href="/login"
          style={bloomGhostButtonStyle({ width: "100%", padding: "16px 26px", fontSize: 17, boxSizing: "border-box" })}
        >
          Log in
        </a>
      </div>

      <a
        href="/signup"
        style={{
          marginTop: 28,
          fontFamily: "var(--font-heading)",
          fontSize: 15,
          fontWeight: 700,
          color: "var(--color-accent)",
          textDecoration: "underline",
          textUnderlineOffset: "3px",
        }}
      >
        Already tried it? Get started
      </a>
    </div>
  );
}
