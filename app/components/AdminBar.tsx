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
 * Floating bar for organizers: Attendee view · Admin · Insights.
 * "Attendee view" previews the site as attendees see it; Admin or Insights
 * returns to the organizer view.
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

  if (!me?.isAdmin) return null;
  if (pathname?.startsWith("/login")) return null;

  const inAttendeeMode = me.viewMode === "attendee";

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

  async function goAttendee() {
    if (inAttendeeMode) return;
    if (!(await setViewMode("attendee"))) return;
    // Organizer-only pages have no attendee version: go to the conference
    const organizerOnly = /^\/(insights|admin|upload|edit)(\/|$)/.test(window.location.pathname);
    if (organizerOnly) window.location.href = "/";
    else window.location.reload();
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

  const onAdmin = !inAttendeeMode && /^\/admin(\/|$)/.test(pathname ?? "");
  const onInsights = !inAttendeeMode && /^\/insights(\/|$)/.test(pathname ?? "");
  const btn = (active: boolean) =>
    [
      "px-3 py-1 rounded-md text-xs font-medium transition-colors disabled:opacity-50",
      active ? "bg-white text-gray-900" : "text-gray-200 hover:bg-gray-800",
    ].join(" ");

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-xl shadow-lg border border-gray-700 bg-gray-900 flex items-center gap-1 px-1.5 py-1.5">
      <button type="button" onClick={goAttendee} disabled={busy} className={btn(inAttendeeMode)} title="See the site as attendees do">
        Attendee view
      </button>
      <button type="button" onClick={() => goOrganizer("/admin")} disabled={busy} className={btn(onAdmin)}>
        Admin
      </button>
      <button type="button" onClick={() => goOrganizer("/insights")} disabled={busy} className={btn(onInsights)}>
        Insights
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
  );
}
