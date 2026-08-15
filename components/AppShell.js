"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Landmark,
  SplitSquareVertical,
  CalendarCheck,
  Repeat,
  Settings as SettingsIcon,
  Zap,
  Menu,
} from "lucide-react";
import { Badge } from "./ui";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

// Payments tab removed -- every deposit splits automatically the moment
// Plaid's webhook detects it (see app/api/plaid/webhook), so there's no
// longer a manual trigger someone needs a dedicated nav item for. Recent
// transfers are still visible on the Dashboard.
const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/accounts", label: "Accounts", icon: Landmark },
  { href: "/splits", label: "Split Rules", icon: SplitSquareVertical },
  { href: "/closeout", label: "Close Out", icon: CalendarCheck },
  { href: "/subscriptions", label: "Subscriptions", icon: Repeat },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

const TITLES = {
  "/dashboard": "Dashboard",
  "/accounts": "Linked Accounts",
  "/splits": "Split Rules",
  "/closeout": "Monthly Close-Out",
  "/subscriptions": "Subscriptions",
  "/settings": "Settings",
};

// /splits/minimums and /splits/percentage-splits are now just redirects
// back to the single /splits page -- this still resolves any of the three
// paths to the same "Split Rules" header title and nav highlight.
function titleFor(pathname) {
  if (pathname.startsWith("/splits")) return TITLES["/splits"];
  return TITLES[pathname] || "PriorityPay Simple";
}

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await supabaseBrowser().auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="relative flex h-screen w-full bg-neutral-50 text-neutral-900 overflow-hidden">
      {sidebarOpen && (
        <div className="absolute inset-0 bg-neutral-900/40 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`w-64 md:w-56 shrink-0 bg-white border-r border-neutral-200 flex flex-col h-full absolute md:static inset-y-0 left-0 z-40 transform transition-transform duration-200 ease-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="px-5 py-5 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center">
            <Zap size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-base font-bold tracking-tight">PriorityPay Simple</span>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <a
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active ? "bg-emerald-50 text-emerald-700" : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
                }`}
              >
                <Icon size={18} strokeWidth={2} />
                {label}
              </a>
            );
          })}
        </nav>
        <div className="px-3 pb-4">
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700"
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-14 shrink-0 border-b border-neutral-200 bg-white flex items-center justify-between px-4 sm:px-6 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-neutral-500 hover:text-neutral-900 shrink-0"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-bold text-neutral-900 truncate">{titleFor(pathname)}</h1>
          </div>
          <Badge>Sandbox mode</Badge>
        </header>
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
