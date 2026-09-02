"use client";

import { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { AlertTriangle } from "lucide-react";
import { Card, currency } from "@/components/ui";
import { colorForIndex } from "@/lib/allocations";

// Sits directly under CategoryDistributionSection ("How your money has
// been distributed", which is scoped to one month's deposits) -- this is
// the live, whole-picture version: every dollar currently tracked across
// every connected account, all at once, no month picker. For a Retirement
// category this deliberately blends two real pots of money into one
// slice -- what's still sitting in savings waiting to be moved, plus
// what's already actually invested in the real 401k/IRA -- per explicit
// product decision that both belong to the person and should read as one
// number, not two. See GET /api/allocations/total-allocation for the math.
//
// A category currently spent past its own balance can't be a pie slice
// (a negative number has no angle), so those are pulled out and listed to
// the side instead, same "here's what's overdrawn" spirit as the
// per-account breakdown on the Accounts page.
const UNALLOCATED_COLOR = "#D9C9FF";

export default function TotalAllocationSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/allocations/total-allocation")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const slicesRaw = data?.slices || [];
  const unallocated = data?.unallocated || 0;
  const overdrawn = data?.overdrawn || [];
  const total = data?.total || 0;

  const pieData = useMemo(() => {
    const slices = slicesRaw.map((c, i) => ({
      name: c.label,
      value: c.amount,
      color: c.color || colorForIndex(i),
    }));
    if (unallocated > 0) {
      slices.push({ name: "Unallocated", value: unallocated, color: UNALLOCATED_COLOR });
    }
    return slices.map((c) => ({ ...c, pct: total > 0 ? Math.round((c.value / total) * 100) : 0 }));
  }, [slicesRaw, unallocated, total]);

  return (
    <Card className="p-5" style={{ borderRadius: 26, background: "var(--color-surface)" }}>
      <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 700, color: "var(--color-text)" }}>
        How all your money is allocated right now
      </h2>
      <p className="text-xs text-neutral-500 mb-4">
        Every dollar tracked across every connected account, live — including money already invested in a real
        401k/IRA alongside savings still waiting to get there.
      </p>

      {loading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : total === 0 && overdrawn.length === 0 ? (
        <p className="text-sm text-neutral-400">Nothing tracked yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          {total > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={2}
                    isAnimationActive={false}
                    label={({ pct }) => (pct >= 6 ? `${pct}%` : "")}
                    labelLine={false}
                    fontSize={10}
                    fontWeight={700}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => currency(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-neutral-400">No positive balances to chart yet.</p>
          )}
          <div>
            <div className="flex items-center justify-between text-sm mb-2 pb-2 border-b border-neutral-100">
              <span className="font-semibold text-neutral-700">Total tracked</span>
              <span className="font-bold font-mono">{currency(total)}</span>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {pieData.map((c) => (
                <div key={c.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                    <span className="text-neutral-700 truncate">{c.name}</span>
                  </div>
                  <span className="font-semibold shrink-0 font-mono">
                    {currency(c.value)}
                    <span className="text-neutral-400 font-normal ml-1">({c.pct}%)</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!loading && overdrawn.length > 0 && (
        <div className="mt-5 pt-4" style={{ borderTop: "1px solid var(--color-divider)" }}>
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle size={13} style={{ color: "#9C3B22" }} />
            <span className="text-xs font-semibold" style={{ color: "#9C3B22" }}>
              Overdrawn — spent past what&apos;s tracked
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {overdrawn.map((c) => (
              <div
                key={c.label}
                className="flex items-center justify-between text-sm px-3 py-2"
                style={{ border: "1px solid #E8B9A6", borderRadius: "var(--radius-md)", background: "#FBEDE7" }}
              >
                <span className="text-neutral-700 truncate">{c.label}</span>
                <span className="font-mono font-semibold" style={{ color: "#9C3B22" }}>
                  -{currency(Math.abs(c.amount))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
