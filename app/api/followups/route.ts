/**
 * Follow-up requests — "I'd like to talk with this presenter."
 *
 * GET    /api/followups?posterId=X  → { requested: boolean, request? }
 * POST   /api/followups             → { posterId, email, organization?, role?, note? }
 * DELETE /api/followups?posterId=X  → withdraw
 *
 * The requester's contact details are shared only with that talk's
 * presenter (via their manage link). Nothing is emailed automatically.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";
import { getSessionUser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const clip = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);

export async function GET(req: NextRequest) {
  const user = await getSessionUser().catch(() => null);
  if (!user) return NextResponse.json({ requested: false });

  const posterId = req.nextUrl.searchParams.get("posterId");
  if (!posterId) return NextResponse.json({ error: "posterId required" }, { status: 400 });

  const db = await getDb();
  const doc = await db
    .collection("followups")
    .findOne({ posterId, userId: user._id, withdrawnAt: { $exists: false } });

  // Also return the last contact details this person used, to pre-fill the form
  const last = await db
    .collection("followups")
    .find({ userId: user._id })
    .sort({ createdAt: -1 })
    .limit(1)
    .next();

  return NextResponse.json({
    requested: Boolean(doc),
    prefill: last
      ? { email: last.email ?? "", organization: last.organization ?? "", role: last.role ?? "" }
      : null,
  });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Sign in to request a follow-up" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const posterId = clip(body.posterId, 64);
  const email = clip(body.email, 200).toLowerCase();
  const organization = clip(body.organization, 160);
  const role = clip(body.role, 120);
  const note = clip(body.note, 1000);

  if (!posterId) return NextResponse.json({ error: "posterId required" }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });

  const db = await getDb();
  const poster = await db.collection("posters").findOne({ id: posterId, deletedAt: { $exists: false } });
  if (!poster) return NextResponse.json({ error: "Talk not found" }, { status: 404 });

  const now = new Date();
  await db.collection("followups").updateOne(
    { posterId, userId: user._id },
    {
      $set: {
        posterId,
        userId: user._id,
        name: user.displayName,
        email,
        organization: organization || undefined,
        role: role || undefined,
        note: note || undefined,
        updatedAt: now,
      },
      $unset: { withdrawnAt: "" },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );

  return NextResponse.json({ requested: true });
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const posterId = req.nextUrl.searchParams.get("posterId");
  if (!posterId) return NextResponse.json({ error: "posterId required" }, { status: 400 });

  const db = await getDb();
  await db
    .collection("followups")
    .updateOne({ posterId, userId: user._id }, { $set: { withdrawnAt: new Date() } });
  return NextResponse.json({ requested: false });
}
