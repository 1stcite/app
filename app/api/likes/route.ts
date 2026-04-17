/**
 * Likes API — binary approval signal per talk.
 *
 * GET    /api/likes?posterId=X  → { liked: boolean, count: number }
 * POST   /api/likes             → { posterId }  (add like, requires viewed)
 * DELETE /api/likes?posterId=X  → remove like
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";
import { getSessionUser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const db = await getDb();
  const posterId = req.nextUrl.searchParams.get("posterId");

  if (!posterId) return NextResponse.json({ error: "posterId required" }, { status: 400 });

  const count = await db.collection("likes").countDocuments({ posterId });
  const user = await getSessionUser().catch(() => null);

  if (!user) return NextResponse.json({ liked: false, count });

  const doc = await db.collection("likes").findOne({ userId: user._id, posterId });
  return NextResponse.json({ liked: !!doc, count });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const posterId = String(body?.posterId || "");
  if (!posterId) return NextResponse.json({ error: "posterId required" }, { status: 400 });

  const db = await getDb();

  // Must have viewed the talk first
  const viewed = await db.collection("viewed").findOne({ userId: user._id, posterId });
  if (!viewed) {
    return NextResponse.json(
      { error: "You must view this talk before liking" },
      { status: 403 }
    );
  }

  const existing = await db.collection("likes").findOne({ userId: user._id, posterId });
  if (!existing) {
    await db.collection("likes").insertOne({ userId: user._id, posterId, createdAt: new Date() });
  }

  const count = await db.collection("likes").countDocuments({ posterId });
  return NextResponse.json({ liked: true, count });
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const posterId = req.nextUrl.searchParams.get("posterId");
  if (!posterId) return NextResponse.json({ error: "posterId required" }, { status: 400 });

  const db = await getDb();
  await db.collection("likes").deleteOne({ userId: user._id, posterId });

  const count = await db.collection("likes").countDocuments({ posterId });
  return NextResponse.json({ liked: false, count });
}
