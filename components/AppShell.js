"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { LEDGER_TOKENS } from "@/lib/ledgerTheme";
import PriorityPayLogo from "@/components/PriorityPayLogo";

// Payments tab removed -- every deposit splits automatically the moment
// Plaid's webhook detects it (see app/api/plaid/webhook), so there's no
// longer a manual trigger someone needs a dedicated nav item for. Recent
// transfers are still visible on the Dashboard.
const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/accounts", label: "Accounts" },
  { href: "/splits", label: "Income Split Rules" },
  { href: "/simulator", label: "Income Split Simulator" },
  { href: "/closeout", label: "Close Out" },
  { href: "/tax-summary", label: "Tax Summary" },
  { href: "/history", label: "History" },
  { href: "/advisor", label: "Tax Savings Quiz" },
  { href: "/settings", label: "Settings" },
];

const TITLES = {
  "/dashboard": "Dashboard",
  "/accounts": "Linked Accounts",
  "/splits": "Income Split Rules",
  "/simulator": "Income Split Simulator",
  "/closeout": "Monthly Close-Out",
  "/tax-summary": "Tax Summary",
  "/history": "Transaction History",
  "/advisor": "Tax Savings Quiz",
  "/settings": "Settings",
};

// /splits/minimums and /splits/percentage-splits are now just redirects
// back to the single /splits page -- this still resolves any of the three
// paths to the same "Income Split Rules" header title and nav highlight.
function titleFor(pathname) {
  if (pathname.startsWith("/splits")) return TITLES["/splits"];
  return TITLES[pathname] || "PriorityPay Simple";
}

function NavLink({ href, label, active, onClick }) {
  return (
    <a
      href={href}
      onClick={onClick}
      className="pp-ledger-navlink"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        textAlign: "left",
        background: active ? "color-mix(in srgb, var(--color-accent) 8%, transparent)" : "transparent",
        borderLeft: `2px solid ${active ? "var(--color-accent)" : "transparent"}`,
        cursor: "pointer",
        padding: "12px 13px",
        fontFamily: "var(--font-heading)",
        fontSize: 16,
        letterSpacing: "0.01em",
        whiteSpace: "nowrap",
        color: active ? "var(--color-accent-700)" : "var(--color-text)",
        textDecoration: "none",
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: active ? "var(--color-accent)" : "color-mix(in srgb, var(--color-text) 25%, transparent)",
          flex: "none",
        }}
      />
      {label}
    </a>
  );
}

