"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card, currency } from "@/components/ui";

// "Transfer history" on Split My Deposits: every deposit that has at least
// one line that landed, newest first. Open a deposit to see each line, where
// it went and its status. Data from /api/transfers/history.
const dateFmt = (iso) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const STATUS = {
  completed: "Landed",
  in_transit: "On the way",
  needs_approval: "Not sent yet",
};

function destName(acc, fallback) {
  if (acc) return `${acc.institution_name} ${acc.account_name} •••• ${acc.mask}`;
  if (fallback) return `${fallback} (disconnected)`;
  return "an account that has since been disconnected";
}

export default function TransferHistory({ accounts = [], refreshKey = 0 }) {
  const [transfers, setTransfers] = useState(null);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    fetch("/api/transfers/history")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(true);
        else setTransfers(d.transfers || []);
      })
      .catch(() => setError(true));
  }, [refreshKey]);

  const byId = Object.fromEntries((accounts || []).map((a) => [a.id, a]));
  const count = transfers ? transfers.length : 0;
  const muted = { color: "var(--color-text-muted, #5D5372)" };

  return (
    <Card className="p-5 space-y-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-2 font-bold text-lg"
        style={{ minHeight: 44, background: "transparent" }}
      >
        {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        Transfer history{transfers ? ` (${count})` : ""}
      </button>
      {open && error && <div className="text-sm">Couldn&apos;t load your transfer history. Try refreshing.</div>}
      {open && !error && transfers && count === 0 && (
        <div className="text-sm" style={muted}>
          Nothing here yet. Deposits show up here once at least one of their transfers has landed.
        </div>
      )}
      {open &&
        !error &&
        (transfers || []).map((t) => {
          const isOpen = openId === t.id;
          const landed = t.lines.filter((l) => l.status === "completed");
          const landedTotal = landed.reduce((s, l) => s + l.amount, 0);
          return (
            <div key={t.id} style={{ borderTop: "1px solid var(--color-neutral-200, #EFE8FF)" }}>
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : t.id)}
                aria-expanded={isOpen}
                className="w-full text-left py-3 flex flex-wrap items-center justify-between gap-2"
                style={{ minHeight: 44, background: "transparent" }}
              >
                <span>
                  <b>{t.name || "Deposit"}</b>
                  <span style={muted}> · {dateFmt(t.createdAt)}</span>
                </span>
                <span style={{ fontFamily: "var(--font-mono)" }}>
                  {currency(t.sourceAmount)} deposit · {currency(landedTotal)} landed
                </span>
              </button>
              {isOpen && (
                <div className="pb-3 space-y-2">
                  {t.lines.map((l) => (
                    <div key={l.id} className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                      <span>
                        <b>{l.label}</b>
                        <span style={muted}> · to {destName(byId[l.destAccountId], l.destAccountLabel)}</span>
                      </span>
                      <span>
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{currency(l.amount)}</span>
                        <span style={muted}>
                          {" "}
                          · {STATUS[l.status] || l.status}
                          {l.status === "completed" && l.sentAt ? `, sent ${dateFmt(l.sentAt)}` : ""}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
    </Card>
  );
}
