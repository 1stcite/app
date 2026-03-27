import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";

// Admin-only route — returns ALL posters regardless of source
export async function GET() {
  const db = await getDb();
  const posters = await db
    .collection("posters")
    .find({ deletedAt: { $exists: false } })
    .sort({ uploadedAt: -1 })
    .toArray();
  return NextResponse.json(posters);
}

// Update source tag on a single poster
export async function PATCH(req: NextRequest) {
  const { id, source } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const db = await getDb();
  await db.collection("posters").updateOne(
    { id },
    { $set: { source: source || null } }
  );
  return NextResponse.json({ ok: true });
}
