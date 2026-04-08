import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";
import { getSessionUser } from "@/app/lib/auth";

// GET — fetch single poster by id
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = await getDb();
  const poster = await db.collection("posters").findOne({ id, deletedAt: { $exists: false } });
  if (!poster) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(poster);
}

// PATCH — update title, author, and/or replace PDF
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const update: Record<string, unknown> = { updatedAt: new Date() };

  if (body.title !== undefined) update.title = body.title.toString().trim();
  if (body.author !== undefined) update.author = body.author.toString().trim();
  if (body.abstract !== undefined) update.abstract = body.abstract.toString().trim();
  if (body.fileUrl !== undefined) update.fileUrl = body.fileUrl.toString().trim();

  if (Object.keys(update).length === 1) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const db = await getDb();
  const result = await db.collection("posters").findOneAndUpdate(
    { id },
    { $set: update },
    { returnDocument: "after" }
  );

  if (!result) return NextResponse.json({ error: "Poster not found" }, { status: 404 });
  return NextResponse.json(result);
}

// DELETE — soft delete
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const db = await getDb();
  await db.collection("posters").updateOne(
    { id },
    { $set: { deletedAt: new Date() } }
  );
  return NextResponse.json({ ok: true });
}
