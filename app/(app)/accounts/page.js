"use client";

import { useEffect, useState } from "react";
import { Landmark, CreditCard, Briefcase } from "lucide-react";
import { Card, Badge, GhostButton } from "@/components/ui";
import PlaidLinkButton from "@/components/PlaidLinkButton";

// Identity verification (Dwolla KYC) used to gate this whole page -- see
// the removed dwollaStatus check below and the equivalent removal in
// app/onboarding/page.js. That was required because Dwolla originated
// real transfers on someone's behalf; manual-approval mode
// (lib/runSplit.js) means PriorityPay never touches money itself, so
// there's nothing left that actually needs identity verified before
// connecting an account.
export default function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [disconnectingId, setDisconnectingId] = useState(null);
  const [disconnectError, setDisconnectError] = useState(null);

  const load = async () => {
    const accountsRes = await fetch("/api/accounts").then((r) => r.json());
    setAccounts(accountsRes.accounts || []);
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

  if (loading) return <p className="text-sm text-neutral-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        {/* "...or app" was dropped here on purpose -- Plaid's Transactions
            product links real bank/credit union accounts, not P2P apps
            like Venmo or Cash App, so the old copy overpromised what this
            button can actually connect. */}
        <PlaidLinkButton label="Connect a bank account" onLinked={load} />
        <PlaidLinkButton
          label="Add a credit card"
          creditCard
          onLinked={load}
          className="text-xs px-4 py-2 mt-2 ml-2"
          style={{ backgroundColor: "#525252" }}
        />
        <p className="text-xs text-neutral-500 mt-2">
          Credit cards are for close-out expense tracking only — they're never used for splits or transfers.
        </p>
        {disconnectError && <p className="text-xs text-red-600 mt-2">{disconnectError}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {accounts.map((acc) => (
          <Card key={acc.id} className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center">
                  {acc.account_type === "credit" ? (
                    <CreditCard size={18} className="text-neutral-600" />
                  ) : acc.account_type === "business" ? (
                    <Briefcase size={18} className="text-neutral-600" />
                  ) : (
                    <Landmark size={18} className="text-neutral-600" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-semibold">{acc.institution_name}</div>
                  <div className="text-xs text-neutral-500">{acc.account_name} •••• {acc.mask}</div>
                </div>
              </div>
              <Badge>{acc.account_type === "credit" ? "Credit card" : acc.account_type === "business" ? "Business account" : "Active"}</Badge>
            </div>
            {acc.account_type === "credit" ? (
              <p className="text-xs text-neutral-500">Spending here shows up in close-out. Not used for splits.</p>
            ) : acc.account_type === "business" ? (
              <p className="text-xs text-neutral-500">Balance shown for visibility only — never used for splits or transfers.</p>
            ) : acc.autoDetectEnabled ? (
              <p className="text-xs font-medium" style={{ color: "var(--color-accent-700)" }}>Deposits here are split automatically — you'll get a checklist to confirm and send each transfer</p>
            ) : (
              <div>
                <p className="text-xs text-amber-700 mb-2">
                  Linked before auto-detect existed — deposits here still need the manual Split button.
                </p>
                <PlaidLinkButton
                  mode="update"
                  accountId={acc.id}
                  label="Enable auto-detect"
                  onUpdated={load}
                  className="text-xs px-3 py-1.5"
                />
              </div>
            )}
            <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--color-divider)" }}>
              <GhostButton
                onClick={() => disconnect(acc)}
                disabled={disconnectingId === acc.id}
                className="text-xs px-3 py-1.5"
              >
                {disconnectingId === acc.id ? "Disconnecting…" : "Disconnect"}
              </GhostButton>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
