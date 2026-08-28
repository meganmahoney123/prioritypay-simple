"use client";

import { useEffect, useState } from "react";
import { Landmark, CreditCard, Briefcase } from "lucide-react";
import { Card, Badge } from "@/components/ui";
import PlaidLinkButton from "@/components/PlaidLinkButton";
import AccountCategoryBreakdown from "@/components/AccountCategoryBreakdown";
import { bloomGhostButtonStyle, bloomWarningCardStyle } from "@/lib/bloomTheme";

// Identity verification (Dwolla KYC) used to gate this whole page -- see
// the removed dwollaStatus check below and the equivalent removal in
// app/onboarding/page.js. That was required because Dwolla originated
// real transfers on someone's behalf; manual-approval mode
// (lib/runSplit.js) means PriorityPay never touches money itself, so
// there's nothing left that actually needs identity verified before
// connecting an account.
export default function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [categoryBalances, setCategoryBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const [disconnectingId, setDisconnectingId] = useState(null);
  const [disconnectError, setDisconnectError] = useState(null);

  const load = async () => {
    // Fetched once here (not per-account inside AccountCategoryBreakdown)
    // to avoid N duplicate /api/allocations/account-balances requests for
    // N connected accounts -- the whole payload is small and each account
    // Card just reads its own slice out of the lookup below.
    const [accountsRes, categoryBalancesRes] = await Promise.all([
      fetch("/api/accounts").then((r) => r.json()),
      fetch("/api/allocations/account-balances").then((r) => r.json()),
    ]);
    setAccounts(accountsRes.accounts || []);
    setCategoryBalances(Object.fromEntries((categoryBalancesRes.accounts || []).map((a) => [a.accountId, a])));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const disconnect = async (acc) => {
    const confirmed = window.confirm(
      `Disconnect ${acc.institution_name} ${acc.account_name} •••• ${acc.mask}? ` +
        `Any split rule currently sending money here will need a new account, and PriorityPay will stop seeing its deposits.`
    );
    if (!confirmed) return;

    setDisconnectError(null);
    setDisconnectingId(acc.id);
    const res = await fetch("/api/plaid/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId: acc.id }),
    });
    const data = await res.json();
    setDisconnectingId(null);
    if (!res.ok || !data.ok) {
      setDisconnectError(data.error || "Could not disconnect that account.");
      return;
    }
    load();
  };

  if (loading) return <p className="text-sm" style={{ color: "var(--color-neutral-700)" }}>Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        {/* "...or app" was dropped here on purpose -- Plaid's Transactions
            product links real bank/credit union accounts, not P2P apps
            like Venmo or Cash App, so the old copy overpromised what this
            button can actually connect. */}
        <PlaidLinkButton
          label="Connect a bank account"
          onLinked={load}
          style={{ borderRadius: "var(--radius-pill)", fontFamily: "var(--font-heading)", fontWeight: 700 }}
        />
        <PlaidLinkButton
          label="Add a credit card"
          creditCard
          onLinked={load}
          className="text-xs mt-2 ml-2"
          style={{
            borderRadius: "var(--radius-pill)",
            fontFamily: "var(--font-heading)",
            fontWeight: 700,
            padding: "10px 20px",
            background: "var(--color-accent-800)",
            border: "1px solid var(--color-accent-800)",
          }}
        />
        <p className="text-xs mt-2" style={{ color: "var(--color-neutral-700)" }}>
          Credit cards are for close-out expense tracking only — they're never used for splits or transfers.
        </p>
        {disconnectError && (
          <div className="text-xs mt-2 p-3" style={bloomWarningCardStyle()}>
            {disconnectError}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {accounts.map((acc) => (
          <Card key={acc.id} style={{ padding: "18px 20px", borderRadius: "var(--radius-md)", background: "var(--color-surface)" }}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 flex items-center justify-center"
                  style={{ borderRadius: "var(--radius-sm)", background: "var(--color-accent-100)" }}
                >
                  {acc.account_type === "credit" ? (
                    <CreditCard size={18} style={{ color: "var(--color-accent-700)" }} />
                  ) : acc.account_type === "business" ? (
                    <Briefcase size={18} style={{ color: "var(--color-accent-700)" }} />
                  ) : (
                    <Landmark size={18} style={{ color: "var(--color-accent-700)" }} />
                  )}
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-heading)", fontSize: 18 }}>{acc.institution_name}</div>
                  <div className="text-xs" style={{ color: "var(--color-neutral-700)" }}>{acc.account_name} •••• {acc.mask}</div>
                </div>
              </div>
              <Badge>{acc.account_type === "credit" ? "Credit card" : acc.account_type === "business" ? "Business account" : "Active"}</Badge>
            </div>
            {acc.account_type === "credit" ? (
              <p className="text-xs" style={{ color: "var(--color-neutral-700)" }}>Spending here shows up in close-out. Not used for splits.</p>
            ) : acc.account_type === "business" ? (
              <p className="text-xs" style={{ color: "var(--color-neutral-700)" }}>Balance shown for visibility only — never used for splits or transfers.</p>
            ) : acc.autoDetectEnabled ? (
              <p className="text-xs font-medium" style={{ color: "var(--color-accent-700)" }}>Deposits here are split automatically — you'll get a checklist to confirm and send each transfer</p>
            ) : (
              <div>
                <p className="text-xs mb-2" style={{ color: "#9C3B22" }}>
                  Linked before auto-detect existed — deposits here still need the manual Split button.
                </p>
                <PlaidLinkButton
                  mode="update"
                  accountId={acc.id}
                  label="Enable auto-detect"
                  onUpdated={load}
                  className="text-xs"
                  style={{ borderRadius: "var(--radius-pill)", fontFamily: "var(--font-heading)", fontWeight: 700, padding: "8px 16px", fontSize: 13 }}
                />
              </div>
            )}
            <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--color-divider)" }}>
              <button
                type="button"
                onClick={() => disconnect(acc)}
                disabled={disconnectingId === acc.id}
                className="text-xs"
                style={bloomGhostButtonStyle({
                  color: "var(--color-accent-700)",
                  border: "none",
                  background: "transparent",
                  padding: "6px 4px",
                  fontSize: 13,
                  opacity: disconnectingId === acc.id ? 0.45 : 1,
                  cursor: disconnectingId === acc.id ? "not-allowed" : "pointer",
                })}
              >
                {disconnectingId === acc.id ? "Disconnecting…" : "Disconnect"}
              </button>
            </div>
            <AccountCategoryBreakdown accountId={acc.id} data={categoryBalances[acc.id]} />
          </Card>
        ))}
      </div>
    </div>
  );
}
