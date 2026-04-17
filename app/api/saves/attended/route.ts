import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";
import { getSessionUser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/saves/attended
 * Body: { posterId, attended: boolean }
 *
 * Sets the "attended" flag on the user's save record for this talk.
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const posterId = String(body?.posterId || "");
  const attended = Boolean(body?.attended);

  if (!posterId) return NextResponse.json({ error: "posterId required" }, { status: 400 });

  const db = await getDb();
  const result = await db.collection("stars").updateOne(
    { userId: user._id, posterId },
    { $set: { attended } }
  );

  if (result.matchedCount === 0) {
    return NextResponse.json({ error: "No save found for this talk" }, { status: 404 });
  }

  return NextResponse.json({ success: true, attended });
}
