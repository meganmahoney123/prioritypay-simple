"use client";

import { useEffect, useRef, useState } from "react";
import Btn from "./PublicBtn";
import PublicHeader from "./PublicHeader";
import PublicFooter from "./PublicFooter";
// Design: "Bloom" (working name), the purple, card-based redesign Megan
// built in Claude Design (Aug 25 2026), exported as static HTML and ported
// here 1:1, replacing the earlier "Ledger" concept. Colors/spacing/type
// below are the design's actual tokens (see the exported .dc.html), not
// approximations. Content (copy, data, FAQ answers, hrefs) is UNCHANGED
// from the previous version -- only the visual layer moved. PublicHeader
// and PublicFooter are shared across every public page (calculators, blog,
// etc.) and were intentionally left alone: PublicHeader reads these same
// --color-*/--font-* tokens so it re-themes automatically here, but
// PublicFooter hardcodes its own dark colors on purpose (see its own
// comment) so every public page gets an identical footer regardless of
// which page's TOKENS are active -- changing it would re-theme every
// calculator/blog page too, not just this one.
const TOKENS = {
  "--color-bg": "#FAF7FD",
  "--color-surface": "#FFFFFF",
  "--color-text": "#241634",
  "--color-accent": "#6D3BE0",
  "--color-accent-2": "#4E22B8",
  "--color-divider": "#EFE7FA",

  "--color-neutral-100": "#FAF7FD",
  "--color-neutral-200": "#F4EEFF",
  "--color-neutral-300": "#EFE7FA",
  "--color-neutral-400": "#D8C9F5",
  "--color-neutral-500": "#B69EE8",

  "--color-accent-100": "#F4EEFF",
  "--color-accent-200": "#EDE6FF",
  "--color-accent-300": "#C4A9FA",
  "--color-accent-400": "#9A72F0",
  "--color-accent-700": "#4E22B8",
  "--color-accent-900": "#3B1C7A",

  "--radius-sm": "10px",
  "--radius-md": "18px",
  "--radius-lg": "28px",
  "--radius-pill": "999px",

  "--shadow-sm": "0 10px 24px -14px rgba(52,26,102,0.22)",
  "--shadow-md": "0 30px 60px -30px rgba(52,26,102,0.3)",
  "--shadow-lg": "0 40px 80px -30px rgba(52,26,102,0.32)",

  "--font-heading": "Figtree, Helvetica, Arial, sans-serif",
  "--font-body": "Figtree, Helvetica, Arial, sans-serif",
  "--font-mono": "'IBM Plex Mono', monospace",

  fontFamily: "var(--font-body)",
  color: "var(--color-text)",
  background: "var(--color-bg)",
  overflowX: "hidden",
  WebkitFontSmoothing: "antialiased",
};

// ---- content (identical to the previous design + lib/allocations.js defaults) ----

const SPLIT_ROWS = [
  { name: "Retirement · Solo 401k", pct: "15%", amt: "$630" },
  { name: "Investments", pct: "10%", amt: "$420" },
  { name: "Savings", pct: "10%", amt: "$420" },
  { name: "Tax Reserve", pct: "10%", amt: "$420" },
];

const BENEFITS = [
  { text: "See every bucket's balance and monthly contributions at a glance" },
  { text: "Know your taxes are already set aside before you owe them" },
  { text: "Spend what’s left without doing mental math first" },
];

const BUCKETS = [
  { name: "Solo 401k", amt: "$11,240", pct: 100 },
  { name: "Tax Reserve", amt: "$8,905", pct: 79 },
  { name: "Emergency Fund", amt: "$6,110", pct: 54 },
  { name: "Investments", amt: "$7,963", pct: 71 },
];

// Real domains behind each bank name, used to pull an actual brand logo
// from Google's public favicon service (Clearbit's free logo API was shut down) instead
// of a plain-text pill or a blank placeholder circle -- for illustrative
// "connect with your bank" UI only, not an endorsement/partnership claim.
const BANK_DOMAINS = {
  Chase: "chase.com",
  "Bank of America": "bankofamerica.com",
  "Wells Fargo": "wellsfargo.com",
  "Capital One": "capitalone.com",
  Citibank: "citibank.com",
  "U.S. Bank": "usbank.com",
  "PNC Bank": "pnc.com",
  Truist: "truist.com",
  "Ally Bank": "ally.com",
  Discover: "discover.com",
  "American Express": "americanexpress.com",
  Chime: "chime.com",
  SoFi: "sofi.com",
};
function bankLogoUrl(name) {
  const domain = BANK_DOMAINS[name];
  return domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : null;
}

