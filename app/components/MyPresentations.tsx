"use client";

import { useEffect, useState } from "react";

type Talk = { id: string; title: string; status: "live" | "taken down" | "expired"; takenDownBy: string | null };

/** "Talks you're presenting": always a way back to the presenter view, even for taken-down talks. */
export default function MyPresentations() {
  const [talks, setTalks] = useState<Talk[]>([]);

  useEffect(() => {
    fetch("/api/my-presentations", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setTalks(Array.isArray(j) ? j : []))
      .catch(() => {});
  }, []);

  if (talks.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-baseline justify-between mb-3 pb-2 border-b-2 border-violet-200">
        <h2 className="text-xl font-bold text-gray-700">
          Talks you&apos;re presenting <span className="text-gray-400 font-normal text-base">({talks.length})</span>
        </h2>
      </div>
      <ul className="space-y-2">
        {talks.map((t) => (
          <li key={t.id} className="bg-white rounded-lg border p-3 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-gray-900 truncate">{t.title}</p>
              <p className="text-xs mt-0.5">
                {t.status === "live" ? (
                  <span className="text-emerald-700">Live</span>
                ) : t.status === "expired" ? (
                  <span className="text-gray-500">Live period ended</span>
                ) : (
                  <span className="text-gray-600">
                    Taken down{t.takenDownBy === "organizer" ? " by the organizers" : ""}
                  </span>
                )}
              </p>
            </div>
            <a
              href={`/presenter/${t.id}`}
              className="shrink-0 rounded-md bg-violet-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-violet-700"
            >
              Presenter view →
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