export default function AppShell({ children, isSandbox = false }) {
  const pathname = usePathname();
  const router = useRouter();
  const [narrow, setNarrow] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onResize = () => {
      const isNarrow = window.innerWidth < 880;
      setNarrow(isNarrow);
      if (!isNarrow) setMenuOpen(false);
    };
    onResize();
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleLogout = async () => {
    await supabaseBrowser().auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div
      className="pp-ledger-shell"
      style={{
        ...LEDGER_TOKENS,
        minHeight: "100vh",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "stretch",
      }}
    >
      <aside
        className="pp-shell-aside"
        style={{ flex: "1 1 232px", minWidth: 0, borderRight: "1px solid var(--color-divider)", background: "var(--color-neutral-100)" }}
      >
          <div style={{ position: "sticky", top: 0, padding: "20px 0 22px" }}>
            <div style={{ display: "flex", alignItems: "center", padding: "0 22px 20px" }}>
              <PriorityPayLogo size={19} />
            </div>
            <nav style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "0 12px", flexDirection: "column" }}>
              {NAV_ITEMS.map((n) => (
                <NavLink key={n.href} href={n.href} label={n.label} active={pathname === n.href || pathname.startsWith(`${n.href}/`)} />
              ))}
            </nav>
            <div style={{ padding: "20px 22px 0" }}>
              <div style={{ height: 1, background: "var(--color-divider)", marginBottom: 16 }} />
              <button
                onClick={handleLogout}
                style={{
                  background: "transparent",
                  border: 0,
                  cursor: "pointer",
                  padding: 0,
                  fontFamily: "var(--font-body)",
                  fontSize: 14,
                  color: "color-mix(in srgb, var(--color-text) 52%, transparent)",
                }}
              >
                Log out
              </button>
            </div>
          </div>
      </aside>

      <div style={{ flex: "999 1 560px", minWidth: 0 }}>
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 15,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "10px 20px",
            padding: "22px clamp(20px, 3.5vw, 44px)",
            borderBottom: "1px solid var(--color-divider)",
            background: "color-mix(in srgb, var(--color-bg) 92%, transparent)",
            backdropFilter: "blur(10px)",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="pp-shell-hamburger"
              style={{
                display: "inline-flex",
                flex: "none",
                alignItems: "center",
                justifyContent: "center",
                width: 40,
                height: 40,
                background: "transparent",
                border: "1px solid var(--color-divider)",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                color: "var(--color-text)",
              }}
            >
              <Menu size={18} />
            </button>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(22px, 3vw, 32px)", fontWeight: 400, margin: 0, letterSpacing: "-0.01em" }}>
              {titleFor(pathname)}
            </h1>
          </span>
          {isSandbox && (
            <span
              className="pp-shell-badge"
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--color-accent-700)",
                border: "1px solid var(--color-accent)",
                borderRadius: 999,
                padding: "6px 14px",
                whiteSpace: "nowrap",
                flex: "none",
              }}
            >
              Sandbox mode
            </span>
          )}
        </header>

        <main style={{ padding: "clamp(24px, 3.5vw, 40px) clamp(20px, 3.5vw, 44px) 90px", maxWidth: 1140 }}>{children}</main>
      </div>

      {narrow && menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 70, background: "color-mix(in srgb, #171614 48%, transparent)", display: "flex" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(84vw, 300px)",
              background: "var(--color-neutral-100)",
              borderRight: "1px solid var(--color-divider)",
              boxShadow: "var(--shadow-lg)",
              padding: "20px 0 26px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "0 20px 20px" }}>
              <PriorityPayLogo size={19} />
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                style={{ display: "inline-flex", background: "transparent", border: 0, cursor: "pointer", color: "color-mix(in srgb, var(--color-text) 50%, transparent)", padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ height: 1, background: "var(--color-divider)", marginBottom: 12 }} />
            <nav style={{ display: "flex", flexDirection: "column", gap: 2, padding: "0 12px" }}>
              {NAV_ITEMS.map((n) => (
                <NavLink
                  key={n.href}
                  href={n.href}
                  label={n.label}
                  active={pathname === n.href || pathname.startsWith(`${n.href}/`)}
                  onClick={() => setMenuOpen(false)}
                />
              ))}
            </nav>
            <div style={{ flex: 1 }} />
            <div style={{ padding: "20px 22px 0" }}>
              <div style={{ height: 1, background: "var(--color-divider)", marginBottom: 16 }} />
              <button
                onClick={handleLogout}
                style={{ background: "transparent", border: 0, cursor: "pointer", padding: 0, fontFamily: "var(--font-body)", fontSize: 15, color: "color-mix(in srgb, var(--color-text) 52%, transparent)" }}
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        /* Sidebar/hamburger split is CSS-driven (not just the JS
           "narrow" state) so there's no flash of the desktop sidebar
           squeezing the header on first paint/hydration, and no dead
           zone if window.innerWidth is ever momentarily stale (e.g. iOS
           Safari's address-bar collapse). The JS state still exists for
           the drawer's open/close interaction and to auto-close it if
           the window is resized wide, but the breakpoint itself is
           enforced here so it always matches real layout. */
        .pp-shell-aside {
          display: block;
        }
        .pp-shell-hamburger {
          display: none !important;
        }
        @media (max-width: 880px) {
          .pp-shell-aside {
            display: none !important;
          }
          .pp-shell-hamburger {
            display: inline-flex !important;
          }
        }
        @media (max-width: 420px) {
          .pp-shell-badge {
            font-size: 10px !important;
            padding: 5px 10px !important;
            letter-spacing: 0.12em !important;
          }
        }
        .pp-ledger-navlink:hover {
          color: var(--color-accent-700) !important;
        }
        .pp-ledger-btn-primary:hover {
          background: var(--color-accent-600) !important;
          border-color: var(--color-accent-600) !important;
        }
        .pp-ledger-btn-ghost:hover {
          border-color: var(--color-accent) !important;
          color: var(--color-accent-700) !important;
        }
        body {
          background: var(--color-bg, #f3f2f2);
        }
        /* Section headings across Dashboard/Accounts/Income Split Rules/Close
           Out/Settings inherit the Ledger serif heading font -- weight
           still comes from each element's own Tailwind font-* class, this
           only swaps the typeface. */
        .pp-ledger-shell h1,
        .pp-ledger-shell h2,
        .pp-ledger-shell h3,
        .pp-ledger-shell h4 {
          font-family: var(--font-heading);
          letter-spacing: -0.005em;
        }
        .pp-ledger-shell input,
        .pp-ledger-shell select,
        .pp-ledger-shell textarea {
          font-family: var(--font-body);
        }
        /* Broad sweep for the remaining plain Tailwind neutral-gray
           borders/backgrounds/text left inside page-specific markup (card
           containers, info banners, muted copy) across Dashboard/
           Accounts/Income Split Rules/Close Out/Settings -- keeps every leftover
           spot visually consistent with the Ledger palette without
           needing to hand-convert every className. */
        .pp-ledger-shell .border-neutral-200,
        .pp-ledger-shell .border-neutral-100 {
          border-color: var(--color-divider) !important;
        }
        .pp-ledger-shell .rounded-xl,
        .pp-ledger-shell .rounded-lg,
        .pp-ledger-shell .rounded-2xl {
          border-radius: var(--radius-md) !important;
        }
        .pp-ledger-shell .bg-neutral-100 {
          background: var(--color-neutral-100) !important;
        }
        .pp-ledger-shell .bg-neutral-50,
        .pp-ledger-shell .bg-white {
          background: var(--color-bg) !important;
        }
        .pp-ledger-shell .text-neutral-400,
        .pp-ledger-shell .text-neutral-500 {
          color: color-mix(in srgb, var(--color-text) 55%, transparent) !important;
        }
        .pp-ledger-shell .text-neutral-600,
        .pp-ledger-shell .text-neutral-700 {
          color: color-mix(in srgb, var(--color-text) 75%, transparent) !important;
        }
        .pp-ledger-shell input,
        .pp-ledger-shell select {
          background: transparent;
        }
      `}</style>
    </div>
  );
}
