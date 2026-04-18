"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useConference } from "@/app/lib/conferenceContext";
import EngagementBadge from "@/app/components/EngagementBadge";
import Footer from "@/app/components/Footer";

type Poster = {
  _id: string;
  id: string;
  title: string;
  author: string;
};

type FilterTab = "all" | "interested" | "scheduled" | "saved";

export default function LibraryPageClient() {
  const { name: conferenceName } = useConference();
  const [posters, setPosters] = useState<Poster[]>([]);
  const [interestedIds, setInterestedIds] = useState<string[]>([]);
  const [scheduledIds, setScheduledIds] = useState<string[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<FilterTab>("all");

  useEffect(() => {
    Promise.all([
      fetch("/api/posters").then(r => r.json()),
      fetch("/api/stars").then(r => r.json()),      // interested
      fetch("/api/attend").then(r => r.json()),      // scheduled/attended
      fetch("/api/library").then(r => r.json()),     // saved to library
    ]).then(([p, stars, attend, library]) => {
      setPosters(p || []);
      setInterestedIds((stars || []).map((s: { posterId: string }) => s.posterId));
      setScheduledIds((attend || []).map((a: { posterId: string }) => a.posterId));
      setSavedIds((library || []).map((l: { posterId: string }) => l.posterId));
      setLoading(false);
    });
  }, []);

  // Build the unified set of poster IDs the user has interacted with
  const allInteractedIds = useMemo(() => {
    const set = new Set([...interestedIds, ...scheduledIds, ...savedIds]);
    return set;
  }, [interestedIds, scheduledIds, savedIds]);

  const posterById = useMemo(() => new Map(posters.map(p => [p.id, p])), [posters]);

  const filteredPosters = useMemo(() => {
    let ids: string[];
    switch (tab) {
      case "interested": ids = interestedIds; break;
      case "scheduled": ids = scheduledIds; break;
      case "saved": ids = savedIds; break;
      default: ids = [...allInteractedIds]; break;
    }
    return ids
      .map(id => posterById.get(id))
      .filter((p): p is Poster => Boolean(p));
  }, [tab, interestedIds, scheduledIds, savedIds, allInteractedIds, posterById]);

  function badges(posterId: string) {
    const b: string[] = [];
    if (interestedIds.includes(posterId)) b.push("interested");
    if (scheduledIds.includes(posterId)) b.push("scheduled");
    if (savedIds.includes(posterId)) b.push("saved");
    return b;
  }

  const counts = {
    all: allInteractedIds.size,
    interested: interestedIds.length,
    scheduled: scheduledIds.length,
    saved: savedIds.length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 md:p-8 max-w-4xl">
        <div className="mb-6">
          <Link href="/" className="text-sm text-blue-600 hover:underline">← Back to {conferenceName}</Link>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">My Talks</h1>
          <p className="text-gray-500 text-sm">
            Talks you&apos;ve marked as interested, scheduled to attend, or saved to your library.
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-6 bg-gray-200 p-1 rounded-lg w-fit">
          {([
            { key: "all" as FilterTab, label: "All" },
            { key: "interested" as FilterTab, label: "Interested" },
            { key: "scheduled" as FilterTab, label: "Scheduled" },
            { key: "saved" as FilterTab, label: "Saved" },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                tab === key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {label} ({counts[key]})
            </button>
          ))}
        </div>

        {filteredPosters.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-600 mb-4">
              {tab === "all"
                ? "You haven't interacted with any talks yet."
                : `No talks marked as ${tab}.`}
            </p>
            <Link href="/" className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
              Browse the conference
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {filteredPosters.map(poster => {
              const tags = badges(poster.id);
              return (
                <div key={poster.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <Link href={`/view/${poster.id}`}>
                        <p className="font-medium text-gray-900 leading-snug hover:text-blue-700 transition-colors">
                          {poster.title}
                        </p>
                      </Link>
                      {poster.author && (
                        <p className="text-sm text-gray-500 mt-0.5">{poster.author}</p>
                      )}
                      {/* Status badges */}
                      {tab === "all" && tags.length > 0 && (
                        <div className="flex gap-1.5 mt-2">
                          {tags.includes("interested") && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              ★ Interested
                            </span>
                          )}
                          {tags.includes("scheduled") && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Scheduled
                            </span>
                          )}
                          {tags.includes("saved") && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                              Saved
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <EngagementBadge talkId={poster.id} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Footer />
      </div>
    </div>
  );
}
