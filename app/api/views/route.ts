/**
 * Slide-view beacon.
 *
 * POST /api/views { posterId, page, numPages? }
 *
 * The viewer calls this after someone has stayed on a slide for a moment.
 * One document per (talk, viewer, slide), counting repeat visits, so the
 * presenter report can show distinct viewers per slide and where attention
 * drops off. Signed-in viewers are keyed by user; anonymous viewers by a
 * random first-party cookie (no fingerprinting, no third parties).
 */

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getDb } from "@/app/lib/db";
import { getSessionUser } from "@/app/lib/auth";
import { getRequireLogin } from "@/app/lib/config";
import { liveFilter } from "@/app/lib/guards";

export const dynamic = "force-dynamic";

const ANON_COOKIE = "px_anon";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const posterId = String(body?.posterId ?? "").slice(0, 64);
  const page = Number(body?.page);
  const numPages = Number(body?.numPages);

  if (!posterId || !Number.isInteger(page) || page < 1 || page > 1000) {
    return NextResponse.json({ error: "posterId and page required" }, { status: 400 });
  }

  const user = await getSessionUser().catch(() => null);
  if (!user && (await getRequireLogin())) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const db = await getDb();
  const poster = await db.collection("posters").findOne(
    { id: posterId, deletedAt: { $exists: false }, ...liveFilter() },
    { projection: { _id: 1, numPages: 1, presenterUserId: 1 } }
  );
  if (!poster) return NextResponse.json({ ok: false }, { status: 404 });

  // Don't count the presenter looking at their own deck
  if (user && poster.presenterUserId && String(poster.presenterUserId) === String(user._id)) {
    return NextResponse.json({ ok: true, skipped: "presenter" });
  }

  let anon = req.cookies.get(ANON_COOKIE)?.value;
  const newAnon = !user && !anon;
  if (newAnon) anon = randomBytes(12).toString("base64url");
  const viewerKey = user ? `u:${String(user._id)}` : `a:${anon}`;

  const now = new Date();
  await db.collection("views").updateOne(
    { posterId, viewerKey, page },
    {
      $inc: { count: 1 },
      $set: { lastAt: now, ...(user ? { userId: user._id } : {}) },
      $setOnInsert: { firstAt: now },
    },
    { upsert: true }
  );

  // Remember the deck length so reports can show slides nobody reached
  // (set once per deck; cleared when the deck is replaced)
  if (!poster.numPages && Number.isInteger(numPages) && numPages > 0 && numPages <= 500) {
    await db.collection("posters").updateOne({ _id: poster._id }, { $set: { numPages } });
  }

  const res = NextResponse.json({ ok: true });
  if (newAnon && anon) {
    res.cookies.set({
      name: ANON_COOKIE,
      value: anon,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });
  }
  return res;
}
