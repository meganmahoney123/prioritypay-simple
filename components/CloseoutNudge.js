"use client";

import { useEffect, useState } from "react";
import { CalendarCheck } from "lucide-react";
import { Card } from "@/components/ui";

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
    <Card className="p-4 bg-emerald-50 border-emerald-200 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <CalendarCheck size={16} className="text-emerald-700 shrink-0" />
        <span className="text-sm text-emerald-800">
          {info.status === "draft" ? "You've started" : "You haven't closed out"} {periodLabel(info.period)} yet --
          confirm your income to see this month&apos;s retirement and tax recommendations.
        </span>
      </div>
      <a href="/closeout" className="text-xs font-semibold text-emerald-700 underline shrink-0">
        Close out {periodLabel(info.period)}
      </a>
    </Card>
  );
}
