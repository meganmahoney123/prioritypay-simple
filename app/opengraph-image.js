import { ImageResponse } from "next/og";

// Site-wide default OG/Twitter share image -- before this, no page had
// one at all, so links shared to Slack/iMessage/Twitter/LinkedIn showed
// no preview image whatsoever. Generated at request time so it stays
// visually in sync without a separate asset to maintain. Any page can
// override this by adding its own opengraph-image file in its route
// segment; none currently do, so this is what every page's share
// preview uses today.
//
// Rebuilt for the Aug 2026 Bloom purple redesign -- this previously
// still used the old gold "Ledger" theme (#7d5411, serif font, grey
// background) and a 4-bar mark from an even earlier revision, both long
// superseded elsewhere on the site. Bar geometry/colors now match
// components/PriorityPayLogo.js's PriorityPayMark exactly (same
// centered-funnel 4-bar shape, same 4 purple shades) so this share image
// and the on-site header logo stay visually identical.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const MARK_BARS = [
  { w: 84, color: "#3B1C7A" },
  { w: 55, color: "#4E22B8" },
  { w: 36, color: "#9A72F0" },
  { w: 24, color: "#9A72F0" },
];

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#FAF7FD",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, width: 84 }}>
            {MARK_BARS.map((b, i) => (
              <div
                key={i}
                style={{ width: b.w, height: 13, background: b.color, borderRadius: 6, alignSelf: "center" }}
              />
            ))}
          </div>
          <div style={{ width: 2, height: 74, background: "#E3D6FA" }} />
          <div style={{ display: "flex", fontSize: 64, fontWeight: 800, color: "#241634" }}>
            Priority<span style={{ color: "#6D3BE0", fontStyle: "italic" }}>Pay</span>
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#574A68", textAlign: "center", maxWidth: 820 }}>
          Automatically route income to savings, taxes, and investments.
        </div>
      </div>
    ),
    { ...size }
  );
}
