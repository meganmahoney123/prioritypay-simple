"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MoneySimulator from "@/components/MoneySimulator";
import { BLOOM_TOKENS } from "@/lib/bloomTheme";
import { DEFAULT_SPLIT_RULES, isCoreRow } from "@/lib/allocations";
import { toPercentRules, DEMO_GOALS } from "@/lib/simSharing";

const FIXED_LABELS = new Set(["Tax Reserve", "Business Expenses (OPEX)"]);

function toSimRows(percent) {
  return (percent || []).map((r) => ({
    id: r.id,
    label: r.label,
    pct: r.pct,
    fixed: FIXED_LABELS.has(r.label),
    color: r.color,
    custom: !isCoreRow(r),
    real: r,
  }));
}

function computeDiff(original, next) {
  const originalById = new Map(original.map((r) => [r.id, r]));
  const changes = [];
  for (const r of next) {
    const before = originalById.get(r.id);
    if (!before) {
      changes.push({ label: r.label, before: null, after: r.pct });
    } else if (Number(before.pct) !== Number(r.pct) || before.label !== r.label) {
      changes.push({ label: r.label, before: Number(before.pct), after: Number(r.pct) });
    }
  }
  return changes;
}

export default function MoneySimulatorDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [income, setIncome] = useState(0);
  const [rows, setRows] = useState([]);
  const [incomeSource, setIncomeSource] = useState(null);
  const [pendingRows, setPendingRows] = useState(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    (async () => {
      const rulesPromise = fetch("/api/split-rules").then((r) => r.json());
      const statusPromise = fetch("/api/closeout/status").then((r) => r.json());

      const [rulesRes, statusRes] = await Promise.all([rulesPromise, statusPromise]);
      const savedPercent = rulesRes.splitRules?.percent;
      setRows(toSimRows(savedPercent && savedPercent.length ? savedPercent : DEFAULT_SPLIT_RULES.percent));

      let gotConfirmedIncome = false;
      if (statusRes?.status === "confirmed" && statusRes?.period) {
        try {
          const closeoutRes = await fetch(`/api/closeout/${statusRes.period}`).then((r) => r.json());
          if (typeof closeoutRes?.closeout?.net_income === "number") {
            setIncome(Math.round(closeoutRes.closeout.net_income * 100) / 100);
            setIncomeSource(`Pulled from your confirmed net income for ${statusRes.period}. Edit anytime.`);
            gotConfirmedIncome = true;
          }
        } catch {
          // Fall through to the 0/editable default below.
        }
      }
      if (!gotConfirmedIncome) setIncomeSource("Enter your typical monthly income. Last month's confirmed net income wasn't available yet.");
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const diff = pendingRows ? computeDiff(rows, pendingRows) : [];

  const confirmApply = async () => {
    setApplying(true);
    try {
      await fetch("/api/split-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ percent: toPercentRules(pendingRows) }),
      });
      router.push("/splits");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6" style={BLOOM_TOKENS}>
      <div>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(24px, 3.2vw, 32px)", fontWeight: 400, margin: "0 0 8px", lineHeight: 1.3 }}>
          Enter a financial goal and adjust split percentages to achieve it.
        </h2>
        <div style={{ height: 1, background: "var(--color-divider)", margin: "0 0 16px" }} />
        <p className="text-sm" style={{ color: "color-mix(in srgb, var(--color-text) 76%, transparent)" }}>
          Started from your real split rules and last month's income. Try changes here first — nothing updates
          your actual accounts until you confirm it below.
        </p>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
          Loading your real numbers…
        </p>
      ) : (
        <MoneySimulator
          initialIncome={income}
          initialRows={rows}
          initialGoals={DEMO_GOALS}
          incomeNote={incomeSource}
          secondaryCtaLabel="Update my real split rules"
          secondaryCtaHelp="Ready to make these your real split rules?"
          onSetUpReal={(nextRows) => setPendingRows(nextRows)}
        />
      )}

      {pendingRows && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            background: "color-mix(in srgb, #171614 55%, transparent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div style={{ background: "var(--color-bg)", border: "1px solid var(--color-divider)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)", maxWidth: "28em", width: "100%", padding: "34px 34px 30px" }}>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 24, fontWeight: 400, margin: "0 0 14px" }}>
              Update your real split rules?
            </h2>
            {diff.length > 0 ? (
              <ul style={{ fontSize: 14, lineHeight: 1.8, margin: "0 0 22px", paddingLeft: 18, color: "color-mix(in srgb, var(--color-text) 76%, transparent)" }}>
                {diff.map((c, i) => (
                  <li key={i}>
                    {c.label}: {c.before === null ? `new, at ${c.after}%` : `${c.before}% → ${c.after}%`}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ fontSize: 14, color: "color-mix(in srgb, var(--color-text) 60%, transparent)", margin: "0 0 22px" }}>
                No changes from your current split rules.
              </p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button onClick={confirmApply} disabled={applying} className="pp-btn pp-btn-primary" style={{ padding: "12px 22px", opacity: applying ? 0.6 : 1 }}>
                {applying ? "Updating…" : "Yes, implement these changes"}
              </button>
              <button onClick={() => setPendingRows(null)} disabled={applying} className="pp-btn pp-btn-secondary" style={{ padding: "12px 22px" }}>
                No, don&apos;t import changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
