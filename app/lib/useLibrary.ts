"use client";

import { useState, useEffect, useCallback } from "react";

type LibraryState = {
  saved: boolean;
  loading: boolean;
  toggleSave: () => Promise<void>;
};

export function useLibrary(posterId: string): LibraryState {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/library?posterId=${encodeURIComponent(posterId)}`)
      .then(r => r.json())
      .then(data => { if (!cancelled) setSaved(Boolean(data.saved)); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [posterId]);

  const toggleSave = useCallback(async () => {
    const was = saved;
    setSaved(!was);
    try {
      if (was) {
        await fetch(`/api/library?posterId=${encodeURIComponent(posterId)}`, { method: "DELETE" });
      } else {
        await fetch("/api/library", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ posterId }),
        });
      }
    } catch {
      setSaved(was);
    }
  }, [saved, posterId]);

  return { saved, loading, toggleSave };
}
