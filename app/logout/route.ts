import { NextRequest, NextResponse } from "next/server";
import { revokeSession, SESSION_COOKIE } from "@/app/lib/auth";

/** GET /logout: sign out and go to the sign-in page (handy as a plain link). */
export async function GET(req: NextRequest) {
  await revokeSession();
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  const res = NextResponse.redirect(url);
  res.cookies.set({ name: SESSION_COOKIE, value: "", path: "/", maxAge: 0 });
  return res;
}
