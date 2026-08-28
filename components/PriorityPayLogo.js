"use client";

// Shared brand mark for every surface of the app (sidebar, public header,
// auth card, homepage footer, favicon) -- rebuilt for the Aug 2026 logo
// refresh (design_handoff_prioritypay_redesign/logo/*.svg, most recently
// re-sent in "Redesign PriorityPay homepage (15).zip"): four bars, each
// centered on the others (not left-aligned) so the mark reads as a
// symmetric funnel, tapering 42.24/27.84/18.24/12 wide, each 6.72px tall
// with a matching gap, in four shades of purple (#3B1C7A / #4E22B8 /
// #6D3BE0 / #9A72F0). This replaced an earlier three-bar, left-aligned
// revision of the mark that this component was previously built from --
// Megan flagged the header/logo as out of date sitewide, and the fix is
// here since every surface renders through this one component. Geometry
// and colors match logo/prioritypay-mark.svg exactly (viewBox 0 0 48 48,
// bars centered at x=24) so this component and the standalone SVG files
// (used for favicons, app icons, and print -- see also app/icon.svg,
// which needed the same 3-bar-to-4-bar update) stay visually identical.
//
// One component so every surface stays in sync automatically -- update
// the mark once, here, instead of drifting across AppShell/PublicHeader/
// AuthCard/PublicFooter's separate copies.

const BARS = [
  { w: 42.24, y: 0, color: "#3B1C7A" },
  { w: 27.84, y: 13.44, color: "#4E22B8" },
  { w: 18.24, y: 26.88, color: "#6D3BE0" },
  { w: 12, y: 40.32, color: "#9A72F0" },
];
const MARK_VIEWBOX = 48; // matches logo/prioritypay-mark.svg's 48x48 viewBox
const MARK_ASPECT = 1; // the new mark is square, unlike the old 52x30 wide mark

// `color`, when passed, overrides all four bars with one flat tone --
// used on dark backgrounds (see PublicFooter.js) where the four-tone
// gradient would lose contrast against a near-black background. Omitted
// entirely (the normal case) renders the real four-tone mark.
export function PriorityPayMark({ size = 22, color, style }) {
  const width = size * MARK_ASPECT;
  return (
    <svg width={width} height={size} viewBox={`0 0 ${MARK_VIEWBOX} ${MARK_VIEWBOX}`} style={style} aria-hidden="true">
      {BARS.map((b, i) => (
        <rect
          key={i}
          x={(MARK_VIEWBOX - b.w) / 2}
          y={b.y}
          width={b.w}
          height={6.72}
          rx={3.36}
          fill={color || b.color}
        />
      ))}
    </svg>
  );
}

export function PriorityPayWordmark({ size = 22, color = "var(--color-text)", payColor = "var(--color-accent)", style }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 10, ...style }}>
      <span style={{ fontFamily: "var(--font-heading)", fontSize: size, fontWeight: 800, letterSpacing: "-0.02em", color }}>
        Priority
      </span>
      <span
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: size,
          fontWeight: 800,
          letterSpacing: "-0.02em",
          fontStyle: "italic",
          color: payColor,
          marginLeft: -9,
        }}
      >
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
