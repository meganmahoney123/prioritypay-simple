"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, ArrowRight, ChevronDown, ChevronRight, Home, Download, SlidersHorizontal, LayoutGrid, Target, User, X } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { BLOOM_TOKENS, APP_REFINED_TOKENS } from "@/lib/bloomTheme";
import { currency } from "@/components/ui";
import PriorityPayLogo from "@/components/PriorityPayLogo";
import AppLockGate from "@/components/AppLockGate";
import { isNativeApp } from "@/lib/native";
import { isW2NoSideHustle } from "@/lib/allocations";
import { groupByCategory, buildDeposit } from "@/components/PendingTransfers";

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
// Menu: three daily pages stand alone, everything else sits in two groups.
// Manage = things you do. Plan = things you look ahead with. Settings is
// pinned at the bottom on desktop and lives under the profile circle on
// phones (bottom tab bar: Home, Deposits, Split rules, Manage, Plan).
// Bills and Autopays / Savings Goals will be added to these groups when
// those pages exist.
const SHOW_TAX_QUIZ_NAV = false; // quiz not finished, same as before

function buildNav({ isW2Only = false, showDebt = false, showBusiness = false } = {}) {
  const manage = [
    { href: "/accounts", label: "Accounts" },
    { href: "/withdrawals", label: "Withdrawals" },
    { href: "/bills", label: "Bills and Autopays" },
    { href: "/transfers", label: "One-Time Transfer" },
    { href: "/closeout", label: isW2Only ? "Month in Review" : "Close Out" },
  ];
  if (showBusiness) manage.push({ href: "/business", label: "Business" });
  const plan = [
    { href: "/simulator", label: "Savings Calculator" },
    { href: "/projections", label: "Investment Projections" },
  ];
  if (SHOW_TAX_QUIZ_NAV) plan.push({ href: "/advisor", label: "Tax Savings Quiz" });
  if (showDebt) plan.push({ href: "/debt", label: "Debt Payoff" });
  return {
    top: [
      { href: "/dashboard", label: "Dashboard", tab: "Home", Icon: Home },
      { href: "/deposits", label: "Split My Deposits", tab: "Deposits", Icon: Download },
      { href: "/splits", label: "Deposit Splits", tab: "Split rules", Icon: SlidersHorizontal },
    ],
    groups: [
      { key: "manage", label: "Manage", tab: "Manage", Icon: LayoutGrid, items: manage },
      { key: "plan", label: "Plan", tab: "Plan", Icon: Target, items: plan },
    ],
    settings: { href: "/settings", label: "Settings" },
  };
}

const isActivePath = (pathname, href) => pathname === href || pathname.startsWith(`${href}/`);

// Business tab hidden for now (Business plan is paused). Flip to true to
// bring the nav item back for users on the Business plan.
const SHOW_BUSINESS_NAV = false;

const TITLES = {
  "/dashboard": "Dashboard",
  "/deposits": "Split My Deposits",
  "/projections": "Investment & Retirement Projections",
  "/accounts": "Linked Accounts",
  "/splits": "Deposit Splits",
  "/simulator": "Savings Calculator",
  "/debt": "Debt Payoff",
  "/transfers": "One-Time Transfer",
  "/withdrawals": "Withdrawals",
  "/bills": "Bills and Autopays",
  "/closeout": "Monthly Close-Out",
  "/history": "Transaction History",
  "/advisor": "Tax Savings Quiz",
  "/business": "Business",
  "/settings": "Settings",
};

// /splits/minimums and /splits/percentage-splits are now just redirects
// back to the single /splits page -- this still resolves any of the three
// paths to the same "Deposit Splits" header title and nav highlight.
function titleFor(pathname) {
  if (pathname.startsWith("/splits")) return TITLES["/splits"];
  return TITLES[pathname] || "PrioritySave";
}

// Lets the Dashboard page (only) inject content into AppShell's own
// sticky header instead of rendering its own separate sticky bar further
// down the page -- Megan wants the greeting where the page title
// ("Dashboard") normally sits, and the This Month/This Year toggle where
// the "Sandbox mode" badge sits (once that badge is gone -- see isSandbox
// below). AppShell exposes the two slot DOM nodes via context; Dashboard
// portals into them with react-dom's createPortal. No other page reads
// this context, so every other route keeps the plain titleFor(pathname)
// header exactly as before.
const DashboardHeaderSlotsContext = createContext({ titleSlot: null, actionsSlot: null });
export function useDashboardHeaderSlots() {
  return useContext(DashboardHeaderSlotsContext);
}

