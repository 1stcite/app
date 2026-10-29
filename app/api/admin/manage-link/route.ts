/**
 * Admin: issue a fresh presenter manage link for a talk (e.g. the presenter
 * lost theirs). The old link stops working immediately.
 *
 * POST /api/admin/manage-link { posterId } → { manageUrl }
 */

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/app/lib/db";
import { requireAdmin } from "@/app/lib/guards";
import { hashToken, newManageToken } from "@/app/lib/presenter";

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const posterId = String(body?.posterId ?? "");
  if (!posterId) return NextResponse.json({ error: "posterId required" }, { status: 400 });

  const db = await getDb();
  const poster = await db.collection("posters").findOne({ id: posterId });
  if (!poster) return NextResponse.json({ error: "Talk not found" }, { status: 404 });

  // The manage link signs its holder in as the talk's presenter. If the talk
  // is owned by an organizer account (bulk upload), give it its own
  // presenter-only account first so the link can never grant admin.
  const set: Record<string, unknown> = {};
  const ownerId = String(poster.presenterUserId ?? "");
  const owner = ObjectId.isValid(ownerId)
    ? await db.collection("users").findOne({ _id: new ObjectId(ownerId) }, { projection: { role: 1, isAdmin: 1 } })
    : null;
  if (!owner || owner.role !== "presenter" || owner.isAdmin) {
    const now = new Date();
    const u = await db.collection("users").insertOne({
      displayName: String(poster.presenterName || poster.author || "Presenter"),
      role: "presenter",
      createdAt: now,
      lastSeenAt: now,
    });
    set.presenterUserId = u.insertedId.toString();
  }

  const token = newManageToken();
  await db.collection("posters").updateOne(
    { id: posterId },
    { $set: { ...set, manageTokenHash: hashToken(token), manageLinkIssuedAt: new Date() } }
  );

  return NextResponse.json({ manageUrl: `/manage/${token}` });
}
