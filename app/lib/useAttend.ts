"use client";

import { useState, useEffect, useCallback } from "react";

type AttendState = {
  attended: boolean;
  loading: boolean;
  toggleAttend: () => Promise<void>;
};

export function useAttend(posterId: string): AttendState {
  const [attended, setAttended] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/attend?posterId=${encodeURIComponent(posterId)}`)
      .then(r => r.json())
      .then(data => { if (!cancelled) setAttended(Boolean(data.attended)); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [posterId]);

  const toggleAttend = useCallback(async () => {
    const was = attended;
    setAttended(!was);
    try {
      if (was) {
        await fetch(`/api/attend?posterId=${encodeURIComponent(posterId)}`, { method: "DELETE" });
      } else {
        await fetch("/api/attend", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ posterId }),
        });
      }
    } catch {
      setAttended(was);
    }
  }, [attended, posterId]);

  return { attended, loading, toggleAttend };
}
