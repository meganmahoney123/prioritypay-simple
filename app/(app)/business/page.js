"use client";

// PHASE T: Business tier hub. One page for everything the Business plan
// adds on top of the Simple experience -- managing separate business
// entities, assigning connected accounts to them, connecting each entity's
// QuickBooks Online company, and running the profit-vs-deposit true-up.
//
// Plan-gated client-side off /api/profile's billing.isBusiness (the same
// gate every /api/entities and /api/qbo route enforces server-side, so this
// is purely to decide what to render -- a Simple-plan user who reaches this
// URL directly still gets 402s from the API, they just see the upgrade
// pitch instead of a broken page). The nav item itself only appears for
// Business-plan users (see components/AppShell.js).
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, PrimaryButton, GhostButton, currency } from "@/components/ui";
import { bloomInputStyle, bloomNoticeCardStyle, bloomWarningCardStyle, bloomAccentCardStyle } from "@/lib/bloomTheme";

const DEFAULT_SLOT = "__default__"; // stands in for "no entity / the single default pool"

// QBO's callback redirects back here with ?qbo=<code> (see
// app/api/qbo/callback). Friendly copy per outcome.
const QBO_MESSAGES = {
  connected: { tone: "notice", text: "QuickBooks connected." },
  denied: { tone: "warning", text: "QuickBooks connection was cancelled." },
  error: { tone: "warning", text: "Something went wrong connecting QuickBooks. Please try again." },
  state_mismatch: { tone: "warning", text: "QuickBooks connection couldn't be verified. Please try again." },
  entity_not_found: { tone: "warning", text: "That business entity no longer exists." },
};

const label = {
  display: "block",
  fontFamily: "var(--font-heading)",
  fontSize: 12,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "color-mix(in srgb, var(--color-text) 60%, transparent)",
  marginBottom: 8,
};

