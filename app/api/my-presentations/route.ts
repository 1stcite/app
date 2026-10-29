/**
 * Talks the signed-in user presents at this conference, including ones that
 * are taken down or past their live window, so presenters can always get
 * back to their presenter view (to restore a talk or read its report).
 */

import { NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";
import { getSessionUser } from "@/app/lib/auth";
import { getRequestSourceId } from "@/app/lib/guards";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser().catch(() => null);
  if (!user) return NextResponse.json([]);

  const db = await getDb();
  const sourceId = await getRequestSourceId();
  const now = new Date();
  const talks = await db
    .collection("posters")
    .find(
      { presenterUserId: String(user._id), ...(sourceId ? { source: sourceId } : {}) },
      { projection: { id: 1, title: 1, deletedAt: 1, takenDownBy: 1, liveUntil: 1 } }
    )
    .sort({ uploadedAt: -1 })
    .toArray();

  return NextResponse.json(
    talks.map((t) => ({
      id: String(t.id),
      title: String(t.title ?? "Untitled"),
      status: t.deletedAt ? "taken down" : t.liveUntil && t.liveUntil < now ? "expired" : "live",
      takenDownBy: t.deletedAt ? String(t.takenDownBy ?? "organizer") : null,
    }))
  );
}
