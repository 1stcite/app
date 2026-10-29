import { cookies, headers } from "next/headers";
import type { NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";
import { ObjectId } from "mongodb";
import { randomBytes } from "crypto";

export const SESSION_COOKIE = "px_session";

export type AuthedUser = {
  _id: ObjectId;
  displayName: string;
  isAdmin?: boolean;
  role?: string;
};

/** Subdomain of the current request (set by middleware), if any. */
async function requestSubdomain(): Promise<string | null> {
  try {
    const h = await headers();
    return h.get("x-subdomain");
  } catch {
    return null;
  }
}

/**
 * Admins are the display names listed in ADMIN_DISPLAY_NAMES.
 * If ADMIN_ACCESS_CODE is also set, they must enter it at sign-in too
 * (optional hardening for later; off by default).
 */
export function isAdminSignIn(displayName: string, code: string): boolean {
  const adminNames = (process.env.ADMIN_DISPLAY_NAMES || "")
    .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  if (!adminNames.includes(displayName.trim().toLowerCase())) return false;
  const expected = process.env.ADMIN_ACCESS_CODE || "";
  return !expected || code.trim() === expected;
}

export async function createSession(displayName: string, opts: { isAdmin?: boolean } = {}) {
  const name = String(displayName || "").trim();
  if (!name) throw new Error("Display name required");

  const db = await getDb();
  const now = new Date();

  const userRes = await db.collection("users").insertOne({
    displayName: name,
    ...(opts.isAdmin ? { isAdmin: true } : {}),
    createdAt: now,
    lastSeenAt: now,
  });

  const { token, expiresAt } = await createSessionForUser(userRes.insertedId, 12);
  return { token, expiresAt, userId: userRes.insertedId, displayName: name };
}

export async function getSessionUser(): Promise<AuthedUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = await getDb();
  const now = new Date();

  const session = await db.collection("sessions").findOne({
    token,
    revokedAt: { $exists: false },
    expiresAt: { $gt: now },
  });

  if (!session) return null;

  // A session belongs to the conference (subdomain) it was created on.
  // Replaying it against another conference's API doesn't work.
  const sub = await requestSubdomain();
  if (session.subdomain && sub && session.subdomain !== sub) return null;

  const user = await db
    .collection("users")
    .findOne({ _id: session.userId }, { projection: { displayName: 1, isAdmin: 1, role: 1 } });

  if (!user) return null;

  const isAdmin = user.isAdmin === true;

  await db.collection("users").updateOne({ _id: user._id }, { $set: { lastSeenAt: now } });

  return { _id: user._id, displayName: user.displayName, isAdmin, role: user.role };
}

export async function revokeSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return;

  const db = await getDb();

  await db.collection("sessions").updateOne(
    { token, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } }
  );
}

/**
 * Create a session for an existing user (used when a presenter opens their
 * manage link, so they can answer questions as themselves in the viewer).
 */
export async function createSessionForUser(userId: ObjectId, hours = 24 * 14) {
  const db = await getDb();
  const now = new Date();
  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * hours);
  const subdomain = await requestSubdomain();
  await db.collection("sessions").insertOne({
    token,
    userId,
    ...(subdomain ? { subdomain } : {}),
    createdAt: now,
    expiresAt,
  });
  return { token, expiresAt };
}

/** Attach the session cookie to a response. */
export function setSessionCookie(
  res: NextResponse,
  token: string,
  expiresAt: Date
) {
  res.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.max(1, Math.floor((expiresAt.getTime() - Date.now()) / 1000)),
  });
}
