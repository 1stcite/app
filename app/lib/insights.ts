/**
 * Organizer insights for one conference.
 *
 * Live mode aggregates recorded events (views, comments, stars, attend,
 * library, followups). Sample mode generates stable, plausible numbers for
 * the conference's real talks and sessions so the dashboard can be shown
 * before an event has data. Sample numbers are deterministic (seeded by
 * talk id) and are always labeled as sample data in the UI.
 *
 * Counts only: no attendee names or contact details reach organizers.
 */

import { getDb } from "@/app/lib/db";

export type InsightsTalk = {
  id: string;
  title: string;
  author: string;
  sessionName: string;
  viewers: number; // distinct people who opened the deck
  outsideSession: number; // of those, people who weren't in the room (didn't mark attending)
  questions: number;
  followups: number;
  saves: number;
};

export type InsightsSession = {
  name: string;
  talks: number;
  viewers: number;
  questions: number;
  followups: number;
};

export type InsightsDay = { date: string; label: string; phase: "before" | "during" | "after"; activity: number };

export type Insights = {
  mode: "sample" | "live";
  conferenceName: string;
  conferenceDates: { start: string | null; end: string | null };
  totals: {
    talks: number;
    talksShared: number; // talks with a deck online
    people: number; // distinct people who opened at least one deck
    deckOpens: number;
    outsideSessionShare: number; // 0..1 of deck opens by people not in the room
    questions: number;
    followups: number;
    talksWithFollowups: number;
    saves: number;
    activityAfterShare: number; // 0..1 of activity after the last conference day
    daysActiveAfter: number; // days after the conference with any activity
  };
  days: InsightsDay[];
  topTalks: InsightsTalk[];
  sessions: InsightsSession[];
};

const DAY = 24 * 60 * 60 * 1000;

