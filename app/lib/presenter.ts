import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { getDb } from "@/app/lib/db";

/**
 * Presenter manage links.
 *
 * Presenters don't create accounts. When they upload, they get a private link
 * (/manage/<token>) that lets them edit, replace, take down, or extend their
 * talk and read their report. Only a SHA-256 hash of the token is stored, so a
 * database leak doesn't expose working links.
 */

export function newManageToken(): string {
  return randomBytes(24).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function findPosterByManageToken(token: string) {
  if (!token || token.length < 20) return null;
  const db = await getDb();
  return db.collection("posters").findOne({ manageTokenHash: hashToken(token) });
}

/** Constant-time comparison for short shared codes (presenter / access codes). */
export function codesMatch(given: string, expected: string | undefined | null): boolean {
  if (!expected) return false;
  const a = Buffer.from(given.trim().toLowerCase());
  const b = Buffer.from(expected.trim().toLowerCase());
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Fields that must never leave the server in a public poster payload. */
const PRIVATE_POSTER_FIELDS = ["manageTokenHash", "presenterEmail"] as const;

export function publicPoster<T extends Record<string, unknown>>(poster: T): T {
  const copy: Record<string, unknown> = { ...poster };
  for (const f of PRIVATE_POSTER_FIELDS) delete copy[f];
  return copy as T;
}

/** Fields that must never leave the server in a public conference payload. */
const PRIVATE_CONFERENCE_FIELDS = ["accessCode", "presenterCode"] as const;

export function publicConference<T extends Record<string, unknown>>(conf: T): T {
  const copy: Record<string, unknown> = { ...conf };
  for (const f of PRIVATE_CONFERENCE_FIELDS) delete copy[f];
  return copy as T;
}

export const MAX_UPLOAD_BYTES = 40 * 1024 * 1024; // 40 MB
