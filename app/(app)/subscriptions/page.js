"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Repeat, Landmark, CalendarClock, AlertCircle } from "lucide-react";
import { Card, currency } from "@/components/ui";

function formatDate(iso) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function daysUntil(iso) {
  const now = new Date();
  const target = new Date(`${iso}T00:00:00Z`);
  const diff = Math.round((target - Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) / 86400000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return `in ${diff} days`;
}

function SubscriptionRow({ sub }) {
  return (
    <div className="flex items-center justify-between gap-4 border border-neutral-200 rounded-xl px-4 py-3.5 bg-white">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
          <Repeat size={16} className="text-emerald-700" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-neutral-900 truncate">{sub.merchant}</div>
          <div className="text-xs text-neutral-500 flex items-center gap-1.5 flex-wrap">
            <span>{sub.cadence}</span>
            <span>·</span>
            <span>{sub.occurrences} charges seen</span>
            {sub.accountLabel && (
              <>
                <span>·</span>
                <span className="truncate">{sub.accountLabel}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-bold text-neutral-900 font-mono">{currency(sub.amount)}</div>
        <div className="text-xs text-neutral-500">{formatDate(sub.nextChargeDate)} &middot; {daysUntil(sub.nextChargeDate)}</div>
      </div>
    </div>
  );
}

export default function SubscriptionsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/subscriptions")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="text-sm text-neutral-500">Loading...</div>;
  }

  if (!data || data.connectedAccounts === 0) {
    return (
      <div className="max-w-2xl">
        <Card className="p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <Landmark size={22} className="text-emerald-700" />
          </div>
          <h2 className="text-lg font-bold text-neutral-900 mb-2">Connect an account to see your subscriptions</h2>
          <p className="text-sm text-neutral-600 mb-5">
            Once you connect an account, PriorityPay scans your transaction history and predicts which recurring
            charges are coming up -- streaming services, software, memberships, anything that bills you on a
            schedule.
          </p>
          <Link href="/accounts" className="text-sm font-bold text-emerald-700 hover:text-emerald-800">
            Connect an account &rarr;
          </Link>
        </Card>
      </div>
    );
  }

  const { subscriptions, upcoming, monthlyEstimate } = data;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <p className="text-neutral-600 max-w-2xl">
          PriorityPay looks at the last few months of transactions across every connected account and predicts
          which recurring charges are about to hit -- so nothing catches you off guard.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="text-xs font-bold uppercase tracking-wide text-neutral-400 mb-1">Charging in the next 30 days</div>
          <div className="text-3xl font-extrabold text-neutral-900 font-mono">{upcoming.length}</div>
          <div className="text-sm text-neutral-500 mt-1">
            {currency(upcoming.reduce((s, u) => s + u.amount, 0))} total
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs font-bold uppercase tracking-wide text-neutral-400 mb-1">Estimated recurring spend</div>
          <div className="text-3xl font-extrabold text-neutral-900 font-mono">{currency(monthlyEstimate)}</div>
          <div className="text-sm text-neutral-500 mt-1">per month, across {subscriptions.length} subscriptions</div>
        </Card>
      </div>

      <div>
        <h2 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2">
          <CalendarClock size={16} className="text-emerald-700" />
          Charging soon
        </h2>
        {upcoming.length === 0 ? (
          <Card className="p-5 text-sm text-neutral-500">Nothing predicted to charge in the next 30 days.</Card>
        ) : (
          <div className="space-y-2.5">
            {upcoming.map((sub) => (
              <SubscriptionRow key={sub.key} sub={sub} />
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-bold text-neutral-900 mb-3">All recurring charges we found</h2>
        {subscriptions.length === 0 ? (
          <Card className="p-5 flex items-start gap-3">
            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-neutral-600">
              No recurring pattern yet -- PriorityPay usually needs to see a charge repeat at least twice to
              confidently call it a subscription. Check back after a billing cycle or two.
            </p>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {subscriptions.map((sub) => (
              <SubscriptionRow key={sub.key} sub={sub} />
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-neutral-400">
        These are predictions based on past charge patterns, not a guarantee -- amounts and dates can shift if a
        merchant changes their billing.
      </p>
    </div>
  );
}
