import { NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";
import { getRequireLogin } from "@/app/lib/config";
import { requireAdmin } from "@/app/lib/guards";

export async function GET() {
  const requireLogin = await getRequireLogin();
  return NextResponse.json({ requireLogin });
}

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const requireLogin = Boolean(body?.requireLogin);

  const db = await getDb();

  await db.collection("config").updateOne(
    { key: "demo" },
    { $set: { key: "demo", requireLogin, updatedAt: new Date() } },
    { upsert: true }
  );

  return NextResponse.json({ ok: true, requireLogin });
}
