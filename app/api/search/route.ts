import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";

function normalize(s: string) {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * GET /api/search?q=...
 *
 * Searches posters by title and author (fast, in-memory).
 * If the poster has a cached `textContent` field, also searches that.
 * Content indexing happens lazily: first search request for a poster
 * without cached text triggers extraction in the background.
 */
export async function GET(req: NextRequest) {
  const q = normalize(req.nextUrl.searchParams.get("q") || "");

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const db = await getDb();

    const posters = await db
      .collection("posters")
      .find({ deletedAt: { $exists: false } })
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
        // highlight which field matched
        matchedIn: [
          normalize(p.title || "").includes(q) && "title",
          normalize(p.author || "").includes(q) && "author",
          normalize(p.textContent || "").includes(q) && "content",
        ].filter(Boolean),
      }));

    // Trigger background text extraction for any poster missing textContent
    const needsExtraction = posters.filter(
      (p) => !p.textContent && p.fileUrl
    );
    if (needsExtraction.length > 0) {
      extractTextInBackground(needsExtraction, db).catch(console.error);
    }

    return NextResponse.json({ results, total: posters.length });
  } catch (e) {
    console.error("GET /api/search error:", e);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

async function extractTextInBackground(
  posters: { id: string; fileUrl: string }[],
  db: Awaited<ReturnType<typeof import("@/app/lib/db").getDb>>
) {
  // Only process one at a time to avoid hammering Vercel Blob
  for (const poster of posters.slice(0, 3)) {
    try {
      const text = await extractPdfText(poster.fileUrl);
      if (text) {
        await db.collection("posters").updateOne(
          { id: poster.id },
          { $set: { textContent: text, textIndexedAt: new Date() } }
        );
      }
    } catch (e) {
      console.error(`Text extraction failed for poster ${poster.id}:`, e);
    }
  }
}

async function extractPdfText(fileUrl: string): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const res = await fetch(fileUrl);
  if (!res.ok) throw new Error(`Failed to fetch PDF: ${res.status}`);

  const arrayBuffer = await res.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  const textParts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str || "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (pageText) textParts.push(pageText);
  }

  return textParts.join("\n");
}
