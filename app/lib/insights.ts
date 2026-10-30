/**
 * Organizer insights for one conference, as of a point in time.
 *
 * The picture changes with the conference:
 *   before  deck views, early questions, and interest (stars, schedules,
 *           saves) that show which talks will draw a crowd
 *   during  completed talks show their bump in engagement; upcoming talks
 *           are ranked by interest
 *   after   the full post-event picture
 *
 * `asOf` is real time, or the admin demo clock (Before / During / After).
 *
 * Live mode counts recorded events up to `asOf`. Sample mode generates
 * stable, plausible activity for the conference's real talks and sessions,
 * spread over time around each talk's session, so every phase can be shown
 * before an event has data. Sample numbers are deterministic (seeded by
 * talk id) and always labeled as sample data in the UI.
 *
 * Counts only: no attendee names or contact details reach organizers.
 */

import { getDb } from "@/app/lib/db";

export type Phase = "before" | "during" | "after";

export type InsightsTalk = {
  id: string;
  title: string;
  author: string;
  sessionName: string;
  startsAt: string | null; // ISO, session (or talk) start
  done: boolean; // its session has ended as of asOf
  viewers: number; // distinct people who opened the deck
  outsideSession: number; // of those, people who weren't in the room (didn't mark attending)
  questions: number;
  followups: number; // contact requests
  saves: number;
  stars: number;
  scheduled: number; // people who added it to their schedule
};

export type InsightsSession = {
  name: string;
  startsAt: string | null;
  done: boolean;
  talks: number;
  viewers: number;
  questions: number;
  followups: number;
  stars: number;
  scheduled: number;
  saves: number;
};

export type InsightsDay = {
  date: string;
  label: string;
  phase: Phase;
  activity: number;
  future: boolean; // after asOf: nothing to show yet
};

export type Insights = {
  mode: "sample" | "live";
  phase: Phase;
  asOf: string;
  conferenceName: string;
  conferenceDates: { start: string | null; end: string | null };
  totals: {
    talks: number;
    talksDone: number;
    people: number; // distinct people who opened at least one deck
    deckOpens: number;
    outsideSessionShare: number; // 0..1 of deck opens by people not in the room
    questions: number;
    followups: number;
    talksWithFollowups: number;
    saves: number;
    stars: number;
    scheduled: number;
    activityAfterShare: number; // 0..1 of activity after the last conference day
  };
  days: InsightsDay[];
  /** Talks that have happened, by contact requests then reach. */
  topTalks: InsightsTalk[];
  /** Talks still to come, by interest (schedules, stars, saves). */
  upcomingTalks: InsightsTalk[];
  sessions: InsightsSession[];
};

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function seeded(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const dayLabel = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** Session date + time as a UTC wall-clock moment (same convention as the demo clock). */
function at(date?: string, time?: string): number | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const t = time && /^\d{1,2}:\d{2}$/.test(time) ? time.padStart(5, "0") : null;
  const ms = Date.parse(`${date}T${t ?? "00:00"}:00Z`);
  return Number.isNaN(ms) ? null : ms;
}

type PosterRow = { id: string; title: string; author: string; sessionId?: string; talkStart?: string; talkEnd?: string };
type SessionRow = { id: string; name: string; date?: string; startTime?: string; endTime?: string };

/** `withSlidesOnly`: live numbers skip program slots that have no slides yet;
 *  the sample dashboard uses the whole program. */
