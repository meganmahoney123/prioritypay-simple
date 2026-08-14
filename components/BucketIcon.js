"use client";

import { useId } from "react";

const BUCKET_TOP = 36;
const BUCKET_BOTTOM = 120;
const BODY_PATH = "M 8 36 C 0 64, 10 100, 28 120 L 72 120 C 90 100, 100 64, 92 36 Z";
const PLANK_X = [18, 30, 42, 50, 58, 70, 82];
// Every bucket renders in the same wood palette no matter the category --
// approved design direction is one consistent bucket, with category color
// living only on the small dot next to each row's label. See the standalone
// mockup this was ported from (priority-pay-bucket-mockup.html) for the
// original vanilla-JS version this mirrors line for line.
const BUCKET_EMPTY = "#efe6da";
const BUCKET_FILL = "#7a5233";
const BUCKET_LINE = "#5f4630";
const BUCKET_DARK = "#3d2b1a";

// fillPct: 0-100, how full the bucket should render. Clamped here so a
// caller passing a slightly-over-100 number (e.g. a balance already past
// its minimum) never breaks the SVG math.
export default function BucketIcon({ fillPct = 0, size = 56 }) {
  const uid = useId();
  const clamped = Math.max(0, Math.min(100, fillPct));
  const fillH = (BUCKET_BOTTOM - BUCKET_TOP) * (clamped / 100);
  const fillY = BUCKET_BOTTOM - fillH;

  return (
    <svg viewBox="0 0 100 128" width={size} height={Math.round(size * 1.28)}>
      <defs>
        <clipPath id={`bucket-clip-${uid}`}>
          <path d={BODY_PATH} />
        </clipPath>
      </defs>
      <g clipPath={`url(#bucket-clip-${uid})`}>
        <rect x="0" y="0" width="100" height="128" fill={BUCKET_EMPTY} />
        <rect
          x="0"
          y={fillY}
          width="100"
          height={fillH}
          fill={BUCKET_FILL}
          style={{ transition: "y .5s ease, height .5s ease" }}
        />
        {PLANK_X.map((x) => (
          <line key={x} x1={x} y1="38" x2={x} y2="118" stroke={BUCKET_LINE} strokeOpacity=".3" strokeWidth="1.5" />
        ))}
        <path d="M 4 62 Q 50 68 96 62" fill="none" stroke={BUCKET_LINE} strokeWidth="5" />
        <path d="M 14 100 Q 50 106 86 100" fill="none" stroke={BUCKET_LINE} strokeWidth="5" />
      </g>
      <path d={BODY_PATH} fill="none" stroke={BUCKET_LINE} strokeWidth="3" strokeLinejoin="round" />
      <path d="M 14 36 Q 50 4 86 36" fill="none" stroke={BUCKET_DARK} strokeWidth="4" strokeLinecap="round" />
      <circle cx="14" cy="36" r="3" fill={BUCKET_DARK} />
      <circle cx="86" cy="36" r="3" fill={BUCKET_DARK} />
      <ellipse cx="50" cy="36" rx="42" ry="7" fill={BUCKET_EMPTY} stroke={BUCKET_LINE} strokeWidth="3" />
    </svg>
  );
}
