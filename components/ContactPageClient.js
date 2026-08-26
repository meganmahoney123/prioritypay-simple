"use client";

import { useState } from "react";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { BLOOM_TOKENS, bloomInputStyle, bloomPrimaryButtonStyle } from "@/lib/bloomTheme";

// Replaces the old "Contact" footer link, which was just a mailto: --
// a real page with a real form. Submits to app/api/contact, which stores
// the message in simple_contact_messages (read via the Supabase table
// editor) rather than sending an email directly -- see that route's
// comment for why. hello@prioritypay.co is still shown below as a plain
// fallback for anyone who'd rather just email directly.
export default function ContactPageClient() {
  const [form, setForm] = useState({ name: "", email: "", message: "", website: "" });
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [error, setError] = useState("");

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }
      setStatus("sent");
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  return (
    <div style={{ ...BLOOM_TOKENS, minHeight: "100vh", background: "var(--color-bg)", display: "flex", flexDirection: "column" }}>
      <PublicHeader />

      <main style={{ flex: 1, maxWidth: 640, margin: "0 auto", width: "100%", padding: "56px 28px 90px" }}>
        <h1
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(34px, 6vw, 46px)",
            fontWeight: 800,
            letterSpacing: "-0.035em",
            margin: "0 0 14px",
            color: "var(--color-text)",
          }}
        >
          Contact us
        </h1>
        <p style={{ fontFamily: "var(--font-body)", fontSize: 17, lineHeight: 1.6, color: "var(--color-neutral-700)", margin: "0 0 36px" }}>
          Questions, feedback, or something not working right? Send us a message and we&apos;ll get back to you —
          or email us directly at{" "}
          <a href="mailto:hello@prioritypay.co" style={{ color: "var(--color-accent)", textDecoration: "underline" }}>
            hello@prioritypay.co
          </a>
          .
        </p>

        {status === "sent" ? (
          <div
            style={{
              background: "var(--color-accent-100)",
              border: "1px solid var(--color-accent-400)",
              borderRadius: "var(--radius-md)",
              padding: "22px 24px",
              fontFamily: "var(--font-body)",
              fontSize: 15,
              color: "var(--color-accent-700)",
            }}
          >
            Thanks — your message is on its way. We&apos;ll get back to you soon.
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Honeypot -- visually hidden, real users never fill this in. */}
            <input
              type="text"
              name="website"
              value={form.website}
              onChange={handleChange("website")}
              tabIndex={-1}
              autoComplete="off"
              style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
              aria-hidden="true"
            />

            <div>
              <label
                style={{ display: "block", fontFamily: "var(--font-heading)", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 60%, transparent)", marginBottom: 10 }}
              >
                Name
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={handleChange("name")}
                style={bloomInputStyle({ fontSize: 16, padding: "11px 2px" })}
              />
            </div>

            <div>
              <label
                style={{ display: "block", fontFamily: "var(--font-heading)", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 60%, transparent)", marginBottom: 10 }}
              >
                Email
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={handleChange("email")}
                style={bloomInputStyle({ fontSize: 16, padding: "11px 2px" })}
              />
            </div>

            <div>
              <label
                style={{ display: "block", fontFamily: "var(--font-heading)", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 60%, transparent)", marginBottom: 10 }}
              >
                Message
              </label>
              <textarea
                required
                rows={6}
                value={form.message}
                onChange={handleChange("message")}
                style={{ ...bloomInputStyle({ fontSize: 16, padding: "11px 2px" }), resize: "vertical", fontFamily: "var(--font-body)" }}
              />
            </div>

            {error && (
              <p style={{ fontSize: 14, color: "#C0392B", margin: 0 }}>{error}</p>
            )}

            <button type="submit" disabled={status === "sending"} style={{ ...bloomPrimaryButtonStyle(), alignSelf: "flex-start", opacity: status === "sending" ? 0.6 : 1 }}>
              {status === "sending" ? "Sending…" : "Send message"}
            </button>
          </form>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