async function loadConference(sourceId: string, withSlidesOnly = false) {
  const db = await getDb();
  const [posters, sessions] = await Promise.all([
    db
      .collection("posters")
      .find(
        {
          source: sourceId,
          deletedAt: { $exists: false },
          excludeFromStats: { $ne: true },
          ...(withSlidesOnly ? { awaitingSlides: { $ne: true } } : {}),
        },
        { projection: { id: 1, title: 1, author: 1, sessionId: 1, talkStart: 1, talkEnd: 1 } }
      )
      .toArray(),
    db
      .collection("sessions")
      .find(
        { conferenceId: sourceId, deletedAt: { $exists: false } },
        { projection: { id: 1, name: 1, date: 1, startTime: 1, endTime: 1, sortOrder: 1 } }
      )
      .sort({ date: 1, startTime: 1, sortOrder: 1 })
      .toArray(),
  ]);
  const p: PosterRow[] = posters.map((x) => ({
    id: String(x.id),
    title: String(x.title ?? "Untitled"),
    author: String(x.author ?? ""),
    sessionId: x.sessionId ? String(x.sessionId) : undefined,
    talkStart: x.talkStart ? String(x.talkStart) : undefined,
    talkEnd: x.talkEnd ? String(x.talkEnd) : undefined,
  }));
  const s: SessionRow[] = sessions.map((x) => ({
    id: String(x.id),
    name: String(x.name ?? ""),
    date: x.date ? String(x.date) : undefined,
    startTime: x.startTime ? String(x.startTime) : undefined,
    endTime: x.endTime ? String(x.endTime) : undefined,
  }));
  return { posters: p, sessions: s };
}

type Clock = {
  asOf: number;
  start: number | null; // earliest session start
  end: number | null; // latest session end
  startDay: string | null;
  endDay: string | null;
  phase: Phase;
};

function clockFor(sessions: SessionRow[], asOf: Date): Clock {
  const starts = sessions.map((s) => at(s.date, s.startTime ?? "00:00")).filter((x): x is number => x !== null);
  const ends = sessions.map((s) => at(s.date, s.endTime ?? "23:59")).filter((x): x is number => x !== null);
  const start = starts.length ? Math.min(...starts) : null;
  const end = ends.length ? Math.max(...ends) : null;
  const t = asOf.getTime();
  const phase: Phase = start === null || end === null ? "after" : t < start ? "before" : t <= end ? "during" : "after";
  return {
    asOf: t,
    start,
    end,
    startDay: start !== null ? isoDay(new Date(start)) : null,
    endDay: end !== null ? isoDay(new Date(end)) : null,
    phase,
  };
}

/** When each talk happens: its own times if imported, else its session's; unscheduled talks sit mid-conference. */
function talkTimes(p: PosterRow, sessionById: Map<string, SessionRow>, clock: Clock) {
  const s = p.sessionId ? sessionById.get(p.sessionId) : undefined;
  const start = at(s?.date, p.talkStart ?? s?.startTime) ?? at(s?.date, "09:00");
  const end = at(s?.date, p.talkEnd ?? s?.endTime) ?? (start !== null ? start + HOUR : null);
  if (start !== null && end !== null) return { start, end, scheduled: true };
  const mid = clock.start !== null && clock.end !== null ? (clock.start + clock.end) / 2 : Date.now() - 7 * DAY;
  return { start: mid, end: mid + HOUR, scheduled: false };
}

/** Days from two weeks before the conference to 30 days after. */
function dayAxis(clock: Clock) {
  const s = clock.startDay ? Date.parse(`${clock.startDay}T00:00:00Z`) : clock.asOf - 37 * DAY;
  const e = clock.endDay ? Date.parse(`${clock.endDay}T00:00:00Z`) : s + DAY;
  const out: { t: number; phase: Phase }[] = [];
  for (let t = s - 14 * DAY; t <= e + 30 * DAY; t += DAY) {
    out.push({ t, phase: t < s ? "before" : t <= e ? "during" : "after" });
  }
  return out;
}

