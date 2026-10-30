import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";
import { getSessionUser } from "@/app/lib/auth";
import { canManagePoster, liveFilter } from "@/app/lib/guards";
import { publicPoster } from "@/app/lib/presenter";
import { getRequireLogin } from "@/app/lib/config";
import { rebuildTextContent, reindexPdfInBackground } from "@/app/lib/textContent";

// GET — fetch single poster by id (hidden once taken down or past its live window)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (await getRequireLogin()) {
    const viewer = await getSessionUser().catch(() => null);
    if (!viewer) return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  const db = await getDb();
  const poster = await db
    .collection("posters")
    .findOne({ id, deletedAt: { $exists: false }, ...liveFilter() });
  if (!poster) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(publicPoster(poster));
}

// PATCH — update title, author, and/or replace PDF (admin or the talk's presenter)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const db = await getDb();
  const existing = await db.collection("posters").findOne({ id });
  if (!existing) return NextResponse.json({ error: "Poster not found" }, { status: 404 });
  if (!canManagePoster(user, existing)) {
    return NextResponse.json({ error: "Only the presenter or an admin can edit this talk" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const update: Record<string, unknown> = { updatedAt: new Date() };

  if (body.title !== undefined) update.title = body.title.toString().trim();
  if (body.author !== undefined) update.author = body.author.toString().trim();
  if (body.abstract !== undefined) update.abstract = body.abstract.toString().trim();
  if (body.fileUrl !== undefined) update.fileUrl = body.fileUrl.toString().trim();

  // Organizer restore of a taken-down talk
  if (body.deleted === false) {
    if (!user.isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 });
    await db.collection("posters").updateOne({ id }, { $unset: { deletedAt: "", takenDownBy: "" } });
    if (Object.keys(update).length === 1) return NextResponse.json({ ok: true });
  }

  if (Object.keys(update).length === 1) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const result = await db.collection("posters").findOneAndUpdate(
    { id },
    { $set: update },
    { returnDocument: "after" }
  );

  if (!result) return NextResponse.json({ error: "Poster not found" }, { status: 404 });
  if (update.fileUrl && update.fileUrl !== existing.fileUrl) {
    // An organizer adding slides to a program slot fills it
    await db.collection("posters").updateOne({ id }, { $unset: { numPages: "", awaitingSlides: "" } });
    reindexPdfInBackground(id, String(update.fileUrl));
  } else if (update.abstract !== undefined) {
    await rebuildTextContent(id);
  }
  return NextResponse.json(publicPoster(result));
}

// DELETE — soft delete (admin or the talk's presenter)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const db = await getDb();
  const existing = await db.collection("posters").findOne({ id });
  if (!existing) return NextResponse.json({ error: "Poster not found" }, { status: 404 });
  if (!canManagePoster(user, existing)) {
    return NextResponse.json({ error: "Only the presenter or an admin can remove this talk" }, { status: 403 });
  }

  await db.collection("posters").updateOne(
    { id },
    { $set: { deletedAt: new Date(), takenDownBy: user.isAdmin ? "organizer" : "presenter" } }
  );
  return NextResponse.json({ ok: true });
}
