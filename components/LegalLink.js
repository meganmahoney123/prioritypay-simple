"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

const PAGES = {
  terms: { title: "Terms of Use (EULA)", src: "/terms" },
  privacy: { title: "Privacy Policy", src: "/privacy" },
};

const linkStyle = {
  color: "var(--color-accent-700)",
  textDecoration: "underline",
  background: "none",
  border: "none",
  padding: 0,
  font: "inherit",
  cursor: "pointer",
};

export default function LegalLink({ kind, children }) {
  const [open, setOpen] = useState(false);
  const page = PAGES[kind] || PAGES.terms;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} style={linkStyle}>
        {children}
      </button>
      {open && typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={page.title}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 2147483000,
              background: "#fff",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "calc(env(safe-area-inset-top, 0px) + 12px) 16px 12px",
                borderBottom: "1px solid rgba(0,0,0,0.12)",
                fontSize: 16,
                fontWeight: 600,
                color: "#111",
                background: "#fff",
              }}
            >
              <span>{page.title}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  padding: "6px 14px",
                  borderRadius: 8,
                  border: "1px solid rgba(0,0,0,0.2)",
                  background: "#f4f4f5",
                  color: "#111",
                }}
              >
                Close
              </button>
            </div>
            <iframe
              title={page.title}
              src={page.src}
              style={{ flex: 1, width: "100%", border: "none", background: "#fff" }}
            />
          </div>,
          document.body
        )}
    </>
  );
}
