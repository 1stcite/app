"use client";

import { useState } from "react";
import Link from "next/link";
import { usePosters } from "@/app/lib/usePosters";
import PosterCard from "@/app/components/PosterCard";

function normalize(s: string) {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

export default function HomePage() {
  const { posters, loading, starredPosterIds, toggleStar } = usePosters();
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? posters.filter((p) => {
        const q = normalize(query);
        return (
          normalize(p.title || "").includes(q) ||
          normalize(p.author || "").includes(q)
        );
      })
    : posters;

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
            <img src="/LSW-logo.png" alt="1stCite" className="h-10 w-auto" />
          </Link>
        </div>

        {/* Search bar */}
        <div className="mb-6">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or author…"
            className="w-full max-w-xl px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {query.trim() && (
            <p className="mt-2 text-sm text-gray-500">
              {filtered.length === 0
                ? "No presentations match your search."
                : `${filtered.length} of ${posters.length} presentation${posters.length !== 1 ? "s" : ""}`}
            </p>
          )}
        </div>

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
