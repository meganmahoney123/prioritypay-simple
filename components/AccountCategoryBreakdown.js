"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import Link from "next/link";
import { currency } from "@/components/ui";
import { bloomWarningCardStyle } from "@/lib/bloomTheme";

// Same fallback palette family as MoneyDistributionChart/
// SpendDistributionChart, kept as its own copy on purpose (see those
// files) so this chart can diverge visually later without affecting them.
const FALLBACK_PALETTE = ["#2E8B78", "#1F5F4F", "#164536", "#5FB59F", "#A6D9CB"];

function formatCloseoutDate(iso) {
  if (!iso) return "not yet closed out";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Small "what's inside this account" pie chart, rendered inside each
// account's existing Card on the Accounts page (app/(app)/accounts/
// page.js) -- one chart per connected account, breaking that account's
// current balance down by the split-rule categories linked to it (see
// simple_split_rules_percent.account_id). Data for every account is
// fetched ONCE at the page level from /api/allocations/account-balances
// and passed down per-account as `data`, rather than each instance of
// this component fetching for itself -- avoids N duplicate requests for
// N accounts. Renders nothing if this account has no linked categories
// (data is undefined/null), same as the parent already handles.
export default function AccountCategoryBreakdown({ accountId, data }) {
  if (!data || !data.categories || data.categories.length === 0) return null;

  const { categories, totalBalance, lastCloseoutAt, uncategorizedCount } = data;
  const pieData = categories.map((c, i) => ({
    name: c.label,
    value: c.balance,
    color: FALLBACK_PALETTE[i % FALLBACK_PALETTE.length],
  }));

  return (
    <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--color-divider)" }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              {/* Animation off to match MoneyDistributionChart/
                  SpendDistributionChart -- avoids the same class of
                  enter-animation/re-render race those charts already
                  work around. */}
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={28} outerRadius={44} paddingAngle={2} isAnimationActive={false}>
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => currency(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5 pb-1.5 border-b" style={{ borderColor: "var(--color-divider)" }}>
            <span className="font-semibold" style={{ color: "var(--color-neutral-700)" }}>Categorized here</span>
            <span className="font-bold font-mono">{currency(totalBalance)}</span>
          </div>
          <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
            {pieData.map((c) => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="truncate" style={{ color: "var(--color-neutral-700)" }}>{c.name}</span>
                </div>
                <span className="font-semibold shrink-0 font-mono">{currency(c.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="text-xs mt-2" style={{ color: "var(--color-neutral-700)" }}>
        As of your last close-out ({formatCloseoutDate(lastCloseoutAt)}).
      </p>
      {uncategorizedCount > 0 && (
        <Link href="/closeout" className="block text-xs mt-2 p-2" style={bloomWarningCardStyle()}>
          <span style={{ fontWeight: 600 }}>Warning:</span> {uncategorizedCount} transaction{uncategorizedCount === 1 ? "" : "s"} from
          this account haven&apos;t been categorized yet in Close Out — this chart may be out of date.
        </Link>
      )}
    </div>
  );
}
