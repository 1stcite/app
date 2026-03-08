import { NextResponse } from "next/server";
import { revokeSession, SESSION_COOKIE } from "@/app/lib/auth";

export async function POST() {
  await revokeSession();

  const res = NextResponse.json({ ok: true });
  res.cookies.set({ name: SESSION_COOKIE, value: "", path: "/", maxAge: 0 });
  return res;
}