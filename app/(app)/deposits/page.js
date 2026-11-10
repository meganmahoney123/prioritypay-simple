"use client";

import { useEffect, useState } from "react";
import PendingTransfers from "@/components/PendingTransfers";

// "Split My Deposits": the transfer checklist, on its own tab so it doesn't
// crowd the Dashboard. The Dashboard shows a notification that links here.
export default function DepositsPage() {
  const [accounts, setAccounts] = useState([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((d) => setAccounts(d.accounts || []))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      <PendingTransfers showEmpty accounts={accounts} refreshKey={tick} onChanged={() => setTick((t) => t + 1)} />
    </div>
  );
}