// Bank logo that never shows a broken-image icon: if the picture fails to load
// (including before the page finished hydrating), it falls back to the bank's
// first letter in a soft tile, or to nothing for the small pills.
function BankLogo({ name, size, tile }) {
  const url = bankLogoUrl(name);
  const [failed, setFailed] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);
  if (!url || failed) {
    if (!tile) return null;
    return (
      <span
        aria-hidden="true"
        style={{ width: size, height: size, borderRadius: 10, background: "var(--color-accent-200)", color: "var(--color-accent-700)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: Math.round(size * 0.46), fontWeight: 700 }}
      >
        {name.charAt(0)}
      </span>
    );
  }
  return (
    <img
      ref={ref}
      src={url}
      alt=""
      width={size}
      height={size}
      referrerPolicy="no-referrer"
      style={{ width: size, height: size, borderRadius: tile ? 10 : 4, background: tile ? "var(--color-accent-200)" : "transparent", display: "block", flexShrink: 0, objectFit: "contain" }}
      onError={() => setFailed(true)}
    />
  );
}

const INSTITUTIONS = [
  { name: "Capital One", kind: "Personal checking" },
  { name: "Ally Bank", kind: "Savings" },
  { name: "Chime", kind: "Personal checking" },
  { name: "Chase", kind: "Personal checking" },
  { name: "Bank of America", kind: "Personal checking" },
  { name: "Wells Fargo", kind: "Savings" },
];

const PERCENTAGES = [
  { name: "Solo 401k", pct: "10%", width: "50%" },
  { name: "Wedding", pct: "5%", width: "25%" },
  { name: "Investments", pct: "10%", width: "50%" },
  { name: "Tax Reserve", pct: "20%", width: "100%" },
  { name: "Emergency Fund", pct: "10%", width: "50%" },
  { name: "Travel", pct: "10%", width: "50%" },
  { name: "Savings", pct: "10%", width: "50%" },
];

const CATEGORY_CARDS = [
  { name: "Tax Reserve", pct: "20%", color: "#2B1470", balance: "$8,220", contributed: "+$840", withdrawals: "No withdrawals yet" },
  { name: "Solo 401k", pct: "15%", color: "#7C4DDB", balance: "$13,165", contributed: "+$630", withdrawals: "No withdrawals yet" },
  { name: "Emergency Fund", pct: "10%", color: "#3B1C7A", balance: "$4,110", contributed: "+$420", withdrawals: "No withdrawals yet" },
  { name: "Savings", pct: "10%", color: "#B79CF0", balance: "$4,110", contributed: "+$420", withdrawals: "1 this month" },
];

const WHO_FOR = [
  "Freelancers", "Coaches", "Consultants", "Solopreneurs", "Small Business Owners",
  "Creators", "Contractors", "Designers", "Photographers", "Real Estate Agents", "Trainers",
];

const BANK_NAMES = [
  "Chase", "Bank of America", "Wells Fargo",
  "Capital One", "Citibank", "U.S. Bank", "PNC Bank", "Truist", "Ally Bank",
  "Discover", "American Express", "Chime", "SoFi",
];
const MARQUEE_ITEMS = [...BANK_NAMES, "+ 10,000 more banks & credit unions"];

const CLOSEOUT_ROWS = [
  { label: "Income", value: "$14,220" },
  { label: "Business expenses", value: "$3,110" },
  { label: "W2 income (excluded)", value: "$0" },
];
const NET_INCOME = { label: "Net income this month", value: "$11,110" };

const STRATEGIES = [
  "Solo 401(k) vs. SEP IRA",
  "S-corp election & reasonable salary",
  "Home office & business deductions",
  "HSA & 529 account strategies",
  "QBI (Section 199A) deduction",
];

const FAQS = [
  {
    q: "I have an LLC or corporation. Does PrioritySave split every customer payment?",
    a: "No. For an LLC, partnership or corporation, PrioritySave splits the draws, distributions or salary you pay yourself, not every payment your business receives. Connect the personal account where your pay lands and skip the business operating account, so business and personal money stay separate. If you also have a sole proprietorship, the income you receive from it is split as it comes in.",
  },
  {
    q: "Who is PrioritySave for?",
    a: "PrioritySave is designed for irregular income: sole proprietors (freelancers, solopreneurs and more) and small business owners who get paid in uneven amounts at uneven times. If you own an LLC, it splits the draws you pay yourself. It also works for W2 employees with side income. You can set rules to route a percentage of each deposit to specific accounts, like savings, tax reserve, investments, retirement, and specific savings like a wedding, a down payment on a house, or college.",
  },
  {
    q: "What accounts can I connect?",
    a: "Any US bank, credit union, or investment/retirement account through Plaid, including all the major banks and roughly 10,000 smaller banks and credit unions across the US and Canada.",
  },
  {
    q: "Does PrioritySave manage or invest my money?",
    a: "No. PrioritySave allows you to set percentage rules to send a portion of each deposit to specific accounts. For example, you can set rules to send 10% of each deposit to a tax reserve account, 15% of each deposit to savings, and 15% of each deposit to retirement. However, PrioritySave does not actually touch your money or move it for you. You complete every transfer yourself. PrioritySave is not a bank, broker-dealer, or investment adviser, and never holds, invests, or moves your funds. You stay in control of every account.",
  },
  {
    q: "Can I change my percentages later?",
    a: "Anytime, from Split Rules in your dashboard. Add or remove categories, adjust any percentage, and reconnect accounts whenever your income or goals change.",
  },
  {
    q: "Is my account information secure?",
    a: "Yes. Account connections run through Plaid, the same infrastructure trusted by banks and other financial apps. PrioritySave only ever gets read-only access to balances and transaction data, never the ability to move money. Sensitive account credentials are encrypted (AES-256) before they're stored, and you can turn on two-factor authentication for your PrioritySave account in Settings.",
  },
];

// ---- small helpers ----

function Reveal({ children, style, as: Tag = "div" }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.95) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setShown(true);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -6% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      style={{
        ...style,
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : "translateY(18px)",
        transition: "opacity 700ms ease, transform 700ms cubic-bezier(.2,.7,.2,1)",
      }}
    >
      {children}
    </Tag>
  );
}

// Pill CTA styling, scoped to just this page via inline style overrides on
// the shared Btn component (rather than editing the global .pp-btn* CSS in
// app/globals.css, which every other public page also uses) -- keeps the
// new rounded/filled look here without changing button shape anywhere
// else on the site.
const PILL_PRIMARY = {
  background: "var(--color-accent)",
  color: "#FFFFFF",
  border: "1px solid var(--color-accent)",
  borderRadius: "var(--radius-pill)",
  padding: "16px 30px",
  fontSize: 16,
  fontWeight: 700,
};
const PILL_SECONDARY = {
  background: "#FFFFFF",
  color: "var(--color-accent-900)",
  border: "1px solid var(--color-divider)",
  borderRadius: "var(--radius-pill)",
  padding: "16px 30px",
  fontSize: 16,
  fontWeight: 700,
};

