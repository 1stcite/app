/**
 * Shared presenter-view logic, used by both ways in:
 *   /api/manage/[token]  — the private link (no sign-in needed)
 *   /api/presenter/[id]  — signed in as the talk's presenter, or an organizer
 */

import { NextResponse } from "next/server";
import type { WithId, Document } from "mongodb";
import { getDb } from "@/app/lib/db";
import { publicPoster } from "@/app/lib/presenter";
import { buildPresenterReport } from "@/app/lib/report";
import { rebuildTextContent, reindexPdfInBackground } from "@/app/lib/textContent";

const DAY = 24 * 60 * 60 * 1000;

function isBlobUrl(u: string): boolean {
  try {
    const url = new URL(u);
    return url.protocol === "https:" && url.hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

/**
 * `forOrganizer`: an organizer looking at someone else's talk. Attendee names
 * and follow-up contact details are the presenter's alone, so organizers get
 * the same page with people redacted to counts.
 */
export async function manageData(poster: WithId<Document>, opts: { forOrganizer?: boolean } = {}) {
  const numPages = Number(poster.numPages ?? 0);
  const report = await buildPresenterReport(poster.id, poster.presenterUserId, numPages);
  if (opts.forOrganizer) {
    const anon = (list: { name: string; at?: string }[]) => list.map((p) => ({ ...p, name: "Attendee" }));
    report.interested = anon(report.interested);
    report.attending = anon(report.attending);
    report.saved = anon(report.saved);
    report.followups = report.followups.map((f) => ({
      ...f,
      name: "Attendee",
      email: "",
      organization: undefined,
      role: undefined,
      note: undefined,
    }));
  }
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
      takenDownBy: poster.deletedAt ? String(poster.takenDownBy ?? "organizer") : null,
    },
    report,
  });
}

/** Apply an edit or action. `by` is who is acting: the presenter or an organizer. */
export async function applyManagePatch(
  poster: WithId<Document>,
  body: Record<string, unknown>,
  by: "presenter" | "organizer"
) {
  const set: Record<string, unknown> = { updatedAt: new Date() };
  const unset: Record<string, ""> = {};

  if (body.title !== undefined) {
    const t = String(body.title).trim().slice(0, 300);
    if (!t) return NextResponse.json({ error: "Title can't be empty." }, { status: 400 });
    set.title = t;
  }
  if (body.abstract !== undefined) {
    set.abstract = String(body.abstract).trim().slice(0, 4000);
  }
  if (body.fileUrl !== undefined) {
    const u = String(body.fileUrl).trim();
    if (!isBlobUrl(u)) return NextResponse.json({ error: "Upload the new PDF first." }, { status: 400 });
    set.fileUrl = u;
    set.replacedAt = new Date();
    unset.numPages = ""; // re-learned from the new deck
  }

  switch (body.action) {
    case "takedown":
      // Already down: leave it, so nobody's removal gets relabeled as someone else's
      if (poster.deletedAt) return NextResponse.json({ ok: true });
      set.deletedAt = new Date();
      set.takenDownBy = by;
      break;
    case "restore": {
      // Each side restores only its own take-down
      const downBy = String(poster.takenDownBy ?? "organizer");
      if (poster.deletedAt && downBy !== by) {
        return NextResponse.json(
          {
            error:
              downBy === "organizer"
                ? "The organizers removed this talk. Contact them to restore it."
                : "The presenter took this talk down. Only they can restore it.",
          },
          { status: 403 }
        );
      }
      unset.deletedAt = "";
      unset.takenDownBy = "";
      break;
    }
    case "extend": {
      if (!poster.liveUntil) {
        return NextResponse.json({ error: "This talk has no end date, so there's nothing to extend." }, { status: 400 });
      }
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
  await db
    .collection("posters")
    .updateOne({ _id: poster._id }, { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) });
  if (set.fileUrl) reindexPdfInBackground(poster.id, String(set.fileUrl));
  else if (set.abstract !== undefined) await rebuildTextContent(poster.id);
  return NextResponse.json({ ok: true });
}
