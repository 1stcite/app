"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePosters, type Poster } from "@/app/lib/usePosters";
import PosterCard from "@/app/components/PosterCard";
import EngagementBadge from "@/app/components/EngagementBadge";
import { useConference } from "@/app/lib/conferenceContext";
import Footer from "@/app/components/Footer";
import { useDemoClock } from "@/app/lib/demoClock";
import { sessionTimingAt, type SessionLike } from "@/app/lib/sessionTiming";

type FilterTab = "all" | "schedule" | "library";

/** Check if two sessions conflict — different sessions with overlapping times. */
function sessionsConflict(
  a: { id?: string; date?: string; startTime?: string; endTime?: string },
  b: { id?: string; date?: string; startTime?: string; endTime?: string }
): boolean {
  if (a.id && b.id && a.id === b.id) return false;
  if (!a.date || !b.date || a.date !== b.date) return false;
  if (!a.startTime || !b.startTime) return false;
  const aEnd = a.endTime || "23:59";
  const bEnd = b.endTime || "23:59";
  return a.startTime < bEnd && b.startTime < aEnd;
}

export default function MyTalksPage() {
  const { logo: ctxLogo } = useConference();
  const { loading, posters, starredPosterIds, starredPosters, toggleStar } = usePosters();
  const { now: demoNow } = useDemoClock();

  const [LOGO, setLogo] = useState(ctxLogo);
  const [attendedIds, setAttendedIds] = useState<string[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [tab, setTab] = useState<FilterTab>("all");

  // Logo fallback
  useEffect(() => {
    if (ctxLogo && ctxLogo !== "/1stcite-logo.png") { setLogo(ctxLogo); return; }
    fetch("/api/conference").then(r => r.json()).then(c => { if (c?.logo) setLogo(c.logo); }).catch(() => {});
  }, [ctxLogo]);

  // Fetch attend + library data
  useEffect(() => {
    fetch("/api/attend").then(r => r.json())
      .then(d => setAttendedIds((d || []).map((x: { posterId: string }) => x.posterId))).catch(() => {});
    fetch("/api/library").then(r => r.json())
      .then(d => setSavedIds((d || []).map((x: { posterId: string }) => x.posterId))).catch(() => {});
  }, []);

  const posterById = useMemo(() => new Map(posters.map(p => [p.id, p])), [posters]);

  // ─── SCHEDULE DATA (upcoming starred talks, session-grouped) ───────
  const upcoming = useMemo(() => {
    return starredPosters.filter(p => {
      const session = (p as unknown as { session?: SessionLike }).session;
      return sessionTimingAt(session, demoNow) !== "past";
    });
  }, [starredPosters, demoNow]);

  // Conflict detection among attended talks
  const conflicts = useMemo(() => {
    const attended = posters
      .filter(p => attendedIds.includes(p.id))
      .map(p => ({ poster: p, session: (p as unknown as { session?: SessionLike & { id?: string } }).session }))
      .filter(x => x.session?.date && x.session?.startTime);
    const ids = new Set<string>();
    for (let i = 0; i < attended.length; i++) {
      for (let j = i + 1; j < attended.length; j++) {
        if (sessionsConflict(attended[i].session!, attended[j].session!)) {
          ids.add(attended[i].poster.id);
          ids.add(attended[j].poster.id);
        }
      }
    }
    return ids;
  }, [posters, attendedIds]);

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

  // ─── LIBRARY DATA (flat lists) ─────────────────────────────────────
  const savedPosters = useMemo(() =>
    savedIds.map(id => posterById.get(id)).filter((p): p is Poster => Boolean(p)),
    [savedIds, posterById]
  );

  // Starred or attended but NOT saved — reminder list
  const unsavedInteracted = useMemo(() => {
    const allInteracted = new Set([...starredPosterIds, ...attendedIds]);
    return [...allInteracted]
      .filter(id => !savedIds.includes(id))
      .map(id => posterById.get(id))
      .filter((p): p is Poster => Boolean(p));
  }, [starredPosterIds, attendedIds, savedIds, posterById]);

  // ─── RENDER HELPERS ────────────────────────────────────────────────

  function renderScheduleCards(items: typeof starredPosters) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(poster => (
          <div key={poster._id}>
            {conflicts.has(poster.id) && (
              <div className="mb-1 px-2 py-1 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-center gap-1.5">
                <span className="font-semibold">⚠ Conflict</span>
                <span>— overlaps with another talk you plan to attend</span>
              </div>
            )}
            <PosterCard
              poster={poster}
              isStarred={starredPosterIds.includes(poster.id)}
              onToggleStar={toggleStar}
              variant="starred"
              now={demoNow}
            />
          </div>
        ))}
      </div>
    );
  }

  function renderScheduleSection() {
    if (upcoming.length === 0) return null;
    return (
      <div>
        <div className="flex items-baseline justify-between mb-4 pb-2 border-b-2 border-blue-200">
          <h2 className="text-xl font-bold text-gray-700">
            Schedule <span className="text-gray-400 font-normal text-base">({upcoming.length})</span>
          </h2>
        </div>

        {conflicts.size > 0 && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            <strong>⚠ Schedule conflict:</strong> {conflicts.size} talks you plan to attend overlap in time.
          </div>
        )}

        <div className="space-y-6">
          {upcomingGrouped.groups.map(({ session, posters: sessionPosters }) => (
            <div key={session.id}>
              <div className="mb-3">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "#1a2e5a" }}>
                  <span className="text-white font-semibold text-sm">{session.name}</span>
                </div>
                <div className="flex gap-3 mt-1 text-xs text-gray-500 pl-1">
                  {session.date && session.startTime && (
                    <span>🕐 {session.startTime}{session.endTime ? ` – ${session.endTime}` : ""}</span>
                  )}
                  {session.location && <span>📍 {session.location}</span>}
                </div>
              </div>
              {renderScheduleCards(sessionPosters)}
            </div>
          ))}
          {upcomingGrouped.withoutSession.length > 0 && (
            <div>
              <div className="mb-3"><span className="text-sm font-medium text-gray-400">Other</span></div>
              {renderScheduleCards(upcomingGrouped.withoutSession)}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderLibrarySection() {
    if (savedPosters.length === 0 && unsavedInteracted.length === 0) return null;
    return (
      <div>
        <div className="flex items-baseline justify-between mb-4 pb-2 border-b-2 border-blue-200">
          <h2 className="text-xl font-bold text-gray-700">
            Library <span className="text-gray-400 font-normal text-base">({savedPosters.length})</span>
          </h2>
        </div>

        {/* Saved talks — flat list */}
        {savedPosters.length > 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {savedPosters.map(poster => (
              <div key={poster.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <Link href={`/view/${poster.id}`}>
                      <p className="font-medium text-gray-900 leading-snug hover:text-blue-700 transition-colors">
                        {poster.title}
                      </p>
                    </Link>
                    {poster.author && <p className="text-sm text-gray-500 mt-0.5">{poster.author}</p>}
                  </div>
                  <EngagementBadge talkId={poster.id} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-sm text-gray-500">
            No saved talks yet. Use the 💾 icon to save talks to your library.
          </div>
        )}

        {/* Unsaved but starred/attended — prompt section */}
        {unsavedInteracted.length > 0 && (
          <div className="mt-6">
            <div className="flex items-baseline justify-between mb-3 pb-2 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-500">
                Not yet saved <span className="text-gray-400 font-normal text-sm">({unsavedInteracted.length})</span>
              </h3>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Talks you starred or attended but haven&apos;t saved to your library yet.
            </p>
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
              {unsavedInteracted.map(poster => {
                const isStarred = starredPosterIds.includes(poster.id);
                const isAttended = attendedIds.includes(poster.id);
                return (
                  <div key={poster.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <Link href={`/view/${poster.id}`}>
                          <p className="font-medium text-gray-900 leading-snug hover:text-blue-700 transition-colors">
                            {poster.title}
                          </p>
                        </Link>
                        {poster.author && <p className="text-sm text-gray-500 mt-0.5">{poster.author}</p>}
                        <div className="flex gap-1.5 mt-1.5">
                          {isStarred && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              ★ Interested
                            </span>
                          )}
                          {isAttended && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Attended
                            </span>
                          )}
                        </div>
                      </div>
                      <EngagementBadge talkId={poster.id} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── PAGE ──────────────────────────────────────────────────────────

  const hasAnything = starredPosterIds.length > 0 || attendedIds.length > 0 || savedIds.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 md:p-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4 min-w-0">
          <h1 className="text-xl md:text-3xl font-bold text-gray-500 whitespace-nowrap">My Talks</h1>
          <Link href="/"
            className="px-3 py-1.5 rounded border border-gray-300 text-gray-700 bg-white text-sm hover:bg-gray-50 whitespace-nowrap shrink-0">
            Conference
          </Link>
          <div className="flex-1" />
          <Link href="/" className="shrink-0">
            <img src={LOGO} alt="" className="h-8 md:h-16 w-auto max-w-[80px] md:max-w-[160px] object-contain" />
          </Link>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-6 bg-gray-200 p-1 rounded-lg w-fit">
          {([
            { key: "all" as FilterTab, label: "All" },
            { key: "schedule" as FilterTab, label: "Schedule" },
            { key: "library" as FilterTab, label: "Library" },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                tab === key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading…</p>
          </div>
        ) : !hasAnything ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-lg text-gray-600">No talks yet</p>
            <p className="text-sm text-gray-400 mt-2">
              Use the ★ 🪑 💾 icons on any talk to get started.
            </p>
            <Link href="/" className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
              Browse the conference
            </Link>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Schedule section — shown on All and Schedule tabs */}
            {(tab === "all" || tab === "schedule") && renderScheduleSection()}

            {/* Empty state for schedule tab */}
            {tab === "schedule" && upcoming.length === 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-sm text-gray-500">
                No upcoming talks scheduled. Star talks from the conference to add them here.
              </div>
            )}

            {/* Library section — shown on All and Library tabs */}
            {(tab === "all" || tab === "library") && renderLibrarySection()}

            {/* Empty state for library tab */}
            {tab === "library" && savedPosters.length === 0 && unsavedInteracted.length === 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-sm text-gray-500">
                No saved talks yet. Use the 💾 icon to save talks to your library.
              </div>
            )}
          </div>
        )}

        <Footer />
      </div>
    </div>
  );
}