function BusinessPageInner() {
  const searchParams = useSearchParams();
  const qboResult = searchParams.get("qbo");

  const [loading, setLoading] = useState(true);
  const [isBusiness, setIsBusiness] = useState(false);
  const [entities, setEntities] = useState([]);
  const [connections, setConnections] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState(null);

  const [upgradeBusy, setUpgradeBusy] = useState(false);

  async function loadAll() {
    const p = await fetch("/api/profile").then((r) => r.json());
    const business = Boolean(p.profile?.billing?.isBusiness);
    setIsBusiness(business);
    if (business) {
      const [ent, conn, acct] = await Promise.all([
        fetch("/api/entities").then((r) => r.json()),
        fetch("/api/qbo/connections").then((r) => r.json()),
        fetch("/api/accounts").then((r) => r.json()),
      ]);
      setEntities(ent.entities || []);
      setConnections(conn.connections || []);
      setAccounts(acct.accounts || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  const upgrade = async () => {
    setUpgradeBusy(true);
    const res = await fetch("/api/billing/business-checkout", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else {
      setUpgradeBusy(false);
      setError(data.error || "Could not start checkout.");
    }
  };

  if (loading) return <p className="text-sm text-neutral-500">Loading…</p>;

  // --- Not on the Business plan: pitch + upgrade -------------------------
  if (!isBusiness) {
    return (
      <div className="max-w-2xl space-y-6">
        <Card className="p-6" style={{ maxWidth: "40em" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 400, margin: "0 0 6px" }}>
            PriorityPay Business
          </h2>
          <div style={{ height: 1, background: "var(--color-divider)", marginBottom: 20 }} />
          <p style={{ fontSize: 15, margin: "0 0 14px" }}>
            The Business plan adds tools for owners running one or more separate businesses:
          </p>
          <ul style={{ fontSize: 15, lineHeight: 1.7, margin: "0 0 18px", paddingLeft: 20 }}>
            <li>Group connected accounts into separate business entities</li>
            <li>Connect each entity&apos;s QuickBooks Online company</li>
            <li>Monthly profit-vs-deposit true-up against QuickBooks&apos; own books</li>
          </ul>
          {error && (
            <div className="text-sm" style={{ ...bloomWarningCardStyle(), padding: 14, margin: "0 0 16px" }}>{error}</div>
          )}
          <PrimaryButton onClick={upgrade} disabled={upgradeBusy}>
            {upgradeBusy ? "Loading…" : "Upgrade to Business"}
          </PrimaryButton>
        </Card>
      </div>
    );
  }

  // --- Business plan: the hub --------------------------------------------
  const qboMsg = qboResult ? QBO_MESSAGES[qboResult] : null;

  return (
    <div className="max-w-3xl space-y-6">
      {qboMsg && (
        <div
          className="text-sm"
          style={{ ...(qboMsg.tone === "warning" ? bloomWarningCardStyle() : bloomNoticeCardStyle()), padding: 14 }}
        >
          {qboMsg.text}
        </div>
      )}
      {error && (
        <div className="text-sm" style={{ ...bloomWarningCardStyle(), padding: 14 }}>{error}</div>
      )}

      <EntitiesCard entities={entities} onChange={loadAll} setError={setError} />
      <AccountsEntityCard accounts={accounts} entities={entities} onChange={loadAll} setError={setError} />
      <QuickBooksCard entities={entities} connections={connections} onChange={loadAll} setError={setError} />
      <TrueUpCard entities={entities} connections={connections} setError={setError} />
    </div>
  );
}

// ---- Entities -----------------------------------------------------------
function EntitiesCard({ entities, onChange, setError }) {
  const [name, setName] = useState("");
  const [entityType, setEntityType] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    const res = await fetch("/api/entities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), entity_type: entityType.trim() || null }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.entity) {
      setName("");
      setEntityType("");
      onChange();
    } else setError(data.error || "Could not create entity.");
  };

  const rename = async (id) => {
    if (!editName.trim()) return;
    const res = await fetch(`/api/entities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    const data = await res.json();
    if (data.entity) {
      setEditingId(null);
      onChange();
    } else setError(data.error || "Could not rename entity.");
  };

  const remove = async (id) => {
    const res = await fetch(`/api/entities/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.ok) onChange();
    else setError(data.error || "Could not delete entity.");
  };

  return (
    <Card className="p-6">
      <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 400, margin: "0 0 6px" }}>Businesses</h2>
      <p style={{ fontSize: 13, color: "color-mix(in srgb, var(--color-text) 60%, transparent)", margin: "0 0 18px" }}>
        Each business you add can hold its own accounts and QuickBooks company. Accounts left unassigned stay in your
        single default pool, exactly as before.
      </p>

      {entities.length === 0 ? (
        <p style={{ fontSize: 14, color: "color-mix(in srgb, var(--color-text) 60%, transparent)", marginBottom: 18 }}>
          No businesses yet.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
          {entities.map((e) => (
            <div
              key={e.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 14px",
                border: "1px solid var(--color-divider)",
                borderRadius: 12,
              }}
            >
              {editingId === e.id ? (
                <>
                  <input value={editName} onChange={(ev) => setEditName(ev.target.value)} style={bloomInputStyle({ flex: 1 })} />
                  <PrimaryButton onClick={() => rename(e.id)}>Save</PrimaryButton>
                  <GhostButton onClick={() => setEditingId(null)}>Cancel</GhostButton>
                </>
              ) : (
                <>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{e.name}</div>
                    {e.entity_type && (
                      <div style={{ fontSize: 12, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                        {e.entity_type}
                      </div>
                    )}
                  </div>
                  <GhostButton
                    onClick={() => {
                      setEditingId(e.id);
                      setEditName(e.name);
                    }}
                  >
                    Rename
                  </GhostButton>
                  <GhostButton onClick={() => remove(e.id)}>Delete</GhostButton>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 12 }}>
        <div style={{ flex: "2 1 200px" }}>
          <label style={label}>Business name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme LLC" style={bloomInputStyle({ width: "100%" })} />
        </div>
        <div style={{ flex: "1 1 160px" }}>
          <label style={label}>Type (optional)</label>
          <input
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            placeholder="LLC, S-Corp…"
            style={bloomInputStyle({ width: "100%" })}
          />
        </div>
        <PrimaryButton onClick={create} disabled={busy || !name.trim()}>
          {busy ? "Adding…" : "Add business"}
        </PrimaryButton>
      </div>
    </Card>
  );
}

// ---- Accounts -> entity assignment -------------------------------------
function AccountsEntityCard({ accounts, entities, onChange, setError }) {
  const assign = async (accountId, value) => {
    const entity_id = value === DEFAULT_SLOT ? null : value;
    const res = await fetch(`/api/accounts/${accountId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity_id }),
    });
    const data = await res.json();
    if (data.id) onChange();
    else setError(data.error || "Could not update account.");
  };

  return (
    <Card className="p-6">
      <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 400, margin: "0 0 6px" }}>
        Accounts by business
      </h2>
      <p style={{ fontSize: 13, color: "color-mix(in srgb, var(--color-text) 60%, transparent)", margin: "0 0 18px" }}>
        Assign each connected account to a business, or leave it in the default pool.
      </p>

      {accounts.length === 0 ? (
        <p style={{ fontSize: 14, color: "color-mix(in srgb, var(--color-text) 60%, transparent)" }}>
          No connected accounts yet.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {accounts.map((a) => (
            <div
              key={a.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                border: "1px solid var(--color-divider)",
                borderRadius: 12,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>
                  {a.institution_name} · {a.account_name}
                </div>
                <div style={{ fontSize: 12, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                  ••{a.mask} · {currency(a.current_balance)}
                </div>
              </div>
              <select
                value={a.entityId || DEFAULT_SLOT}
                onChange={(e) => assign(a.id, e.target.value)}
                style={bloomInputStyle({ minWidth: 180 })}
              >
                <option value={DEFAULT_SLOT}>Default pool</option>
                {entities.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ---- QuickBooks connections --------------------------------------------
function QuickBooksCard({ entities, connections, onChange, setError }) {
  // One connect "slot" per entity plus the default pool. A slot's current
  // connection is matched by entity_id (null for the default pool).
  const slots = [{ key: DEFAULT_SLOT, name: "Default pool", entityId: null }, ...entities.map((e) => ({ key: e.id, name: e.name, entityId: e.id }))];

  const connect = async (entityId) => {
    const qs = entityId ? `?entity_id=${encodeURIComponent(entityId)}` : "";
    const res = await fetch(`/api/qbo/connect${qs}`);
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setError(data.error || "Could not start QuickBooks connection.");
  };

  const disconnect = async (id) => {
    const res = await fetch("/api/qbo/connections", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (data.ok) onChange();
    else setError(data.error || "Could not disconnect.");
  };

  return (
    <Card className="p-6">
      <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 400, margin: "0 0 6px" }}>QuickBooks Online</h2>
      <p style={{ fontSize: 13, color: "color-mix(in srgb, var(--color-text) 60%, transparent)", margin: "0 0 18px" }}>
        Connect a QuickBooks company per business (or to the default pool) to enable the monthly true-up.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {slots.map((slot) => {
          const conn = connections.find((c) => (c.entity_id || null) === slot.entityId);
          return (
            <div
              key={slot.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                border: "1px solid var(--color-divider)",
                borderRadius: 12,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{slot.name}</div>
                <div style={{ fontSize: 12, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                  {conn ? `Connected${conn.company_name ? ` · ${conn.company_name}` : ""}` : "Not connected"}
                </div>
              </div>
              {conn ? (
                <GhostButton onClick={() => disconnect(conn.id)}>Disconnect</GhostButton>
              ) : (
                <PrimaryButton onClick={() => connect(slot.entityId)}>Connect</PrimaryButton>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// Kept in sync with MAX_UNMATCHED in app/api/qbo/true-up/route.js -- only
// used for the "showing the first N" note, so a drift just makes the note
// slightly off, never breaks anything.
const MAX_UNMATCHED_SHOWN = 50;

// One side of the reconciliation: a titled, count-labelled list of the
// transactions that didn't pair off, each rendered as date · label · amount.
function UnmatchedList({ title, items, render }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
        {title}{" "}
        <span style={{ color: "color-mix(in srgb, var(--color-text) 50%, transparent)", fontWeight: 400 }}>
          ({items.length})
        </span>
      </div>
      {items.length === 0 ? (
        <p style={{ fontSize: 13, color: "color-mix(in srgb, var(--color-text) 55%, transparent)", margin: 0 }}>None.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {items.map((it, i) => {
            const r = render(it);
            return (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
                <span style={{ color: "color-mix(in srgb, var(--color-text) 65%, transparent)", whiteSpace: "nowrap" }}>
                  {r.date || "—"}
                </span>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</span>
                <strong style={{ whiteSpace: "nowrap" }}>{currency(r.amount)}</strong>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---- Profit-vs-deposit true-up -----------------------------------------
function TrueUpCard({ entities, connections, setError }) {
  const now = new Date();
  // Default to the previous month -- the most recent one likely to have a
  // confirmed Close-Out to true up against.
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const [slot, setSlot] = useState(DEFAULT_SLOT);
  const [year, setYear] = useState(prev.getFullYear());
  const [month, setMonth] = useState(prev.getMonth() + 1);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const slots = [{ key: DEFAULT_SLOT, name: "Default pool", entityId: null }, ...entities.map((e) => ({ key: e.id, name: e.name, entityId: e.id }))];
  const selectedEntityId = slot === DEFAULT_SLOT ? null : slot;
  const hasConnection = connections.some((c) => (c.entity_id || null) === selectedEntityId);

  const run = async () => {
    setBusy(true);
    setResult(null);
    const res = await fetch("/api/qbo/true-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity_id: selectedEntityId, year: Number(year), month: Number(month) }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.snapshot) setResult(data);
    else setError(data.error || "Could not run the true-up.");
  };

  const monthName = (m) => new Date(2000, m - 1, 1).toLocaleString("en-US", { month: "long" });
  const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  return (
    <Card className="p-6">
      <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 400, margin: "0 0 6px" }}>Profit true-up</h2>
      <p style={{ fontSize: 13, color: "color-mix(in srgb, var(--color-text) 60%, transparent)", margin: "0 0 18px" }}>
        Compare QuickBooks&apos; net income for a month against the deposits PriorityPay tracked for that business.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 12, marginBottom: 16 }}>
        <div style={{ flex: "1 1 180px" }}>
          <label style={label}>Business</label>
          <select value={slot} onChange={(e) => setSlot(e.target.value)} style={bloomInputStyle({ width: "100%" })}>
            {slots.map((s) => (
              <option key={s.key} value={s.key}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: "1 1 120px" }}>
          <label style={label}>Month</label>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={bloomInputStyle({ width: "100%" })}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {monthName(m)}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: "0 1 100px" }}>
          <label style={label}>Year</label>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={bloomInputStyle({ width: "100%" })}>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <PrimaryButton onClick={run} disabled={busy || !hasConnection}>
          {busy ? "Running…" : "Run true-up"}
        </PrimaryButton>
      </div>

      {!hasConnection && (
        <p style={{ fontSize: 13, color: "var(--color-accent-800)" }}>
          Connect QuickBooks for this business above to run its true-up.
        </p>
      )}

      {result && (
        <div style={{ ...bloomAccentCardStyle(), padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 6 }}>
            <span>QuickBooks net income</span>
            <strong>{result.snapshot.qbo_net_income === null ? "—" : currency(result.snapshot.qbo_net_income)}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 6 }}>
            <span>PriorityPay tracked deposits</span>
            <strong>{result.snapshot.tracked_deposits === null ? "—" : currency(result.snapshot.tracked_deposits)}</strong>
          </div>
          <div style={{ height: 1, background: "var(--color-divider)", margin: "8px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15 }}>
            <span style={{ fontWeight: 600 }}>Variance</span>
            <strong>{result.snapshot.variance === null ? "—" : currency(result.snapshot.variance)}</strong>
          </div>
          {result.note && (
            <p style={{ fontSize: 13, color: "var(--color-accent-800)", margin: "12px 0 0" }}>{result.note}</p>
          )}

          {result.reconciliation && (
            <div style={{ marginTop: 16, borderTop: "1px solid var(--color-divider)", paddingTop: 14 }}>
              {result.reconciliation.unmatchedQbo.length === 0 && result.reconciliation.unmatchedTracked.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--color-accent-800)", margin: 0 }}>
                  Every QuickBooks transaction matched a tracked deposit by amount — nothing to reconcile.
                </p>
              ) : (
                <>
                  <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 55%, transparent)", marginBottom: 4 }}>
                    What&apos;s driving the variance
                  </div>
                  <UnmatchedList
                    title="In QuickBooks, not tracked by PriorityPay"
                    items={result.reconciliation.unmatchedQbo}
                    render={(x) => ({ date: x.date, label: x.name || x.type || "—", amount: x.amount })}
                  />
                  <UnmatchedList
                    title="Tracked by PriorityPay, not in QuickBooks"
                    items={result.reconciliation.unmatchedTracked}
                    render={(x) => ({ date: x.date, label: x.name || x.category || "—", amount: x.amount })}
                  />
                  {result.reconciliation.truncated && (
                    <p style={{ fontSize: 12, color: "color-mix(in srgb, var(--color-text) 55%, transparent)", marginTop: 8 }}>
                      Showing the first {MAX_UNMATCHED_SHOWN} of each — reconcile these first, then re-run.
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default function BusinessPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-500">Loading…</p>}>
      <BusinessPageInner />
    </Suspense>
  );
}
