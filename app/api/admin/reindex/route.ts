import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";
import { extractPdfText } from "@/app/lib/extractPdfText";

// Simple secret guard — set REINDEX_SECRET env var on Vercel, pass as ?secret=
const SECRET = process.env.REINDEX_SECRET ?? "reindex";

export const maxDuration = 300; // 5 min Vercel timeout

export async function POST(req: NextRequest) {
  if (req.nextUrl.searchParams.get("secret") !== SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();

  // Fetch all posters that don't yet have textContent
  const posters = await db
    .collection("posters")
    .find({ deletedAt: { $exists: false }, textContent: { $exists: false } })
    .project({ id: 1, title: 1, fileUrl: 1 })
    .toArray();

  const results: { id: string; title: string; status: string }[] = [];

  for (const poster of posters) {
    try {
      const textContent = await extractPdfText(poster.fileUrl);
      if (textContent) {
        await db.collection("posters").updateOne(
          { id: poster.id },
          { $set: { textContent, textIndexedAt: new Date() } }
        );
        results.push({ id: poster.id, title: poster.title, status: "indexed" });
      } else {
        results.push({ id: poster.id, title: poster.title, status: "no_text" });
      }
    } catch (e) {
      results.push({ id: poster.id, title: poster.title, status: `error: ${e}` });
    }
  }

  return NextResponse.json({
    total: posters.length,
    results,
  });
}
