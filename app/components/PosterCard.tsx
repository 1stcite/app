"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { Poster } from "@/app/lib/usePosters";
import EngagementBadge from "@/app/components/EngagementBadge";
import { useLibrary } from "@/app/lib/useLibrary";
import { useAttend } from "@/app/lib/useAttend";
import { sessionTimingAt, type SessionLike } from "@/app/lib/sessionTiming";

function firstAuthor(author: string) {
  const a = String(author || "").trim();
  if (!a) return "";
  return a.split(/[,;]+/)[0].trim();
}

/* ── Toast hook ──────────────────────────────────────────────────────── */

function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const show = useCallback((text: string) => {
    setMsg(text);
  }, []);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 1500);
    return () => clearTimeout(t);
  }, [msg]);
  return { msg, show };
}

/* ── Icons ───────────────────────────────────────────────────────────── */

/** Star — same outline/filled as before */
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

/** Person sitting in a chair — attend */
function AttendIcon({ filled }: { filled: boolean }) {
  // Simple person-in-chair silhouette
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"} strokeWidth={filled ? 0 : 1.5}>
      {/* Head */}
      <circle cx="12" cy="5" r="2.5" />
      {/* Body sitting */}
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 10h6l1 5h-8l1-5z" />
      {/* Legs */}
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M10 15v4M14 15v2.5h2" />
      {/* Chair back */}
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M7 8v9" />
      {/* Chair seat */}
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M7 15h10" />
      {/* Chair legs */}
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M7 17v2M17 15v4" />
    </svg>
  );
}

/** Books on a shelf — library. Same icon filled/unfilled, just color changes */
function BooksIcon({ filled }: { filled: boolean }) {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"} strokeWidth={filled ? 0 : 1.5}>
      {/* Shelf */}
      <path strokeLinecap="round" d="M3 20h18" />
      {/* Book 1 — tall, slight lean */}
      <rect x="5" y="6" width="3" height="14" rx="0.5"
        transform="rotate(-2 6.5 13)" />
      {/* Book 2 — medium */}
      <rect x="9" y="8" width="2.5" height="12" rx="0.5" />
      {/* Book 3 — tall */}
      <rect x="12.5" y="5" width="3" height="15" rx="0.5"
        transform="rotate(1 14 12.5)" />
      {/* Book 4 — short, leaning */}
      <rect x="16.5" y="10" width="2.5" height="10" rx="0.5"
        transform="rotate(3 17.75 15)" />
    </svg>
  );
}

/* ── Toast component ─────────────────────────────────────────────────── */

function Toast({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-50 animate-fade-toast">
      <div className="bg-gray-900 text-white text-[11px] font-medium px-2.5 py-1 rounded-md shadow-lg whitespace-nowrap">
        {msg}
      </div>
    </div>
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
  const { saved, toggleSave } = useLibrary(poster.id);
  const { attended, toggleAttend } = useAttend(poster.id);
  const session = (poster as unknown as { session?: SessionLike }).session ?? undefined;
  const timing = sessionTimingAt(session, now ?? new Date());
  const isPast = timing === "past";

  const starToast = useToast();
  const attendToast = useToast();
  const libraryToast = useToast();

  const bg = isPast
    ? "bg-gray-200 border-gray-400"
    : variant === "starred"
      ? "bg-yellow-50 border-yellow-200"
      : "bg-white border-gray-200";

  return (
    <div className={`rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 border ${bg}`}>
      {/* Toast animation style */}
      <style>{`
        @keyframes fadeToast {
          0% { opacity: 0; transform: translate(-50%, 4px); }
          15% { opacity: 1; transform: translate(-50%, 0); }
          85% { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, -4px); }
        }
        .animate-fade-toast { animation: fadeToast 1.5s ease-in-out forwards; }
      `}</style>

      {/* Clickable card → view slides */}
      <Link href={`/view/${poster.id}`} className="block group">
        <div className="flex items-start justify-between gap-3">
          <div className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 flex-1 group-hover:text-blue-600 transition-colors">
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

        {/* Three independent icon toggles with toasts */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* ⭐ Interested */}
          <div className="relative">
            <Toast msg={starToast.msg} />
            <button
              onClick={() => {
                onToggleStar(poster.id);
                if (!isStarred) starToast.show("Interested");
              }}
              className={`p-1.5 rounded-md transition-colors ${
                isStarred
                  ? "text-amber-500 bg-amber-50"
                  : "text-gray-900 hover:text-amber-500 hover:bg-amber-50"
              }`}
              title="Interested"
            >
              <StarIcon filled={isStarred} />
            </button>
          </div>

          {/* 🪑 Attend */}
          <div className="relative">
            <Toast msg={attendToast.msg} />
            <button
              onClick={() => {
                toggleAttend();
                if (!attended) attendToast.show("Attend");
              }}
              className={`p-1.5 rounded-md transition-colors ${
                attended
                  ? "text-emerald-600 bg-emerald-50"
                  : "text-gray-900 hover:text-emerald-600 hover:bg-emerald-50"
              }`}
              title="Attend"
            >
              <AttendIcon filled={attended} />
            </button>
          </div>

          {/* 📚 Save to Library */}
          <div className="relative">
            <Toast msg={libraryToast.msg} />
            <button
              onClick={() => {
                toggleSave();
                if (!saved) libraryToast.show("Save to Library");
              }}
              className={`p-1.5 rounded-md transition-colors ${
                saved
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-900 hover:text-blue-600 hover:bg-blue-50"
              }`}
              title="Save to Library"
            >
              <BooksIcon filled={saved} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
