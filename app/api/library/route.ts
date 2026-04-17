/**
 * Library API — save-to-library, independent of scheduling.
 *
 * GET    /api/library              → all library items for this user
 * GET    /api/library?posterId=X   → { saved: boolean, attended: boolean }
 * POST   /api/library              → { posterId }  (save to library)
 * DELETE /api/library?posterId=X   → remove from library
 * PATCH  /api/library              → { posterId, attended: boolean } (set attendance)
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";
import { getSessionUser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getSessionUser().catch(() => null);
  if (!user) return NextResponse.json([]);

  const db = await getDb();
  const posterId = req.nextUrl.searchParams.get("posterId");

  if (posterId) {
    const doc = await db.collection("library").findOne({ userId: user._id, posterId });
    return NextResponse.json({
      saved: !!doc,
      attended: Boolean(doc?.attended),
    });
  }

  const docs = await db.collection("library").find({ userId: user._id }).sort({ createdAt: -1 }).toArray();
  return NextResponse.json(
    docs.map(d => ({
      posterId: d.posterId,
      attended: Boolean(d.attended),
      createdAt: d.createdAt,
    }))
  );
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const posterId = String(body?.posterId || "");
  if (!posterId) return NextResponse.json({ error: "posterId required" }, { status: 400 });

  const db = await getDb();
  const existing = await db.collection("library").findOne({ userId: user._id, posterId });
  if (!existing) {
    await db.collection("library").insertOne({
      userId: user._id,
      posterId,
      attended: false,
      createdAt: new Date(),
    });
  }

  return NextResponse.json({ saved: true });
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const posterId = req.nextUrl.searchParams.get("posterId");
  if (!posterId) return NextResponse.json({ error: "posterId required" }, { status: 400 });

  const db = await getDb();
  await db.collection("library").deleteOne({ userId: user._id, posterId });

  return NextResponse.json({ saved: false });
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const posterId = String(body?.posterId || "");
  const attended = Boolean(body?.attended);
  if (!posterId) return NextResponse.json({ error: "posterId required" }, { status: 400 });

  const db = await getDb();
  const result = await db.collection("library").updateOne(
    { userId: user._id, posterId },
    { $set: { attended } }
  );

  if (result.matchedCount === 0) {
    return NextResponse.json({ error: "Not in library" }, { status: 404 });
  }

  return NextResponse.json({ success: true, attended });
}
