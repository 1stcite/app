"use client";

import Link from "next/link";
import { usePosters } from "@/app/lib/usePosters";
import PosterCard from "@/app/components/PosterCard";
import { useConference } from "@/app/lib/conferenceContext";
import Footer from "@/app/components/Footer";

export default function SelectedPage() {
  const { logo: LOGO, name: LOGO_ALT } = useConference();
  const { loading, starredPosterIds, starredPosters, toggleStar } = usePosters();

  // Group starred posters by session
  const withSession = starredPosters.filter(p => (p as any).session);
  const withoutSession = starredPosters.filter(p => !(p as any).session);

  // Build session groups in order
  const sessionMap = new Map<string, { session: any; posters: typeof starredPosters }>();
  for (const poster of withSession) {
    const s = (poster as any).session;
    if (!sessionMap.has(s.id)) sessionMap.set(s.id, { session: s, posters: [] });
    sessionMap.get(s.id)!.posters.push(poster);
  }
  const sessionGroups = [...sessionMap.values()];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 md:p-8 max-w-6xl">

        {/* Header */}
        <div className="flex items-center gap-2 mb-8 min-w-0">
          <h1 className="text-xl md:text-3xl font-bold text-gray-500 whitespace-nowrap">Selected</h1>
          <Link
            href="/"
            className="px-3 py-1.5 rounded border border-gray-300 text-gray-700 bg-white text-sm hover:bg-gray-50 whitespace-nowrap shrink-0"
          >
            Conference
          </Link>
          <div className="flex-1" />
          <Link href="/" className="shrink-0">
            <img src={LOGO} alt="" className="h-8 md:h-16 w-auto max-w-[80px] md:max-w-[160px] object-contain" />
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading...</p>
          </div>
        ) : starredPosters.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-xl text-gray-600">No selected presentations yet</p>
            <p className="text-sm text-gray-400 mt-2">
              Star presentations from the{" "}
              <Link href="/" className="underline">conference view</Link>{" "}
              to save them here.
            </p>
          </div>
        ) : (
          <div className="space-y-8">

            {/* Session groups */}
            {sessionGroups.map(({ session, posters }) => (
              <div key={session.id}>
                {/* Session header */}
                <div className="mb-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{background:"#1a2e5a"}}>
                    <span className="text-white font-semibold text-sm">{session.name}</span>
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-gray-500 pl-1">
                    {session.date && session.startTime && (
                      <span>🕐 {session.startTime}{session.endTime ? ` – ${session.endTime}` : ''}</span>
                    )}
                    {session.location && <span>📍 {session.location}</span>}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {posters.map(poster => (
                    <PosterCard
                      key={poster._id}
                      poster={poster}
                      isStarred={starredPosterIds.includes(poster.id)}
                      onToggleStar={toggleStar}
                      variant="starred"
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Unscheduled */}
            {withoutSession.length > 0 && (
              <div>
                {sessionGroups.length > 0 && (
                  <div className="mb-3">
                    <span className="text-sm font-medium text-gray-400">Other</span>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {withoutSession.map(poster => (
                    <PosterCard
                      key={poster._id}
                      poster={poster}
                      isStarred={starredPosterIds.includes(poster.id)}
                      onToggleStar={toggleStar}
                      variant="starred"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      <Footer />
      </div>
    </div>
  );
}
