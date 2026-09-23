"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { BLOOM_TOKENS, MOVE_IN_COLOR, MOVE_OUT_COLOR } from "@/lib/bloomTheme";
import { currency, PrimaryButton } from "@/components/ui";
import PriorityPayLogo from "@/components/PriorityPayLogo";
import AppLockGate from "@/components/AppLockGate";
import { isW2NoSideHustle } from "@/lib/allocations";
import { groupByCategory } from "@/components/PendingTransfers";

// Payments tab removed -- every deposit splits automatically the moment
// Plaid's webhook detects it (see app/api/plaid/webhook), so there's no
// longer a manual trigger someone needs a dedicated nav item for. Recent
// transfers are still visible on the Dashboard.
//
// History tab removed by request -- it wasn't pulling its weight and just
// added clutter; the transfers it showed are still visible on the
// Dashboard, and the route itself (app/(app)/history/page.js) is left in
// place rather than deleted in case it's wanted again later, it's just no
// longer linked from anywhere in the nav.
const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/accounts", label: "Accounts" },
  { href: "/splits", label: "Income Split Rules" },
  { href: "/simulator", label: "Income Split Simulator" },
  { href: "/transfers", label: "One-Time Transfer" },
  { href: "/withdrawals", label: "Withdrawals" },
  { href: "/closeout", label: "Close Out" },
  { href: "/projections", label: "Investment Projections" },
  { href: "/advisor", label: "Tax Savings Quiz" },
  { href: "/settings", label: "Settings" },
];

const TITLES = {
  "/dashboard": "Dashboard",
  "/projections": "Investment & Retirement Projections",
  "/accounts": "Linked Accounts",
  "/splits": "Income Split Rules",
  "/simulator": "Income Split Simulator",
  "/transfers": "One-Time Transfer",
  "/withdrawals": "Withdrawals",
  "/closeout": "Monthly Close-Out",
  "/history": "Transaction History",
  "/advisor": "Tax Savings Quiz",
  "/business": "Business",
  "/settings": "Settings",
};

// /splits/minimums and /splits/percentage-splits are now just redirects
// back to the single /splits page -- this still resolves any of the three
// paths to the same "Income Split Rules" header title and nav highlight.
function titleFor(pathname) {
  if (pathname.startsWith("/splits")) return TITLES["/splits"];
  return TITLES[pathname] || "PriorityPay";
}

