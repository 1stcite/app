/**
 * Saves API — the canonical engagement model going forward.
 *
 * A save is the user's gesture of "I'm interested in this talk." Each save has:
 *   - state:  unreviewed | in_library | declined
 *   - source: in_session | insights | post_conference_email
 *
 * The legacy /api/stars endpoint writes into the same `stars` collection but
 * always with state='unreviewed' and source='in_session'. This file is the
 * richer interface that handles state transitions and source tracking.
 *
 * For migration: existing star documents without state/source are treated as
 * { state: 'unreviewed', source: 'in_session' } by default in reads.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";
import { getSessionUser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

type SaveState = "unreviewed" | "in_library" | "declined";
type SaveSource = "in_session" | "insights" | "post_conference_email";

function normalizeState(s: unknown): SaveState {
  return s === "in_library" || s === "declined" ? s : "unreviewed";
}
function normalizeSource(s: unknown): SaveSource {
  return s === "insights" || s === "post_conference_email" ? s : "in_session";
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const stateFilter = req.nextUrl.searchParams.get("state");

  const db = await getDb();
  const query: Record<string, unknown> = { userId: user._id };
  if (stateFilter) {
    if (stateFilter === "unreviewed") {
      // Match either explicit 'unreviewed' OR missing state field (legacy)
      query.$or = [{ state: "unreviewed" }, { state: { $exists: false } }];
    } else {
      query.state = stateFilter;
    }
  }

  const saves = await db.collection("stars").find(query).sort({ createdAt: -1 }).toArray();

  return NextResponse.json(
    saves.map(s => ({
      _id: String(s._id),
      posterId: s.posterId,
      state: normalizeState(s.state),
      source: normalizeSource(s.source),
      createdAt: s.createdAt,
      reviewedAt: s.reviewedAt || null,
    }))
  );
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const posterId = String(body?.posterId || "");
  const source = normalizeSource(body?.source);
  if (!posterId) {
    return NextResponse.json({ error: "posterId required" }, { status: 400 });
  }

  const db = await getDb();

  // Look up existing save for this user+poster
  const existing = await db.collection("stars").findOne({ userId: user._id, posterId });

  const now = new Date();
  if (existing) {
    // If it was declined, this is a "changed my mind" — reset to unreviewed with new source
    if (existing.state === "declined") {
      await db.collection("stars").updateOne(
        { _id: existing._id },
        { $set: { state: "unreviewed", source, createdAt: now }, $unset: { reviewedAt: "" } }
      );
    }
    // Otherwise no-op: preserve original source
  } else {
    await db.collection("stars").insertOne({
      userId: user._id,
      posterId,
      state: "unreviewed",
      source,
      createdAt: now,
    });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const posterId = req.nextUrl.searchParams.get("posterId");
  if (!posterId) {
    return NextResponse.json({ error: "posterId required" }, { status: 400 });
  }

  const db = await getDb();
  await db.collection("stars").deleteOne({ userId: user._id, posterId });

  return NextResponse.json({ success: true });
}

/**
 * PATCH: bulk update review state for a list of poster IDs.
 * Body: { addToLibrary: string[], decline: string[] }
 *
 * Used by the review pages (in-conference button, post-conference email).
 */
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const addToLibrary: string[] = Array.isArray(body?.addToLibrary) ? body.addToLibrary : [];
  const decline: string[] = Array.isArray(body?.decline) ? body.decline : [];

  const db = await getDb();
  const now = new Date();

  if (addToLibrary.length) {
    await db.collection("stars").updateMany(
      { userId: user._id, posterId: { $in: addToLibrary } },
      { $set: { state: "in_library", reviewedAt: now } }
    );
  }
  if (decline.length) {
    await db.collection("stars").updateMany(
      { userId: user._id, posterId: { $in: decline } },
      { $set: { state: "declined", reviewedAt: now } }
    );
  }

  return NextResponse.json({
    success: true,
    promoted: addToLibrary.length,
    declined: decline.length,
  });
}
