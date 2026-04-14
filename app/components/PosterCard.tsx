"use client";

import Link from "next/link";
import type { Poster } from "@/app/lib/usePosters";
import InCiteBadge from "@/app/components/InCiteBadge";
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
  /** Current time for timing computation. Defaults to real now. */
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

  const bg =
    variant === "starred"
      ? "bg-yellow-50 border-yellow-200"
      : "bg-white border-gray-200";

  // Button label depends on session timing:
  //   Upcoming → Schedule / Scheduled
  //   Past     → Library  / In Library
  const buttonLabel = isPast
    ? isStarred ? "✓ In Library" : "+ Library"
    : isStarred ? "✓ Scheduled" : "+ Schedule";

  return (
    <div
      className={`rounded-lg shadow-sm hover:shadow-md transition-shadow p-5 border ${bg} ${
        isPast ? "opacity-70" : ""
      }`}
    >
      <Link href={`/view/${poster.id}`} className="block">
        <div className="flex items-start justify-between gap-2">
          <div className="text-base font-semibold text-gray-900 leading-snug line-clamp-2 flex-1">
            {poster.title}
          </div>
          <InCiteBadge talkId={poster.id} />
        </div>
      </Link>

      <div className="mt-2 flex items-center justify-between gap-2">
        {poster.author ? (
          <div className="text-sm text-gray-600 truncate">by {firstAuthor(poster.author)}</div>
        ) : (
          <div />
        )}
        <button
          onClick={() => onToggleStar(poster.id)}
          className={`shrink-0 text-xs px-2.5 py-1 rounded-md border font-medium transition-colors ${
            isStarred
              ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          }`}
          aria-label={buttonLabel}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