function assemble(
  mode: Insights["mode"],
  conferenceName: string,
  clock: Clock,
  talks: InsightsTalk[],
  sessionsAll: SessionRow[],
  sessionOf: Map<string, string | undefined>,
  people: number,
  days: InsightsDay[]
): Insights {
  const sum = (list: InsightsTalk[], f: (t: InsightsTalk) => number) => list.reduce((a, t) => a + f(t), 0);
  const deckOpens = sum(talks, (t) => t.viewers);
  const outside = sum(talks, (t) => t.outsideSession);
  const totalActivity = days.reduce((a, d) => a + d.activity, 0);
  const afterActivity = days.filter((d) => d.phase === "after").reduce((a, d) => a + d.activity, 0);

  // Sessions in program order, then unscheduled
  const byId = new Map(sessionsAll.map((s) => [s.id, s]));
  const rows = new Map<string, InsightsSession>();
  for (const t of talks) {
    const sid = sessionOf.get(t.id);
    const key = sid && byId.has(sid) ? sid : "_unscheduled";
    const s = byId.get(key);
    const cur =
      rows.get(key) ??
      ({
        name: s?.name || "Unscheduled",
        startsAt: t.startsAt,
        done: t.done,
        talks: 0,
        viewers: 0,
        questions: 0,
        followups: 0,
        stars: 0,
        scheduled: 0,
        saves: 0,
      } as InsightsSession);
    cur.talks += 1;
    cur.viewers += t.viewers;
    cur.questions += t.questions;
    cur.followups += t.followups;
    cur.stars += t.stars;
    cur.scheduled += t.scheduled;
    cur.saves += t.saves;
    cur.done = cur.done && t.done;
    rows.set(key, cur);
  }
  const order = new Map(sessionsAll.map((s, i) => [s.id, i]));
  const sessions = [...rows.entries()]
    .sort(([a], [b]) => (order.get(a) ?? 1e6) - (order.get(b) ?? 1e6))
    .map(([, v]) => v);

  const interest = (t: InsightsTalk) => t.scheduled * 2 + t.stars + t.saves;
  const done = talks.filter((t) => t.done);
  const upcoming = talks.filter((t) => !t.done);

  return {
    mode,
    phase: clock.phase,
    asOf: new Date(clock.asOf).toISOString(),
    conferenceName,
    conferenceDates: { start: clock.startDay, end: clock.endDay },
    totals: {
      talks: talks.length,
      talksDone: done.length,
      people,
      deckOpens,
      outsideSessionShare: deckOpens ? outside / deckOpens : 0,
      questions: sum(talks, (t) => t.questions),
      followups: sum(talks, (t) => t.followups),
      talksWithFollowups: talks.filter((t) => t.followups > 0).length,
      saves: sum(talks, (t) => t.saves),
      stars: sum(talks, (t) => t.stars),
      scheduled: sum(talks, (t) => t.scheduled),
      activityAfterShare: totalActivity ? afterActivity / totalActivity : 0,
    },
    days,
    topTalks: [...done].sort((a, b) => b.followups - a.followups || b.viewers - a.viewers).slice(0, 10),
    upcomingTalks: [...upcoming].sort((a, b) => interest(b) - interest(a) || b.viewers - a.viewers).slice(0, 10),
    sessions,
  };
}

/* ── Sample: lifetime totals per talk, released over time ───────────── */

const ramp = (t: number, a: number, b: number) => (b <= a ? (t >= b ? 1 : 0) : Math.min(1, Math.max(0, (t - a) / (b - a))));
const decay = (x: number, tau: number) => (x <= 0 ? 0 : 1 - Math.exp(-x / tau));

/** Share of a talk's lifetime activity of each kind that has happened by time t. */
function released(kind: "views" | "questions" | "contacts" | "saves" | "stars" | "scheduled", t: number, start: number, end: number, confStart: number) {
  const pre = (w: number, from = confStart - 14 * DAY) => w * ramp(t, from, start);
  const bump = (w: number) => w * ramp(t, start, end + 2 * HOUR); // in the room and right after
  const tail = (w: number, tauDays: number) => w * decay(t - end - 2 * HOUR, tauDays * DAY);
  switch (kind) {
    case "views":
      return pre(0.15) + bump(0.4) + tail(0.45, 7);
    case "questions":
      return pre(0.1) + bump(0.45) + tail(0.45, 5);
    case "contacts":
      return pre(0.05) + bump(0.4) + tail(0.55, 6);
    case "saves":
      return pre(0.35) + bump(0.3) + tail(0.35, 5);
    case "stars":
      return 0.75 * ramp(t, confStart - 21 * DAY, confStart) + 0.2 * ramp(t, confStart, start) + 0.05 * ramp(t, end, end + 3 * DAY);
    case "scheduled": // nobody schedules a talk after it's over
      return 0.8 * ramp(t, confStart - 21 * DAY, confStart) + 0.2 * ramp(t, confStart, start);
  }
}

