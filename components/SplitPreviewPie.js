"use client";

// Live "what would a deposit do" picture shown above the split rows. It
// redraws on every keystroke because it only reads the `rows` the editor
// already holds (label + percent), so it can never drift from what is saved.
// Whatever is not allocated is Guilt-Free Spending, same as everywhere else.

const SAMPLE = 10000;
const GUILT_COLOR = "#EDE6FF";

function money(n) {
  return "$" + Math.round(n).toLocaleString("en-US");
}

function pctText(p) {
  return `${Math.round(p * 10) / 10}%`;
}

export default function SplitPreviewPie({ rows, colorFor, sample = SAMPLE }) {
  const items = rows.map((r) => ({
    key: r.id,
    label: r.label || "Untitled",
    pct: Math.max(0, Number(r.pct) || 0),
    color: colorFor(r.id),
  }));
  const used = items.reduce((s, i) => s + i.pct, 0);
  const over = used > 100.0001;
  const rest = Math.max(0, 100 - used);
  const list = [...items, { key: "guilt-free", label: "Guilt-Free Spending", pct: rest, color: GUILT_COLOR, rest: true }];
  const total = Math.max(100, used);

  const R = 52;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const arcs = list
    .filter((i) => i.pct > 0)
    .map((i) => {
      const len = (i.pct / total) * C;
      const el = { ...i, len, offset };
      offset += len;
      return el;
    });

  return (
    <div className="pp-split-preview" role="group" aria-label={`Sample ${money(sample)} deposit split`}>
      <style>{`
        .pp-split-preview{border:1px solid #DDD5F3;border-radius:24px;background:#fff;padding:16px 20px;display:grid;gap:12px;z-index:5}
        .pp-split-preview .pp-sp-body{display:grid;grid-template-columns:132px minmax(0,1fr);gap:18px;align-items:center}
        .pp-split-preview ul{list-style:none;margin:0;padding:0;display:grid;gap:5px}
        .pp-split-preview li{display:grid;grid-template-columns:12px minmax(0,1fr) auto auto;gap:8px;align-items:center;font-size:14px}
        @media (max-width:520px){.pp-split-preview .pp-sp-body{grid-template-columns:1fr;justify-items:center}.pp-split-preview ul{width:100%}}
        @media (min-width:900px) and (min-height:820px){.pp-split-preview{position:sticky;top:10px;box-shadow:0 6px 24px rgba(78,34,184,.12)}}
      `}</style>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "var(--font-heading)", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
          Sample: {money(sample)} deposit
        </span>
        {over && <span style={{ fontSize: 13, fontWeight: 600, color: "#B42318" }}>Over 100% ({pctText(used)})</span>}
      </div>
      <div className="pp-sp-body">
        <svg viewBox="0 0 132 132" width="132" height="132" aria-hidden="true">
          <g transform="rotate(-90 66 66)">
            <circle cx="66" cy="66" r={R} fill="none" stroke="#F3EEFF" strokeWidth="22" />
            {arcs.map((a) => (
              <circle
                key={a.key}
                cx="66"
                cy="66"
                r={R}
                fill="none"
                stroke={a.color}
                strokeWidth="22"
                strokeDasharray={`${Math.max(0, a.len - (arcs.length > 1 ? 1.2 : 0))} ${C}`}
                strokeDashoffset={-a.offset}
                style={{ transition: "stroke-dasharray .25s ease, stroke-dashoffset .25s ease" }}
              />
            ))}
          </g>
          <text x="66" y="62" textAnchor="middle" fontSize="9" letterSpacing="1.2" fill="#6b6280">DEPOSIT</text>
          <text x="66" y="80" textAnchor="middle" fontSize="16" fontWeight="800" fill="#2A1550" fontFamily="var(--font-mono)">{money(sample)}</text>
        </svg>
        <ul>
          {list.map((i) => (
            <li key={i.key} style={i.rest ? { opacity: 0.85 } : undefined}>
              <span style={{ width: 12, height: 12, borderRadius: 4, background: i.color, border: i.rest ? "1px solid #C4A9FA" : "none" }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.label}</span>
              <span style={{ fontFamily: "var(--font-mono)", color: "color-mix(in srgb, var(--color-text) 60%, transparent)", fontVariantNumeric: "tabular-nums" }}>{pctText(i.pct)}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, minWidth: 64, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{money((i.pct / 100) * sample)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
