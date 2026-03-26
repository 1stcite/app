import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";
import { getSessionUser } from "@/app/lib/auth";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }

    const db = await getDb();
    const stars = await db
      .collection("stars")
      .find({ userId: user._id })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(stars);
  } catch (e) {
    console.error("GET /api/stars error:", e);
    return NextResponse.json({ error: "Failed to fetch stars" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }

    const body = await req.json();
    const posterId = String(body?.posterId || "");
    if (!posterId) {
      return NextResponse.json({ error: "posterId required" }, { status: 400 });
    }

    const db = await getDb();
    await db.collection("stars").updateOne(
      { userId: user._id, posterId },
      { $set: { userId: user._id, posterId, createdAt: new Date() } },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST /api/stars error:", e);
    return NextResponse.json({ error: "Failed to star poster" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }

    const posterId = req.nextUrl.searchParams.get("posterId");
    if (!posterId) {
      return NextResponse.json({ error: "posterId required" }, { status: 400 });
    }

    const db = await getDb();
    await db.collection("stars").deleteOne({ userId: user._id, posterId });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/stars error:", e);
    return NextResponse.json({ error: "Failed to unstar poster" }, { status: 500 });
  }
}
