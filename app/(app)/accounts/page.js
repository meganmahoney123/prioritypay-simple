"use client";

import { useEffect, useState } from "react";
import { Landmark, CreditCard, Briefcase } from "lucide-react";
import { Card, Badge } from "@/components/ui";
import IdentityForm from "@/components/IdentityForm";
import PlaidLinkButton from "@/components/PlaidLinkButton";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  // Holds Dwolla's actual verification_status string, not just "does a
  // Dwolla customer record exist" -- a customer stuck in retry/kba/
  // document/suspended isn't actually able to send funds yet, so showing
  // them the "connect accounts" UI instead of a way to finish
  // verification would let them link banks and build split rules that
  // can never actually execute. See app/onboarding/page.js for the fuller
  // writeup of why this changed.
  const [dwollaStatus, setDwollaStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [accountsRes, statusRes] = await Promise.all([
      fetch("/api/accounts").then((r) => r.json()),
      fetch("/api/dwolla/status").then((r) => r.json()),
    ]);
    setAccounts(accountsRes.accounts || []);
    setDwollaStatus(statusRes.status || null);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <p className="text-sm text-neutral-500">Loading…</p>;

  return (
    <div className="space-y-6">
      {dwollaStatus !== "verified" ? (
        <Card className="p-5">
          <h2 className="text-sm font-semibold mb-3">Verify your identity first</h2>
          {dwollaStatus === "retry" ? (
            <>
              <p className="text-xs text-neutral-500 mb-3">
                We weren&apos;t able to verify your identity with the information provided. This time, we also need
                your full 9-digit SSN.
              </p>
              <IdentityForm onDone={load} theme="ledger" mode="retry" />
            </>
          ) : dwollaStatus === "kba" || dwollaStatus === "document" || dwollaStatus === "suspended" ? (
            <p className="text-xs text-neutral-500">
              {dwollaStatus === "suspended"
                ? "Your identity verification was suspended and can't be resolved automatically."
                : "We need a bit more to verify your identity than this form can collect automatically."}{" "}
              Email us at{" "}
              <a href="mailto:megan@ignitemysite.com" className="underline">megan@ignitemysite.com</a> and
              we&apos;ll help you finish verification directly.
            </p>
          ) : (
            <IdentityForm onDone={load} theme="ledger" />
          )}
        </Card>
      ) : (
        <div>
          <PlaidLinkButton label="Connect a bank account or app" onLinked={load} />
          <PlaidLinkButton
            label="Add a credit card"
            creditCard
            onLinked={load}
            className="text-xs px-4 py-2 mt-2 ml-2"
            style={{ backgroundColor: "#525252" }}
          />
          <p className="text-xs text-neutral-500 mt-2">
            Credit cards are for close-out expense tracking only -- they're never used for splits or transfers.
          </p>
        </div>
      )}

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
              <p className="text-xs text-neutral-500">Balance shown for visibility only -- never used for splits or transfers.</p>
            ) : acc.autoDetectEnabled ? (
              <p className="text-xs font-medium" style={{ color: "var(--color-accent-700)" }}>Deposits here split automatically</p>
            ) : (
              <div>
                <p className="text-xs text-amber-700 mb-2">
                  Linked before auto-detect existed -- deposits here still need the manual Split button.
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
          </Card>
        ))}
      </div>
    </div>
  );
}
