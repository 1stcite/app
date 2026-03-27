import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";
import { getSessionUser } from "@/app/lib/auth";
import { extractPdfText } from "@/app/lib/extractPdfText";

export async function GET() {
  try {
    const db = await getDb();
    const siteId = process.env.NEXT_PUBLIC_SITE_ID;
    const filter: Record<string, any> = { deletedAt: { $exists: false } };
    if (siteId) filter.source = siteId;

    const posters = await db
      .collection("posters")
      .find(filter)
      .sort({ uploadedAt: -1 })
      .toArray();
    return NextResponse.json(posters);
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
    };

    const result = await db.collection("posters").insertOne(poster);

    // Kick off PDF text extraction in the background — don't await so the upload
    // response is fast. textContent will be populated within seconds.
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

    return NextResponse.json({ ...poster, _id: result.insertedId }, { status: 201 });
  } catch (error) {
    console.error("POST /api/posters failed:", error);
    return NextResponse.json({ error: "Failed to save poster metadata" }, { status: 500 });
  }
}
