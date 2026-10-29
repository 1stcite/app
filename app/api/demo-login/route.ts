import { NextResponse } from "next/server";
import { createSession, isAdminSignIn, SESSION_COOKIE } from "@/app/lib/auth";
import { getRequestConference } from "@/app/lib/guards";
import { codesMatch } from "@/app/lib/presenter";

const EXPECTED = process.env.DEMO_ACCESS_CODE || "";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const displayName = String(body?.displayName || "").trim();
  const accessCode = String(body?.accessCode || "").trim();

  if (!displayName) {
    return NextResponse.json({ error: "Display name required" }, { status: 400 });
  }
  // Organizers sign in with their name plus the admin code
  const asAdmin = isAdminSignIn(displayName, accessCode);

  // A conference's own access code wins; otherwise fall back to the global one.
  const conf = await getRequestConference().catch(() => null);
  const expected = conf?.accessCode || EXPECTED;
  if (!asAdmin && expected && !codesMatch(accessCode, expected)) {
    return NextResponse.json({ error: "That access code doesn't match. Check your registration email." }, { status: 401 });
  }

  const { token, expiresAt } = await createSession(displayName, { isAdmin: asAdmin });

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