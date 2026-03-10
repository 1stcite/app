'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Poster = {
  _id: string;
  id: string;
  title: string;
  author: string;
  uploadedAt: string;
};

function firstAuthor(author: string) {
  const a = String(author || '').trim();
  if (!a) return '';
  // handle "A, B, C" or "A; B; C"
  return a.split(/[,;]+/)[0].trim();
}

export default function HomePage() {
  const [posters, setPosters] = useState<Poster[]>([]);
  const [loading, setLoading] = useState(true);
  const [starredPosterIds, setStarredPosterIds] = useState<string[]>([]);
  useEffect(() => {
    fetchPosters();
    fetchStars();

    const onFocus = () => {
      fetchStars();
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  async function fetchPosters() {
    try {
      const response = await fetch('/api/posters');
      if (response.ok) {
        const data = await response.json();
        setPosters(data);
      }
    } catch (error) {
      console.error('Error fetching posters:', error);
    } finally {
      setLoading(false);
    }
  }
  async function fetchStars() {
    try {
      const response = await fetch('/api/stars');
      if (response.ok) {
        const data = await response.json();
        setStarredPosterIds(data.map((s: any) => s.posterId));
      }
    } catch (error) {
      console.error('Error fetching stars:', error);
    }
  }
  async function toggleLibraryStar(posterId: string) {
    const alreadyStarred = starredPosterIds.includes(posterId);

    try {
      const res = await fetch(
        alreadyStarred
          ? `/api/stars?posterId=${encodeURIComponent(posterId)}`
          : `/api/stars`,
        {
          method: alreadyStarred ? "DELETE" : "POST",
          headers: alreadyStarred ? undefined : { "Content-Type": "application/json" },
          body: alreadyStarred ? undefined : JSON.stringify({ posterId }),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        console.error("Failed to toggle library star", res.status, text);
        return;
      }

      setStarredPosterIds((prev) =>
        alreadyStarred ? prev.filter((id) => id !== posterId) : [...prev, posterId]
      );
    } catch (error) {
      console.error("Error toggling star:", error);
    }
  }
  const starredPosters = posters.filter((poster) =>
    starredPosterIds.includes(poster.id)
  );
  const unstarredPosters = posters.filter(
    (poster) => !starredPosterIds.includes(poster.id)
  );
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 md:p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
  <div className="flex items-center gap-4">
    <h1 className="text-3xl md:text-4xl font-bold text-gray-500">
      Selected
    </h1>

    <div className="flex gap-2">
      <Link
        href="/"
        className="px-3 py-1.5 rounded border text-gray-700 border-gray-300 bg-white text-sm hover:bg-gray-50"
      >
        Conference
      </Link>

      <Link
        href="/selected"
        className="px-3 py-1.5 rounded border border-gray-300 text-gray-700 bg-white text-sm hover:bg-gray-50"
      >
        Selected Talks
      </Link>
    </div>
  </div>

  <Link href="/" className="shrink-0">
    <img src="/presentrxiv-logo.png" alt="PresentrXiv" className="h-10 w-auto" />
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
          <>
            {starredPosters.length > 0 && (
              <div className="mb-8">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {starredPosters.map((poster) => {
                    const isStarred = starredPosterIds.includes(poster.id);

                    return (
                      <div
                        key={`starred-${poster._id}`}
                        className="bg-yellow-50 rounded-lg shadow-sm hover:shadow-md transition-shadow p-5 border border-yellow-200"
                      >
                        <Link href={`/view/${poster.id}`} className="block">
                          <div className="text-base font-semibold text-gray-900 leading-snug line-clamp-2">
                            {poster.title}
                          </div>
                        </Link>

                        <div className="mt-2 flex items-center justify-between">
                          {poster.author ? (
                            <div className="text-sm text-gray-600">by {firstAuthor(poster.author)}</div>
                          ) : (
                            <div />
                          )}

                          <button
                            onClick={() => toggleLibraryStar(poster.id)}
                            className="text-sm text-gray-600 px-2 py-1 rounded border border-gray-300 hover:bg-gray-50"
                          >
                            {isStarred ? "★" : "☆"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            
          </>
        )}
      </div>
    </div>
  );
}