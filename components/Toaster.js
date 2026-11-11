"use client";
import { useEffect, useState } from "react";

export default function Toaster() {
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    let t;
    const on = (e) => {
      setMsg(e.detail);
      clearTimeout(t);
      t = setTimeout(() => setMsg(null), 7000);
    };
    window.addEventListener("ps-toast", on);
    return () => { window.removeEventListener("ps-toast", on); clearTimeout(t); };
  }, []);
  if (!msg) return null;
  return (
    <div
      role="alert"
      style={{
        position: "fixed", left: 16, right: 16, bottom: 20, zIndex: 9999, maxWidth: 440, margin: "0 auto",
        background: "#FFF6DB", color: "#5C4600", border: "1px solid #E8C766", borderRadius: 14,
        padding: "12px 14px", fontSize: 14, lineHeight: 1.4, boxShadow: "0 8px 24px rgba(36,19,55,.18)",
        display: "flex", gap: 12, alignItems: "flex-start",
      }}
    >
      <span style={{ flex: 1 }}>{msg}</span>
      <button onClick={() => setMsg(null)} aria-label="Dismiss" style={{ background: "none", border: 0, fontSize: 18, lineHeight: 1, cursor: "pointer", color: "inherit" }}>×</button>
    </div>
  );
}
