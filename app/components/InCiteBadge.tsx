"use client";

import { computeInCite } from "@/app/lib/incite";

type Props = {
  talkId: string;
  inputs?: { views?: number; comments?: number; saves?: number };
  size?: "sm" | "md" | "lg";
};

/**
 * InCite Index — two-axis cross visualization.
 *
 *   - Engagement is the horizontal bar (mirrored, centered)
 *   - Sentiment is the vertical bar (mirrored, centered)
 *   - The engagement number sits at the center as the headline value
 */
export default function InCiteBadge({ talkId, inputs, size = "sm" }: Props) {
  const score = computeInCite(talkId, inputs);

  const dim = size === "lg" ? 64 : size === "md" ? 52 : 44;
  const fontSize = size === "lg" ? 18 : size === "md" ? 14 : 13;
  const center = dim / 2;
  const maxBar = dim * 0.42; // bar extends up to 42% of the box from center

  // Half-width / half-height of the colored bars
  const hHalf = (score.engagement / 100) * maxBar;
  const vHalf = (score.sentiment / 100) * maxBar;

  return (
    <div
      className="inline-block relative shrink-0"
      style={{ width: dim, height: dim }}
      title={`InCite — Engagement ${score.engagement}, Sentiment ${score.sentiment}`}
    >
      <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`} className="block">
        {/* Faint gridlines showing max extents */}
        <line
          x1={center - maxBar} y1={center}
          x2={center + maxBar} y2={center}
          stroke="#e5e7eb" strokeWidth={1}
        />
        <line
          x1={center} y1={center - maxBar}
          x2={center} y2={center + maxBar}
          stroke="#e5e7eb" strokeWidth={1}
        />
        {/* Engagement bar (horizontal, emerald) */}
        <line
          x1={center - hHalf} y1={center}
          x2={center + hHalf} y2={center}
          stroke="#10b981" strokeWidth={3} strokeLinecap="round"
        />
        {/* Sentiment bar (vertical, emerald — slightly different shade) */}
        <line
          x1={center} y1={center - vHalf}
          x2={center} y2={center + vHalf}
          stroke="#34d399" strokeWidth={3} strokeLinecap="round"
        />
        {/* Center number */}
        <text
          x={center}
          y={center}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={fontSize}
          fontWeight="700"
          fill="#065f46"
        >
          {score.engagement}
        </text>
      </svg>
    </div>
  );
}