function seeded(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

function dayLabel(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

type PosterRow = { id: string; title: string; author: string; sessionId?: string; fileUrl?: string };
type SessionRow = { id: string; name: string; date?: string };

/** `withSlidesOnly`: live numbers skip program slots that have no slides yet;
 *  the sample dashboard uses the whole program. */
async function loadConference(sourceId: string, withSlidesOnly = false) {
  const db = await getDb();
  const [posters, sessions] = await Promise.all([
    db
      .collection("posters")
      .find(
        { source: sourceId, deletedAt: { $exists: false }, excludeFromStats: { $ne: true }, ...(withSlidesOnly ? { awaitingSlides: { $ne: true } } : {}) },
        { projection: { id: 1, title: 1, author: 1, sessionId: 1, fileUrl: 1 } }
      )
      .toArray(),
    db
      .collection("sessions")
      .find({ conferenceId: sourceId, deletedAt: { $exists: false } }, { projection: { id: 1, name: 1, date: 1 } })
      .toArray(),
  ]);
  const p = posters.map((x) => ({
    id: String(x.id),
    title: String(x.title ?? "Untitled"),
    author: String(x.author ?? ""),
    sessionId: x.sessionId ? String(x.sessionId) : undefined,
    fileUrl: x.fileUrl ? String(x.fileUrl) : undefined,
  })) as PosterRow[];
  const s = sessions.map((x) => ({ id: String(x.id), name: String(x.name ?? ""), date: x.date ? String(x.date) : undefined })) as SessionRow[];
  return { posters: p, sessions: s };
}

function conferenceWindow(sessions: SessionRow[]) {
  const dates = sessions.map((s) => s.date).filter((d): d is string => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  return { start: dates[0] ?? null, end: dates[dates.length - 1] ?? null };
}

/** Days from a week before the conference to 30 days after (or the last 45 days if no dates). */
function dayAxis(start: string | null, end: string | null) {
  const s = start ? new Date(`${start}T00:00:00Z`) : new Date(Date.now() - 37 * DAY);
  const e = end ? new Date(`${end}T00:00:00Z`) : new Date(s.getTime() + 1 * DAY);
  const from = new Date(s.getTime() - 7 * DAY);
  const to = new Date(e.getTime() + 30 * DAY);
  const days: { d: Date; phase: InsightsDay["phase"] }[] = [];
  for (let t = from.getTime(); t <= to.getTime(); t += DAY) {
    const d = new Date(t);
    const phase = t < s.getTime() ? "before" : t <= e.getTime() ? "during" : "after";
    days.push({ d, phase });
  }
  return days;
}

function finish(
  mode: Insights["mode"],
  conferenceName: string,
  window: { start: string | null; end: string | null },
  talks: InsightsTalk[],
  sessionsAll: SessionRow[],
  people: number,
  days: InsightsDay[]
): Insights {
  const sum = (f: (t: InsightsTalk) => number) => talks.reduce((a, t) => a + f(t), 0);
  const deckOpens = sum((t) => t.viewers);
  const outside = sum((t) => t.outsideSession);
  const totalActivity = days.reduce((a, d) => a + d.activity, 0);
  const afterActivity = days.filter((d) => d.phase === "after").reduce((a, d) => a + d.activity, 0);

  const bySession = new Map<string, InsightsSession>();
  for (const t of talks) {
    const key = t.sessionName || "Unscheduled";
    const cur = bySession.get(key) ?? { name: key, talks: 0, viewers: 0, questions: 0, followups: 0 };
    cur.talks += 1;
    cur.viewers += t.viewers;
    cur.questions += t.questions;
    cur.followups += t.followups;
    bySession.set(key, cur);
  }
  // keep sessions in program order where known
  const order = new Map(sessionsAll.map((s, i) => [s.name, i]));
  const sessions = [...bySession.values()].sort(
    (a, b) => (order.get(a.name) ?? 999) - (order.get(b.name) ?? 999) || b.viewers - a.viewers
  );

  return {
    mode,
    conferenceName,
    conferenceDates: window,
    totals: {
      talks: talks.length,
      talksShared: talks.length,
      people,
      deckOpens,
      outsideSessionShare: deckOpens ? outside / deckOpens : 0,
      questions: sum((t) => t.questions),
      followups: sum((t) => t.followups),
      talksWithFollowups: talks.filter((t) => t.followups > 0).length,
      saves: sum((t) => t.saves),
      activityAfterShare: totalActivity ? afterActivity / totalActivity : 0,
      daysActiveAfter: days.filter((d) => d.phase === "after" && d.activity > 0).length,
    },
    days,
    topTalks: [...talks].sort((a, b) => b.followups - a.followups || b.viewers - a.viewers).slice(0, 10),
    sessions,
  };
}

/** Plausible, stable numbers for the conference's real talks. */
export async function sampleInsights(sourceId: string, conferenceName: string): Promise<Insights> {
  const { posters, sessions } = await loadConference(sourceId);
  const sessionName = new Map(sessions.map((s) => [s.id, s.name]));
  const window = conferenceWindow(sessions);

  // Assume ~600 attendees; each talk reaches a skewed share of them
  const talks: InsightsTalk[] = posters.map((p) => {
    const r1 = seeded(p.id + ":v");
    const r2 = seeded(p.id + ":o");
    const r3 = seeded(p.id + ":q");
    const r4 = seeded(p.id + ":f");
    const r5 = seeded(p.id + ":s");
    const viewers = Math.round(35 + Math.pow(r1, 1.8) * 260);
    const outsideSession = Math.round(viewers * (0.45 + r2 * 0.3));
    const questions = Math.round(viewers * (0.01 + r3 * 0.05));
    const followups = Math.round(viewers * (0.01 + Math.pow(r4, 2) * 0.07));
    const saves = Math.round(viewers * (0.08 + r5 * 0.17));
    return {
      id: p.id,
      title: p.title,
      author: p.author,
      sessionName: (p.sessionId && sessionName.get(p.sessionId)) || "",
      viewers,
      outsideSession,
      questions,
      followups,
      saves,
    };
  });

  // Distinct people: fewer than deck opens (people open several decks)
  const deckOpens = talks.reduce((a, t) => a + t.viewers, 0);
  const people = Math.min(640, Math.round(deckOpens / 6.5));

  // Activity curve: trickle before, peak during, long decaying tail after
  const axis = dayAxis(window.start, window.end);
  const firstDuring = Math.max(0, axis.findIndex((x) => x.phase !== "before"));
  let afterIdx = 0;
  const days: InsightsDay[] = axis.map(({ d, phase }, i) => {
    const noise = 0.75 + seeded(sourceId + isoDay(d)) * 0.5;
    let base: number;
    if (phase === "before") base = 6 + (7 - (firstDuring - i)) * 5; // decks posted ahead; interest builds
    else if (phase === "during") base = 420;
    else {
      afterIdx += 1;
      base = 260 * Math.exp(-afterIdx / 6) + 8;
    }
    return { date: isoDay(d), label: dayLabel(d), phase, activity: Math.max(0, Math.round(base * noise)) };
  });

  return finish("sample", conferenceName, window, talks, sessions, people, days);
}

/** Real numbers from recorded events. */
export async function liveInsights(sourceId: string, conferenceName: string): Promise<Insights> {
  const db = await getDb();
  const { posters, sessions } = await loadConference(sourceId, true);
  const ids = posters.map((p) => p.id);
  const sessionName = new Map(sessions.map((s) => [s.id, s.name]));
  const window = conferenceWindow(sessions);

  const countBy = async (collection: string, extra: Record<string, unknown> = {}) => {
    const rows = await db
      .collection(collection)
      .aggregate([{ $match: { posterId: { $in: ids }, ...extra } }, { $group: { _id: "$posterId", n: { $sum: 1 } } }])
      .toArray();
    return new Map(rows.map((r) => [String(r._id), Number(r.n)]));
  };

  const [viewerRows, attendRows, questions, followups, saves, distinct] = await Promise.all([
    db
      .collection("views")
      .aggregate([
        { $match: { posterId: { $in: ids } } },
        { $group: { _id: { p: "$posterId", v: "$viewerKey" }, userId: { $first: "$userId" } } },
      ])
      .toArray(),
    db.collection("attend").find({ posterId: { $in: ids } }, { projection: { posterId: 1, userId: 1 } }).toArray(),
    countBy("comments", { visibilityType: { $ne: "note" }, parentId: { $exists: false } }),
    countBy("followups", { withdrawnAt: { $exists: false } }),
    countBy("library"),
    db
      .collection("views")
      .aggregate([{ $match: { posterId: { $in: ids } } }, { $group: { _id: "$viewerKey" } }, { $count: "n" }])
      .toArray(),
  ]);

  const attended = new Set(attendRows.map((a) => `${a.posterId}|${String(a.userId)}`));
  const viewers = new Map<string, number>();
  const outside = new Map<string, number>();
  for (const r of viewerRows) {
    const pid = String(r._id.p);
    viewers.set(pid, (viewers.get(pid) ?? 0) + 1);
    const inRoom = r.userId && attended.has(`${pid}|${String(r.userId)}`);
    if (!inRoom) outside.set(pid, (outside.get(pid) ?? 0) + 1);
  }

  const talks: InsightsTalk[] = posters.map((p) => ({
    id: p.id,
    title: p.title,
    author: p.author,
    sessionName: (p.sessionId && sessionName.get(p.sessionId)) || "",
    viewers: viewers.get(p.id) ?? 0,
    outsideSession: outside.get(p.id) ?? 0,
    questions: questions.get(p.id) ?? 0,
    followups: followups.get(p.id) ?? 0,
    saves: saves.get(p.id) ?? 0,
  }));

  // Daily activity = slide views + questions + follow-ups, by UTC day
  const perDay = new Map<string, number>();
  const add = (d: unknown, n = 1) => {
    if (!(d instanceof Date)) return;
    const k = isoDay(d);
    perDay.set(k, (perDay.get(k) ?? 0) + n);
  };
  const [viewDocs, commentDocs, followDocs] = await Promise.all([
    db.collection("views").find({ posterId: { $in: ids } }, { projection: { firstAt: 1, lastAt: 1 } }).toArray(),
    db.collection("comments").find({ posterId: { $in: ids } }, { projection: { timestamp: 1 } }).toArray(),
    db.collection("followups").find({ posterId: { $in: ids } }, { projection: { createdAt: 1 } }).toArray(),
  ]);
  for (const v of viewDocs) {
    add(v.firstAt);
    if (v.lastAt && v.firstAt && isoDay(v.lastAt) !== isoDay(v.firstAt)) add(v.lastAt);
  }
  for (const c of commentDocs) add(c.timestamp);
  for (const f of followDocs) add(f.createdAt);

  const days: InsightsDay[] = dayAxis(window.start, window.end).map(({ d, phase }) => ({
    date: isoDay(d),
    label: dayLabel(d),
    phase,
    activity: perDay.get(isoDay(d)) ?? 0,
  }));

  return finish("live", conferenceName, window, talks, sessions, Number(distinct[0]?.n ?? 0), days);
}
