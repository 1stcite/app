import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";
import { getSessionUser } from "@/app/lib/auth";

export async function GET() {
  try {
    const db = await getDb();
    const posters = await db
      .collection("posters")
      .find({ deletedAt: { $exists: false } })
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

    const poster = {
      id,
      title,
      author: author || "Anonymous",
      fileUrl,
      presenterUserId: user._id.toString(),
      uploadedAt: new Date(),
    };

    const result = await db.collection("posters").insertOne(poster);
    return NextResponse.json({ ...poster, _id: result.insertedId }, { status: 201 });
  } catch (error) {
    console.error("POST /api/posters failed:", error);
    return NextResponse.json({ error: "Failed to save poster metadata" }, { status: 500 });
  }
}
