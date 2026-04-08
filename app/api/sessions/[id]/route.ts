import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";

// PATCH — update session
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const db = await getDb();
  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name !== undefined) update.name = body.name.toString().trim();
  if (body.date !== undefined) update.date = body.date;
  if (body.startTime !== undefined) update.startTime = body.startTime;
  if (body.endTime !== undefined) update.endTime = body.endTime;
  if (body.location !== undefined) update.location = body.location.toString().trim();
  if (body.sortOrder !== undefined) update.sortOrder = body.sortOrder;
  await db.collection("sessions").updateOne({ id }, { $set: update });
  return NextResponse.json({ ok: true });
}

// DELETE — soft delete session (clears sessionId from its posters too)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = await getDb();
  await db.collection("sessions").updateOne({ id }, { $set: { deletedAt: new Date() } });
  await db.collection("posters").updateMany({ sessionId: id }, { $unset: { sessionId: "" } });
  return NextResponse.json({ ok: true });
}
