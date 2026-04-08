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

// Update source tag or sortOrder on a single poster, or bulk reorder
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  // Bulk reorder: { reorder: [{id, sortOrder}, ...] }
  if (Array.isArray(body.reorder)) {
    const db = await getDb();
    await Promise.all(
      body.reorder.map(({ id, sortOrder }: { id: string; sortOrder: number }) =>
        db.collection("posters").updateOne({ id }, { $set: { sortOrder } })
      )
    );
    return NextResponse.json({ ok: true });
  }

  // Single poster update: source and/or sortOrder
  const { id, source, sortOrder } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const db = await getDb();
  const update: Record<string, unknown> = {};
  if (source !== undefined) update.source = source || null;
  if (sortOrder !== undefined) update.sortOrder = sortOrder;
  if ("sessionId" in body) update.sessionId = body.sessionId || null;

  await db.collection("posters").updateOne({ id }, { $set: update });
  return NextResponse.json({ ok: true });
}
