import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

const COOKIE = "px_attendee";

// optional: set DEMO_ACCESS_CODE in .env.local, or leave empty to not require
const EXPECTED = process.env.DEMO_ACCESS_CODE || "";

function b64(obj: unknown) {
  return Buffer.from(JSON.stringify(obj), "utf8").toString("base64url");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const displayName = String(body?.displayName || "").trim();
  const accessCode = String(body?.accessCode || "").trim();

  if (!displayName) {
    return NextResponse.json({ error: "Display name required" }, { status: 400 });
  }

  if (EXPECTED && accessCode !== EXPECTED) {
    return NextResponse.json({ error: "Invalid access code" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: COOKIE,
    value: b64({ id: randomUUID(), name: displayName }),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}