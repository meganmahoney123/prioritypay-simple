"use client";

// Small popup for the "Not sure" link that sits under the "My employer
// already pulls money from my paycheck for this" checkbox on employer-tied
// retirement rows (401k/IRA/HSA) in PercentSplitEditor.js. Rather than
// leaving someone to guess, this drafts an email to their HR contact asking
// the two questions that actually resolve the checkbox -- what's already
// set up, and whether payroll is already funding it -- then hands off to
// their own mail client via a mailto: link so PriorityPay never sends
// anything on their behalf (they still have to hit Send themselves).
import { useState } from "react";
import { X } from "lucide-react";
import { BLOOM_TOKENS } from "@/lib/bloomTheme";

export default function EmployerCheckEmailModal({ label, onClose }) {
  const [companyName, setCompanyName] = useState("");
  const [hrEmail, setHrEmail] = useState("");

  const subject = "Question about my retirement & healthcare benefits";
  const body = `Hello,

I'm setting aside income for retirement and healthcare, and I'd like to know:

1.) What accounts do I already have set up through ${companyName || "[company name]"}?
2.) Is there any money currently being pulled out of my paycheck to fund those accounts?

Thanks for your help!`;

  const mailtoHref = `mailto:${encodeURIComponent(hrEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{ ...BLOOM_TOKENS, background: "color-mix(in srgb, #241634 55%, transparent)" }}
    >
      <div
        className="max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 relative"
        style={{ background: "var(--color-bg)", border: "1px solid var(--color-divider)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)" }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4"
          style={{ color: "color-mix(in srgb, var(--color-text) 45%, transparent)", background: "transparent", border: 0, cursor: "pointer" }}
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 700, margin: "0 0 8px", paddingRight: 24 }}>
          Not sure about your {label}?
        </h3>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "color-mix(in srgb, var(--color-text) 65%, transparent)", margin: "0 0 20px" }}>
          Your HR or payroll team can tell you exactly what&apos;s already set up and whether money is already coming
          out of your paycheck for it. Fill this in and we&apos;ll draft the email for you -- you&apos;ll still need
          to find your HR contact&apos;s email address and hit send yourself.
        </p>

        <label style={{ display: "block", fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 60%, transparent)", marginBottom: 6 }}>
          Company name
        </label>
        <input
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Acme Inc."
          style={{
            width: "100%",
            fontSize: 15,
            padding: "10px 12px",
            border: "1px solid var(--color-divider)",
            borderRadius: "var(--radius-sm)",
            background: "var(--color-neutral-100)",
            marginBottom: 16,
          }}
        />

        <label style={{ display: "block", fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 60%, transparent)", marginBottom: 6 }}>
          Your HR or payroll contact&apos;s email
        </label>
        <input
          type="email"
          value={hrEmail}
          onChange={(e) => setHrEmail(e.target.value)}
          placeholder="hr@yourcompany.com"
          style={{
            width: "100%",
            fontSize: 15,
            padding: "10px 12px",
            border: "1px solid var(--color-divider)",
            borderRadius: "var(--radius-sm)",
            background: "var(--color-neutral-100)",
            marginBottom: 6,
          }}
        />
        <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "color-mix(in srgb, var(--color-text) 50%, transparent)", margin: "0 0 20px" }}>
          Not sure who to ask? Check your employee handbook, an old onboarding email, or your company directory for
          HR or payroll.
        </p>

        <div
          style={{
            background: "var(--color-neutral-100)",
            border: "1px solid var(--color-divider)",
            borderRadius: "var(--radius-sm)",
            padding: "14px 16px",
            fontSize: 13.5,
            lineHeight: 1.6,
            color: "var(--color-text)",
            whiteSpace: "pre-wrap",
            marginBottom: 20,
          }}
        >
          {body}
        </div>

        <a
          href={mailtoHref}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            fontFamily: "var(--font-heading)",
            fontWeight: 600,
            fontSize: 14,
            color: "#fff",
            background: "var(--color-accent)",
            borderRadius: "var(--radius-pill)",
            padding: "12px 20px",
            textDecoration: "none",
          }}
        >
          Open in my email app
        </a>
      </div>
    </div>
  );
}
