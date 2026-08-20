import { ImageResponse } from "next/og";

// Site-wide default OG/Twitter share image -- before this, no page had
// one at all, so links shared to Slack/iMessage/Twitter/LinkedIn showed
// no preview image whatsoever. Generated at request time from the same
// Ledger palette/wordmark as the rest of the site rather than a static
// upload, so it stays visually in sync without a separate asset to
// maintain. Any page can override this by adding its own
// opengraph-image file in its route segment; none currently do, so this
// is what every page's share preview uses today.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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
          background: "#f3f2f2",
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 28 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 54 }}>
            <div style={{ width: 54, height: 10, background: "#7d5411", borderRadius: 2 }} />
            <div style={{ width: 36, height: 10, background: "#7d5411", borderRadius: 2 }} />
            <div style={{ width: 24, height: 10, background: "#7d5411", borderRadius: 2 }} />
            <div style={{ width: 16, height: 10, background: "#7d5411", borderRadius: 2 }} />
          </div>
          <div style={{ display: "flex", fontSize: 64, color: "#201f1d" }}>
            Priority<span style={{ color: "#7d5411", fontStyle: "italic" }}>Pay</span>
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#201f1d", opacity: 0.75, textAlign: "center", maxWidth: 820 }}>
          Automatically route income to savings, taxes, and investments.
        </div>
      </div>
    ),
    { ...size }
  );
}
