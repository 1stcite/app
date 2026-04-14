"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useConference } from "@/app/lib/conferenceContext";
import InCiteBadge from "@/app/components/InCiteBadge";

type Save = {
  posterId: string;
  state: "unreviewed" | "in_library" | "declined";
  source: "in_session" | "insights" | "post_conference_email";
  createdAt: string;
};

type Poster = {
  _id: string;
  id: string;
  title: string;
  author: string;
  session?: { id: string; name: string; date?: string; startTime?: string; endTime?: string };
};

export default function ReviewPageClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const { name: conferenceName } = useConference();

  // mode=email → pre-checked (cleanup pass)
  // mode=session (default) → unchecked (active judgment)
  const mode = sp.get("mode") === "email" ? "email" : "session";
  const preChecked = mode === "email";

  const [posters, setPosters] = useState<Poster[]>([]);
  const [saves, setSaves] = useState<Save[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/posters").then(r => r.json()),
      fetch("/api/saves?state=unreviewed").then(r => r.json()),
    ]).then(([p, s]) => {
      if (cancelled) return;
      setPosters(p || []);
      setSaves(s || []);
      if (preChecked) {
        setChecked(new Set((s || []).map((x: Save) => x.posterId)));
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [preChecked]);

  // Group unreviewed saves by session
  const groups = useMemo(() => {
    const posterById = new Map(posters.map(p => [p.id, p]));
    const items = saves
      .map(s => ({ save: s, poster: posterById.get(s.posterId) }))
      .filter((x): x is { save: Save; poster: Poster } => Boolean(x.poster));

    const bySession = new Map<string, { sessionName: string; items: typeof items }>();
    for (const item of items) {
      const sid = item.poster.session?.id || "_unscheduled";
      const sname = item.poster.session?.name || "Other talks";
      if (!bySession.has(sid)) bySession.set(sid, { sessionName: sname, items: [] });
      bySession.get(sid)!.items.push(item);
    }
    return [...bySession.values()];
  }, [posters, saves]);

  function toggle(posterId: string) {
    setChecked(prev => {
      const n = new Set(prev);
      if (n.has(posterId)) n.delete(posterId);
      else n.add(posterId);
      return n;
    });
  }

  async function submit() {
    setSubmitting(true);
    const allIds = saves.map(s => s.posterId);
    const addToLibrary = allIds.filter(id => checked.has(id));
    const decline = allIds.filter(id => !checked.has(id));

    const r = await fetch("/api/saves", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ addToLibrary, decline }),
    });

    if (r.ok) {
      const j = await r.json();
      setDoneMessage(`${j.promoted} talk${j.promoted === 1 ? "" : "s"} added to your library.`);
      setTimeout(() => router.push("/library"), 1800);
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 md:p-8 max-w-3xl">

        {mode === "email" && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 text-sm text-blue-900">
            <strong>📧 Demo note:</strong> This page would arrive in your inbox 1 day after the conference ends.
          </div>
        )}

        <div className="mb-6">
          <Link href="/" className="text-sm text-blue-600 hover:underline">← Back to {conferenceName}</Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {mode === "email" ? `Your ${conferenceName} reading list` : "Review your saved talks"}
          </h1>
          <p className="text-gray-600">
            {mode === "email"
              ? "These are the talks you saved during the conference. Uncheck anything you don't want in your library."
              : "Pick the talks you want to keep in your library. You can always come back and review more later."}
          </p>
        </div>

        {doneMessage && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6 text-emerald-900">
            ✓ {doneMessage} Redirecting to your library…
          </div>
        )}

        {saves.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-600 mb-4">No talks to review right now.</p>
            <p className="text-sm text-gray-400">When you save talks, they'll show up here for you to review.</p>
            <Link href="/" className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
              Browse the conference
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-6">
              {groups.map(group => (
                <div key={group.sessionName}>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    {group.sessionName}
                  </h2>
                  <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
                    {group.items.map(({ save, poster }) => {
                      const isChecked = checked.has(poster.id);
                      return (
                        <label
                          key={poster.id}
                          className={`flex items-start gap-3 p-4 cursor-pointer hover:bg-gray-50 ${isChecked ? "bg-blue-50/30" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggle(poster.id)}
                            className="mt-1 h-4 w-4 text-blue-600 rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <p className="font-medium text-gray-900 leading-snug">{poster.title}</p>
                              <InCiteBadge talkId={poster.id} />
                            </div>
                            {poster.author && (
                              <p className="text-sm text-gray-500 mt-0.5">{poster.author}</p>
                            )}
                            {save.source === "insights" && (
                              <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                                Discovered via insights
                              </span>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="sticky bottom-4 mt-8 bg-white rounded-xl shadow-lg border border-gray-200 p-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <strong className="text-gray-900">{checked.size}</strong> of {saves.length} selected
              </div>
              <div className="flex gap-2">
                <Link
                  href="/"
                  className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </Link>
                <button
                  onClick={submit}
                  disabled={submitting}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60 font-medium"
                >
                  {submitting ? "Saving…" : checked.size === 0 ? "Skip all" : `Add ${checked.size} to library`}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