export async function sampleInsights(sourceId: string, conferenceName: string, asOfIn: Date): Promise<Insights> {
  const { posters, sessions } = await loadConference(sourceId);
  const sessionById = new Map(sessions.map((s) => [s.id, s]));
  let clock = clockFor(sessions, asOfIn);
  // "After" shows the whole follow-up window, not the hour after the last session
  if (clock.phase === "after" && clock.end !== null) clock = { ...clock, asOf: Math.max(clock.asOf, clock.end + 30 * DAY) };
  const confStart = clock.start ?? clock.asOf - 7 * DAY;

  // Lifetime totals: ~600 attendees; each talk reaches a skewed share of them
  const life = posters.map((p) => {
    const r = (k: string) => seeded(`${p.id}:${k}`);
    const viewers = Math.round(35 + Math.pow(r("v"), 1.8) * 260);
    const stars = Math.round(viewers * (0.15 + r("st") * 0.3));
    return {
      p,
      times: talkTimes(p, sessionById, clock),
      viewers,
      outsideRatio: 0.45 + r("o") * 0.3,
      questions: Math.round(viewers * (0.01 + r("q") * 0.05)),
      contacts: Math.round(viewers * (0.01 + Math.pow(r("f"), 2) * 0.07)),
      saves: Math.round(viewers * (0.08 + r("s") * 0.17)),
      stars,
      scheduled: Math.round(stars * (0.35 + r("sc") * 0.45)),
    };
  });

  const asOf = clock.asOf;
  const talks: InsightsTalk[] = life.map((x) => {
    const { start, end } = x.times;
    const f = (k: Parameters<typeof released>[0]) => released(k, asOf, start, end, confStart);
    const viewers = Math.round(x.viewers * f("views"));
    return {
      id: x.p.id,
      title: x.p.title,
      author: x.p.author,
      sessionName: (x.p.sessionId && sessionById.get(x.p.sessionId)?.name) || "",
      startsAt: x.times.scheduled ? new Date(start).toISOString() : null,
      done: end <= asOf,
      viewers,
      outsideSession: Math.round(viewers * x.outsideRatio),
      questions: Math.round(x.questions * f("questions")),
      followups: Math.round(x.contacts * f("contacts")),
      saves: Math.round(x.saves * f("saves")),
      stars: Math.round(x.stars * f("stars")),
      scheduled: Math.round(x.scheduled * f("scheduled")),
    };
  });

  const deckOpens = talks.reduce((a, t) => a + t.viewers, 0);
  const people = Math.min(640, Math.round(deckOpens / 6.5));

  // Daily activity: slide views (about five per deck opened), questions and contact requests
  const activityBy = (t: number) =>
    life.reduce((a, x) => {
      const { start, end } = x.times;
      return (
        a +
        x.viewers * 5 * released("views", t, start, end, confStart) +
        x.questions * released("questions", t, start, end, confStart) +
        x.contacts * released("contacts", t, start, end, confStart)
      );
    }, 0);
  const days: InsightsDay[] = dayAxis(clock).map(({ t, phase }) => {
    const future = t > asOf;
    const noise = 0.85 + seeded(sourceId + isoDay(new Date(t))) * 0.3;
    const a = future ? 0 : Math.max(0, (activityBy(Math.min(t + DAY, asOf)) - activityBy(t)) * noise);
    return { date: isoDay(new Date(t)), label: dayLabel(new Date(t)), phase, activity: Math.round(a), future };
  });

  const sessionOf = new Map(posters.map((p) => [p.id, p.sessionId]));
  return assemble("sample", conferenceName, clock, talks, sessions, sessionOf, people, days);
}

/* ── Live: recorded events up to asOf ───────────────────────────────── */

