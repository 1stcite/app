import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";
import { getSessionUser } from "@/app/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const { page, note } = await req.json().catch(() => ({}));
  if (page === undefined) return NextResponse.json({ error: "page required" }, { status: 400 });

  const db = await getDb();

  // Verify caller is the presenter
  const poster = await db.collection("posters").findOne({ id, deletedAt: { $exists: false } });
  if (!poster) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (String(poster.presenterUserId) !== String(user._id) && !user.isAdmin) {
    return NextResponse.json({ error: "Only the presenter or admin can edit notes" }, { status: 403 });
  }

  // Save note for this page
  const noteKey = `notes.${page}`;
  await db.collection("posters").updateOne(
    { id },
    note?.trim()
      ? { $set: { [noteKey]: note.trim() } }
      : { $unset: { [noteKey]: "" } }
  );

  // Rebuild textContent from abstract + all notes for search
  const updated = await db.collection("posters").findOne({ id });
  const notesText = Object.values(updated?.notes ?? {}).join(" ");
  const textContent = [updated?.abstract, notesText].filter(Boolean).join("\n");
  await db.collection("posters").updateOne(
    { id },
    { $set: { textContent: textContent || undefined, textIndexedAt: new Date() } }
  );

  return NextResponse.json({ ok: true });
}
