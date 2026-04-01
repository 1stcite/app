import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";

// Ensure text index exists — MongoDB ignores this if index already exists
async function ensureTextIndex() {
  const db = await getDb();
  await db.collection("posters").createIndex(
    { title: "text", author: "text", textContent: "text" },
    { name: "posters_text_search", weights: { title: 10, author: 5, textContent: 1 } }
  );
}

// Create index on first cold start — safe to call repeatedly
ensureTextIndex().catch((e) => console.error("Text index creation failed:", e));

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const db = await getDb();

    const siteId = process.env.NEXT_PUBLIC_SITE_ID;
    const filter: Record<string, any> = {
      $text: { $search: q },
      deletedAt: { $exists: false },
    };
    if (siteId && siteId !== "presentrxiv") filter.source = siteId;

    const posters = await db
      .collection("posters")
      .find(filter, { projection: { score: { $meta: "textScore" }, id: 1, title: 1, author: 1, uploadedAt: 1 } })
      .sort({ score: { $meta: "textScore" } })
      .toArray();

    const results = posters.map((p) => ({
      id: p.id,
      title: p.title,
      author: p.author,
      uploadedAt: p.uploadedAt,
      matchedIn: ["content"], // native text search doesn't distinguish fields easily
    }));

    return NextResponse.json({ results, total: results.length });
  } catch (e) {
    console.error("GET /api/search error:", e);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
