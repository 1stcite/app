/**
 * Admin: issue a fresh presenter manage link for a talk (e.g. the presenter
 * lost theirs). The old link stops working immediately.
 *
 * POST /api/admin/manage-link { posterId } → { manageUrl }
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";
import { requireAdmin } from "@/app/lib/guards";
import { hashToken, newManageToken } from "@/app/lib/presenter";

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const posterId = String(body?.posterId ?? "");
  if (!posterId) return NextResponse.json({ error: "posterId required" }, { status: 400 });

  const token = newManageToken();
  const db = await getDb();
  const r = await db
    .collection("posters")
    .updateOne({ id: posterId }, { $set: { manageTokenHash: hashToken(token), manageLinkIssuedAt: new Date() } });
  if (r.matchedCount === 0) return NextResponse.json({ error: "Talk not found" }, { status: 404 });

  return NextResponse.json({ manageUrl: `/manage/${token}` });
}
