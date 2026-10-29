/**
 * Admin: conference-level report for organizers.
 *
 * GET /api/admin/conference-report?sourceId=X
 *
 * Counts only. No attendee names or contact details, which stay with the
 * presenters who earned them.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";
import { requireAdmin } from "@/app/lib/guards";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  title: string;
  author: string;
  presenterName?: string;
  presenterEmail?: string;
  selfUploaded: boolean;
  status: "live" | "taken down" | "expired";
  liveUntil: string | null;
  viewers: number;
  questions: number;
  followups: number;
  interested: number;
  saved: number;
};

async function countBy(collection: string, ids: string[], extra: Record<string, unknown> = {}) {
  const db = await getDb();
  const rows = await db
    .collection(collection)
    .aggregate([{ $match: { posterId: { $in: ids }, ...extra } }, { $group: { _id: "$posterId", n: { $sum: 1 } } }])
    .toArray();
  return new Map(rows.map((r) => [String(r._id), Number(r.n)]));
}

export async function GET(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const sourceId = req.nextUrl.searchParams.get("sourceId") ?? "";
  if (!sourceId) return NextResponse.json({ error: "sourceId required" }, { status: 400 });

  const db = await getDb();
  const posters = await db.collection("posters").find({ source: sourceId }).sort({ uploadedAt: -1 }).toArray();
  const ids = posters.map((p) => String(p.id));

  const [viewerRows, questions, followups, interested, saved] = await Promise.all([
    db
      .collection("views")
      .aggregate([
        { $match: { posterId: { $in: ids } } },
        { $group: { _id: { p: "$posterId", v: "$viewerKey" } } },
        { $group: { _id: "$_id.p", n: { $sum: 1 } } },
      ])
      .toArray(),
    countBy("comments", ids, { visibilityType: { $ne: "note" }, parentId: { $exists: false } }),
    countBy("followups", ids, { withdrawnAt: { $exists: false } }),
    countBy("stars", ids),
    countBy("library", ids),
  ]);
  const viewers = new Map(viewerRows.map((r) => [String(r._id), Number(r.n)]));

  const now = new Date();
  const rows: Row[] = posters.map((p) => ({
    id: String(p.id),
    title: String(p.title ?? ""),
    author: String(p.author ?? ""),
    presenterName: p.presenterName,
    presenterEmail: p.presenterEmail,
    selfUploaded: Boolean(p.selfUploaded),
    status: p.deletedAt ? "taken down" : p.liveUntil && p.liveUntil < now ? "expired" : "live",
    liveUntil: p.liveUntil ? new Date(p.liveUntil).toISOString() : null,
    viewers: viewers.get(String(p.id)) ?? 0,
    questions: questions.get(String(p.id)) ?? 0,
    followups: followups.get(String(p.id)) ?? 0,
    interested: interested.get(String(p.id)) ?? 0,
    saved: saved.get(String(p.id)) ?? 0,
  }));

  const live = rows.filter((r) => r.status === "live");
  const distinct = await db
    .collection("views")
    .aggregate([
      { $match: { posterId: { $in: live.map((r) => r.id) } } },
      { $group: { _id: "$viewerKey" } },
      { $count: "n" },
    ])
    .toArray();
  const totals = {
    talks: live.length,
    selfUploaded: live.filter((r) => r.selfUploaded).length,
    distinctViewers: Number(distinct[0]?.n ?? 0), // people (or devices) who opened any deck
    deckOpens: live.reduce((a, r) => a + r.viewers, 0), // summed per talk; one person can count on many talks
    questions: live.reduce((a, r) => a + r.questions, 0),
    followups: live.reduce((a, r) => a + r.followups, 0),
  };

  return NextResponse.json({ totals, rows });
}
