import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";
import { getSessionUser } from "@/app/lib/auth";
import { extractPdfText } from "@/app/lib/extractPdfText";

export async function GET() {
  try {
    const db = await getDb();
    // Get conference config from x-subdomain header (set by middleware)
    const { headers } = await import("next/headers");
    const headersList = await headers();
    const subdomain = headersList.get("x-subdomain") ?? process.env.NEXT_PUBLIC_SITE_ID ?? "";

    const filter: Record<string, any> = { deletedAt: { $exists: false } };
    if (subdomain && subdomain !== "presentrxiv") {
      // Look up sourceId from conferences collection
      const conf = await db.collection("conferences").findOne({ subdomain, active: true });
      const sourceId = conf?.sourceId ?? subdomain;
      filter.source = sourceId;
    }

    const posters = await db
      .collection("posters")
      .find(filter)
      .sort({ sortOrder: 1, uploadedAt: -1 })
      .toArray();

    // Attach session data
    const sessionIds = [...new Set(posters.map(p => p.sessionId).filter(Boolean))];
    let sessionsMap: Record<string, unknown> = {};
    if (sessionIds.length > 0) {
      const sessions = await db.collection("sessions")
        .find({ id: { $in: sessionIds } })
        .toArray();
      sessionsMap = Object.fromEntries(sessions.map(s => [s.id, s]));
    }
    const postersWithSession = posters.map(p => ({
      ...p,
      session: p.sessionId ? sessionsMap[p.sessionId] ?? null : null,
    }));

    return NextResponse.json(postersWithSession);
  } catch (error) {
    console.error("Error fetching posters:", error);
    return NextResponse.json({ error: "Failed to fetch posters" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Upload the PDF first via /api/upload-blob, then POST JSON metadata." },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    const title = (body?.title ?? "").toString().trim();
    const author = (body?.author ?? "").toString().trim();
    const fileUrl = (body?.fileUrl || body?.url || "").toString().trim();
    const abstract = (body?.abstract || "").toString().trim() || undefined;

    if (!title || !fileUrl) {
      return NextResponse.json(
        { error: "title and fileUrl are required" },
        { status: 400 }
      );
    }

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }

    const db = await getDb();
    const id = Date.now().toString();

    const siteId = process.env.NEXT_PUBLIC_SITE_ID;

    const poster = {
      id,
      title,
      author: author || "Anonymous",
      fileUrl,
      presenterUserId: user._id.toString(),
      uploadedAt: new Date(),
      ...(siteId ? { source: siteId } : {}),
      ...(abstract ? { abstract, textContent: abstract, textIndexedAt: new Date() } : {}),
    };

    const result = await db.collection("posters").insertOne(poster);

    // Only extract PDF text if no abstract was provided
    if (!abstract) {
      extractPdfText(fileUrl).then(async (textContent) => {
        if (!textContent) return;
        try {
          const dbForUpdate = await getDb();
          await dbForUpdate.collection("posters").updateOne(
            { id },
            { $set: { textContent, textIndexedAt: new Date() } }
          );
        } catch (e) {
          console.error("Failed to store textContent for poster", id, e);
        }
      });
    }

    return NextResponse.json({ ...poster, _id: result.insertedId }, { status: 201 });
  } catch (error) {
    console.error("POST /api/posters failed:", error);
    return NextResponse.json({ error: "Failed to save poster metadata" }, { status: 500 });
  }
}
