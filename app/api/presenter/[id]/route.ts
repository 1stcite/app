/**
 * Presenter view for a signed-in user: the talk's presenter, or an organizer.
 * Same data and actions as the private manage link.
 *
 * GET   → talk details + presenter report
 * PATCH → { title?, abstract?, fileUrl?, action?: "takedown" | "restore" | "extend" }
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";
import { getSessionUser } from "@/app/lib/auth";
import { canManagePoster } from "@/app/lib/guards";
import { applyManagePatch, manageData } from "@/app/lib/manageTalk";

export const dynamic = "force-dynamic";

async function load(params: Promise<{ id: string }>) {
  const { id } = await params;
  const user = await getSessionUser().catch(() => null);
  if (!user) return { error: NextResponse.json({ error: "Sign in to see the presenter view." }, { status: 401 }) };
  const db = await getDb();
  const poster = await db.collection("posters").findOne({ id });
  if (!poster) return { error: NextResponse.json({ error: "Talk not found." }, { status: 404 }) };
  if (!canManagePoster(user, poster)) {
    return { error: NextResponse.json({ error: "Only this talk's presenter can open the presenter view." }, { status: 403 }) };
  }
  return { poster, by: (user.isAdmin && String(poster.presenterUserId) !== String(user._id) ? "organizer" : "presenter") as "presenter" | "organizer" };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const r = await load(params);
  if ("error" in r) return r.error;
  return manageData(r.poster);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const r = await load(params);
  if ("error" in r) return r.error;
  const body = await req.json().catch(() => ({}));
  return applyManagePatch(r.poster, body, r.by);
}
