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

export default function AdminBar() {
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  const [busy, setBusy] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me", { cache: "no-store" })
      .then(r => r.json())
      .then(data => { if (!cancelled) setMe(data); })
      .catch(() => { if (!cancelled) setMe(null); });
    return () => { cancelled = true; };
  }, [pathname]); // refetch on navigation so the bar reflects route gating

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
        "fixed bottom-4 right-4 z-50 rounded-xl shadow-lg border flex items-center gap-1 px-2 py-1.5",
        inAttendeeMode
          ? "bg-amber-50 border-amber-300 text-amber-900"
          : "bg-gray-900 border-gray-700 text-white",
      ].join(" ")}
    >
      <span
        className={[
          "px-2 py-0.5 rounded-md text-xs font-semibold mr-1",
          inAttendeeMode ? "bg-amber-200 text-amber-900" : "bg-blue-600 text-white",
        ].join(" ")}
        title={inAttendeeMode ? "You're previewing as an attendee" : "You're signed in as admin"}
      >
        {inAttendeeMode ? "ATTENDEE VIEW" : "ADMIN"}
      </span>

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
  );
}