function NavLink({ href, label, active, onClick, badge }) {
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
      {badge > 0 && (
        <span
          aria-label={`${badge} waiting`}
          style={{
            marginLeft: "auto",
            minWidth: 22,
            height: 22,
            padding: "0 6px",
            borderRadius: 11,
            background: "var(--color-accent)",
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {badge}
        </span>
      )}
    </a>
  );
}

function GroupHeader({ label, open, hasActive, onToggle, id }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={id}
      className="pp-bloom-navlink"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        textAlign: "left",
        background: "transparent",
        border: 0,
        borderRadius: 14,
        cursor: "pointer",
        padding: "12px 13px",
        fontFamily: "var(--font-heading)",
        fontSize: 16,
        fontWeight: hasActive ? 800 : 700,
        letterSpacing: "0.01em",
        color: hasActive ? "var(--color-accent-700)" : "var(--color-text)",
      }}
    >
      {label}
      <span style={{ marginLeft: "auto", display: "inline-flex", color: "var(--color-neutral-700)" }}>
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </span>
    </button>
  );
}

function SubLink({ href, label, active }) {
  return (
    <a
      href={href}
      aria-current={active ? "page" : undefined}
      className="pp-bloom-navlink"
      style={{
        display: "block",
        borderRadius: 14,
        padding: "10px 13px 10px 26px",
        fontFamily: "var(--font-heading)",
        fontSize: 15,
        fontWeight: active ? 700 : 500,
        background: active ? "var(--color-accent-200)" : "transparent",
        color: active ? "var(--color-accent-700)" : "var(--color-text)",
        textDecoration: "none",
      }}
    >
      {label}
    </a>
  );
}

const pathnameIsDebt = (p) => p === "/debt" || p.startsWith("/debt/");