function NavLink({ href, label, active, onClick }) {
  return (
    <a
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className="pp-bloom-navlink"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        textAlign: "left",
        background: active ? "var(--color-accent-200)" : "transparent",
        borderRadius: 14,
        cursor: "pointer",
        padding: "12px 13px",
        fontFamily: "var(--font-heading)",
        fontSize: 16,
        fontWeight: active ? 700 : 500,
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
          background: active ? "var(--color-accent)" : "var(--color-neutral-400)",
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
  // Tax Savings Quiz doesn't apply to a plain W2 employee with no
  // self-employment/side income -- its strategies are almost entirely
  // self-employment/business-focused (see lib/quizEngine.js). Hidden from
  // nav for that one persona rather than removed outright, since it's
  // still relevant to every other persona (including W2 + side hustle,
  // since side income IS self-employment income).
  const [navItems, setNavItems] = useState(NAV_ITEMS);
  // Powers both the persistent "transfer pending" banner below and the
  // browser-tab title reminder -- same /api/transfers/pending shape the
  // Dashboard already fetches (see app/(app)/dashboard/page.js), plus
  // /api/accounts so account labels/institutions can be resolved the same
  // way components/PendingTransfers.js does. Deliberately scoped to ONLY
  // the real cross-account needs_approval/in_transit flow -- same-account
  // category-to-category bookkeeping transfers (POST
  // /api/allocations/category-transfer) never create rows in this status
  // flow at all, so they can never show up here.
  const [pendingAllocations, setPendingAllocations] = useState([]);
  const [pendingAccounts, setPendingAccounts] = useState([]);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        let items = NAV_ITEMS;
        // Hide the Tax Savings Quiz for a plain W2-no-side-hustle persona
        // (see the comment on navItems above).
        if (isW2NoSideHustle(d.profile?.persona)) {
          items = items.filter((n) => n.href !== "/advisor");
        }
        // Business tier (PHASE T): the /business hub only appears for a
        // user actually on the Business plan. Simple-plan users reach the
        // upgrade CTA from Settings instead, so the nav item stays hidden
        // until their plan flips (via the Stripe webhook). Inserted just
        // before Settings so it reads as the last product area.
        if (d.profile?.billing?.isBusiness) {
          const settingsIdx = items.findIndex((n) => n.href === "/settings");
          const at = settingsIdx === -1 ? items.length : settingsIdx;
          items = [...items.slice(0, at), { href: "/business", label: "Business" }, ...items.slice(at)];
        }
        if (items !== NAV_ITEMS) setNavItems(items);
      })
      .catch(() => {});
  }, []);

  const loadPendingTransfers = async () => {
    try {
      const [pendingRes, accountsRes] = await Promise.all([
        fetch("/api/transfers/pending").then((r) => r.json()),
        fetch("/api/accounts").then((r) => r.json()),
      ]);
      setPendingAllocations(pendingRes.allocations || []);
      setPendingAccounts(accountsRes.accounts || []);
    } catch {
      // Best-effort -- a failed fetch here just means the banner/title
      // reminder stay as they were; it never blocks the rest of the app.
    }
  };

  // Re-checked on every navigation within the (app) shell (AppShell stays
  // mounted across route changes, this effect just re-runs its fetch),
  // so confirming a transfer on one page clears the banner on the next
  // page without needing a full reload -- same reason
  // components/PendingTransfers.js's onConfirmed callback refetches.
  useEffect(() => {
    loadPendingTransfers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const pendingAccountsById = useMemo(() => Object.fromEntries(pendingAccounts.map((a) => [a.id, a])), [pendingAccounts]);
  const pendingGroups = useMemo(
    () => groupByCategory((pendingAllocations || []).filter((a) => a.status === "needs_approval")),
    [pendingAllocations]
  );
  const inTransitGroups = useMemo(
    () => groupByCategory((pendingAllocations || []).filter((a) => a.status === "in_transit")),
    [pendingAllocations]
  );
  const hasPendingTransfers = pendingGroups.length > 0 || inTransitGroups.length > 0;

  // Browser-tab title reminder: while anything is needs_approval/
  // in_transit, replace the normal per-page title with a reminder of what
  // still needs sending, restoring titleFor(pathname) the moment nothing
  // is pending. Picks the single largest pending group when there's
  // exactly one worth naming; falls back to a generic "Transfers
  // pending" line once there's more than one, per Megan's call that
  // correctness here matters more than naming every single one.
  useEffect(() => {
    const normalTitle = `${titleFor(pathname)} | PriorityPay`;
    if (!hasPendingTransfers) {
      document.title = normalTitle;
      return;
    }
    const allGroups = [...pendingGroups, ...inTransitGroups];
    if (allGroups.length === 1) {
      const g = allGroups[0];
      const destAccount = pendingAccountsById[g.dest_account_id];
      const destName = destAccount
        ? `${destAccount.institution_name} •••• ${destAccount.mask}`
        : g.dest_account_label || "your account";
      document.title = `→ ${currency(g.amount)} to ${destName} | PriorityPay`;
    } else {
      document.title = `Transfers pending (${allGroups.length}) | PriorityPay`;
    }
    return () => {
      document.title = normalTitle;
    };
  }, [pathname, hasPendingTransfers, pendingGroups, inTransitGroups, pendingAccountsById]);

  const [bannerBusyKey, setBannerBusyKey] = useState(null);
  const confirmFromBanner = async (group) => {
    setBannerBusyKey(group.key);
    try {
      // Same endpoint components/PendingTransfers.js's own confirm()
      // calls -- this banner is just another entry point to it, not a
      // second implementation.
      const results = await Promise.all(
        group.ids.map((id) => fetch(`/api/transfer-allocations/${id}/confirm`, { method: "POST" }))
      );
      if (results.some((r) => r.ok)) await loadPendingTransfers();
    } finally {
      setBannerBusyKey(null);
    }
  };

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
    <AppLockGate>
    <div
      className="pp-ledger-shell"
      style={{
        ...BLOOM_TOKENS,
        minHeight: "100vh",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "stretch",
        background: "var(--color-bg)",
      }}
    >
      <aside
        className="pp-shell-aside"
        style={{ flex: "1 1 250px", minWidth: 0, borderRight: "1px solid var(--color-divider)", background: "var(--color-surface)" }}
      >
          <div style={{ position: "sticky", top: 0, padding: "20px 0 22px" }}>
            <div style={{ display: "flex", alignItems: "center", padding: "0 22px 20px" }}>
              <PriorityPayLogo size={19} />
            </div>
            <nav style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "0 12px", flexDirection: "column" }}>
              {navItems.map((n) => (
                <NavLink key={n.href} href={n.href} label={n.label} active={pathname === n.href || pathname.startsWith(`${n.href}/`)} />
              ))}
            </nav>
            <div style={{ padding: "20px 22px 0" }}>
              <div style={{ height: 1, background: "var(--color-divider)", marginBottom: 16 }} />
              <button
                onClick={handleLogout}
                className="pp-bloom-logout"
                style={{
                  background: "transparent",
                  border: 0,
                  cursor: "pointer",
                  padding: 0,
                  fontFamily: "var(--font-body)",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--color-neutral-700)",
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
            background: "rgba(250,247,253,0.92)",
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
                border: "1px solid var(--color-neutral-300)",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                color: "var(--color-text)",
              }}
            >
              <Menu size={18} />
            </button>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(24px, 3vw, 34px)", fontWeight: 800, margin: 0, letterSpacing: "-0.03em" }}>
              {titleFor(pathname)}
            </h1>
          </span>
          {isSandbox && (
            <span
              className="pp-shell-badge"
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--color-accent-700)",
                background: "var(--color-accent-100)",
                border: "1px solid var(--color-accent-400)",
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

        <main style={{ padding: "clamp(24px, 3.5vw, 40px) clamp(20px, 3.5vw, 44px) 90px", maxWidth: 1140 }}>
          {/* Persistent "transfer pending" banner -- visible on every
              (app) page, not just Dashboard/Transfers, so a real
              cross-account transfer someone recorded and then navigated
              away from is never forgotten. Same From/To/Amount info as
              components/PendingTransfers.js's "Transfers waiting on you"
              card and the same confirm endpoint -- this is another
              surface for it, not a second implementation. Only ever
              shows rows in the real needs_approval/in_transit flow;
              same-account category-to-category bookkeeping transfers
              never enter that flow, so they never appear here. */}
          {pendingGroups.length > 0 && (
            <div
              className="mb-6 space-y-2"
              style={{
                border: `1px solid ${MOVE_OUT_COLOR}55`,
                borderRadius: "var(--radius-md)",
                background: "var(--color-accent-100)",
                padding: "16px 20px",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--color-accent-700)",
                }}
              >
                Transfer{pendingGroups.length > 1 ? "s" : ""} waiting on you
              </div>
              <div className="space-y-2">
                {pendingGroups.map((g) => {
                  const destAccount = pendingAccountsById[g.dest_account_id];
                  const sourceAccount = pendingAccountsById[g.source_account_id];
                  const destName = destAccount
                    ? `${destAccount.institution_name} ${destAccount.account_name} •••• ${destAccount.mask}`
                    : g.dest_account_label || "an account";
                  const sourceName = sourceAccount
                    ? `${sourceAccount.institution_name} ${sourceAccount.account_name} •••• ${sourceAccount.mask}`
                    : g.source_account_label || "your account";
                  const busy = bannerBusyKey === g.key;
                  return (
                    <div
                      key={g.key}
                      className="flex items-center justify-between gap-3 flex-wrap"
                      style={{ padding: "8px 12px", borderRadius: "var(--radius-sm)", background: "var(--color-surface)" }}
                    >
                      <div className="text-sm min-w-0">
                        <span style={{ color: MOVE_OUT_COLOR, fontWeight: 600 }}>{sourceName}</span>
                        {" → "}
                        <span style={{ color: MOVE_IN_COLOR, fontWeight: 600 }}>{destName}</span>
                        <span className="font-mono font-semibold ml-2">{currency(g.amount)}</span>
                      </div>
                      <PrimaryButton onClick={() => confirmFromBanner(g)} disabled={busy} style={{ padding: "6px 14px", fontSize: 13 }}>
                        {busy ? "Marking…" : "I sent this"}
                      </PrimaryButton>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {children}
        </main>
      </div>

      {narrow && menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(36,22,52,0.5)", display: "flex" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(84vw, 300px)",
              background: "var(--color-surface)",
              borderRadius: "0 24px 24px 0",
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
                style={{ display: "inline-flex", background: "transparent", border: 0, cursor: "pointer", color: "var(--color-neutral-700)", padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ height: 1, background: "var(--color-divider)", marginBottom: 12 }} />
            <nav style={{ display: "flex", flexDirection: "column", gap: 2, padding: "0 12px" }}>
              {navItems.map((n) => (
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
                style={{ background: "transparent", border: 0, cursor: "pointer", padding: 0, fontFamily: "var(--font-body)", fontSize: 15, fontWeight: 600, color: "var(--color-neutral-700)" }}
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
            letter-spacing: 0.1em !important;
          }
        }
        .pp-bloom-navlink:hover {
          background: var(--color-accent-100) !important;
          color: var(--color-accent-700) !important;
        }
        .pp-bloom-logout:hover {
          color: var(--color-accent-700) !important;
        }
        .pp-ledger-btn-primary:hover {
          background: var(--color-accent-700) !important;
          border-color: var(--color-accent-700) !important;
        }
        .pp-ledger-btn-ghost:hover {
          border-color: var(--color-accent) !important;
          color: var(--color-accent-700) !important;
        }
        body {
          background: var(--color-bg, #FAF7FD);
        }
        /* Section headings across Dashboard/Accounts/Income Split Rules/Close
           Out/Settings inherit the shared heading font -- weight
           still comes from each element's own Tailwind font-* class, this
           only swaps the typeface. */
        .pp-ledger-shell h1,
        .pp-ledger-shell h2,
        .pp-ledger-shell h3,
        .pp-ledger-shell h4 {
          font-family: var(--font-heading);
          letter-spacing: -0.01em;
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
           spot visually consistent with the Bloom palette without
           needing to hand-convert every className. Screens not yet migrated
           off Ledger tokens still render inside this same shell, so these
           mappings intentionally target Bloom colors now that the shell
           itself has moved. */
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
          background: var(--color-surface) !important;
        }
        .pp-ledger-shell .text-neutral-400,
        .pp-ledger-shell .text-neutral-500 {
          color: var(--color-neutral-700) !important;
        }
        .pp-ledger-shell .text-neutral-600,
        .pp-ledger-shell .text-neutral-700 {
          color: var(--color-neutral-800) !important;
        }
        .pp-ledger-shell input,
        .pp-ledger-shell select {
          background: transparent;
        }
      `}</style>
    </div>
    </AppLockGate>
  );
}
