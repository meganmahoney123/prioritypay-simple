"use client";

// Shared brand mark for every surface of the app (sidebar, public header,
// auth card, homepage footer, favicon) -- rebuilt for the Aug 2026 logo
// refresh (design_handoff_prioritypay_redesign/logo/*.svg): three
// left-aligned bars tapering 52/36/20 wide (a funnel -- the "know your
// split before you spend it" metaphor), each 6px tall with a 6px gap, in
// three shades of purple (#3B1C7A / #6D3BE0 / #9A72F0) -- replacing the
// old single-tone, four-bar, centered mark. Geometry and colors match
// logo/prioritypay-mark.svg exactly (viewBox 0 0 52 30) so this component
// and the standalone SVG files (used for favicons, app icons, and print)
// stay visually identical.
//
// One component so every surface stays in sync automatically -- update
// the mark once, here, instead of drifting across AppShell/PublicHeader/
// AuthCard/PublicFooter's separate copies.

const BARS = [
  { w: 52, y: 0, color: "#3B1C7A" },
  { w: 36, y: 12, color: "#6D3BE0" },
  { w: 20, y: 24, color: "#9A72F0" },
];
const MARK_ASPECT = 52 / 30; // matches logo/prioritypay-mark.svg's 52x30 viewBox

// `color`, when passed, overrides all three bars with one flat tone --
// used on dark backgrounds (see PublicFooter.js) where the three-tone
// gradient would lose contrast against a near-black background. Omitted
// entirely (the normal case) renders the real three-tone mark.
export function PriorityPayMark({ size = 22, color, style }) {
  const width = size * MARK_ASPECT;
  return (
    <svg width={width} height={size} viewBox="0 0 52 30" style={style} aria-hidden="true">
      {BARS.map((b, i) => (
        <rect key={i} x={0} y={b.y} width={b.w} height={6} rx={3} fill={color || b.color} />
      ))}
    </svg>
  );
}

export function PriorityPayWordmark({ size = 22, color, payColor = "var(--color-accent-700)", style }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 10, ...style }}>
      <span style={{ fontFamily: "var(--font-heading)", fontSize: size, letterSpacing: "0.01em", color }}>Priority</span>
      <span style={{ fontFamily: "var(--font-heading)", fontSize: size, fontStyle: "italic", color: payColor, marginLeft: -9 }}>
        Pay
      </span>
    </span>
  );
}

// layout="row": icon, thin vertical divider, wordmark -- all one line.
// Matches the horizontal lockup in Megan's artwork; used anywhere the
// logo sits in a single strip (sidebar top, public nav header, homepage
// footer).
// layout="stack": icon centered above a short horizontal dash above the
// wordmark. Matches the vertical lockup in Megan's artwork; used for the
// centered auth card, where there's vertical room and a single line would
// otherwise crowd the card width on mobile.
export default function PriorityPayLogo({ size = 22, layout = "row", markColor, payColor, style }) {
  if (layout === "stack") {
    return (
      <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: size * 0.32, ...style }}>
        <PriorityPayMark size={size * 1.3} color={markColor} />
        <span style={{ width: size * 1.1, height: 1, background: "var(--color-accent)" }} />
        <PriorityPayWordmark size={size} payColor={payColor} />
      </span>
    );
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: size * 0.5, ...style }}>
      <PriorityPayMark size={size} color={markColor} />
      <span style={{ width: 1, height: size * 0.9, background: "var(--color-divider)" }} />
      <PriorityPayWordmark size={size} payColor={payColor} />
    </span>
  );
}
