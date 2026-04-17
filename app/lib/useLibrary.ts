"use client";

import { useState, useEffect, useCallback } from "react";

type LibraryState = {
  saved: boolean;
  attended: boolean;
  loading: boolean;
  toggleSave: () => Promise<void>;
  setAttended: (attended: boolean) => Promise<void>;
};

/**
 * Hook for save-to-library state, independent of scheduling.
 * Uses the /api/library endpoint and the `library` MongoDB collection.
 */
export function useLibrary(posterId: string): LibraryState {
  const [saved, setSaved] = useState(false);
  const [attended, setAttendedState] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/library?posterId=${encodeURIComponent(posterId)}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        setSaved(Boolean(data.saved));
        setAttendedState(Boolean(data.attended));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [posterId]);

  const toggleSave = useCallback(async () => {
    const wasSaved = saved;
    setSaved(!wasSaved);

    try {
      if (wasSaved) {
        await fetch(`/api/library?posterId=${encodeURIComponent(posterId)}`, { method: "DELETE" });
        setAttendedState(false);
      } else {
        await fetch("/api/library", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ posterId }),
        });
      }
    } catch {
      setSaved(wasSaved); // revert
    }
  }, [saved, posterId]);

  const setAttended = useCallback(async (value: boolean) => {
    setAttendedState(value);
    try {
      await fetch("/api/library", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ posterId, attended: value }),
      });
    } catch {
      setAttendedState(!value); // revert
    }
  }, [posterId]);

  return { saved, attended, loading, toggleSave, setAttended };
}
