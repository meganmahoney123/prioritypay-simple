"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card } from "@/components/ui";

// A live visual of the split-rule percentages themselves (the config the
// user is editing on the Split Rules page), not a history of real money --
// that's MoneyDistributionChart.js's job (Dashboard), which sums actual
// confirmed transfer_allocations. This one just mirrors the `percent`
// array passed down from app/(app)/splits/page.js in real time, the same
// way the percentage inputs above/below it update on every keystroke, so
// someone can see the shape of their split as they build it instead of
// only reading a column of numbers.
//
// Renders one slice per category with a nonzero percentage, plus an
// "Unallocated" slice for whatever's left under 100% (using the page's
// already-computed remainingPct so the two never disagree) -- omitted
// entirely once the split reaches 100%.
const UNALLOCATED_COLOR = "#E3D6FA";

export default function SplitPercentPieChart({ percent = [], remainingPct = 0 }) {
  const pieData = useMemo(() => {
    const rows = percent
      .filter((r) => Number(r.pct) > 0)
      .map((r) => ({ name: r.label || "Untitled", value: Number(r.pct), color: r.color || "#6D3BE0" }));
    if (remainingPct > 0) {
      rows.push({ name: "Unallocated", value: remainingPct, color: UNALLOCATED_COLOR });
    }
    return rows;
  }, [percent, remainingPct]);

  const hasData = pieData.length > 0;

  return (
    <Card className="p-5" style={{ borderRadius: 26, background: "var(--color-surface)" }}>
      <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 700, color: "var(--color-text)", margin: "0 0 4px" }}>
        What your split looks like
      </h2>
      <p className="text-xs text-neutral-500 mb-4">Updates live as you adjust percentages below.</p>

      {!hasData ? (
        <p className="text-sm text-neutral-400">Set a percentage on a category below to see it here.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75} paddingAngle={2} isAnimationActive={false}>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {pieData.map((c) => (
              <div key={c.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="text-neutral-700 truncate" style={{ fontStyle: c.name === "Unallocated" ? "italic" : "normal" }}>
                    {c.name}
                  </span>
                </div>
                <span className="font-semibold shrink-0 font-mono">{c.value}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
