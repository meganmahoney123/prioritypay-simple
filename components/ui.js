"use client";

export function Card({ children, className = "" }) {
  return <div className={`bg-white border border-neutral-200 rounded-xl card-shadow ${className}`}>{children}</div>;
}

export function PrimaryButton({ children, onClick, disabled, className = "", type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl px-6 py-3 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, onClick, className = "", disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 bg-white hover:bg-neutral-50 text-neutral-700 font-semibold rounded-2xl px-6 py-3 text-sm border border-neutral-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

export function Badge({ children, tone = "emerald" }) {
  const tones = {
    emerald: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-800",
    neutral: "bg-neutral-100 text-neutral-600",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export const currency = (n) =>
  Number(n || 0).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
