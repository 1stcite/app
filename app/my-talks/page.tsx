"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePosters } from "@/app/lib/usePosters";
import PosterCard from "@/app/components/PosterCard";
import { useConference } from "@/app/lib/conferenceContext";
import Footer from "@/app/components/Footer";
import { useDemoClock } from "@/app/lib/demoClock";
import { sessionTimingAt, type SessionLike } from "@/app/lib/sessionTiming";

export default function MyTalksPage() {
  const { logo: LOGO } = useConference();
  const { loading, starredPosterIds, starredPosters, toggleStar } = usePosters();
  const { now: demoNow } = useDemoClock();

  const [unreviewedCount, setUnreviewedCount] = useState(0);
  const [libraryCount, setLibraryCount] = useState(0);
  const [pastCollapsed, setPastCollapsed] = useState(false);

  useEffect(() => {
    fetch("/api/saves?state=unreviewed").then(r => r.json()).then(d => setUnreviewedCount(d?.length || 0));
    fetch("/api/saves?state=in_library").then(r => r.json()).then(d => setLibraryCount(d?.length || 0));
  }, [starredPosterIds]);

  // Split into Upcoming vs Past based on session timing at demoNow
  const { upcoming, past } = useMemo(() => {
    const up: typeof starredPosters = [];
    const ps: typeof starredPosters = [];
    for (const p of starredPosters) {
      const session = (p as unknown as { session?: SessionLike }).session;
      const t = sessionTimingAt(session, demoNow);
      if (t === "past") ps.push(p);
      else up.push(p);
    }
    return { upcoming: up, past: ps };
  }, [starredPosters, demoNow]);

  // Within each bucket, group by session
  function groupBySession(items: typeof starredPosters) {
    const withSession = items.filter(p => (p as any).session);
    const withoutSession = items.filter(p => !(p as any).session);
    const map = new Map<string, { session: any; posters: typeof starredPosters }>();
    for (const poster of withSession) {
      const s = (poster as any).session;
      if (!map.has(s.id)) map.set(s.id, { session: s, posters: [] });
      map.get(s.id)!.posters.push(poster);
    }
    return { groups: [...map.values()], withoutSession };
  }

  const upcomingGrouped = groupBySession(upcoming);
  const pastGrouped = groupBySession(past);

  // Auto-collapse Past if there are many items
  useEffect(() => {
    if (past.length > 12) setPastCollapsed(true);
  }, [past.length]);

  function renderSessionCards(items: typeof starredPosters, variant: "starred" = "starred") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(poster => (
          <PosterCard
            key={poster._id}
            poster={poster}
            isStarred={starredPosterIds.includes(poster.id)}
            onToggleStar={toggleStar}
            variant={variant}
            now={demoNow}
          />
        ))}
      </div>
    );
  }

  function renderGrouped(grouped: ReturnType<typeof groupBySession>) {
    return (
      <div className="space-y-6">
        {grouped.groups.map(({ session, posters }) => (
          <div key={session.id}>
            <div className="mb-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{background:"#1a2e5a"}}>
                <span className="text-white font-semibold text-sm">{session.name}</span>
              </div>
              <div className="flex gap-3 mt-1 text-xs text-gray-500 pl-1">
                {session.date && session.startTime && (
                  <span>🕐 {session.startTime}{session.endTime ? ` – ${session.endTime}` : ''}</span>
                )}
                {session.location && <span>📍 {session.location}</span>}
              </div>
            </div>
            {renderSessionCards(posters)}
          </div>
        ))}
        {grouped.withoutSession.length > 0 && (
          <div>
            {grouped.groups.length > 0 && (
              <div className="mb-3">
                <span className="text-sm font-medium text-gray-400">Other</span>
              </div>
            )}
            {renderSessionCards(grouped.withoutSession)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 md:p-8 max-w-6xl">

        {/* Header */}
        <div className="flex items-center gap-2 mb-4 min-w-0">
          <h1 className="text-xl md:text-3xl font-bold text-gray-500 whitespace-nowrap">My Talks</h1>
          <Link
            href="/"
            className="px-3 py-1.5 rounded border border-gray-300 text-gray-700 bg-white text-sm hover:bg-gray-50 whitespace-nowrap shrink-0"
          >
            Conference
          </Link>
          <div className="flex-1" />
          <Link href="/" className="shrink-0">
            <img src={LOGO} alt="" className="h-8 md:h-16 w-auto max-w-[80px] md:max-w-[160px] object-contain" />
          </Link>
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <Link
            href="/review"
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium ${
              unreviewedCount > 0
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
            onClick={e => { if (unreviewedCount === 0) e.preventDefault(); }}
          >
            Review saves by session
            {unreviewedCount > 0 && (
              <span className="bg-white/25 px-1.5 rounded text-xs">{unreviewedCount}</span>
            )}
          </Link>
          <Link
            href="/library"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            📚 My Library
            {libraryCount > 0 && (
              <span className="bg-gray-100 px-1.5 rounded text-xs">{libraryCount}</span>
            )}
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading...</p>
          </div>
        ) : starredPosters.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-xl text-gray-600">No talks yet</p>
            <p className="text-sm text-gray-400 mt-2">
              Schedule talks from the{" "}
              <Link href="/" className="underline">conference view</Link>{" "}
              to build your list.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Upcoming */}
            {upcoming.length > 0 && (
              <div>
                <div className="flex items-baseline justify-between mb-4 pb-2 border-b-2 border-blue-200">
                  <h2 className="text-xl font-bold text-gray-700">
                    Upcoming <span className="text-gray-400 font-normal text-base">({upcoming.length})</span>
                  </h2>
                </div>
                {renderGrouped(upcomingGrouped)}
              </div>
            )}

            {/* Past */}
            {past.length > 0 && (
              <div>
                <div className="flex items-baseline justify-between mb-4 pb-2 border-b-2 border-gray-200">
                  <button
                    onClick={() => setPastCollapsed(c => !c)}
                    className="flex items-baseline gap-2 text-xl font-bold text-gray-500 hover:text-gray-700"
                  >
                    <span>{pastCollapsed ? "▸" : "▾"}</span>
                    Past <span className="text-gray-400 font-normal text-base">({past.length})</span>
                  </button>
                </div>
                {!pastCollapsed && renderGrouped(pastGrouped)}
              </div>
            )}
          </div>
        )}
        <Footer />
      </div>
    </div>
  );
}
