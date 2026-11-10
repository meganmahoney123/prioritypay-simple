"use client";

// Select-all-that-apply chips. `options` is [{ value, label }], `selected` is
// an array of values, and `onToggle(value)` is called when one is clicked.
export default function ChipCheckboxes({ options, selected, onToggle }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map((o) => {
        const on = selected.includes(o.value);
        return (
          <label
            key={o.value}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontFamily: "var(--font-body)",
              fontSize: 14.5,
              padding: "10px 14px",
              borderRadius: "var(--radius-md)",
              border: `1px solid ${on ? "var(--color-accent)" : "var(--color-divider)"}`,
              background: on ? "color-mix(in srgb, var(--color-accent) 7%, transparent)" : "transparent",
              color: on ? "var(--color-accent-700)" : "var(--color-text)",
              cursor: "pointer",
            }}
          >
            <input type="checkbox" checked={on} onChange={() => onToggle(o.value)} style={{ width: 18, height: 18, accentColor: "var(--color-accent)" }} />
            {o.hint ? (
              <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {o.label}
                <span style={{ fontSize: 12.5, opacity: 0.7 }}>{o.hint}</span>
              </span>
            ) : (
              o.label
            )}
          </label>
        );
      })}
    </div>
  );
}
