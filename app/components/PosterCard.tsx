"use client";

import Link from "next/link";
import type { Poster } from "@/app/lib/usePosters";
import InCiteBadge from "@/app/components/InCiteBadge";

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
};

export default function PosterCard({
  poster,
  isStarred,
  onToggleStar,
  variant = "default",
}: PosterCardProps) {
  const bg =
    variant === "starred"
      ? "bg-yellow-50 border-yellow-200"
      : "bg-white border-gray-200";

  return (
    <div className={`rounded-lg shadow-sm hover:shadow-md transition-shadow p-5 border ${bg}`}>
      <Link href={`/view/${poster.id}`} className="block">
        <div className="flex items-start justify-between gap-2">
          <div className="text-base font-semibold text-gray-900 leading-snug line-clamp-2 flex-1">
            {poster.title}
          </div>
          <InCiteBadge talkId={poster.id} />
        </div>
      </Link>

      <div className="mt-2 flex items-center justify-between">
        {poster.author ? (
          <div className="text-sm text-gray-600">by {firstAuthor(poster.author)}</div>
        ) : (
          <div />
        )}
        <button
          onClick={() => onToggleStar(poster.id)}
          className={`text-xs px-2.5 py-1 rounded-md border font-medium transition-colors ${
            isStarred
              ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          }`}
          aria-label={isStarred ? "Unsave" : "Save"}
        >
          {isStarred ? "✓ Saved" : "+ Save"}
        </button>
      </div>
    </div>
  );
}
