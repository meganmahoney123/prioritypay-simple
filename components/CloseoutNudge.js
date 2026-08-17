"use client";

import { useEffect, useState } from "react";
import { CalendarCheck } from "lucide-react";
import { Card } from "@/components/ui";
import { ledgerAccentCardStyle } from "@/lib/ledgerTheme";

function periodLabel(period) {
  const [y, m] = period.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

// Dashboard banner nudging toward /closeout once last month has ended and
// hasn't been closed out yet -- this is the only place retirement room and
// the tax estimate get calculated (see PHASE B), so a month that never gets
// closed out just means those recommendations never show up.
export default function CloseoutNudge() {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    fetch("/api/closeout/status")
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => {});
  }, []);

  if (!info || info.status === "confirmed") return null;

  return (
    <Card className="p-4 flex items-center justify-between gap-3 flex-wrap" style={ledgerAccentCardStyle()}>
      <div className="flex items-center gap-2">
        <CalendarCheck size={16} style={{ color: "var(--color-accent-700)" }} className="shrink-0" />
        <span className="text-sm" style={{ color: "var(--color-accent-800)" }}>
          {info.status === "draft"
            ? "You've started but haven't finished closing out"
            : "You haven't closed out"}{" "}
          {periodLabel(info.period)} yet -- confirm your income to see this month&apos;s retirement and tax
          recommendations.
        </span>
      </div>
      <a href="/closeout" className="text-xs shrink-0" style={{ fontWeight: 600, color: "var(--color-accent-700)", textDecoration: "underline" }}>
        Close out {periodLabel(info.period)}
      </a>
    </Card>
  );
}
