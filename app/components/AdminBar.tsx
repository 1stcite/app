"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Me = {
  signedIn: boolean;
  isAdmin: boolean;
  displayName: string | null;
  viewMode: "admin" | "attendee";
};

type DemoMode = "live" | "before" | "during" | "after";

function readDemoModeCookie(): DemoMode {
  if (typeof document === "undefined") return "live";
  const m = document.cookie.match(/(?:^|;\s*)px_demo_mode=([^;]+)/);
  if (!m) return "live";
  const v = decodeURIComponent(m[1]);
  return v === "before" || v === "during" || v === "after" ? v : "live";
}

export default function AdminBar() {
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  const [busy, setBusy] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [demoMode, setDemoMode] = useState<DemoMode>("live");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me", { cache: "no-store" })
      .then(r => r.json())
      .then(data => { if (!cancelled) setMe(data); })
      .catch(() => { if (!cancelled) setMe(null); });
    setDemoMode(readDemoModeCookie());
    return () => { cancelled = true; };
  }, [pathname]);

  // Don't render at all unless we know the user is admin
  if (!me?.isAdmin) return null;

  // Don't render on the login page itself
  if (pathname?.startsWith("/login")) return null;

  async function toggleViewMode() {
    if (!me) return;
    setBusy(true);
    const next = me.viewMode === "admin" ? "attendee" : "admin";
    try {
      const r = await fetch("/api/view-mode", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: next }),
      });
      if (r.ok) {
        setMe({ ...me, viewMode: next });
        // Reload to re-evaluate any server-rendered admin UI
        window.location.reload();
      }
    } finally {
      setBusy(false);
    }
  }

  async function setDemoModeAPI(mode: DemoMode) {
    if (mode === demoMode) return;
    setBusy(true);
    try {
      const r = await fetch("/api/demo-mode", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      if (r.ok) {
        setDemoMode(mode);
        window.location.reload();
      }
    } finally {
      setBusy(false);
    }
  }

  const inAttendeeMode = me.viewMode === "attendee";

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

  return (
    <div
      className={[
        "fixed bottom-4 right-4 z-50 rounded-xl shadow-lg border flex flex-col items-stretch px-2 py-1.5 gap-1",
        inAttendeeMode
          ? "bg-amber-50 border-amber-300 text-amber-900"
          : "bg-gray-900 border-gray-700 text-white",
      ].join(" ")}
    >
      {/* Main row */}
      <div className="flex items-center gap-1">
      <span
        className={[
          "px-2 py-0.5 rounded-md text-xs font-semibold mr-1",
          inAttendeeMode ? "bg-amber-200 text-amber-900" : "bg-blue-600 text-white",
        ].join(" ")}
        title={inAttendeeMode ? "You're previewing as an attendee" : "You're signed in as admin"}
      >
        {inAttendeeMode ? "ATTENDEE VIEW" : "ADMIN"}
      </span>

      {demoMode !== "live" && (
        <span
          className="px-2 py-0.5 rounded-md text-xs font-semibold bg-yellow-400 text-yellow-900 mr-1"
          title={
            demoMode === "before" ? "Demo clock: before the conference starts" :
            demoMode === "during" ? "Demo clock: between two sessions (mid-conference)" :
            "Demo clock: after the conference ends"
          }
        >
          DEMO: {demoMode.toUpperCase()}
        </span>
      )}

      <Link
        href="/admin"
        className={[
          "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
          inAttendeeMode ? "hover:bg-amber-100" : "hover:bg-gray-800",
        ].join(" ")}
      >
        Admin
      </Link>

      <Link
        href="/insights"
        className={[
          "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
          inAttendeeMode ? "hover:bg-amber-100" : "hover:bg-gray-800",
        ].join(" ")}
      >
        Insights
      </Link>

      <button
        type="button"
        onClick={toggleViewMode}
        disabled={busy}
        className={[
          "px-2.5 py-1 rounded-md text-xs font-medium transition-colors disabled:opacity-50 ml-1 border",
          inAttendeeMode
            ? "border-amber-400 hover:bg-amber-100"
            : "border-gray-600 hover:bg-gray-800",
        ].join(" ")}
        title={inAttendeeMode ? "Return to admin view" : "Preview as attendee"}
      >
        {inAttendeeMode ? "← Exit preview" : "View as attendee"}
      </button>

      <button
        type="button"
        onClick={() => setCollapsed(true)}
        className={[
          "ml-1 h-6 w-6 rounded-md text-xs flex items-center justify-center transition-colors",
          inAttendeeMode ? "hover:bg-amber-100" : "hover:bg-gray-800",
        ].join(" ")}
        aria-label="Hide admin bar"
        title="Hide"
      >
        ✕
      </button>
      </div>

      {/* Demo clock switcher row */}
      <div className={[
        "flex items-center gap-1 pt-1 border-t",
        inAttendeeMode ? "border-amber-200" : "border-gray-800",
      ].join(" ")}>
        <span className={[
          "text-[10px] font-semibold uppercase tracking-wide mr-1 px-1",
          inAttendeeMode ? "text-amber-700" : "text-gray-500",
        ].join(" ")}>
          Clock
        </span>
        {(["live", "before", "during", "after"] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => setDemoModeAPI(m)}
            disabled={busy || demoMode === m}
            className={[
              "px-2 py-0.5 rounded text-[11px] font-medium transition-colors disabled:cursor-default",
              demoMode === m
                ? (m === "live"
                    ? "bg-emerald-500 text-white"
                    : "bg-yellow-400 text-yellow-900")
                : (inAttendeeMode
                    ? "border border-amber-300 hover:bg-amber-100"
                    : "border border-gray-700 hover:bg-gray-800"),
            ].join(" ")}
            title={
              m === "live" ? "Use real time" :
              m === "before" ? "Demo: 1 hour before the conference starts" :
              m === "during" ? "Demo: between two sessions, mid-conference" :
              "Demo: 1 hour after the conference ends"
            }
          >
            {m === "live" ? "Live" : m === "before" ? "Before" : m === "during" ? "During" : "After"}
          </button>
        ))}
      </div>
    </div>
  );
}
