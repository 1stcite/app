import { NextResponse } from "next/server";
import clientPromise  from "@/app/lib/mongodb"; 

export async function GET() {
  const client = await clientPromise;
  const db = client.db();
  const cfg = await db.collection("config").findOne({ key: "demo" });

  const requireLogin = Boolean(cfg?.requireLogin);
  return NextResponse.json({ requireLogin });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const requireLogin = Boolean(body?.requireLogin);

  const client = await clientPromise;
  const db = client.db();

  await db.collection("config").updateOne(
    { key: "demo" },
    { $set: { key: "demo", requireLogin, updatedAt: new Date() } },
    { upsert: true }
  );

  return NextResponse.json({ ok: true, requireLogin });
}