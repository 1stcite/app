"use client";

import { useEffect, useState } from "react";

export type DemoMode = "live" | "before" | "after";

const DEMO_MODE_COOKIE = "px_demo_mode";

/** Read the cookie on the client. Returns 'live' if not set or unreadable. */
function readDemoMode(): DemoMode {
  if (typeof document === "undefined") return "live";
  const m = document.cookie.match(/(?:^|;\s*)px_demo_mode=([^;]+)/);
  if (!m) return "live";
  const v = decodeURIComponent(m[1]);
  return v === "before" || v === "after" ? v : "live";
}

/** Read the as-of timestamp from a cookie. Returns null if not set. */
function readAsOf(): Date | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)px_as_of=([^;]+)/);
  if (!m) return null;
  const v = decodeURIComponent(m[1]);
  const t = Number(v);
  if (!Number.isFinite(t)) return null;
  return new Date(t);
}

/**
 * Returns the current effective "now" for UI purposes. Respects the demo
 * clock cookies if set. Re-reads cookies every 2s so admin toggles surface
 * quickly across tabs.
 */
export function useDemoClock(): { now: Date; mode: DemoMode } {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const h = setInterval(() => setTick(t => t + 1), 2000);
    return () => clearInterval(h);
  }, []);

  const mode = readDemoMode();
  const asOf = readAsOf();
  const now = asOf && mode !== "live" ? asOf : new Date();

  // tick is referenced to keep the effect from being pruned
  void tick;

  return { now, mode };
}

export { DEMO_MODE_COOKIE };