export async function liveInsights(sourceId: string, conferenceName: string, asOfIn: Date): Promise<Insights> {
  const db = await getDb();
  const { posters, sessions } = await loadConference(sourceId, true);
  const ids = posters.map((p) => p.id);
  const sessionById = new Map(sessions.map((s) => [s.id, s]));
  const clock = clockFor(sessions, asOfIn);
  const asOf = new Date(clock.asOf);
  const upTo = (field: string) => ({ $or: [{ [field]: { $lte: asOf } }, { [field]: { $exists: false } }] });

  const countBy = async (collection: string, extra: Record<string, unknown> = {}) => {
    const rows = await db
      .collection(collection)
      .aggregate([{ $match: { posterId: { $in: ids }, ...extra } }, { $group: { _id: "$posterId", n: { $sum: 1 } } }])
      .toArray();
    return new Map(rows.map((r) => [String(r._id), Number(r.n)]));
  };

  const [viewerRows, attendRows, questions, followups, saves, stars, distinct] = await Promise.all([
    db
      .collection("views")
      .aggregate([
        { $match: { posterId: { $in: ids }, ...upTo("firstAt") } },
        { $group: { _id: { p: "$posterId", v: "$viewerKey" }, userId: { $first: "$userId" } } },
      ])
      .toArray(),
    db
      .collection("attend")
      .find({ posterId: { $in: ids }, ...upTo("createdAt") }, { projection: { posterId: 1, userId: 1 } })
      .toArray(),
    countBy("comments", { visibilityType: { $ne: "note" }, parentId: { $exists: false }, ...upTo("timestamp") }),
    countBy("followups", { withdrawnAt: { $exists: false }, ...upTo("createdAt") }),
    countBy("library", upTo("createdAt")),
    countBy("stars", upTo("createdAt")),
    db
      .collection("views")
      .aggregate([
        { $match: { posterId: { $in: ids }, ...upTo("firstAt") } },
        { $group: { _id: "$viewerKey" } },
        { $count: "n" },
      ])
      .toArray(),
  ]);

  const attended = new Set(attendRows.map((a) => `${a.posterId}|${String(a.userId)}`));
  const scheduled = new Map<string, number>();
  for (const a of attendRows) scheduled.set(String(a.posterId), (scheduled.get(String(a.posterId)) ?? 0) + 1);
  const viewers = new Map<string, number>();
  const outside = new Map<string, number>();
  for (const r of viewerRows) {
    const pid = String(r._id.p);
    viewers.set(pid, (viewers.get(pid) ?? 0) + 1);
    const inRoom = r.userId && attended.has(`${pid}|${String(r.userId)}`);
    if (!inRoom) outside.set(pid, (outside.get(pid) ?? 0) + 1);
  }

  const talks: InsightsTalk[] = posters.map((p) => {
    const times = talkTimes(p, sessionById, clock);
    return {
      id: p.id,
      title: p.title,
      author: p.author,
      sessionName: (p.sessionId && sessionById.get(p.sessionId)?.name) || "",
      startsAt: times.scheduled ? new Date(times.start).toISOString() : null,
      done: times.scheduled ? times.end <= clock.asOf : clock.phase === "after",
      viewers: viewers.get(p.id) ?? 0,
      outsideSession: outside.get(p.id) ?? 0,
      questions: questions.get(p.id) ?? 0,
      followups: followups.get(p.id) ?? 0,
      saves: saves.get(p.id) ?? 0,
      stars: stars.get(p.id) ?? 0,
      scheduled: scheduled.get(p.id) ?? 0,
    };
  });

  // Daily activity = slide views + questions + contact requests, by UTC day, up to asOf
  const perDay = new Map<string, number>();
  const add = (d: unknown, n = 1) => {
    if (!(d instanceof Date) || d.getTime() > clock.asOf) return;
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

  const days: InsightsDay[] = dayAxis(clock).map(({ t, phase }) => ({
    date: isoDay(new Date(t)),
    label: dayLabel(new Date(t)),
    phase,
    activity: perDay.get(isoDay(new Date(t))) ?? 0,
    future: t > clock.asOf,
  }));

  const sessionOf = new Map(posters.map((p) => [p.id, p.sessionId]));
  return assemble("live", conferenceName, clock, talks, sessions, sessionOf, Number(distinct[0]?.n ?? 0), days);
}
