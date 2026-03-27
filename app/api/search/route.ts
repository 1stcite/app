import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";

function normalize(s: string) {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

export async function GET(req: NextRequest) {
  const q = normalize(req.nextUrl.searchParams.get("q") || "");

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const db = await getDb();

    const siteId = process.env.NEXT_PUBLIC_SITE_ID;
    const filter: Record<string, any> = { deletedAt: { $exists: false } };
    if (siteId) filter.source = siteId;

    const posters = await db
      .collection("posters")
      .find(filter)
      .project({ id: 1, title: 1, author: 1, fileUrl: 1, textContent: 1, uploadedAt: 1 })
      .toArray();

    const results = posters
      .filter((p) => {
        const title = normalize(p.title || "");
        const author = normalize(p.author || "");
        const content = normalize(p.textContent || "");
        return title.includes(q) || author.includes(q) || content.includes(q);
      })
      .map((p) => ({
        id: p.id,
        title: p.title,
        author: p.author,
        uploadedAt: p.uploadedAt,
        matchedIn: [
          normalize(p.title || "").includes(q) && "title",
          normalize(p.author || "").includes(q) && "author",
          normalize(p.textContent || "").includes(q) && "content",
        ].filter(Boolean),
      }));

    return NextResponse.json({ results, total: posters.length });
  } catch (e) {
    console.error("GET /api/search error:", e);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}