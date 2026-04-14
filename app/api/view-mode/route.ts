import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const mode = body?.mode === "attendee" ? "attendee" : "admin";

  const res = NextResponse.json({ ok: true, viewMode: mode });
  res.cookies.set({
    name: "px_view_mode",
    value: mode,
    httpOnly: false, // readable by client so the bar can react instantly
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
