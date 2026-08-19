"use client";

// Shared brand mark for every surface of the app (sidebar, public header,
// auth card, homepage footer, favicon) -- built from the logo artwork
// Megan provided (priority-pay-logo-6b-written.png): four horizontal bars
// tapering ~65% each step, forming a funnel/priority-stack mark, paired
// with the "Priority" + italic gold "Pay" wordmark already used
// throughout the site. Rendered as a solid fill rather than the softer
// blurred/feathered edges in the source artwork -- that blur reads well
// at large marketing sizes but just looks like fuzz at the ~20px this
// renders at in a nav bar or sidebar, so the shape (not the blur) is what
// carries the brand here.
//
// One component so every surface stays in sync automatically -- update
// the bar ratios or wordmark styling once, here, instead of drifting
// across AppShell/PublicHeader/AuthCard/Homepage's separate copies.

const BARS = [
  { w: 0.88, y: 0 },
  { w: 0.58, y: 0.28 },
  { w: 0.38, y: 0.56 },
  { w: 0.25, y: 0.84 },
];
const BAR_HEIGHT = 0.14;

export function PriorityPayMark({ size = 22, color = "var(--color-accent-700)", style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 1 1" style={style} aria-hidden="true">
      {BARS.map((b, i) => (
        <rect key={i} x={(1 - b.w) / 2} y={b.y} width={b.w} height={BAR_HEIGHT} rx={BAR_HEIGHT / 2} fill={color} />
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
