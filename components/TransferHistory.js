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
    <Card className="p-5 space-y-3" style={{ borderRadius: 24 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-2 font-bold text-lg"
        style={{ minHeight: 44, background: "transparent", border: "none", padding: 0, cursor: "pointer", color: "var(--color-text)" }}
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
          const allLanded = t.lines.length > 0 && landed.length === t.lines.length;
          // Same look as the cards in "On the way" above: soft purple card, bold title,
          // amount on the right, a small status pill under the details.
          return (
            <div key={t.id} style={{ background: "#F8F5FF", border: "2px solid #D9C9FF", borderRadius: 18, padding: "14px 16px", display: "grid", gap: 8 }}>
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : t.id)}
                aria-expanded={isOpen}
                className="w-full text-left"
                style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", display: "grid", gap: 8, color: "inherit", font: "inherit" }}
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span style={{ fontSize: 18, fontWeight: 800, color: "#241337" }}>{t.name || "Deposit"}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 19, fontWeight: 700, color: "#241337" }}>{currency(landedTotal)}</span>
                </span>
                <span style={{ fontSize: 15, color: "#4A3F63", lineHeight: 1.45 }}>
                  <span style={{ display: "block" }}>{dateFmt(t.createdAt)}</span>
                  <span style={{ display: "block" }}>From a {currency(t.sourceAmount)} deposit</span>
                </span>
                <span className="flex items-center gap-2 flex-wrap">
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 14,
                      fontWeight: 800,
                      color: allLanded ? "#0F6B4F" : "#8A4B00",
                      background: allLanded ? "#E3F5EE" : "#FFF1DE",
                      borderRadius: 999,
                      padding: "5px 12px",
                    }}
                  >
                    {allLanded ? "All landed" : `${landed.length} of ${t.lines.length} landed`}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "#4E22B8", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    {isOpen ? "Hide details" : "See details"}
                  </span>
                </span>
              </button>
              {isOpen && (
                <div style={{ display: "grid", gap: 8, borderTop: "1.5px solid #E7DEFA", paddingTop: 10 }}>
                  {t.lines.map((l) => (
                    <div key={l.id} className="flex flex-wrap items-baseline justify-between gap-x-3" style={{ fontSize: 15, color: "#4A3F63" }}>
                      <span>
                        <b style={{ color: "#241337" }}>{l.label}</b> · to {destName(byId[l.destAccountId], l.destAccountLabel)}
                      </span>
                      <span>
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#241337" }}>{currency(l.amount)}</span>
                        {" "}· {STATUS[l.status] || l.status}
                        {l.status === "completed" && l.sentAt ? `, sent ${dateFmt(l.sentAt)}` : ""}
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
