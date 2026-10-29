import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";
import { requireAdmin } from "@/app/lib/guards";

const SECRET = process.env.REINDEX_SECRET ?? "reindex";

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (req.nextUrl.searchParams.get("secret") !== SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { source } = await req.json().catch(() => ({}));
  if (!source) {
    return NextResponse.json({ error: "source required in body" }, { status: 400 });
  }

  const db = await getDb();

  // Tag all posters that don't have a source yet
  const result = await db.collection("posters").updateMany(
    { source: { $exists: false }, deletedAt: { $exists: false } },
    { $set: { source } }
  );

  return NextResponse.json({
    tagged: result.modifiedCount,
    source,
  });
}
