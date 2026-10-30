/**
 * Introduction requests — a presenter asked the organizers to connect them
 * with an attendee who sent a note but didn't share contact details.
 * The organizer has registration emails; 1stCite only passes on the names.
 *
 * GET   /api/admin/intros?sourceId=X → { intros: [...] }
 * PATCH /api/admin/intros            → { id, done: boolean }
 */

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/app/lib/db";
import { requireAdmin } from "@/app/lib/guards";

export const dynamic = "force-dynamic";

const iso = (d: unknown) => (d instanceof Date ? d.toISOString() : d ? String(d) : null);

export async function GET(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const sourceId = req.nextUrl.searchParams.get("sourceId") ?? "";
  if (!sourceId) return NextResponse.json({ error: "sourceId required" }, { status: 400 });

  const db = await getDb();
  const docs = await db.collection("intros").find({ source: sourceId }).sort({ createdAt: -1 }).limit(500).toArray();
  return NextResponse.json({
    intros: docs.map((d) => ({
      id: String(d._id),
      posterId: String(d.posterId ?? ""),
      talkTitle: String(d.talkTitle ?? ""),
      presenterName: String(d.presenterName ?? ""),
      presenterEmail: String(d.presenterEmail ?? ""),
      attendeeName: String(d.attendeeName ?? "Attendee"),
      requestedAt: iso(d.updatedAt ?? d.createdAt),
      doneAt: iso(d.doneAt),
    })),
  });
}

export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "");
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const db = await getDb();
  await db
    .collection("intros")
    .updateOne(
      { _id: new ObjectId(id) },
      body.done ? { $set: { doneAt: new Date() } } : { $unset: { doneAt: "" } }
    );
  return NextResponse.json({ ok: true });
}
