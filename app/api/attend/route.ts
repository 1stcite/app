/**
 * Attend API — "I plan to attend" / "I attended this talk"
 *
 * GET    /api/attend?posterId=X  → { attended: boolean }
 * GET    /api/attend              → [{ posterId, createdAt }]
 * POST   /api/attend              → { posterId }
 * DELETE /api/attend?posterId=X   → remove
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";
import { getSessionUser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getSessionUser().catch(() => null);
  if (!user) return NextResponse.json({ attended: false });

  const db = await getDb();
  const posterId = req.nextUrl.searchParams.get("posterId");

  if (posterId) {
    const doc = await db.collection("attend").findOne({ userId: user._id, posterId });
    return NextResponse.json({ attended: !!doc });
  }

  const docs = await db.collection("attend").find({ userId: user._id }).sort({ createdAt: -1 }).toArray();
  return NextResponse.json(docs.map(d => ({ posterId: d.posterId, createdAt: d.createdAt })));
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const posterId = String(body?.posterId || "");
  if (!posterId) return NextResponse.json({ error: "posterId required" }, { status: 400 });

  const db = await getDb();
  const existing = await db.collection("attend").findOne({ userId: user._id, posterId });
  if (!existing) {
    await db.collection("attend").insertOne({ userId: user._id, posterId, createdAt: new Date() });
  }

  return NextResponse.json({ attended: true });
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const posterId = req.nextUrl.searchParams.get("posterId");
  if (!posterId) return NextResponse.json({ error: "posterId required" }, { status: 400 });

  const db = await getDb();
  await db.collection("attend").deleteOne({ userId: user._id, posterId });

  return NextResponse.json({ attended: false });
}
