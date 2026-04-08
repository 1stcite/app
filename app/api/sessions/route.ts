import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";

// GET /api/sessions?conferenceId=iaprd  (subdomain or sourceId both work)
export async function GET(req: NextRequest) {
  const conferenceId = req.nextUrl.searchParams.get("conferenceId")
    ?? req.headers.get("x-subdomain")
    ?? "";
  const db = await getDb();
  const conf = await db.collection("conferences").findOne({ subdomain: conferenceId, active: true });
  const sourceId = conf?.sourceId ?? conferenceId;

  const sessions = await db
    .collection("sessions")
    .find({ conferenceId: sourceId, deletedAt: { $exists: false } })
    .sort({ date: 1, startTime: 1, sortOrder: 1 })
    .toArray();
  return NextResponse.json(sessions);
}

// POST — create session
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { conferenceId, name, date, startTime, endTime, location, sortOrder } = body;
  if (!conferenceId || !name) {
    return NextResponse.json({ error: "conferenceId and name required" }, { status: 400 });
  }
  const db = await getDb();
  const id = `sess_${Date.now()}`;
  const session = {
    id,
    conferenceId,
    name: name.trim(),
    date: date ?? "",
    startTime: startTime ?? "",
    endTime: endTime ?? "",
    location: (location ?? "").trim(),
    sortOrder: sortOrder ?? 0,
    createdAt: new Date(),
  };
  await db.collection("sessions").insertOne(session);
  return NextResponse.json(session, { status: 201 });
}
