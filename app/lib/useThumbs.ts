"use client";

import { useState, useEffect, useCallback } from "react";

type ThumbsState = {
  viewed: boolean;
  thumbed: boolean;
  thumbCount: number;
  loading: boolean;
  toggleViewed: () => Promise<void>;
  toggleThumb: () => Promise<void>;
};

/**
 * Hook that manages "I viewed this talk" and thumbs-up state.
 * Thumbs-up requires viewed to be true.
 */
export function useThumbs(posterId: string): ThumbsState {
  const [viewed, setViewed] = useState(false);
  const [thumbed, setThumbed] = useState(false);
  const [thumbCount, setThumbCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [vRes, tRes] = await Promise.all([
          fetch(`/api/viewed?posterId=${encodeURIComponent(posterId)}`),
          fetch(`/api/thumbs?posterId=${encodeURIComponent(posterId)}`),
        ]);

        if (cancelled) return;

        if (vRes.ok) {
          const v = await vRes.json();
          setViewed(Boolean(v.viewed));
        }
        if (tRes.ok) {
          const t = await tRes.json();
          setThumbed(Boolean(t.thumbed));
          setThumbCount(t.count ?? 0);
        }
      } catch (e) {
        console.error("useThumbs load error:", e);
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
      setThumbed(false);
    }

    try {
      if (wasViewed) {
        // Un-view: remove thumb first if thumbed, then remove viewed
        if (thumbed) {
          await fetch(`/api/thumbs?posterId=${encodeURIComponent(posterId)}`, { method: "DELETE" });
          // Refresh count
          const tRes = await fetch(`/api/thumbs?posterId=${encodeURIComponent(posterId)}`);
          if (tRes.ok) {
            const t = await tRes.json();
            setThumbCount(t.count ?? 0);
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
  }, [viewed, thumbed, posterId]);

  const toggleThumb = useCallback(async () => {
    if (!viewed) return; // Can't thumb without viewing

    const wasThumbed = thumbed;
    // Optimistic update
    setThumbed(!wasThumbed);
    setThumbCount((c) => c + (wasThumbed ? -1 : 1));

    try {
      if (wasThumbed) {
        const res = await fetch(`/api/thumbs?posterId=${encodeURIComponent(posterId)}`, {
          method: "DELETE",
        });
        if (res.ok) {
          const data = await res.json();
          setThumbCount(data.count ?? 0);
        }
      } else {
        const res = await fetch("/api/thumbs", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ posterId }),
        });
        if (res.ok) {
          const data = await res.json();
          setThumbCount(data.count ?? 0);
        }
      }
    } catch (e) {
      // Revert on error
      setThumbed(wasThumbed);
      setThumbCount((c) => c + (wasThumbed ? 1 : -1));
      console.error("toggleThumb error:", e);
    }
  }, [viewed, thumbed, posterId]);

  return { viewed, thumbed, thumbCount, loading, toggleViewed, toggleThumb };
}
