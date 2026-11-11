"use client";
import { Plus } from "lucide-react";

// "Add a category" block shown directly under the split list (onboarding and
// Split Rules): tappable suggestion chips plus an "Add your own" button, in
// one clearly bordered card so it isn't missed.
export default function AddCategoryCard({ suggestions = [], onAddSuggested, onAddOwn, style }) {
  return (
    <div style={{ border: "1px solid #D9C9FF", borderRadius: 20, background: "#F7F3FF", padding: "18px 18px 20px", ...style }}>
      <div style={{ fontFamily: "var(--font-heading)", fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "#4E22B8", fontWeight: 700 }}>
        Add a category
      </div>
      <div style={{ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 600, color: "var(--color-text)", margin: "4px 0 4px" }}>
        Saving for something else?
      </div>
      <p style={{ margin: "0 0 14px", fontSize: 14.5, lineHeight: 1.5, color: "var(--color-text-muted, #4A3F63)" }}>
        {suggestions.length > 0 ? "Tap a suggestion to add it at 0%, then set its share in the list above." : "Add a category, then set its share in the list above."}
      </p>
      {suggestions.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginBottom: 14 }}>
          {suggestions.map((sg) => (
            <button
              key={sg.label}
              type="button"
              onClick={() => onAddSuggested(sg)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                fontFamily: "var(--font-body)", fontSize: 15, fontWeight: 700, color: "#4E22B8",
                background: "#fff", border: "1.5px solid #9A72F0", borderRadius: 999, padding: "8px 16px",
                cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              <Plus size={14} /> {sg.label}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={onAddOwn}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          background: "#fff", border: "2px dashed #6D3BE0", borderRadius: 16, padding: "13px 16px",
          cursor: "pointer", fontFamily: "var(--font-heading)", fontSize: 16, fontWeight: 700, color: "#4E22B8",
        }}
      >
        <Plus size={16} /> Add your own category
      </button>
    </div>
  );
}
