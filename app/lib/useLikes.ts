"use client";

import { useState, useEffect, useCallback } from "react";

type LikesState = {
  viewed: boolean;
  liked: boolean;
  likeCount: number;
  loading: boolean;
  toggleViewed: () => Promise<void>;
  toggleLike: () => Promise<void>;
};

/**
 * Hook that manages "I viewed this talk" and like state.
 * Like requires viewed to be true.
 */
export function useLikes(posterId: string): LikesState {
  const [viewed, setViewed] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [vRes, tRes] = await Promise.all([
          fetch(`/api/viewed?posterId=${encodeURIComponent(posterId)}`),
          fetch(`/api/likes?posterId=${encodeURIComponent(posterId)}`),
        ]);

        if (cancelled) return;

        if (vRes.ok) {
          const v = await vRes.json();
          setViewed(Boolean(v.viewed));
        }
        if (tRes.ok) {
          const t = await tRes.json();
          setLiked(Boolean(t.liked));
          setLikeCount(t.count ?? 0);
        }
      } catch (e) {
        console.error("useLikes load error:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [posterId]);

  const toggleViewed = useCallback(async () => {
    const wasViewed = viewed;
    // Optimistic update
    setViewed(!wasViewed);
    // If un-viewing, also remove thumb
    if (wasViewed) {
      setLiked(false);
    }

    try {
      if (wasViewed) {
        // Un-view: remove thumb first if liked, then remove viewed
        if (liked) {
          await fetch(`/api/likes?posterId=${encodeURIComponent(posterId)}`, { method: "DELETE" });
          // Refresh count
          const tRes = await fetch(`/api/likes?posterId=${encodeURIComponent(posterId)}`);
          if (tRes.ok) {
            const t = await tRes.json();
            setLikeCount(t.count ?? 0);
          }
        }
        await fetch(`/api/viewed?posterId=${encodeURIComponent(posterId)}`, { method: "DELETE" });
      } else {
        await fetch("/api/viewed", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ posterId }),
        });
      }
    } catch (e) {
      // Revert on error
      setViewed(wasViewed);
      console.error("toggleViewed error:", e);
    }
  }, [viewed, liked, posterId]);

  const toggleLike = useCallback(async () => {
    if (!viewed) return; // Can't like without viewing

    const wasLiked = liked;
    // Optimistic update
    setLiked(!wasLiked);
    setLikeCount((c) => c + (wasLiked ? -1 : 1));

    try {
      if (wasLiked) {
        const res = await fetch(`/api/likes?posterId=${encodeURIComponent(posterId)}`, {
          method: "DELETE",
        });
        if (res.ok) {
          const data = await res.json();
          setLikeCount(data.count ?? 0);
        }
      } else {
        const res = await fetch("/api/likes", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ posterId }),
        });
        if (res.ok) {
          const data = await res.json();
          setLikeCount(data.count ?? 0);
        }
      }
    } catch (e) {
      // Revert on error
      setLiked(wasLiked);
      setLikeCount((c) => c + (wasLiked ? 1 : -1));
      console.error("toggleLike error:", e);
    }
  }, [viewed, liked, posterId]);

  return { viewed, liked, likeCount, loading, toggleViewed, toggleLike };
}
