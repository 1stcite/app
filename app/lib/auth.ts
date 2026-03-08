import { cookies } from "next/headers";
import clientPromise from "@/app/lib/mongodb";
import { ObjectId } from "mongodb";
import { randomBytes } from "crypto";

export const SESSION_COOKIE = "px_session";

export type AuthedUser = {
  _id: ObjectId;
  displayName: string;
};

export async function createSession(displayName: string) {
  const name = String(displayName || "").trim();
  if (!name) throw new Error("Display name required");

  const client = await clientPromise;
  const db = client.db();
  const now = new Date();

  const userRes = await db.collection("users").insertOne({
    displayName: name,
    createdAt: now,
    lastSeenAt: now,
  });

  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 12); // 12h

  await db.collection("sessions").insertOne({
    token,
    userId: userRes.insertedId,
    createdAt: now,
    expiresAt,
  });

  return { token, expiresAt, userId: userRes.insertedId, displayName: name };
}

export async function getSessionUser(): Promise<AuthedUser | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const client = await clientPromise;
  const db = client.db();
  const now = new Date();

  const session = await db.collection("sessions").findOne({
    token,
    revokedAt: { $exists: false },
    expiresAt: { $gt: now },
  });

  if (!session) return null;

  const user = await db.collection("users").findOne(
    { _id: session.userId },
    { projection: { displayName: 1 } }
  );

  if (!user) return null;

  await db.collection("users").updateOne(
    { _id: user._id },
    { $set: { lastSeenAt: now } }
  );

  return { _id: user._id, displayName: user.displayName };
}

export async function revokeSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return;

  const client = await clientPromise;
  const db = client.db();

  await db.collection("sessions").updateOne(
    { token, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } }
  );
}