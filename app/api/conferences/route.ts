import { NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";

// Returns distinct source values so the UI can build a conference filter
export async function GET() {
  const db = await getDb();
  const sources = await db
    .collection("posters")
    .distinct("source", { deletedAt: { $exists: false }, source: { $exists: true, $ne: null } });
  return NextResponse.json(sources.sort());
}
