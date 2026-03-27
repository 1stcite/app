"use client";

import { useEffect, useState } from "react";

export type Poster = {
  _id: string;
  id: string;
  title: string;
  author: string;
  uploadedAt: string;
  source?: string;
};

export function usePosters() {
  const [posters, setPosters] = useState<Poster[]>([]);
  const [loading, setLoading] = useState(true);
  const [starredPosterIds, setStarredPosterIds] = useState<string[]>([]);

  useEffect(() => {
    fetchPosters();
    fetchStars();
    const onFocus = () => fetchStars();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  async function fetchPosters() {
    try {
      const res = await fetch("/api/posters");
      if (res.ok) setPosters(await res.json());
    } catch (e) {
      console.error("Error fetching posters:", e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStars() {
    try {
      const res = await fetch("/api/stars");
      if (res.ok) {
        const data = await res.json();
        setStarredPosterIds(data.map((s: { posterId: string }) => s.posterId));
      }
    } catch (e) {
      console.error("Error fetching stars:", e);
    }
  }

  async function toggleStar(posterId: string) {
    const isStarred = starredPosterIds.includes(posterId);
    try {
      const res = await fetch(
        isStarred ? `/api/stars?posterId=${encodeURIComponent(posterId)}` : "/api/stars",
        {
          method: isStarred ? "DELETE" : "POST",
          headers: isStarred ? undefined : { "Content-Type": "application/json" },
          body: isStarred ? undefined : JSON.stringify({ posterId }),
        }
      );
      if (!res.ok) {
        console.error("Failed to toggle star", res.status, await res.text());
        return;
      }
      setStarredPosterIds((prev) =>
        isStarred ? prev.filter((id) => id !== posterId) : [...prev, posterId]
      );
    } catch (e) {
      console.error("Error toggling star:", e);
    }
  }

  const starredPosters = posters.filter((p) => starredPosterIds.includes(p.id));
  const unstarredPosters = posters.filter((p) => !starredPosterIds.includes(p.id));

  return { posters, loading, starredPosterIds, starredPosters, unstarredPosters, toggleStar };
}
