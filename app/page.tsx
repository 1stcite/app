"use client";

import Link from "next/link";
import { usePosters } from "@/app/lib/usePosters";
import PosterCard from "@/app/components/PosterCard";

export default function HomePage() {
  const { posters, loading, starredPosterIds, toggleStar } = usePosters();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 md:p-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-500">
              Day 2 11:00–12:15
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

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading presentations...</p>
          </div>
        ) : posters.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-xl text-gray-600">No presentations yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {posters.map((poster) => (
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
