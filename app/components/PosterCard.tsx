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
  const show = useCallback((text: string) => { setMsg(text); }, []);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 1500);
    return () => clearTimeout(t);
  }, [msg]);
  return { msg, show };
}

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

/** Chair icon — from SVGRepo, wooden chair profile */
function ChairIcon({ filled, color }: { filled: boolean; color: string }) {
  return (
    <svg className="w-5 h-5" viewBox="-19.82 0 122.88 122.88"
      fill={filled ? color : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={filled ? 0 : 6}
    >
      <path d="M3.28,0h8.62c1.76,0,2.92,1.46,3.2,3.2c3.26,20.54,5.02,41.07,4.93,61.61H79c2.33,0,4.23,1.91,4.23,4.23v8.55 h-3.38v43.71c0,0.7-0.58,1.29-1.29,1.29H67.26c-0.71,0-1.29-0.58-1.29-1.29v-19.02H17.71c-0.7,5.8-1.57,11.6-2.61,17.4 c-0.31,1.73-1.44,3.2-3.2,3.2H3.28c-1.76,0-3.69-1.51-3.2-3.2c11.36-39.56,9-78.23,0-116.48C-0.33,1.49,1.52,0,3.28,0L3.28,0z M65.97,96.4v-18.8H19.85c-0.26,8-0.81,10.81-1.67,18.8H65.97L65.97,96.4z" />
    </svg>
  );
}

/** Disc / floppy save icon */
function DiscIcon({ filled, color }: { filled: boolean; color: string }) {
  if (filled) {
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill={color} stroke="none">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <rect x="7" y="3" width="10" height="7" rx="1" fill="white" opacity="0.9" />
        <rect x="5" y="14" width="14" height="5" rx="1.5" fill="white" opacity="0.3" />
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="7" y="3" width="10" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="5" y="14" width="14" height="5" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
                if (!attended) {
                  attendToast.show("Attend");
                  // Auto-star if not already interested
                  if (!isStarred) onToggleStar(poster.id);
                }
              }}
              className={`p-1.5 rounded-md transition-colors ${
                attended
                  ? "text-emerald-600 bg-emerald-50"
                  : "text-gray-900 hover:text-emerald-600 hover:bg-emerald-50"
              }`}
              title="Attend"
            >
              <ChairIcon filled={attended} color="#059669" />
            </button>
          </div>

          {/* 💾 Save to Library */}
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
              <DiscIcon filled={saved} color="#2563eb" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
