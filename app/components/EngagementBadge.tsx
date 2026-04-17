"use client";

import { computeEngagement } from "@/app/lib/engagement";
import { useState } from "react";

type Props = {
  talkId: string;
};

/**
 * Compact engagement display for index rows and talk cards.
 * Single number at 20px weight 500. Hover reveals breakdown.
 */
export default function EngagementBadge({ talkId }: Props) {
  const data = computeEngagement(talkId);
  const [showTip, setShowTip] = useState(false);

  return (
    <div
      className="relative flex flex-col items-center justify-center shrink-0"
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
    >
      <span
        className="text-gray-900 leading-tight"
        style={{
          fontSize: "20px",
          fontWeight: 500,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {data.engagement.toLocaleString()}
      </span>

      {showTip && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{
            bottom: "calc(100% + 10px)",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          <div
            className="bg-gray-900 text-white rounded-lg shadow-lg"
            style={{
              padding: "10px 14px",
              fontSize: "11.5px",
              lineHeight: 1.55,
              whiteSpace: "nowrap",
            }}
          >
            <dl
              className="m-0"
              style={{
                display: "grid",
                gridTemplateColumns: "auto auto",
                gap: "2px 18px",
              }}
            >
              <dt className="text-gray-400" style={{ fontSize: "11px" }}>Viewers</dt>
              <dd className="m-0 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>{data.viewers}</dd>
              <dt className="text-gray-400" style={{ fontSize: "11px" }}>Median view time</dt>
              <dd className="m-0 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>{data.medianViewTimeMin} m</dd>
              <dt className="text-gray-400" style={{ fontSize: "11px" }}>Commenters</dt>
              <dd className="m-0 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>{data.commenters}</dd>
              <dt className="text-gray-400" style={{ fontSize: "11px" }}>Comments</dt>
              <dd className="m-0 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>{data.comments}</dd>
              <dt className="text-gray-400" style={{ fontSize: "11px" }}>Saves</dt>
              <dd className="m-0 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>{data.saves}</dd>
            </dl>
          </div>
          <div
            style={{
              width: 0, height: 0, margin: "0 auto",
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: "5px solid #111827",
            }}
          />
        </div>
      )}
    </div>
  );
}
