import { NextResponse } from "next/server";
import { createSession, SESSION_COOKIE } from "@/app/lib/auth";

const EXPECTED = process.env.DEMO_ACCESS_CODE || "";

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

  const { token, expiresAt } = await createSession(displayName);

  const res = NextResponse.json({ ok: true });

  // cookie lifetime in seconds
  const maxAge = Math.max(1, Math.floor((expiresAt.getTime() - Date.now()) / 1000));

  res.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });

  return res;
}