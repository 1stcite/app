"use client";

import { computeEngagement } from "@/app/lib/engagement";
import { useThumbs } from "@/app/lib/useThumbs";
import { useState } from "react";

type Props = {
  talkId: string;
};

/**
 * Compact engagement display for index rows and talk cards.
 *
 * Layout:
 *   898        ← engagement score, 20px, weight 500
 *   127 👍     ← thumbs-up count + blue icon (or grey if not viewed)
 *
 * Thumbs-up is greyed out until the user has marked "I viewed this talk."
 * Clicking the grey thumb does nothing. Clicking the active blue thumb toggles it.
 */
export default function EngagementBadge({ talkId }: Props) {
  const data = computeEngagement(talkId);
  const { viewed, thumbed, thumbCount, toggleThumb } = useThumbs(talkId);
  const [showTip, setShowTip] = useState(false);

  const displayCount = thumbCount || data.thumbsUp; // fallback to mock if no real data

  const thumbColor = !viewed
    ? "text-gray-300"
    : thumbed
      ? "text-blue-600"
      : "text-blue-400 hover:text-blue-600";

  const countColor = !viewed
    ? "text-gray-300"
    : thumbed
      ? "text-blue-600"
      : "text-blue-400";

  return (
    <div
      className="relative flex flex-col items-center justify-center shrink-0"
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
    >
      {/* Engagement number */}
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

      {/* Thumbs-up row: count then icon */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (viewed) toggleThumb();
        }}
        className={`flex items-center gap-1 mt-0.5 transition-colors ${viewed ? "cursor-pointer" : "cursor-default"}`}
        title={
          !viewed
            ? "View this talk to enable thumbs-up"
            : thumbed
              ? "Remove thumbs-up"
              : "Give thumbs-up"
        }
      >
        <span
          className={`leading-none ${countColor}`}
          style={{
            fontSize: "13px",
            fontWeight: 500,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {displayCount}
        </span>
        <svg
          className={`transition-colors ${thumbColor}`}
          style={{ width: "13px", height: "13px" }}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zm4-.167v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.556 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
        </svg>
      </button>

      {/* Tooltip */}
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
