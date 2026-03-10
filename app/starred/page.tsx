'use client';

import { useEffect, useState } from "react";

export default function StarredPage() {
  const [posters, setPosters] = useState([]);

  useEffect(() => {
    async function loadStarred() {
      const res = await fetch("/api/stars");
      if (!res.ok) return;

      const stars = await res.json();

      const posterIds = stars.map((s: any) => s.posterId);

      const postersRes = await fetch("/api/posters");
      if (!postersRes.ok) return;

      const allPosters = await postersRes.json();

      const starredPosters = allPosters.filter((p: any) =>
        posterIds.includes(p.id)
      );

      setPosters(starredPosters);
    }

    loadStarred();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">My Starred Presentations</h1>

      <div className="space-y-3">
        {posters.map((p: any) => (
          <a
            key={p.id}
            href={`/poster/${p.id}`}
            className="block border rounded-lg p-4 hover:bg-gray-50"
          >
            <div className="font-medium">{p.title}</div>
            <div className="text-sm text-gray-600">{p.author}</div>
          </a>
        ))}
      </div>
    </div>
  );
}