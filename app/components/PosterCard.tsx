"use client";

import Link from "next/link";
import type { Poster } from "@/app/lib/usePosters";
import EngagementBadge from "@/app/components/EngagementBadge";
import { useLibrary } from "@/app/lib/useLibrary";
import { sessionTimingAt, type SessionLike } from "@/app/lib/sessionTiming";

function firstAuthor(author: string) {
  const a = String(author || "").trim();
  if (!a) return "";
  return a.split(/[,;]+/)[0].trim();
}

/* ── Icons ───────────────────────────────────────────────────────────── */

function StarIcon({ filled }: { filled: boolean }) {
  return filled ? (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function BookIcon({ filled }: { filled: boolean }) {
  return filled ? (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0z" />
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  );
}

/* ── PosterCard ──────────────────────────────────────────────────────── */

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
  const { saved, attended, toggleSave, setAttended } = useLibrary(poster.id);

  const bg = isPast
    ? "bg-gray-200 border-gray-400"
    : variant === "starred"
      ? "bg-yellow-50 border-yellow-200"
      : "bg-white border-gray-200";

  return (
    <div className={`rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 border ${bg}`}>
      <Link href={`/view/${poster.id}`} className="block">
        <div className="flex items-start justify-between gap-3">
          <div className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 flex-1">
            {poster.title}
          </div>
          <EngagementBadge talkId={poster.id} />
        </div>
      </Link>

      <div className="mt-2 flex items-center justify-between gap-2">
        {poster.author ? (
          <div className="text-xs text-gray-600 truncate flex-1">by {firstAuthor(poster.author)}</div>
        ) : (
          <div className="flex-1" />
        )}

        {/* Icon actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* ⭐ Schedule — before session only, toggleable */}
          {!isPast && (
            <button
              onClick={() => onToggleStar(poster.id)}
              className={`p-1.5 rounded-md transition-colors ${
                isStarred
                  ? "text-amber-500 bg-amber-50"
                  : "text-gray-900 hover:text-amber-500 hover:bg-amber-50"
              }`}
              title={isStarred ? "Remove from schedule" : "Add to schedule"}
            >
              <StarIcon filled={isStarred} />
            </button>
          )}

          {/* 👁 View — always visible */}
          <Link
            href={`/view/${poster.id}`}
            className="p-1.5 rounded-md text-gray-900 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="View slides"
          >
            <EyeIcon />
          </Link>

          {/* 📚 Library — during/after session, toggleable independently */}
          {isPast && (
            <button
              onClick={toggleSave}
              className={`p-1.5 rounded-md transition-colors ${
                saved
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-900 hover:text-blue-600 hover:bg-blue-50"
              }`}
              title={saved ? "Remove from library" : "Save to library"}
            >
              <BookIcon filled={saved} />
            </button>
          )}
        </div>
      </div>

      {/* Inline attendance checkbox — after saving to library */}
      {isPast && saved && (
        <div className="mt-2 flex items-center gap-2 text-xs text-gray-600 bg-blue-50 rounded-md px-3 py-2">
          <span className="text-blue-700 font-medium">Saved ✓</span>
          <label className="flex items-center gap-1.5 ml-1 cursor-pointer">
            <input
              type="checkbox"
              checked={attended}
              onChange={(e) => setAttended(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>I attended this talk</span>
          </label>
        </div>
      )}
    </div>
  );
}
