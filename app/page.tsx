"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePosters, type Poster } from "@/app/lib/usePosters";
import PosterCard from "@/app/components/PosterCard";

function normalize(s: string) {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

const SITE_ID = process.env.NEXT_PUBLIC_SITE_ID ?? "";

const LOGO =
  SITE_ID === "presentrxiv" ? "/presentrxiv-logo.png" :
  SITE_ID === "1stcite-demo" ? "/LSW-logo.png" :
  "/1stcite-logo.png";

const LOGO_ALT =
  SITE_ID === "presentrxiv" ? "PresentrXiv" :
  SITE_ID === "1stcite-demo" ? "LSW Demo" :
  "1stCite";

// Only show conference filter on presentrxiv
const IS_REPO = SITE_ID === "presentrxiv";

export default function HomePage() {
  const { posters, loading, starredPosterIds, toggleStar } = usePosters();
  const [query, setQuery] = useState("");
  const [conference, setConference] = useState("");
  const [conferences, setConferences] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<Poster[] | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!IS_REPO) return;
    fetch("/api/conferences")
      .then((r) => r.json())
      .then(setConferences)
      .catch(() => {});
  }, []);

  // Use server-side search when query is present (searches title, author + abstract)
  useEffect(() => {
    if (!query.trim()) { setSearchResults(null); return; }
    if (loading) return; // wait for posters to load before filtering results
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
  const filtered = base.filter((p) => {
    const matchesConference = !conference || p.source === conference;
    return matchesConference;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 md:p-8 max-w-6xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-500">
              Presentations
            </h1>
            <Link
              href="/selected"
              className="px-3 py-1.5 rounded border border-gray-300 text-gray-700 bg-white text-sm hover:bg-gray-50"
            >
              Selected
            </Link>
          </div>
          <Link href="/" className="shrink-0">
            <img src={LOGO} alt={LOGO_ALT} className="h-10 w-auto" />
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

        {(query.trim() || conference) && (
          <p className="mb-4 text-sm text-gray-500">
            {searching ? "Searching…" : filtered.length === 0
              ? "No presentations match."
              : `${filtered.length} of ${posters.length} presentation${posters.length !== 1 ? "s" : ""}`}
          </p>
        )}

        {/* Session subhead — demo only */}
        {SITE_ID === "1stcite-demo" && (
          <p className="mb-4 text-sm font-medium text-gray-500">Day 2 — 11:00 am – 12:15 pm</p>
        )}

        {/* Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading presentations...</p>
          </div>
        ) : posters.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-xl text-gray-600">No presentations yet</p>
          </div>
        ) : filtered.length === 0 ? null : (
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
