"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Me = {
  signedIn: boolean;
  isAdmin: boolean;
  displayName: string | null;
  viewMode: "admin" | "attendee";
};

/**
 * Floating bar for organizers: Attendee view · Admin insights.
 * Attendee view opens the presentations page as attendees see it;
 * Admin insights opens the organizer dashboard.
 */
export default function AdminBar() {
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  const [busy, setBusy] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setMe(data);
      })
      .catch(() => {
        if (!cancelled) setMe(null);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  // The old demo clock is gone; clear any leftover setting so pages use real time
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (/(?:^|;\s*)px_demo_mode=(before|during|after)/.test(document.cookie)) {
      fetch("/api/demo-mode", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "live" }),
      })
        .then(() => window.location.reload())
        .catch(() => {});
    }
  }, []);

  // The insights page reports whether it's showing demo data; the Before /
  // After switch then sits right here with the other buttons.
  const [insights, setInsights] = useState<{ sample: boolean; when: "before" | "after" } | null>(null);
  useEffect(() => {
    const on = (e: Event) => setInsights((e as CustomEvent).detail);
    window.addEventListener("px:insights", on);
    return () => window.removeEventListener("px:insights", on);
  }, []);
  useEffect(() => {
    if (!/^\/insights(\/|$)/.test(pathname ?? "")) setInsights(null);
  }, [pathname]);

  if (!me?.isAdmin) return null;
  if (pathname?.startsWith("/login")) return null;


  async function setViewMode(next: "admin" | "attendee") {
    if (!me || me.viewMode === next) return true;
    setBusy(true);
    try {
      const r = await fetch("/api/view-mode", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: next }),
      });
      if (r.ok) setMe({ ...me, viewMode: next });
      return r.ok;
    } finally {
      setBusy(false);
    }
  }

  /** The presentations page, as attendees see it. */
  async function goAttendee() {
    if (!(await setViewMode("attendee"))) return;
    window.location.href = "/";
  }

  async function goOrganizer(path: string) {
    if (!(await setViewMode("admin"))) return;
    window.location.href = path;
  }

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed bottom-4 right-4 z-50 h-10 w-10 rounded-full bg-gray-900 text-white shadow-lg hover:bg-gray-800 flex items-center justify-center text-sm font-semibold"
        aria-label="Show admin bar"
        title="Show admin bar"
      >
        ⚙
      </button>
    );
  }

  const onAttendee = !/^\/insights(\/|$)/.test(pathname ?? "");
  const onInsights = !onAttendee;
  const btn = (active: boolean) =>
    [
      "px-3 py-1 rounded-md text-xs font-medium transition-colors disabled:opacity-50",
      active ? "bg-white text-gray-900" : "text-gray-200 hover:bg-gray-800",
    ].join(" ");

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-xl shadow-lg border border-gray-700 bg-gray-900 flex flex-col items-stretch gap-1 px-1.5 py-1.5">
      {onInsights && insights?.sample && (
        <div className="flex items-center gap-1 pb-1 mb-0.5 border-b border-gray-700">
          <span className="px-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Sample</span>
          {(["before", "after"] as const).map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("px:insights-when", { detail: w }))}
              className={[
                "flex-1 px-3 py-1 rounded-md text-xs font-semibold transition-colors",
                insights.when === w ? "bg-yellow-400 text-yellow-950" : "text-gray-200 border border-gray-600 hover:bg-gray-800",
              ].join(" ")}
            >
              {w === "before" ? "Before" : "After"}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1">
      <button type="button" onClick={goAttendee} disabled={busy} className={btn(onAttendee)}>
        Attendee view
      </button>
      <button type="button" onClick={() => goOrganizer("/insights")} disabled={busy} className={btn(onInsights)}>
        Admin insights
      </button>
      <button
        type="button"
        onClick={() => setCollapsed(true)}
        className="ml-0.5 h-6 w-6 rounded-md text-xs text-gray-400 flex items-center justify-center hover:bg-gray-800"
        aria-label="Hide admin bar"
        title="Hide"
      >
        ✕
      </button>
      </div>
    </div>
  );
}