export default function AppShell({ children, isSandbox = false }) {
  const pathname = usePathname();
  const router = useRouter();
  const [narrow, setNarrow] = useState(false);
  // Phone: which sheet is open ("manage", "plan", "profile") or null.
  const [sheet, setSheet] = useState(null);
  // Desktop: groups the person folded (remembered per browser).
  const [folded, setFolded] = useState({});
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("pp-nav-folded");
      if (raw) setFolded(JSON.parse(raw) || {});
    } catch {}
  }, []);
  const toggleGroup = (key) =>
    setFolded((f) => {
      const next = { ...f, [key]: !f[key] };
      try {
        window.localStorage.setItem("pp-nav-folded", JSON.stringify(next));
      } catch {}
      return next;
    });
  // The "Sandbox mode" badge is a web/dev aid only. Inside the iOS app it
  // reads as an unfinished build to App Review, so hide it there.
  const [inNativeApp, setInNativeApp] = useState(false);
  useEffect(() => {
    isNativeApp().then(setInNativeApp);
  }, []);
  // DOM nodes for the two Dashboard-only header slots (see
  // DashboardHeaderSlotsContext above) -- state, not refs, so setting them
  // (via the ref callback below) triggers a re-render, which is what lets
  // Dashboard's createPortal calls find a real node on the same pass the
  // header itself mounts.
  const [titleSlotEl, setTitleSlotEl] = useState(null);
  const [actionsSlotEl, setActionsSlotEl] = useState(null);
  // Tax Savings Quiz doesn't apply to a plain W2 employee with no
  // self-employment/side income -- its strategies are almost entirely
  // self-employment/business-focused (see lib/quizEngine.js). Hidden from
  // nav for that one persona rather than removed outright, since it's
  // still relevant to every other persona (including W2 + side hustle,
  // since side income IS self-employment income).
  const [isW2Only, setIsW2Only] = useState(false);
  const [showDebt, setShowDebt] = useState(false);
  const showBusiness = false;
  const nav = useMemo(
    () => buildNav({ isW2Only, showDebt: showDebt || pathnameIsDebt(pathname), showBusiness }),
    [isW2Only, showDebt, pathname]
  );
  const pageTitle = (path) => (isW2Only && path === "/closeout" ? "Month in Review" : titleFor(path));
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
  // Number of deposits waiting to be split: the count badge on "Split My Deposits".
  const [waitingDeposits, setWaitingDeposits] = useState(0);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        // W2-only users see Close Out as "Month in Review" (no tax steps).
        if (isW2NoSideHustle(d.profile?.persona)) setIsW2Only(true);
        // Business tier (PHASE T): kept hidden while SHOW_BUSINESS_NAV is false.
        void SHOW_BUSINESS_NAV;
      })
      .catch(() => {});
    // Debt Payoff only shows for people it applies to: they added a debt or
    // have the Debt Payoff category.
    fetch("/api/debts")
      .then((r) => r.json())
      .then((d) => setShowDebt((d.debts || []).length > 0 || !!d.hasCategory))
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
      try {
        const dep = await fetch("/api/transfers/deposits").then((r) => r.json());
        setWaitingDeposits((dep.deposits || []).map(buildDeposit).filter((d) => d.waitingCount > 0).length);
      } catch {
        // badge is best-effort
      }
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
    setSheet(null);
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
  const pendingTotal = useMemo(() => pendingGroups.reduce((s, g) => s + (Number(g.amount) || 0), 0), [pendingGroups]);

  // Browser-tab title reminder: while anything is needs_approval/
  // in_transit, replace the normal per-page title with a reminder of what
  // still needs sending, restoring titleFor(pathname) the moment nothing
  // is pending. Picks the single largest pending group when there's
  // exactly one worth naming; falls back to a generic "Transfers
  // pending" line once there's more than one, per Megan's call that
  // correctness here matters more than naming every single one.
  useEffect(() => {
    const normalTitle = `${pageTitle(pathname)} | PrioritySave`;
    if (!hasPendingTransfers) {
      document.title = normalTitle;
      return;
    }
    const allGroups = [...pendingGroups, ...inTransitGroups];
    if (allGroups.length === 1) {
      const g = allGroups[0];
      const destAccount = pendingAccountsById[g.dest_account_id];
      const destName = destAccount
        ? `${destAccount.institution_name}${destAccount.mask ? ` •••• ${destAccount.mask}` : ""}`
        : g.dest_account_label || "your account";
      document.title = `→ ${currency(g.amount)} to ${destName} | PrioritySave`;
    } else {
      document.title = `${allGroups.length} transfers pending | PrioritySave`;
    }
    return () => {
      document.title = normalTitle;
    };
  }, [pathname, hasPendingTransfers, pendingGroups, inTransitGroups, pendingAccountsById, isW2Only]);

  useEffect(() => {
    const onResize = () => {
      const isNarrow = window.innerWidth < 880;
      setNarrow(isNarrow);
      if (!isNarrow) setSheet(null);
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
        ...APP_REFINED_TOKENS,
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
              {nav.top.map((n) => (
                <NavLink key={n.href} href={n.href} label={n.label} badge={n.href === "/deposits" ? waitingDeposits : 0} active={isActivePath(pathname, n.href)} />
              ))}
              {nav.groups.map((g) => {
                const hasActive = g.items.some((i) => isActivePath(pathname, i.href));
                // The group holding the current page always shows.
                const open = hasActive || !folded[g.key];
                return (
                  <div key={g.key} style={{ display: "flex", flexDirection: "column", gap: 2, width: "100%" }}>
                    <GroupHeader label={g.label} open={open} hasActive={hasActive} id={`nav-${g.key}`} onToggle={() => toggleGroup(g.key)} />
                    {open && (
                      <div id={`nav-${g.key}`} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {g.items.map((i) => (
                          <SubLink key={i.href} href={i.href} label={i.label} active={isActivePath(pathname, i.href)} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <div style={{ height: 8 }} />
              <NavLink href={nav.settings.href} label={nav.settings.label} active={isActivePath(pathname, nav.settings.href)} />
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
            // Solid, not translucent-with-blur -- two stacked `position:
            // sticky` elements (this header and the Splits page's own
            // "Nothing below is saved" bar) that both rely on
            // backdrop-filter blur are a known WKWebView ghosting bug:
            // the blur buffer for one can bleed a stale frame of
            // previously-scrolled content through the other, which is
            // what showed up as stray overlapping text on the Splits
            // page. An opaque background can't ghost anything through.
            background: "#FAF7FD",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flex: "1 1 auto" }}>
            {pathname === "/dashboard" ? (
              // Dashboard portals its "Good morning, Megan" greeting in
              // here (see useDashboardHeaderSlots) instead of the plain
              // page title -- ref callback both attaches the node and
              // triggers the re-render createPortal needs to find it.
              <span ref={setTitleSlotEl} style={{ minWidth: 0, flex: "1 1 auto" }} />
            ) : (
              <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(24px, 3vw, 34px)", fontWeight: 600, margin: 0, letterSpacing: "-0.03em" }}>
                {pageTitle(pathname)}
              </h1>
            )}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 12, flex: "none" }}>
          {pathname === "/dashboard" ? (
            // The Dashboard's This Month/This Year toggle always lives here
            // now, in the same top-right spot the "Sandbox mode" badge used
            // to occupy -- including while in sandbox mode, per Megan's
            // request, since the toggle is more useful there than the badge
            // (the sidebar/account context already makes sandbox mode clear
            // elsewhere). Every other page still shows the badge.
            <span ref={setActionsSlotEl} style={{ flex: "none" }} />
          ) : isSandbox && !inNativeApp ? (
            <span
              className="pp-shell-badge"
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: 12,
                fontWeight: 600,
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
          ) : null}
          <button
            type="button"
            onClick={() => setSheet("profile")}
            aria-label="Account and settings"
            className="pp-shell-profile"
            style={{
              width: 38,
              height: 38,
              borderRadius: 999,
              border: 0,
              cursor: "pointer",
              background: "var(--color-accent-200)",
              color: "var(--color-accent-700)",
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            <User size={18} />
          </button>
          </span>
        </header>

        {/* Persistent "transfer pending" reminder -- visible on every
            (app) page except Dashboard, so a real cross-account transfer
            someone recorded and then navigated away from is never
            forgotten (see also the browser-tab title reminder above,
            same purpose). Deliberately a plain, edge-to-edge notification
            bar -- not a card sitting in the page's own content, which
            read as if it belonged to whatever page it happened to land
            on (Settings, Split Rules, etc). It only ever names a total
            and links to the Dashboard, which is the one place with the
            actual per-category breakdown, bank links, and "I sent this"
            -- this bar doesn't duplicate that UI, just points at it, so
            there's exactly one real implementation of the checklist
            (components/PendingTransfers.js) and one thin pointer to it.
            Suppressed on /dashboard itself since that page already shows
            the real thing directly. */}
        {pendingGroups.length > 0 && pathname !== "/dashboard" && pathname !== "/deposits" && (
          <Link
            href="/deposits"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              width: "100%",
              boxSizing: "border-box",
              padding: "11px clamp(20px, 3.5vw, 44px)",
              background: "#E6DBFB",
              borderBottom: "1px solid var(--color-divider)",
              color: "var(--color-text)",
              textDecoration: "none",
            }}
          >
            <Bell size={14} style={{ flexShrink: 0, opacity: 0.85 }} />
            <span style={{ fontSize: 14, fontWeight: 600, textAlign: "center" }}>
              {waitingDeposits > 0 ? waitingDeposits : 1} deposit{waitingDeposits > 1 ? "s" : ""} ready to split &middot;{" "}
              {currency(pendingTotal)} to transfer
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 14, fontWeight: 600, textDecoration: "underline", flexShrink: 0 }}>
              Go split {waitingDeposits > 1 ? "them" : "it"} <ArrowRight size={13} />
            </span>
          </Link>
        )}

        <main className="pp-shell-main" style={{ padding: "clamp(24px, 3.5vw, 40px) clamp(20px, 3.5vw, 44px) 90px", maxWidth: 1140 }}>
          <DashboardHeaderSlotsContext.Provider value={{ titleSlot: titleSlotEl, actionsSlot: actionsSlotEl }}>
            {children}
          </DashboardHeaderSlotsContext.Provider>
        </main>
      </div>

      {narrow && sheet && (
        <div
          onClick={() => setSheet(null)}
          style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(36,22,52,0.5)", display: "flex", alignItems: "flex-end" }}
        >
          <div
            role="dialog"
            aria-label={sheet === "profile" ? "Account" : nav.groups.find((g) => g.key === sheet)?.label}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              background: "var(--color-surface)",
              borderRadius: "24px 24px 0 0",
              boxShadow: "var(--shadow-lg)",
              padding: "12px 20px calc(88px + env(safe-area-inset-bottom, 0px))",
              maxHeight: "80vh",
              overflowY: "auto",
            }}
          >
            <div style={{ width: 44, height: 5, borderRadius: 99, background: "var(--color-neutral-300)", margin: "0 auto 14px" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 600 }}>
                {sheet === "profile" ? "Account" : nav.groups.find((g) => g.key === sheet)?.label}
              </div>
              <button onClick={() => setSheet(null)} aria-label="Close" style={{ display: "inline-flex", background: "transparent", border: 0, cursor: "pointer", color: "var(--color-neutral-700)", padding: 4 }}>
                <X size={20} />
              </button>
            </div>
            {(sheet === "profile"
              ? [{ href: nav.settings.href, label: "Settings" }]
              : nav.groups.find((g) => g.key === sheet)?.items || []
            ).map((i) => (
              <a
                key={i.href}
                href={i.href}
                aria-current={isActivePath(pathname, i.href) ? "page" : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 4px",
                  borderTop: "1px solid var(--color-divider)",
                  fontFamily: "var(--font-heading)",
                  fontSize: 16,
                  fontWeight: isActivePath(pathname, i.href) ? 800 : 600,
                  color: isActivePath(pathname, i.href) ? "var(--color-accent-700)" : "var(--color-text)",
                  textDecoration: "none",
                }}
              >
                {i.label}
                <ChevronRight size={16} />
              </a>
            ))}
            {sheet === "profile" && (
              <button
                onClick={handleLogout}
                style={{ display: "block", width: "100%", textAlign: "left", background: "transparent", border: 0, borderTop: "1px solid var(--color-divider)", cursor: "pointer", padding: "14px 4px", fontFamily: "var(--font-heading)", fontSize: 16, fontWeight: 600, color: "var(--color-neutral-700)" }}
              >
                Log out
              </button>
            )}
          </div>
        </div>
      )}

      <nav
        aria-label="Main"
        className="pp-shell-tabbar"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 80,
          background: "var(--color-surface)",
          borderTop: "1px solid var(--color-divider)",
          padding: "8px 6px calc(8px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {[...nav.top, ...nav.groups].map((t) => {
          const isGroup = !!t.items;
          const active = isGroup ? t.items.some((i) => isActivePath(pathname, i.href)) || sheet === t.key : isActivePath(pathname, t.href);
          const inner = (
            <>
              <span
                style={{
                  position: "relative",
                  width: 30,
                  height: 26,
                  borderRadius: 10,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: active ? "var(--color-accent-200)" : "transparent",
                }}
              >
                <t.Icon size={18} />
                {t.href === "/deposits" && waitingDeposits > 0 && (
                  <span
                    aria-label={`${waitingDeposits} waiting`}
                    style={{ position: "absolute", top: -4, right: -2, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 8, background: "var(--color-accent)", color: "#fff", fontSize: 10, fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                  >
                    {waitingDeposits}
                  </span>
                )}
              </span>
              {t.tab}
            </>
          );
          const common = {
            className: "pp-shell-tab",
            style: {
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              background: "transparent",
              border: 0,
              cursor: "pointer",
              fontFamily: "var(--font-heading)",
              fontSize: 11.5,
              fontWeight: active ? 800 : 600,
              color: active ? "var(--color-accent-700)" : "var(--color-neutral-700)",
              textDecoration: "none",
            },
          };
          return isGroup ? (
            <button key={t.key} type="button" onClick={() => setSheet(sheet === t.key ? null : t.key)} aria-expanded={sheet === t.key} {...common}>
              {inner}
            </button>
          ) : (
            <a key={t.href} href={t.href} aria-current={active ? "page" : undefined} {...common}>
              {inner}
            </a>
          );
        })}
      </nav>

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
        .pp-shell-tabbar,
        .pp-shell-profile {
          display: none !important;
        }
        @media (max-width: 880px) {
          .pp-shell-aside {
            display: none !important;
          }
          .pp-shell-tabbar {
            display: flex !important;
          }
          .pp-shell-profile {
            display: inline-flex !important;
            align-items: center;
            justify-content: center;
          }
          .pp-shell-main {
            padding-bottom: calc(110px + env(safe-area-inset-bottom, 0px)) !important;
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
        /* Section headings across Dashboard/Accounts/Deposit Splits/Close
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
           Accounts/Deposit Splits/Close Out/Settings -- keeps every leftover
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
