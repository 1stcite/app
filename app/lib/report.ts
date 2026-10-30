/**
 * Presenter report — real engagement for one talk, from recorded events.
 *
 * Sources:
 *   views      { posterId, viewerKey, userId?, page, count, firstAt, lastAt }
 *   stars      interested (★)
 *   attend     attending (chair)
 *   library    saved (disc)
 *   comments   slide-anchored questions and comments
 *   followups  follow-up requests with contact details
 *   intros     presenter asked the organizer for an introduction to an attendee
 */

import { ObjectId } from "mongodb";
import { getDb } from "@/app/lib/db";

export type PersonRef = { name: string; at?: string };

export type PresenterReport = {
  generatedAt: string;
  viewers: number; // distinct people (or anonymous devices) who opened the deck
  signedInViewers: number;
  slides: { page: number; views: number; viewers: number; questions: number }[];
  interested: PersonRef[];
  attending: PersonRef[];
  saved: PersonRef[];
  questions: {
    id: string;
    page: number;
    text: string;
    author: string;
    at: string;
    kind: "public" | "question";
    replies: number;
    byPresenter: boolean;
    /** The asker shared their email with the presenter (see followups). */
    contactShared: boolean;
    /** Their email, when they asked the presenter to contact them. */
    contactEmail?: string;
    /** The presenter asked the organizer to introduce them to the asker. */
    introRequested: boolean;
  }[];
  followups: {
    id: string;
    name: string;
    email: string;
    organization?: string;
    role?: string;
    note?: string;
    at: string;
    /** Sent along with a private note (shown with that note rather than on its own). */
    withNote: boolean;
  }[];
};

function iso(d: unknown): string | undefined {
  return d instanceof Date ? d.toISOString() : d ? String(d) : undefined;
}

async function namesFor(
  collection: string,
  posterId: string
): Promise<PersonRef[]> {
  const db = await getDb();
  const docs = await db.collection(collection).find({ posterId }).sort({ createdAt: -1 }).toArray();
  const ids = docs.map((d) => d.userId).filter((v): v is ObjectId => v instanceof ObjectId);
  const users = ids.length
    ? await db.collection("users").find({ _id: { $in: ids } }, { projection: { displayName: 1 } }).toArray()
    : [];
  const byId = new Map(users.map((u) => [String(u._id), String(u.displayName ?? "")]));
  return docs.map((d) => ({ name: byId.get(String(d.userId)) || "Attendee", at: iso(d.createdAt) }));
}

export async function buildPresenterReport(
  posterId: string,
  presenterUserId?: string,
  numPagesHint = 0
): Promise<PresenterReport> {
  const db = await getDb();

  // Views: distinct viewers overall and per slide
  const [viewerAgg, perSlide] = await Promise.all([
    db
      .collection("views")
      .aggregate([
        { $match: { posterId } },
        { $group: { _id: "$viewerKey", signedIn: { $max: { $cond: [{ $ifNull: ["$userId", false] }, 1, 0] } } } },
        { $group: { _id: null, viewers: { $sum: 1 }, signedIn: { $sum: "$signedIn" } } },
      ])
      .toArray(),
    db
      .collection("views")
      .aggregate([
        { $match: { posterId } },
        // Views counts repeat visits (each doc's count); viewers is distinct people
        { $group: { _id: { page: "$page", v: "$viewerKey" }, n: { $sum: { $ifNull: ["$count", 1] } } } },
        { $group: { _id: "$_id.page", viewers: { $sum: 1 }, views: { $sum: "$n" } } },
        { $sort: { _id: 1 } },
      ])
      .toArray(),
  ]);

  // Questions and comments: everything except other people's private notes.
  // The presenter's own posts are included and flagged.
  const comments = await db
    .collection("comments")
    .find({
      posterId,
      $or: [
        { visibilityType: { $ne: "note" } },
        ...(presenterUserId && ObjectId.isValid(presenterUserId) ? [{ userId: new ObjectId(presenterUserId) }] : []),
      ],
    })
    .sort({ timestamp: 1 })
    .toArray();
  const isPresenter = (c: Record<string, unknown>) =>
    presenterUserId != null && String(c.userId) === String(presenterUserId);
  const topLevel = comments.filter((c) => !c.parentId);
  const replyCount = new Map<string, number>();
  for (const c of comments) {
    if (c.parentId) replyCount.set(String(c.parentId), (replyCount.get(String(c.parentId)) ?? 0) + 1);
  }

  const questionsBySlide = new Map<number, number>();
  for (const c of topLevel) {
    if (isPresenter(c)) continue; // slide counts reflect audience questions
    const p = Number(c.page);
    questionsBySlide.set(p, (questionsBySlide.get(p) ?? 0) + 1);
  }

  const viewersBySlide = new Map<number, number>(perSlide.map((r) => [Number(r._id), Number(r.viewers)]));
  const viewsBySlide = new Map<number, number>(perSlide.map((r) => [Number(r._id), Number(r.views)]));
  const maxPage = Math.max(
    numPagesHint,
    ...viewsBySlide.keys(),
    ...questionsBySlide.keys(),
    0
  );
  const slides = Array.from({ length: maxPage }, (_, i) => ({
    page: i + 1,
    views: viewsBySlide.get(i + 1) ?? 0,
    viewers: viewersBySlide.get(i + 1) ?? 0,
    questions: questionsBySlide.get(i + 1) ?? 0,
  }));

  const [interested, attending, saved, followupDocs, introDocs] = await Promise.all([
    namesFor("stars", posterId),
    namesFor("attend", posterId),
    namesFor("library", posterId),
    db.collection("followups").find({ posterId, withdrawnAt: { $exists: false } }).sort({ createdAt: -1 }).toArray(),
    db.collection("intros").find({ posterId }, { projection: { attendeeUserId: 1 } }).toArray(),
  ]);
  const noteAuthors = new Set(
    topLevel.filter((c) => c.visibilityType === "question" && !isPresenter(c)).map((c) => String(c.userId))
  );
  const contactEmailByUser = new Map(followupDocs.map((f) => [String(f.userId), String(f.email ?? "")]));
  const introUsers = new Set(introDocs.map((d) => String(d.attendeeUserId)));

  return {
    generatedAt: new Date().toISOString(),
    viewers: Number(viewerAgg[0]?.viewers ?? 0),
    signedInViewers: Number(viewerAgg[0]?.signedIn ?? 0),
    slides,
    interested,
    attending,
    saved,
    questions: topLevel.map((c) => ({
      id: String(c._id),
      page: Number(c.page),
      text: String(c.text ?? ""),
      author: String(c.author ?? "Attendee"),
      at: iso(c.timestamp) ?? "",
      kind: c.visibilityType === "question" ? "question" : "public",
      replies: replyCount.get(String(c._id)) ?? 0,
      byPresenter: isPresenter(c),
      contactShared: c.userId != null && contactEmailByUser.has(String(c.userId)),
      contactEmail: c.userId != null ? contactEmailByUser.get(String(c.userId)) || undefined : undefined,
      introRequested: c.userId != null && introUsers.has(String(c.userId)),
    })),
    followups: followupDocs.map((f) => ({
      id: String(f._id),
      name: String(f.name ?? ""),
      email: String(f.email ?? ""),
      organization: f.organization ? String(f.organization) : undefined,
      role: f.role ? String(f.role) : undefined,
      note: f.note ? String(f.note) : undefined,
      at: iso(f.createdAt) ?? "",
      withNote: noteAuthors.has(String(f.userId)),
    })),
  };
}
