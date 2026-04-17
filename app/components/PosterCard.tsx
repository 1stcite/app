"use client";

import { useState } from "react";
import Link from "next/link";
import type { Poster } from "@/app/lib/usePosters";
import EngagementBadge from "@/app/components/EngagementBadge";
import { sessionTimingAt, type SessionLike } from "@/app/lib/sessionTiming";

function firstAuthor(author: string) {
  const a = String(author || "").trim();
  if (!a) return "";
  return a.split(/[,;]+/)[0].trim();
}

type PosterCardProps = {
  poster: Poster;
  isStarred: boolean;
  onToggleStar: (posterId: string) => void;
  variant?: "default" | "starred";
  now?: Date;
};

export default function PosterCard({
  poster,
  isStarred,
  onToggleStar,
  variant = "default",
  now,
}: PosterCardProps) {
  const session = (poster as unknown as { session?: SessionLike }).session ?? undefined;
  const timing = sessionTimingAt(session, now ?? new Date());
  const isPast = timing === "past";
  const [showAttended, setShowAttended] = useState(false);
  const [attended, setAttended] = useState(false);

  const bg = isPast
    ? "bg-gray-200 border-gray-400"
    : variant === "starred"
      ? "bg-yellow-50 border-yellow-200"
      : "bg-white border-gray-200";

  function handleSave() {
    if (isStarred) {
      // Unsave
      onToggleStar(poster.id);
      setShowAttended(false);
      setAttended(false);
    } else {
      // Save — show inline attendance checkbox
      onToggleStar(poster.id);
      setShowAttended(true);
    }
  }

  async function handleAttendedChange(checked: boolean) {
    setAttended(checked);
    // TODO: PATCH /api/saves to update attended flag on the save record
    try {
      await fetch("/api/saves/attended", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ posterId: poster.id, attended: checked }),
      });
    } catch {
      // Silently fail — non-critical
    }
  }

  return (
    <div className={`rounded-lg shadow-sm hover:shadow-md transition-shadow p-5 border ${bg}`}>
      <Link href={`/view/${poster.id}`} className="block">
        <div className="flex items-start justify-between gap-3">
          <div className="text-base font-semibold text-gray-900 leading-snug line-clamp-2 flex-1">
            {poster.title}
          </div>
          <EngagementBadge talkId={poster.id} />
        </div>
      </Link>

      <div className="mt-2">
        {poster.author && (
          <div className="text-sm text-gray-600 truncate mb-2">by {firstAuthor(poster.author)}</div>
        )}

        <div className="flex items-center gap-2">
          {/* Save to Library — primary action, prominent */}
          <button
            onClick={handleSave}
            className={`text-sm px-4 py-1.5 rounded-md border font-medium transition-colors ${
              isStarred
                ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                : "bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100"
            }`}
          >
            {isStarred ? "✓ Saved" : "Save to Library"}
          </button>

          {/* Schedule — secondary, smaller */}
          {!isPast && (
            <button
              onClick={() => {/* TODO: separate schedule action */}}
              className="text-xs px-2.5 py-1 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              + Schedule
            </button>
          )}
        </div>

        {/* Inline attendance checkbox — appears after save */}
        {isStarred && showAttended && (
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-600 bg-blue-50 rounded-md px-3 py-2">
            <span className="text-blue-700 font-medium">Saved to your library ✓</span>
            <label className="flex items-center gap-1.5 ml-2 cursor-pointer">
              <input
                type="checkbox"
                checked={attended}
                onChange={(e) => handleAttendedChange(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>I attended this talk</span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
