/**
 * Viewed API — tracks whether a user has marked a talk as viewed.
 *
 * GET  /api/viewed?posterId=X  → { viewed: boolean }
 * GET  /api/viewed              → [{ posterId, createdAt }]  (all viewed for user)
 * POST /api/viewed              → { posterId }  (mark as viewed)
 * DELETE /api/viewed?posterId=X → unmark
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";
import { getSessionUser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getSessionUser().catch(() => null);
  if (!user) return NextResponse.json({ viewed: false });

  const db = await getDb();
  const posterId = req.nextUrl.searchParams.get("posterId");

  if (posterId) {
    const doc = await db.collection("viewed").findOne({ userId: user._id, posterId });
    return NextResponse.json({ viewed: !!doc });
  }

  // Return all viewed for this user
  const docs = await db.collection("viewed").find({ userId: user._id }).toArray();
  return NextResponse.json(docs.map(d => ({ posterId: d.posterId, createdAt: d.createdAt })));
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const posterId = String(body?.posterId || "");
  if (!posterId) return NextResponse.json({ error: "posterId required" }, { status: 400 });

  const db = await getDb();
  const existing = await db.collection("viewed").findOne({ userId: user._id, posterId });
  if (!existing) {
    await db.collection("viewed").insertOne({ userId: user._id, posterId, createdAt: new Date() });
  }

  return NextResponse.json({ viewed: true });
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const posterId = req.nextUrl.searchParams.get("posterId");
  if (!posterId) return NextResponse.json({ error: "posterId required" }, { status: 400 });

  const db = await getDb();
  await db.collection("viewed").deleteOne({ userId: user._id, posterId });

  return NextResponse.json({ viewed: false });
}
