/**
 * Presenter manage link API. The token in the URL is the presenter's key.
 *
 * GET   → talk details + presenter report
 * PATCH → { title?, abstract?, fileUrl?, action?: "takedown" | "restore" | "extend" }
 * POST  → { action: "signin" } sign this device in as the presenter
 */

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/app/lib/db";
import { createSessionForUser, setSessionCookie } from "@/app/lib/auth";
import { findPosterByManageToken } from "@/app/lib/presenter";
import { applyManagePatch, manageData } from "@/app/lib/manageTalk";

export const dynamic = "force-dynamic";

async function load(params: Promise<{ token: string }>) {
  const { token } = await params;
  return findPosterByManageToken(token);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const poster = await load(params);
  if (!poster) return NextResponse.json({ error: "This link isn't valid." }, { status: 404 });
  return manageData(poster);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const poster = await load(params);
  if (!poster) return NextResponse.json({ error: "This link isn't valid." }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  return applyManagePatch(poster, body, "presenter");
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const poster = await load(params);
  if (!poster) return NextResponse.json({ error: "This link isn't valid." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  if (body.action !== "signin") return NextResponse.json({ error: "Unknown action" }, { status: 400 });

  const presenterId = String(poster.presenterUserId ?? "");
  if (!ObjectId.isValid(presenterId)) {
    return NextResponse.json({ error: "No presenter account on this talk." }, { status: 400 });
  }
  // Only ever sign in as a presenter-only account, never as an organizer/admin
  const db = await getDb();
  const owner = await db.collection("users").findOne({ _id: new ObjectId(presenterId) }, { projection: { role: 1, isAdmin: 1 } });
  if (!owner || owner.role !== "presenter" || owner.isAdmin) {
    return NextResponse.json({ error: "Ask the organizers for a new presenter link." }, { status: 400 });
  }

  const session = await createSessionForUser(new ObjectId(presenterId));
  const res = NextResponse.json({ ok: true, viewUrl: `/view/${poster.id}` });
  setSessionCookie(res, session.token, session.expiresAt);
  return res;
}
