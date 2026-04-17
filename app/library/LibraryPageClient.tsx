"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useConference } from "@/app/lib/conferenceContext";
import EngagementBadge from "@/app/components/EngagementBadge";

type Save = {
  posterId: string;
  attended: boolean;
  createdAt: string;
};

type Poster = {
  _id: string;
  id: string;
  title: string;
  author: string;
  session?: { id: string; name: string };
};

// For the demo: mock which talks have DOIs.
// In the real version this would come from the embargo + PresentrXiv pipeline.
function mockHasDOI(posterId: string): boolean {
  // Treat ~30% of talks as "ready to cite" for demo variety
  let h = 0;
  for (let i = 0; i < posterId.length; i++) h = (h * 31 + posterId.charCodeAt(i)) | 0;
  return Math.abs(h) % 10 < 3;
}
function mockDOI(posterId: string): string {
  return `10.0000/incite.${posterId.slice(-8)}`;
}

export default function LibraryPageClient() {
  const { name: conferenceName } = useConference();
  const [posters, setPosters] = useState<Poster[]>([]);
  const [saves, setSaves] = useState<Save[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"ready" | "awaiting">("ready");

  useEffect(() => {
    Promise.all([
      fetch("/api/posters").then(r => r.json()),
      fetch("/api/library").then(r => r.json()),
    ]).then(([p, s]) => {
      setPosters(p || []);
      setSaves(s || []);
      setLoading(false);
    });
  }, []);

  const items = useMemo(() => {
    const posterById = new Map(posters.map(p => [p.id, p]));
    return saves
      .map(s => ({ save: s, poster: posterById.get(s.posterId) }))
      .filter((x): x is { save: Save; poster: Poster } => Boolean(x.poster))
      .map(({ save, poster }) => ({
        save,
        poster,
        ready: mockHasDOI(poster.id),
        doi: mockHasDOI(poster.id) ? mockDOI(poster.id) : null,
      }));
  }, [posters, saves]);

  const ready = items.filter(i => i.ready);
  const awaiting = items.filter(i => !i.ready);

  const visible = tab === "ready" ? ready : awaiting;

  function downloadBibtex() {
    const entries = ready.map(({ poster, doi }) => {
      const key = `incite${poster.id.slice(-6)}`;
      const author = poster.author || "Unknown";
      return `@misc{${key},
  title = {${poster.title}},
  author = {${author}},
  year = {2025},
  doi = {${doi}},
  note = {Conference presentation, ${conferenceName}},
  url = {https://doi.org/${doi}}
}`;
    }).join("\n\n");
    const blob = new Blob([entries], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${conferenceName.toLowerCase().replace(/\s+/g, "-")}-library.bib`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading library…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 md:p-8 max-w-4xl">

        <div className="mb-6">
          <Link href="/" className="text-sm text-blue-600 hover:underline">← Back to {conferenceName}</Link>
        </div>

        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">My Library</h1>
            <p className="text-gray-600 text-sm">
              Talks you've added to your permanent research library across conferences.
            </p>
          </div>
          {ready.length > 0 && (
            <button
              onClick={downloadBibtex}
              className="shrink-0 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 font-medium"
            >
              ⬇ Download BibTeX ({ready.length})
            </button>
          )}
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">In library</p>
            <p className="text-2xl font-bold text-gray-900">{items.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-emerald-200 p-4">
            <p className="text-xs text-emerald-600 uppercase tracking-wide">Ready to cite</p>
            <p className="text-2xl font-bold text-emerald-700">{ready.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-amber-200 p-4">
            <p className="text-xs text-amber-600 uppercase tracking-wide">Awaiting DOI</p>
            <p className="text-2xl font-bold text-amber-700">{awaiting.length}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-gray-200 p-1 rounded-lg w-fit">
          <button
            onClick={() => setTab("ready")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              tab === "ready" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Ready to cite ({ready.length})
          </button>
          <button
            onClick={() => setTab("awaiting")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              tab === "awaiting" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Awaiting DOI ({awaiting.length})
          </button>
        </div>

        {visible.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-600 mb-4">
              {tab === "ready"
                ? "Nothing in your library is ready to cite yet."
                : "Everything in your library has a DOI."}
            </p>
            {items.length === 0 && (
              <Link href="/" className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
                Browse the conference
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {visible.map(({ poster, ready: isReady, doi }) => (
              <div key={poster.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <Link href={`/view/${poster.id}`}>
                      <p className="font-medium text-gray-900 leading-snug hover:text-blue-700">{poster.title}</p>
                    </Link>
                    {poster.author && (
                      <p className="text-sm text-gray-500 mt-0.5">{poster.author}</p>
                    )}
                    {poster.session && (
                      <p className="text-xs text-gray-400 mt-1">{poster.session.name}</p>
                    )}
                    {isReady && doi && (
                      <p className="text-xs font-mono text-emerald-700 mt-1.5">DOI: {doi}</p>
                    )}
                    {!isReady && (
                      <p className="text-xs text-amber-700 mt-1.5">
                        ⏳ Slides will be downloadable after the embargo ends
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <EngagementBadge talkId={poster.id} />
                    {isReady && (
                      <button className="text-xs px-2 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700">
                        Download PDF
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "awaiting" && awaiting.length > 0 && (
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
            <strong>📧 Demo note:</strong> When the embargo ends and DOIs are minted, you'll receive an email
            letting you know your library is ready to download. You can uncheck anything you've changed your mind about.
          </div>
        )}
      </div>
    </div>
  );
}
