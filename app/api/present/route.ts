/**
 * Presenter self-upload.
 *
 * POST /api/present
 *   { presenterCode, name, email, organization?, title, abstract?, fileUrl, consent }
 * → { posterId, manageUrl }
 *
 * The PDF has already been uploaded straight to Blob storage via
 * /api/blob-token. This route checks the conference's presenter code,
 * records the talk, and returns the presenter's private manage link.
 * The raw token is returned exactly once; only its hash is stored.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";
import { createSessionForUser, setSessionCookie } from "@/app/lib/auth";
import { defaultLiveUntil, getRequestConference } from "@/app/lib/guards";
import { codesMatch, hashToken, newManageToken } from "@/app/lib/presenter";
import { reindexPdfInBackground } from "@/app/lib/textContent";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isBlobUrl(u: string): boolean {
  try {
    const url = new URL(u);
    return url.protocol === "https:" && url.hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

function clip(v: unknown, max: number): string {
  return String(v ?? "").trim().slice(0, max);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const conf = await getRequestConference();
  if (!conf || !conf.presenterCode) {
    return NextResponse.json({ error: "This conference isn't accepting presenter uploads." }, { status: 404 });
  }
  if (conf.presenterUploadsOpen === false) {
    return NextResponse.json({ error: "Presenter uploads are closed for this conference." }, { status: 403 });
  }
  if (!codesMatch(clip(body.presenterCode, 64), conf.presenterCode)) {
    return NextResponse.json({ error: "That presenter code doesn't match. Check your acceptance email." }, { status: 401 });
  }

  const name = clip(body.name, 120);
  const email = clip(body.email, 200).toLowerCase();
  const organization = clip(body.organization, 160);
  const title = clip(body.title, 300);
  const abstract = clip(body.abstract, 4000);
  const fileUrl = clip(body.fileUrl, 1000);

  if (!name || !title) return NextResponse.json({ error: "Name and talk title are required." }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  if (!isBlobUrl(fileUrl)) return NextResponse.json({ error: "Upload the PDF first." }, { status: 400 });
  if (body.consent !== true) {
    return NextResponse.json({ error: "Please confirm you're authorized to share this deck." }, { status: 400 });
  }

  const db = await getDb();
  const now = new Date();

  const userRes = await db.collection("users").insertOne({
    displayName: name,
    email,
    organization: organization || undefined,
    role: "presenter",
    createdAt: now,
    lastSeenAt: now,
  });

  const token = newManageToken();
  const id = `${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;
  const liveUntil = defaultLiveUntil(conf);

  const poster = {
    id,
    title,
    author: organization ? `${name}, ${organization}` : name,
    presenterName: name,
    presenterOrg: organization || undefined,
    presenterEmail: email,
    presenterUserId: userRes.insertedId.toString(),
    fileUrl,
    source: conf.sourceId,
    uploadedAt: now,
    selfUploaded: true,
    manageTokenHash: hashToken(token),
    ...(liveUntil ? { liveUntil } : {}),
    ...(abstract ? { abstract, textContent: abstract, textIndexedAt: now } : {}),
  };

  await db.collection("posters").insertOne(poster);

  reindexPdfInBackground(id, fileUrl);

  // Sign the presenter in on this device so they can answer questions as themselves.
  const session = await createSessionForUser(userRes.insertedId);
  const res = NextResponse.json({ posterId: id, manageUrl: `/manage/${token}` }, { status: 201 });
  setSessionCookie(res, session.token, session.expiresAt);
  return res;
}
