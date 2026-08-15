"use client";

import { useEffect, useState } from "react";
import { Landmark } from "lucide-react";
import { Card, Badge } from "@/components/ui";
import IdentityForm from "@/components/IdentityForm";
import PlaidLinkButton from "@/components/PlaidLinkButton";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [dwollaVerified, setDwollaVerified] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [accountsRes, statusRes] = await Promise.all([
      fetch("/api/accounts").then((r) => r.json()),
      fetch("/api/dwolla/status").then((r) => r.json()),
    ]);
    setAccounts(accountsRes.accounts || []);
    setDwollaVerified(statusRes.verified);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <p className="text-sm text-neutral-500">Loading…</p>;

  return (
    <div className="space-y-6">
      {!dwollaVerified ? (
        <Card className="p-5">
          <h2 className="text-sm font-semibold mb-3">Verify your identity first</h2>
          <IdentityForm onDone={load} />
        </Card>
      ) : (
        <PlaidLinkButton onLinked={load} />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {accounts.map((acc) => (
          <Card key={acc.id} className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center">
                  <Landmark size={18} className="text-neutral-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{acc.institution_name}</div>
                  <div className="text-xs text-neutral-500">{acc.account_name} •••• {acc.mask}</div>
                </div>
              </div>
              <Badge>Active</Badge>
            </div>
            {acc.autoDetectEnabled ? (
              <p className="text-xs text-emerald-700 font-medium">Deposits here split automatically</p>
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
