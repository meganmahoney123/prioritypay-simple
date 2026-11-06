"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card } from "@/components/ui";
import { CATEGORY_COLORS, colorForIndex } from "@/lib/allocations";

// A live visual of the split-rule percentages themselves (the config the
// user is editing on the Split Rules page), not a history of real money --
// that's MoneyDistributionChart.js's job (Dashboard), which sums actual
// confirmed transfer_allocations. This one just mirrors the `percent`
// array passed down from app/(app)/splits/page.js in real time, the same
// way the percentage inputs above/below it update on every keystroke, so
// someone can see the shape of their split as they build it instead of
// only reading a column of numbers.
//
// Renders exactly one slice per category with a nonzero percentage, plus a
// labeled "Guilt-Free Spending" slice for whatever's left under 100% (using
// the page's already-computed remainingPct so the two never disagree) --
// omitted once the split reaches 100%. Slice and legend come from the same
// list, and colors are assigned here by position from the PrioritySave
// purple palette (darkest first) rather than read from each row's stored
// `color`, which for older rows is still the pre-rebrand grey/teal/orange/
// red defaults. Guilt-Free Spending always gets the lightest shade.
const GUILT_FREE_LABEL = "Guilt-Free Spending";
const GUILT_FREE_COLOR = CATEGORY_COLORS[0]; // #D9C9FF, lightest palette purple
const CATEGORY_SHADES = CATEGORY_COLORS.slice(1).reverse(); // #3B1C7A -> #C4A9FA

function categoryShade(i) {
  // Past the 5 named shades, fall back to generated hsl(258, ...) purples,
  // skipping the first generated one (too close to GUILT_FREE_COLOR).
  return i < CATEGORY_SHADES.length ? CATEGORY_SHADES[i] : colorForIndex(CATEGORY_COLORS.length + 1 + (i - CATEGORY_SHADES.length));
}

export default function SplitPercentPieChart({ percent = [], remainingPct = 0 }) {
  const pieData = useMemo(() => {
    const rows = percent
      .filter((r) => Number(r.pct) > 0)
      .map((r, i) => ({ name: r.label || "Untitled", value: Number(r.pct), color: categoryShade(i) }));
    if (remainingPct > 0) {
      rows.push({ name: GUILT_FREE_LABEL, value: remainingPct, color: GUILT_FREE_COLOR, remainder: true });
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
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {pieData.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="text-neutral-700 truncate" style={{ fontStyle: c.remainder ? "italic" : "normal" }}>
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
