"use client";

import { useState } from "react";
import { PrimaryButton } from "./ui";
import { ledgerInputStyle } from "@/lib/ledgerTheme";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

// Required once, before any bank account can be linked -- Dwolla needs a
// verified Customer to send money, and sending is exactly what splitting a
// deposit does. We pass these fields straight to Dwolla; none of them
// (SSN, DOB, address) are stored in our own database.
//
// `theme="ledger"` only swaps the input styling (see LEDGER_TOKENS) --
// every field, validation, and the submit call below is unchanged.
export default function IdentityForm({ onDone, theme }) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    address1: "",
    city: "",
    state: "CA",
    postalCode: "",
    dateOfBirth: "",
    ssn: "",
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/dwolla/create-customer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      return;
    }
    onDone?.();
  };

  if (theme === "ledger") {
    const inp = ledgerInputStyle();
    return (
      <form onSubmit={submit} style={{ display: "grid", gap: 20, maxWidth: "34em" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <input required placeholder="First name" value={form.firstName} onChange={update("firstName")} style={inp} />
          <input required placeholder="Last name" value={form.lastName} onChange={update("lastName")} style={inp} />
        </div>
        <input required placeholder="Street address" value={form.address1} onChange={update("address1")} style={inp} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 0.8fr 1fr", gap: 20 }}>
          <input required placeholder="City" value={form.city} onChange={update("city")} style={inp} />
          <select required value={form.state} onChange={update("state")} style={inp}>
            {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input required placeholder="ZIP" value={form.postalCode} onChange={update("postalCode")} style={inp} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <input required type="date" value={form.dateOfBirth} onChange={update("dateOfBirth")} style={inp} />
          <input required placeholder="SSN" maxLength={9} value={form.ssn} onChange={update("ssn")} style={{ ...inp, fontFamily: "var(--font-heading)" }} />
        </div>
        {error && <p style={{ fontSize: 13, color: "var(--color-accent-700)", margin: 0 }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 600,
            fontSize: 15,
            color: "var(--color-accent)",
            background: "transparent",
            border: "1px solid var(--color-accent)",
            borderRadius: "var(--radius-md)",
            padding: "13px 24px",
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Verifying…" : "Verify identity"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 max-w-md">
      <div className="grid grid-cols-2 gap-3">
        <input required placeholder="First name" value={form.firstName} onChange={update("firstName")} className="text-sm border border-neutral-200 rounded-xl px-3 py-2.5" />
        <input required placeholder="Last name" value={form.lastName} onChange={update("lastName")} className="text-sm border border-neutral-200 rounded-xl px-3 py-2.5" />
      </div>
      <input required placeholder="Street address" value={form.address1} onChange={update("address1")} className="w-full text-sm border border-neutral-200 rounded-xl px-3 py-2.5" />
      <div className="grid grid-cols-3 gap-3">
        <input required placeholder="City" value={form.city} onChange={update("city")} className="text-sm border border-neutral-200 rounded-xl px-3 py-2.5" />
        <select required value={form.state} onChange={update("state")} className="text-sm border border-neutral-200 rounded-xl px-3 py-2.5">
          {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input required placeholder="ZIP" value={form.postalCode} onChange={update("postalCode")} className="text-sm border border-neutral-200 rounded-xl px-3 py-2.5" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input required type="date" value={form.dateOfBirth} onChange={update("dateOfBirth")} className="text-sm border border-neutral-200 rounded-xl px-3 py-2.5" />
        <input required placeholder="SSN" maxLength={9} value={form.ssn} onChange={update("ssn")} className="text-sm border border-neutral-200 rounded-xl px-3 py-2.5 font-mono" />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <PrimaryButton type="submit" disabled={loading} className="w-full">
        {loading ? "Verifying…" : "Verify identity"}
      </PrimaryButton>
    </form>
  );
}
