/**
 * Presenter manage link API. The token in the URL is the presenter's key.
 *
 * GET   → talk details + presenter report
 * PATCH → { title?, abstract?, fileUrl?, action?: "takedown" | "restore" | "extend" }
 * POST  → { action: "signin" } sign this device in as the presenter
 */

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/app/lib/db";
import { createSessionForUser, setSessionCookie } from "@/app/lib/auth";
import { findPosterByManageToken, publicPoster } from "@/app/lib/presenter";
import { buildPresenterReport } from "@/app/lib/report";

export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

function isBlobUrl(u: string): boolean {
  try {
    const url = new URL(u);
    return url.protocol === "https:" && url.hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

async function load(params: Promise<{ token: string }>) {
  const { token } = await params;
  const poster = await findPosterByManageToken(token);
  return poster;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const poster = await load(params);
  if (!poster) return NextResponse.json({ error: "This link isn't valid." }, { status: 404 });

  const numPages = Number(poster.numPages ?? 0);
  const report = await buildPresenterReport(poster.id, poster.presenterUserId, numPages);
  const pub = publicPoster(poster);

  return NextResponse.json({
    talk: {
      id: pub.id,
      title: pub.title,
      abstract: pub.abstract ?? "",
      author: pub.author,
      presenterName: pub.presenterName ?? "",
      presenterOrg: pub.presenterOrg ?? "",
      presenterEmail: poster.presenterEmail ?? "", // the presenter's own email, shown only here
      fileUrl: pub.fileUrl,
      uploadedAt: pub.uploadedAt,
      liveUntil: poster.liveUntil ?? null,
      takenDown: Boolean(poster.deletedAt),
    },
    report,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const poster = await load(params);
  if (!poster) return NextResponse.json({ error: "This link isn't valid." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const set: Record<string, unknown> = { updatedAt: new Date() };
  const unset: Record<string, ""> = {};

  if (body.title !== undefined) {
    const t = String(body.title).trim().slice(0, 300);
    if (!t) return NextResponse.json({ error: "Title can't be empty." }, { status: 400 });
    set.title = t;
  }
  if (body.abstract !== undefined) {
    const a = String(body.abstract).trim().slice(0, 4000);
    set.abstract = a;
    set.textContent = a;
  }
  if (body.fileUrl !== undefined) {
    const u = String(body.fileUrl).trim();
    if (!isBlobUrl(u)) return NextResponse.json({ error: "Upload the new PDF first." }, { status: 400 });
    set.fileUrl = u;
    set.replacedAt = new Date();
  }

  switch (body.action) {
    case "takedown":
      set.deletedAt = new Date();
      set.takenDownBy = "presenter";
      break;
    case "restore":
      // Presenters can undo their own take-down, not an organizer's removal
      if (poster.deletedAt && poster.takenDownBy !== "presenter") {
        return NextResponse.json(
          { error: "The organizers removed this talk. Contact them to restore it." },
          { status: 403 }
        );
      }
      unset.deletedAt = "";
      unset.takenDownBy = "";
      break;
    case "extend": {
      const base = poster.liveUntil instanceof Date && poster.liveUntil > new Date() ? poster.liveUntil : new Date();
      set.liveUntil = new Date(base.getTime() + 30 * DAY);
      break;
    }
    case undefined:
      break;
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const db = await getDb();
  await db.collection("posters").updateOne(
    { _id: poster._id },
    { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) }
  );
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const poster = await load(params);
  if (!poster) return NextResponse.json({ error: "This link isn't valid." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  if (body.action !== "signin") return NextResponse.json({ error: "Unknown action" }, { status: 400 });

  const presenterId = String(poster.presenterUserId ?? "");
  if (!ObjectId.isValid(presenterId)) {
    return NextResponse.json({ error: "No presenter account on this talk." }, { status: 400 });
  }

  const session = await createSessionForUser(new ObjectId(presenterId));
  const res = NextResponse.json({ ok: true, viewUrl: `/view/${poster.id}` });
  setSessionCookie(res, session.token, session.expiresAt);
  return res;
}
