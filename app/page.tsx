"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePosters, type Poster } from "@/app/lib/usePosters";
import PosterCard from "@/app/components/PosterCard";
import { useConference } from "@/app/lib/conferenceContext";

function normalize(s: string) {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

type Session = {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  sortOrder: number;
  conferenceId: string;
};

type TimeSlot = {
  label: string;       // e.g. "Friday 14:30 – 16:00"
  date: string;
  startTime: string;
  endTime: string;
  sessions: Session[];
};

function formatTimeLabel(s: Session): string {
  if (!s.startTime && !s.endTime) return s.date || "Unscheduled";
  const parts = [];
  if (s.date) {
    // Format date nicely if ISO, else use as-is
    try {
      const d = new Date(s.date + "T00:00:00");
      parts.push(d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }));
    } catch { parts.push(s.date); }
  }
  if (s.startTime) parts.push(`${s.startTime}${s.endTime ? ` – ${s.endTime}` : ""}`);
  return parts.join(" · ");
}

function groupByTimeSlot(sessions: Session[]): TimeSlot[] {
  const map = new Map<string, TimeSlot>();
  for (const s of sessions) {
    const key = `${s.date}|${s.startTime}|${s.endTime}`;
    if (!map.has(key)) {
      map.set(key, {
        label: formatTimeLabel(s),
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        sessions: [],
      });
    }
    map.get(key)!.sessions.push(s);
  }
  return [...map.values()].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.startTime.localeCompare(b.startTime);
  });
}

export default function HomePage() {
  const { name: LOGO_ALT, logo: LOGO, sourceId: SITE_ID, isRepo: IS_REPO } = useConference();
  const { posters, loading, starredPosterIds, toggleStar } = usePosters();
  const [query, setQuery] = useState("");
  const [conference, setConference] = useState("");
  const [conferences, setConferences] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<Poster[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    if (!IS_REPO) return;
    fetch("/api/conferences")
      .then((r) => r.json())
      .then(setConferences)
      .catch(() => {});
  }, [IS_REPO]);

  useEffect(() => {
    if (IS_REPO) return;
    fetch(`/api/sessions`)
      .then((r) => r.json())
      .then(setSessions)
      .catch(() => {});
  }, [IS_REPO]);

  useEffect(() => {
    if (!query.trim()) { setSearchResults(null); return; }
    if (loading) return;
    const controller = new AbortController();
    setSearching(true);
    fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        const resultIds = new Set(data.results?.map((r: any) => r.id) ?? []);
        setSearchResults(posters.filter((p) => resultIds.has(p.id)));
      })
      .catch(() => {})
      .finally(() => setSearching(false));
    return () => controller.abort();
  }, [query, posters, loading]);

  const base = searchResults !== null ? searchResults : posters;
  const filtered = base.filter((p) => !conference || p.source === conference);

  // Determine layout mode: sessions exist and no active search
  const hasSessions = sessions.length > 0;
  const searchActive = query.trim() !== "" || conference !== "";
  const useSessionLayout = hasSessions && !searchActive;

  // Build session-grouped layout
  const timeSlots = useSessionLayout ? groupByTimeSlot(sessions) : [];
  const sessionPosterMap = useSessionLayout
    ? Object.fromEntries(
        sessions.map(s => [
          s.id,
          posters.filter(p => (p as any).sessionId === s.id)
        ])
      )
    : {};
  const unscheduled = useSessionLayout
    ? posters.filter(p => !(p as any).sessionId)
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 md:p-8 max-w-6xl overflow-x-hidden">

        {/* Header */}
        <div className="flex items-center gap-2 mb-6 min-w-0">
          <h1 className="text-xl md:text-3xl font-bold text-gray-500 whitespace-nowrap">Presentations</h1>
          <Link
            href="/selected"
            className="px-3 py-1.5 rounded border border-gray-300 text-gray-700 bg-white text-sm hover:bg-gray-50 whitespace-nowrap shrink-0"
          >
            Selected
          </Link>
          <div className="flex-1" />
          <Link href="/" className="shrink-0">
            <img src={LOGO} alt="" className="h-8 md:h-16 w-auto max-w-[80px] md:max-w-[160px] object-contain" />
          </Link>
        </div>

        {/* Search + conference filter */}
        <div className="mb-6 flex flex-wrap gap-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, author, or abstract…"
            className="flex-1 min-w-[200px] max-w-xl px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {IS_REPO && conferences.length > 0 && (
            <select
              value={conference}
              onChange={(e) => setConference(e.target.value)}
              className="px-3 py-2.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All conferences</option>
              {conferences.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
        </div>

        {searchActive && (
          <p className="mb-4 text-sm text-gray-500">
            {searching ? "Searching…" : filtered.length === 0
              ? "No presentations match."
              : `${filtered.length} of ${posters.length} presentation${posters.length !== 1 ? "s" : ""}`}
          </p>
        )}

        {/* Loading */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading presentations...</p>
          </div>

        /* Search results — flat grid */
        ) : searchActive ? (
          filtered.length === 0 ? null : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {filtered.map((poster) => (
                <PosterCard
                  key={poster._id}
                  poster={poster}
                  isStarred={starredPosterIds.includes(poster.id)}
                  onToggleStar={toggleStar}
                />
              ))}
            </div>
          )

        /* Session layout */
        ) : useSessionLayout ? (
          <div className="space-y-10">
            {timeSlots.map((slot) => (
              <div key={`${slot.date}|${slot.startTime}`}>
                {/* Time slot header */}
                <div className="mb-4 pb-2 border-b-2 border-gray-300">
                  <h2 className="text-xl font-bold text-gray-700">{slot.label}</h2>
                </div>

                {/* Parallel session columns */}
                <div className={`grid gap-6 ${
                  slot.sessions.length === 1 ? "grid-cols-1" :
                  slot.sessions.length === 2 ? "grid-cols-1 md:grid-cols-2" :
                  "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                }`}>
                  {slot.sessions.map((session) => {
                    const sessionPosters = sessionPosterMap[session.id] ?? [];
                    return (
                      <div key={session.id}>
                        {/* Session header */}
                        <div className="mb-3 p-3 bg-blue-600 rounded-lg shadow-sm">
                          <h3 className="font-semibold text-white text-sm">{session.name}</h3>
                          {session.location && (
                            <p className="text-xs text-blue-100 mt-0.5">📍 {session.location}</p>
                          )}
                        </div>

                        {/* Talks in this session */}
                        <div className="space-y-3">
                          {sessionPosters.length === 0 ? (
                            <p className="text-xs text-gray-400 px-1">No talks assigned yet</p>
                          ) : (
                            sessionPosters.map((poster) => (
                              <PosterCard
                                key={poster._id}
                                poster={poster}
                                isStarred={starredPosterIds.includes(poster.id)}
                                onToggleStar={toggleStar}
                              />
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Unscheduled talks */}
            {unscheduled.length > 0 && (
              <div>
                <div className="mb-4 pb-2 border-b-2 border-gray-200">
                  <h2 className="text-xl font-bold text-gray-400">Unscheduled</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {unscheduled.map((poster) => (
                    <PosterCard
                      key={poster._id}
                      poster={poster}
                      isStarred={starredPosterIds.includes(poster.id)}
                      onToggleStar={toggleStar}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

        /* Flat grid — no sessions defined */
        ) : posters.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-xl text-gray-600">No presentations yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filtered.map((poster) => (
              <PosterCard
                key={poster._id}
                poster={poster}
                isStarred={starredPosterIds.includes(poster.id)}
                onToggleStar={toggleStar}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