function Eyebrow({ children }) {
  return (
    <span
      style={{
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "var(--color-accent)",
      }}
    >
      {children}
    </span>
  );
}

export default function Homepage() {
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div style={TOKENS}>
      <PublicHeader />

      {/* HERO */}
      <section
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "clamp(24px, 3vw, 32px) clamp(18px, 4vw, 40px) clamp(24px, 3vw, 32px)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 330px), 1fr))",
          gap: "clamp(40px, 5vw, 64px)",
          alignItems: "center",
        }}
      >
        <Reveal>
          <Eyebrow>Designed for irregular income</Eyebrow>
          <h1
            style={{
              fontSize: "clamp(34px, 4.4vw, 54px)",
              lineHeight: 1.04,
              letterSpacing: "-0.03em",
              fontWeight: 800,
              margin: "14px 0 0",
            }}
          >
            Split and route deposits.{" "}
            <span style={{ color: "var(--color-accent)" }}>Before you spend it.</span>
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.6, color: "#574A68", margin: "16px 0 0", maxWidth: "30em" }}>
            Built for sole proprietors (freelancers, solopreneurs and more) and small business owners. Set rules
            once, and every client payment is split the moment it lands: retirement, savings, investments, a tax
            reserve, or any other goal, like a wedding or college fund.{" "}
            <em style={{ color: "var(--color-text)", fontStyle: "italic" }}>Spend the rest, guilt free.</em>
          </p>
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12, marginTop: 22 }}>
            <Btn href="/signup" variant="primary" style={PILL_PRIMARY}>
              Get started free
            </Btn>
            <Btn href="/login" variant="secondary" style={PILL_SECONDARY}>
              Log in
            </Btn>
          </div>
        </Reveal>

        <Reveal>
          <div
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-divider)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-md)",
              padding: 22,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-accent)" }}>
                Deposit received
              </span>
              <span style={{ fontSize: 13, color: "#6B5E7A", fontFamily: "var(--font-mono)" }}>Today, 9:14 AM</span>
            </div>
            <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.03em", marginTop: 8 }}>$4,200.00</div>
            <div style={{ fontSize: 15, color: "#574A68", marginTop: 4 }}>Client payment · Bridgeway Studio</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0 12px" }}>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6B5E7A" }}>
                Split
              </span>
              <span style={{ flex: 1, height: 1, background: "var(--color-divider)", display: "block" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {SPLIT_ROWS.map((row) => (
                <div
                  key={row.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    background: "var(--color-bg)",
                    borderRadius: "var(--radius-sm)",
                    padding: "11px 16px",
                  }}
                >
                  <span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>{row.name}</span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--color-accent-700)",
                      background: "var(--color-accent-200)",
                      padding: "5px 10px",
                      borderRadius: "var(--radius-pill)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {row.pct}
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 700, width: 70, textAlign: "right", fontFamily: "var(--font-mono)" }}>
                    {row.amt}
                  </span>
                </div>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 14,
                background: "var(--color-accent-900)",
                color: "#FFFFFF",
                borderRadius: "var(--radius-md)",
                padding: "16px 22px",
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 600, opacity: 0.85 }}>Left to spend</span>
              <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", fontFamily: "var(--font-mono)" }}>
                $2,310.00
              </span>
            </div>
          </div>
        </Reveal>
      </section>

      {/* WHO THIS IS FOR */}
      <section style={{ padding: "0 0 clamp(28px, 4vw, 44px)", overflow: "hidden" }}>
        <div style={{ textAlign: "center", fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6B5E7A", marginBottom: 16 }}>
          Who this is for
        </div>
        <div className="pp-marquee-track" style={{ display: "flex", width: "max-content", gap: 12 }}>
          {[...WHO_FOR, ...WHO_FOR, ...WHO_FOR, ...WHO_FOR].map((w, idx) => (
            <span
              key={idx}
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--color-accent-700)",
                background: "var(--color-accent-200)",
                borderRadius: "var(--radius-pill)",
                padding: "13px 24px",
                whiteSpace: "nowrap",
              }}
            >
              {w}
            </span>
          ))}
        </div>
      </section>


      {/* HOW IT WORKS / 3 STEPS */}
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "clamp(52px, 8vw, 84px) clamp(18px, 4vw, 40px)" }}>
        <Reveal style={{ maxWidth: "40em", marginBottom: "clamp(36px, 5vw, 52px)" }}>
          <Eyebrow>How it works</Eyebrow>
          <h2 style={{ fontSize: "clamp(30px, 4.4vw, 46px)", lineHeight: 1.06, letterSpacing: "-0.03em", fontWeight: 800, margin: "14px 0 8px" }}>
            Financial accountability, on autopilot
          </h2>
          <p style={{ fontSize: 18, color: "#574A68", margin: 0 }}>Never remind yourself to save again.</p>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 20 }}>
          <Reveal style={{ background: "var(--color-surface)", border: "1px solid var(--color-divider)", borderRadius: "var(--radius-lg)", padding: 28, display: "flex", flexDirection: "column", gap: 22 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF", background: "var(--color-accent)", width: 34, height: 34, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)" }}>
              01
            </span>
            <div style={{ background: "var(--color-bg)", borderRadius: "var(--radius-md)", padding: "16px 18px 20px" }}>
              <div style={{ textAlign: "center", paddingBottom: 12, borderBottom: "1px solid var(--color-divider)", marginBottom: 14 }}>
                <span style={{ display: "block", fontSize: 13, fontWeight: 700 }}>PrioritySave</span>
                <span style={{ display: "block", fontSize: 11.5, color: "#6B5E7A", marginTop: 2 }}>Text Message · Today 9:14 AM</span>
              </div>
              <div
                style={{
                  background: "#E9E7EE",
                  color: "#1F1730",
                  fontSize: 14.5,
                  lineHeight: 1.45,
                  padding: "12px 15px",
                  borderRadius: "18px 18px 18px 6px",
                  maxWidth: "92%",
                }}
              >
                PrioritySave: <strong>$4,200.00</strong> deposit detected. Your split is calculated and ready.
                Confirm each transfer here:{" "}
                <span style={{ color: "#2563C9", textDecoration: "underline" }}>prioritysave.com/dashboard</span>
              </div>
            </div>
            <div>
              <h3 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 10px" }}>A deposit lands</h3>
              <p style={{ fontSize: 15.5, lineHeight: 1.65, color: "#574A68", margin: 0 }}>
                PrioritySave sends you a text or push notification each time a new deposit hits your account. The
                deposit could be a client payment, a check you deposited, cash from a payment app, or, if you own
                an LLC or corporation, a draw or distribution from your business.
              </p>
            </div>
          </Reveal>

          <Reveal style={{ background: "var(--color-surface)", border: "1px solid var(--color-divider)", borderRadius: "var(--radius-lg)", padding: 28, display: "flex", flexDirection: "column", gap: 22 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF", background: "var(--color-accent)", width: 34, height: 34, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)" }}>
              02
            </span>
            <div style={{ background: "var(--color-bg)", borderRadius: "var(--radius-md)", padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 24, fontWeight: 800, fontFamily: "var(--font-mono)" }}>$4,200</span>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#6B5E7A" }}>SPLIT ON ARRIVAL · 45%</span>
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 18, height: 14, borderRadius: "var(--radius-pill)", overflow: "hidden", background: "var(--color-divider)" }}>
                <span style={{ flex: 15, background: "var(--color-accent-900)", display: "block" }} />
                <span style={{ flex: 10, background: "var(--color-accent)", display: "block" }} />
                <span style={{ flex: 10, background: "var(--color-accent-400)", display: "block" }} />
                <span style={{ flex: 10, background: "var(--color-accent-300)", display: "block" }} />
                <span style={{ flex: 55, background: "var(--color-divider)", display: "block" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
                {SPLIT_ROWS.map((row) => (
                  <div key={row.name} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--color-accent)", display: "block" }} />
                    <span style={{ flex: 1, color: "#574A68" }}>{row.name}</span>
                    <span style={{ fontWeight: 700, fontFamily: "var(--font-mono)" }}>{row.pct}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 10px" }}>
                Deposit is split by percentages you set
              </h3>
              <p style={{ fontSize: 15.5, lineHeight: 1.65, color: "#574A68", margin: 0 }}>
                PrioritySave calculates how much of every deposit should go to retirement, savings, taxes, and any
                other accounts you choose, based on the percentages you set once. You see the breakdown for each
                deposit and send the transfers yourself.
              </p>
            </div>
          </Reveal>

          <Reveal style={{ background: "var(--color-surface)", border: "1px solid var(--color-divider)", borderRadius: "var(--radius-lg)", padding: 28, display: "flex", flexDirection: "column", gap: 22 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF", background: "var(--color-accent)", width: 34, height: 34, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)" }}>
              03
            </span>
            <div style={{ background: "var(--color-accent-900)", color: "#FFFFFF", borderRadius: "var(--radius-md)", padding: "24px 20px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", opacity: 0.6, fontFamily: "var(--font-mono)" }}>
                CHECKING · · · · 4412 · SPLIT
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.75, marginTop: 22 }}>
                Available to spend
              </div>
              <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-0.03em", marginTop: 6, fontFamily: "var(--font-mono)" }}>
                $2,310.00
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.5, opacity: 0.75, marginTop: 14 }}>
                Savings, taxes &amp; retirement already set aside
              </div>
            </div>
            <div>
              <h3 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 10px" }}>
                Spend what&apos;s left. Guilt free.
              </h3>
              <p style={{ fontSize: 15.5, lineHeight: 1.65, color: "#574A68", margin: 0 }}>
                Never wonder if you can afford to splurge this weekend. If the money is in checking? Spend it. Guilt
                free.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* DASHBOARD */}
      <section style={{ background: "var(--color-accent-200)", padding: "clamp(60px, 9vw, 88px) 0" }}>
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: "0 clamp(18px, 4vw, 40px)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
            gap: "clamp(44px, 5vw, 60px)",
            alignItems: "center",
          }}
        >
          <Reveal>
            <Eyebrow>The dashboard</Eyebrow>
            <h2 style={{ fontSize: "clamp(30px, 4.4vw, 46px)", lineHeight: 1.06, letterSpacing: "-0.03em", fontWeight: 800, margin: "14px 0 18px" }}>
              The only personal finance platform you enjoy opening
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.6, color: "#574A68", margin: "0 0 14px" }}>
              Most platforms show what you owe, overspend, and should have done.
            </p>
            <p style={{ fontSize: 17, lineHeight: 1.6, color: "#574A68", margin: "0 0 26px" }}>
              PrioritySave just shows you what you&apos;ve already, effortlessly, saved. No budgeting homework, no
              guilt trip. Just a running total of the retirement, tax, and savings progress that built up
              while you were busy running your business.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {BENEFITS.map((b, i) => (
                <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <span
                    aria-hidden="true"
                    style={{
                      fontSize: 18,
                      lineHeight: "20px",
                      color: "var(--color-accent-700)",
                      background: "#FFFFFF",
                      borderRadius: 10,
                      width: 34,
                      height: 34,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    •
                  </span>
                  <span style={{ fontSize: 16.5, lineHeight: 1.5, color: "var(--color-text)", fontWeight: 500 }}>{b.text}</span>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 14px" }}>Your Categories</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 230px), 1fr))", gap: 14 }}>
              {CATEGORY_CARDS.map((c) => (
                <div key={c.name} style={{ background: "var(--color-surface)", border: "1px solid var(--color-divider)", borderRadius: "var(--radius-lg)", padding: "20px 22px", boxShadow: "var(--shadow-md)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 12, height: 12, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>{c.name}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--font-mono)" }}>{c.pct}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 16 }}>
                    <span style={{ fontSize: 14, color: "#574A68" }}>Balance</span>
                    <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", fontFamily: "var(--font-mono)" }}>{c.balance}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 6 }}>
                    <span style={{ fontSize: 13.5, color: "#574A68" }}>Contributed this month</span>
                    <span style={{ fontSize: 14.5, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--color-accent-700)" }}>{c.contributed}</span>
                  </div>
                  <div style={{ height: 1, background: "var(--color-divider)", margin: "14px 0 12px" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13.5 }}>
                    <span style={{ fontWeight: 700, color: "var(--color-accent-700)" }}>Withdrawals</span>
                    <span style={{ color: "#574A68" }}>{c.withdrawals} ›</span>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* GETTING STARTED / 3 ONBOARDING STEPS */}
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "clamp(60px, 9vw, 88px) clamp(18px, 4vw, 40px)" }}>
        <Reveal style={{ maxWidth: "36em", marginBottom: "clamp(36px, 5vw, 44px)" }}>
          <Eyebrow>Getting started</Eyebrow>
          <h2 style={{ fontSize: "clamp(30px, 4.4vw, 46px)", lineHeight: 1.06, letterSpacing: "-0.03em", fontWeight: 800, margin: "14px 0 0" }}>
            3 simple onboarding steps
          </h2>
        </Reveal>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* step 1 */}
          <Reveal style={{ background: "var(--color-surface)", border: "1px solid var(--color-divider)", borderRadius: "var(--radius-lg)", padding: 34, display: "flex", gap: 44, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 380px", minWidth: 280 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-accent-700)", background: "var(--color-accent-200)", padding: "7px 14px", borderRadius: "var(--radius-pill)", fontFamily: "var(--font-mono)" }}>
                Step 1
              </span>
              <h3 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.025em", margin: "18px 0 12px" }}>Set your percentages</h3>
              <p style={{ fontSize: 16.5, lineHeight: 1.6, color: "#574A68", margin: 0 }}>
                We start you off with buckets built for self-employed income, like Solo 401k, Investments, Tax
                Reserve, Emergency Fund and Savings. Add your own goals, like a wedding or travel. Don&apos;t need
                one? Remove it.
              </p>
            </div>
            <div style={{ flex: "1 1 340px", minWidth: 280, background: "var(--color-bg)", borderRadius: "var(--radius-md)", padding: 22, display: "flex", flexDirection: "column", gap: 10 }}>
              {PERCENTAGES.map((p) => (
                <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 14, background: "#FFFFFF", borderRadius: "var(--radius-sm)", padding: "13px 16px" }}>
                  <span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>{p.name}</span>
                  <span style={{ width: 90, height: 6, borderRadius: "var(--radius-pill)", background: "var(--color-divider)", display: "block", overflow: "hidden" }}>
                    <span style={{ display: "block", height: 6, borderRadius: "var(--radius-pill)", background: "var(--color-accent)", width: p.width }} />
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 700, width: 44, textAlign: "right", fontFamily: "var(--font-mono)" }}>{p.pct}</span>
                </div>
              ))}
            </div>
          </Reveal>

          {/* step 2 */}
          <Reveal style={{ background: "var(--color-surface)", border: "1px solid var(--color-divider)", borderRadius: "var(--radius-lg)", padding: 34, display: "flex", gap: 44, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 380px", minWidth: 280 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-accent-700)", background: "var(--color-accent-200)", padding: "7px 14px", borderRadius: "var(--radius-pill)", fontFamily: "var(--font-mono)" }}>
                Step 2
              </span>
              <h3 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.025em", margin: "18px 0 12px" }}>
                Connect how you actually get paid
              </h3>
              <p style={{ fontSize: 16.5, lineHeight: 1.6, color: "#574A68", margin: 0 }}>
                Connect the accounts where your pay lands. Sole proprietors connect where client payments arrive.
                LLC and corporation owners connect where their draws or distributions arrive, usually a personal
                account, not the business operating account. We connect with over 10,000 banks and credit unions
                across the US and Canada.
              </p>
            </div>
            <div style={{ flex: "1 1 340px", minWidth: 280, background: "var(--color-bg)", borderRadius: "var(--radius-md)", padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#6B5E7A" }}>
                  Income sources connected
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-accent-700)", fontFamily: "var(--font-mono)" }}>6 of 6</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
                {INSTITUTIONS.map((i) => (
                  <div key={i.name} style={{ display: "flex", alignItems: "center", gap: 12, background: "#FFFFFF", borderRadius: "var(--radius-sm)", padding: "12px 14px" }}>
                    <BankLogo name={i.name} size={30} tile />
                    <span style={{ flex: 1 }}>
                      <span style={{ display: "block", fontSize: 15, fontWeight: 600 }}>{i.name}</span>
                      <span style={{ display: "block", fontSize: 13, color: "#6B5E7A" }}>{i.kind}</span>
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#2F7D5B", background: "#E4F5EC", padding: "5px 10px", borderRadius: "var(--radius-pill)" }}>
                      Linked
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 13, color: "#6B5E7A", marginTop: 14, textAlign: "center" }}>
                + 10,000 more banks &amp; credit unions available
              </div>
            </div>
          </Reveal>

          {/* step 3 */}
          <Reveal style={{ background: "var(--color-surface)", border: "1px solid var(--color-divider)", borderRadius: "var(--radius-lg)", padding: 34, display: "flex", gap: 44, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ flex: "1 1 380px", minWidth: 280 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-accent-700)", background: "var(--color-accent-200)", padding: "7px 14px", borderRadius: "var(--radius-pill)", fontFamily: "var(--font-mono)" }}>
                Step 3
              </span>
              <h3 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.025em", margin: "18px 0 12px" }}>Spend the rest, guilt free</h3>
              <p style={{ fontSize: 16.5, lineHeight: 1.6, color: "#574A68", margin: 0 }}>
                That&apos;s it. From here, every future deposit gets split the moment it lands.
                Whatever&apos;s sitting in checking is yours to spend, guilt free.
              </p>
            </div>
            <div style={{ flex: "1 1 340px", minWidth: 280, background: "var(--color-accent-900)", color: "#FFFFFF", borderRadius: "var(--radius-md)", padding: 34 }}>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.75 }}>
                Available to spend
              </div>
              <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: "-0.035em", margin: "8px 0 6px", fontFamily: "var(--font-mono)" }}>
                $1,842
              </div>
              <div style={{ fontSize: 15, opacity: 0.75 }}>already split &amp; saved this month</div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* BANK MARQUEE */}
      <section style={{ padding: "20px 0 clamp(60px, 9vw, 88px)", overflow: "hidden" }}>
        <div style={{ textAlign: "center", fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6B5E7A", marginBottom: 26 }}>
          10,000+ banks &amp; credit unions
        </div>
        <div className="pp-marquee-track" style={{ display: "flex", width: "max-content", gap: 12 }}>
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((m, idx) => {
            const logoUrl = bankLogoUrl(m);
            return (
              <span
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: logoUrl ? 10 : 0,
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#574A68",
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-divider)",
                  borderRadius: "var(--radius-pill)",
                  padding: "13px 22px",
                  whiteSpace: "nowrap",
                }}
              >
                {logoUrl && <BankLogo name={m} size={20} />}
                {m}
              </span>
            );
          })}
        </div>
      </section>

      {/* MONTH CLOSE-OUT */}
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "0 clamp(18px, 4vw, 40px) clamp(60px, 9vw, 88px)" }}>
        <Reveal
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-divider)",
            borderRadius: "var(--radius-lg)",
            padding: "clamp(30px, 4vw, 46px)",
            display: "flex",
            gap: 56,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ flex: "1 1 420px", minWidth: 280 }}>
            <Eyebrow>Month close-out · for sole proprietors</Eyebrow>
            <h2 style={{ fontSize: "clamp(28px, 3.4vw, 42px)", lineHeight: 1.08, letterSpacing: "-0.03em", fontWeight: 800, margin: "14px 0 18px" }}>
              Taxes, almost done before you start them.
            </h2>
            <p style={{ fontSize: 16.5, lineHeight: 1.6, color: "#574A68", margin: "0 0 14px" }}>
              At the end of every month, you already know what was income, what was an expense, and where it came
              from.
            </p>
            <p style={{ fontSize: 16.5, lineHeight: 1.6, color: "#574A68", margin: 0 }}>
              PrioritySave&apos;s Month Close-Out walks sole proprietors through confirming each transaction once,
              then estimates how much to set aside for taxes. Have W2 income? No problem, we&apos;ll separate it
              out for you. LLC and corporation owners should base taxes on their business profit with their CPA.
            </p>
          </div>
          <div style={{ flex: "1 1 340px", minWidth: 280, background: "var(--color-bg)", borderRadius: "var(--radius-md)", padding: 26 }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#6B5E7A" }}>
              Monthly Close Out · July 2026
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 18 }}>
              {CLOSEOUT_ROWS.map((c) => (
                <div key={c.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "13px 0", borderBottom: "1px solid var(--color-divider)" }}>
                  <span style={{ fontSize: 15, color: "#574A68" }}>{c.label}</span>
                  <span style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-mono)" }}>{c.value}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 18, background: "var(--color-accent-200)", borderRadius: "var(--radius-sm)", padding: "18px 20px" }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--color-accent-900)" }}>{NET_INCOME.label}</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: "var(--color-accent-900)", fontFamily: "var(--font-mono)" }}>{NET_INCOME.value}</span>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.5, color: "#6B5E7A", margin: "16px 0 0" }}>
              Calculate your Solo 401k contributions effortlessly inside the dashboard.
            </p>
          </div>
        </Reveal>
      </section>

      {/* MORE FEATURES: One-Time Transfer, Withdrawals, Month Close-Out */}
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "0 clamp(18px, 4vw, 40px) clamp(60px, 9vw, 88px)" }}>
        <Reveal>
          <Eyebrow>More than the split</Eyebrow>
          <h2 style={{ fontSize: "clamp(28px, 3.4vw, 42px)", lineHeight: 1.08, letterSpacing: "-0.03em", fontWeight: 800, margin: "14px 0 40px", maxWidth: "20em" }}>
            Everything else that keeps the buckets honest
          </h2>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 22 }}>
          <Reveal
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-divider)",
              borderRadius: "var(--radius-lg)",
              padding: "clamp(26px, 3vw, 32px)",
            }}
          >
            <h3 style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em", margin: "0 0 10px" }}>One-Time Transfer</h3>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: "#574A68", margin: 0 }}>
              Move money straight between two categories, like $3,000 from Wedding to Maintenance, or boost a
              category with unallocated cash you&apos;re sitting on. Works category to category, or into and out of
              unallocated.
            </p>
            <div style={{ background: "var(--color-bg)", borderRadius: "var(--radius-md)", padding: 16, marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#FFFFFF", borderRadius: "var(--radius-sm)", padding: "10px 12px", fontSize: 14 }}>
                <span style={{ flex: 1, fontWeight: 600 }}>Wedding</span>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#B4432F" }}>−$3,000</span>
              </div>
              <div aria-hidden="true" style={{ textAlign: "center", color: "var(--color-accent)", fontWeight: 800, lineHeight: 1 }}>↓</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#FFFFFF", borderRadius: "var(--radius-sm)", padding: "10px 12px", fontSize: 14 }}>
                <span style={{ flex: 1, fontWeight: 600 }}>Maintenance</span>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#2F7D5B" }}>+$3,000</span>
              </div>
            </div>
          </Reveal>
          <Reveal
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-divider)",
              borderRadius: "var(--radius-lg)",
              padding: "clamp(26px, 3vw, 32px)",
            }}
          >
            <h3 style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em", margin: "0 0 10px" }}>Withdrawals</h3>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: "#574A68", margin: 0 }}>
              Log every expense in one place, whether it&apos;s a specific credit-card charge or a cash purchase, and
              PrioritySave matches it against the category it came from so your buckets always reflect what&apos;s
              actually still there.
            </p>
            <div style={{ background: "var(--color-bg)", borderRadius: "var(--radius-md)", padding: 16, marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#FFFFFF", borderRadius: "var(--radius-sm)", padding: "10px 12px", fontSize: 14 }}>
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontWeight: 600 }}>Airfare · credit card</span>
                  <span style={{ display: "block", fontSize: 12.5, color: "#6B5E7A" }}>From Travel</span>
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>−$420</span>
              </div>
              <div style={{ padding: "2px 4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "#6B5E7A", marginBottom: 6 }}>
                  <span>Travel still available</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-text)" }}>$1,380</span>
                </div>
                <div style={{ height: 6, borderRadius: "var(--radius-pill)", background: "var(--color-divider)", overflow: "hidden" }}>
                  <span style={{ display: "block", height: 6, borderRadius: "var(--radius-pill)", background: "var(--color-accent)", width: "77%" }} />
                </div>
              </div>
            </div>
          </Reveal>
          <Reveal
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-divider)",
              borderRadius: "var(--radius-lg)",
              padding: "clamp(26px, 3vw, 32px)",
            }}
          >
            <h3 style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em", margin: "0 0 10px" }}>Month Close-Out</h3>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: "#574A68", margin: 0 }}>
              For sole proprietors: confirm each month&apos;s transactions once, so you always know what actually
              came in, what was income, and what wasn&apos;t.
            </p>
            <div style={{ background: "var(--color-bg)", borderRadius: "var(--radius-md)", padding: 16, marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#FFFFFF", borderRadius: "var(--radius-sm)", padding: "10px 12px", fontSize: 14 }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontWeight: 600 }}>Bridgeway Studio</span>
                  <span style={{ display: "block", fontSize: 12.5, color: "#6B5E7A" }}>Invoice 118</span>
                </span>
                <span style={{ textAlign: "right" }}>
                  <span style={{ display: "block", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 13 }}>+$4,200</span>
                  <span style={{ display: "inline-block", marginTop: 3, fontSize: 11.5, fontWeight: 700, color: "#2F7D5B", background: "#E4F5EC", padding: "3px 8px", borderRadius: "var(--radius-pill)" }}>Income</span>
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#FFFFFF", borderRadius: "var(--radius-sm)", padding: "10px 12px", fontSize: 14 }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontWeight: 600 }}>Harbor Coffee Co.</span>
                  <span style={{ display: "block", fontSize: 12.5, color: "#6B5E7A" }}>Website project</span>
                </span>
                <span style={{ textAlign: "right" }}>
                  <span style={{ display: "block", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 13 }}>+$1,150</span>
                  <span style={{ display: "inline-block", marginTop: 3, fontSize: 11.5, fontWeight: 700, color: "#2F7D5B", background: "#E4F5EC", padding: "3px 8px", borderRadius: "var(--radius-pill)" }}>Income</span>
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#FFFFFF", borderRadius: "var(--radius-sm)", padding: "10px 12px", fontSize: 14 }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontWeight: 600 }}>Adobe Creative Cloud</span>
                  <span style={{ display: "block", fontSize: 12.5, color: "#6B5E7A" }}>Software</span>
                </span>
                <span style={{ textAlign: "right" }}>
                  <span style={{ display: "block", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 13 }}>−$55</span>
                  <span style={{ display: "inline-block", marginTop: 3, fontSize: 11.5, fontWeight: 700, color: "#7A5A12", background: "#FBF1D9", padding: "3px 8px", borderRadius: "var(--radius-pill)" }}>Expense</span>
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#FFFFFF", borderRadius: "var(--radius-sm)", padding: "10px 12px", fontSize: 14 }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontWeight: 600 }}>Venmo · Jordan</span>
                  <span style={{ display: "block", fontSize: 12.5, color: "#6B5E7A" }}>Refund from vendor</span>
                </span>
                <span style={{ textAlign: "right" }}>
                  <span style={{ display: "block", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 13 }}>+$60</span>
                  <span style={{ display: "inline-block", marginTop: 3, fontSize: 11.5, fontWeight: 700, color: "#7A5A12", background: "#FBF1D9", padding: "3px 8px", borderRadius: "var(--radius-pill)" }}>Not income</span>
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* TAX SAVINGS QUIZ TEASER */}
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "0 clamp(18px, 4vw, 40px) clamp(60px, 9vw, 88px)" }}>
        <Reveal
          style={{
            background: "var(--color-accent-900)",
            color: "#FFFFFF",
            borderRadius: "var(--radius-lg)",
            padding: "clamp(36px, 5vw, 52px) clamp(24px, 4vw, 46px)",
            display: "flex",
            gap: 56,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: "1 1 420px", minWidth: 280 }}>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-accent-300)" }}>
              Free tool
            </span>
            <h2 style={{ fontSize: "clamp(28px, 3.4vw, 42px)", lineHeight: 1.08, letterSpacing: "-0.03em", fontWeight: 800, margin: "14px 0 16px" }}>
              Not sure what tax strategies apply to you?
            </h2>
            <p style={{ fontSize: 16.5, lineHeight: 1.6, margin: "0 0 28px", opacity: 0.85 }}>
              Take our free 2-minute quiz. Answer a few questions about your income, family, and business setup,
              and get a personalized list of tax strategies worth researching. No account needed.
            </p>
            <Btn href="/tax-savings-quiz" variant="primary" style={{ ...PILL_PRIMARY, background: "#FFFFFF", color: "var(--color-accent-900)", border: "1px solid #FFFFFF" }}>
              Take the free quiz
            </Btn>
          </div>
          <div style={{ flex: "1 1 300px", minWidth: 260 }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-accent-300)", marginBottom: 16 }}>
              A few of the strategies covered
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {STRATEGIES.map((s) => (
                <span key={s} style={{ display: "block", fontSize: 15.5, fontWeight: 600, background: "rgba(255,255,255,0.1)", borderRadius: "var(--radius-sm)", padding: "15px 18px" }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* FAQ */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 clamp(18px, 4vw, 40px) clamp(60px, 9vw, 88px)" }}>
        <Reveal style={{ textAlign: "center", marginBottom: 36 }}>
          <Eyebrow>Questions</Eyebrow>
          <h2 style={{ fontSize: "clamp(28px, 3.6vw, 40px)", lineHeight: 1.06, letterSpacing: "-0.03em", fontWeight: 800, margin: "14px 0 0" }}>
            Frequently asked questions
          </h2>
        </Reveal>
        <Reveal style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {FAQS.map((f, i) => {
            const open = openFaq === i;
            return (
              <div key={f.q} style={{ background: "var(--color-surface)", border: "1px solid var(--color-divider)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                <button
                  onClick={() => setOpenFaq(open ? -1 : i)}
                  className="pp-faq-btn"
                  style={{
                    width: "100%",
                    fontFamily: "inherit",
                    textAlign: "left",
                    background: "none",
                    border: 0,
                    padding: "22px 24px",
                    display: "flex",
                    alignItems: "center",
                    gap: 20,
                    cursor: "pointer",
                    color: "var(--color-text)",
                  }}
                >
                  <span style={{ flex: 1, fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em" }}>{f.q}</span>
                  <span
                    style={{
                      fontSize: 20,
                      fontWeight: 500,
                      color: "var(--color-accent)",
                      width: 30,
                      height: 30,
                      borderRadius: "var(--radius-pill)",
                      background: "var(--color-accent-100)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {open ? "−" : "+"}
                  </span>
                </button>
                <div className="pp-faq-panel" style={{ maxHeight: open ? 760 : 0 }}>
                  <p style={{ fontSize: 15.5, lineHeight: 1.65, color: "#574A68", margin: 0, padding: "0 24px 24px" }}>{f.a}</p>
                </div>
              </div>
            );
          })}
        </Reveal>
      </section>

      {/* FINAL CTA */}
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "0 clamp(18px, 4vw, 40px) clamp(72px, 10vw, 96px)" }}>
        <Reveal
          style={{
            background: "var(--color-accent-200)",
            borderRadius: "var(--radius-lg)",
            padding: "clamp(48px, 8vw, 68px) clamp(24px, 5vw, 46px)",
            textAlign: "center",
          }}
        >
          <h2 style={{ fontSize: "clamp(30px, 4.2vw, 48px)", lineHeight: 1.06, letterSpacing: "-0.03em", fontWeight: 800, margin: "0 auto 18px", maxWidth: "22em" }}>
            Stop reacting to your finances. Take an effortless, proactive approach.
          </h2>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: "#574A68", margin: "0 auto 30px", maxWidth: "34em" }}>
            Set your percentages once. Every deposit after that is split between savings and investments for you.
          </p>
          <Btn href="/signup" variant="primary" style={PILL_PRIMARY}>
            Get started free
          </Btn>
        </Reveal>
      </section>

      <PublicFooter />

      <style jsx>{`
        a {
          color: var(--color-accent);
          text-decoration: none;
        }
        a:hover {
          color: var(--color-accent-2);
        }
        ::selection {
          background: color-mix(in srgb, var(--color-accent) 30%, transparent);
        }
        .pp-faq-btn:hover {
          color: var(--color-accent-700);
        }
        .pp-faq-panel {
          overflow: hidden;
          transition: max-height 320ms ease;
        }
        .pp-marquee-track {
          animation: pp-marquee 40s linear infinite;
        }
        @keyframes pp-marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}
