import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSessionUser, type AuthedUser } from "@/app/lib/auth";
import { getDb } from "@/app/lib/db";

/**
 * Returns a 401/403 response if the current session is not an admin, or null
 * if the caller may proceed. Usage:
 *   const denied = await requireAdmin(); if (denied) return denied;
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const user = await getSessionUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 });
  return null;
}

/** True if the user is an admin or the presenter who owns this poster. */
export function canManagePoster(
  user: AuthedUser | null,
  poster: Record<string, unknown> | null
): boolean {
  if (!user || !poster) return false;
  if (user.isAdmin) return true;
  return poster.presenterUserId != null && String(poster.presenterUserId) === String(user._id);
}

export type ConferenceDoc = {
  subdomain: string;
  name: string;
  logo?: string;
  sourceId: string;
  isRepo?: boolean;
  active?: boolean;
  // Access
  requireLogin?: boolean;
  accessCode?: string;
  // Presenter self-upload
  presenterCode?: string;
  presenterUploadsOpen?: boolean;
  endDate?: string; // YYYY-MM-DD, last day of the conference
  liveDaysAfter?: number; // how long talks stay live after endDate (default 30)
};

/** Subdomain for the current request (set by middleware), or the site default. */
export async function getRequestSubdomain(): Promise<string> {
  const h = await headers();
  return h.get("x-subdomain") ?? process.env.NEXT_PUBLIC_SITE_ID ?? "";
}

/** Conference record for the current request, if one exists. */
export async function getRequestConference(): Promise<ConferenceDoc | null> {
  const subdomain = await getRequestSubdomain();
  if (!subdomain || subdomain === "presentrxiv" || subdomain === "www") return null;
  const db = await getDb();
  const conf = await db.collection("conferences").findOne({ subdomain, active: true });
  return (conf as unknown as ConferenceDoc) ?? null;
}

/** The `source` value posters for this request's conference are tagged with. */
export async function getRequestSourceId(): Promise<string | undefined> {
  const conf = await getRequestConference();
  if (conf?.sourceId) return conf.sourceId;
  const sub = await getRequestSubdomain();
  if (sub && sub !== "presentrxiv" && sub !== "www") return sub;
  return process.env.NEXT_PUBLIC_SITE_ID || undefined;
}

/** Filter fragment that hides talks past their live window. */
export function liveFilter(now = new Date()) {
  return {
    $or: [{ liveUntil: { $exists: false } }, { liveUntil: null }, { liveUntil: { $gt: now } }],
  };
}

/** Default live-until date for a newly uploaded talk at this conference. */
export function defaultLiveUntil(conf: ConferenceDoc | null): Date | undefined {
  if (!conf?.endDate) return undefined;
  const end = new Date(`${conf.endDate}T23:59:59-08:00`);
  if (Number.isNaN(end.getTime())) return undefined;
  const days = conf.liveDaysAfter ?? 30;
  return new Date(end.getTime() + days * 24 * 60 * 60 * 1000);
}
