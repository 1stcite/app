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
  questions: number; // all questions and comments to the presenter
  privateNotes: number; // of those, private notes only the presenter sees
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
    program: { talks: number; posters: number; uploadedTalks: number; uploadedPosters: number };
    commentsPublic: number;
    commentsPrivate: number;
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

type PosterRow = {
  id: string;
  title: string;
  author: string;
  sessionId?: string;
  talkStart?: string;
  talkEnd?: string;
  isPoster: boolean;
  awaiting: boolean; // on the program, no slides yet
};
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
        { projection: { id: 1, title: 1, author: 1, sessionId: 1, talkStart: 1, talkEnd: 1, talkType: 1, awaitingSlides: 1 } }
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
    isPoster: x.talkType === "poster",
    awaiting: Boolean(x.awaitingSlides),
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

function programCounts(posters: PosterRow[], uploaded: (p: PosterRow) => boolean) {
  const talks = posters.filter((p) => !p.isPoster);
  const posterRows = posters.filter((p) => p.isPoster);
  return {
    talks: talks.length,
    posters: posterRows.length,
    uploadedTalks: talks.filter(uploaded).length,
    uploadedPosters: posterRows.filter(uploaded).length,
  };
}

function assemble(
  mode: Insights["mode"],
  conferenceName: string,
  clock: Clock,
  talks: InsightsTalk[],
  sessionsAll: SessionRow[],
  sessionOf: Map<string, string | undefined>,
  people: number,
  days: InsightsDay[],
  program: Insights["totals"]["program"]
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
      program,
      commentsPublic: sum(talks, (t) => t.questions - t.privateNotes),
      commentsPrivate: sum(talks, (t) => t.privateNotes),
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

/* ── Sample: a demo of the two moments that matter ──────────────────── */

/**
 * Relative daily engagement around a conference: builds over the two weeks
 * before, peaks on conference days, and tails off over the month after,
 * with the days right before and after still busy. Post-event engagement
 * outweighs pre-event. (The real day-of peak may be sharper; this keeps
 * the before and after visible.)
 */
function shape(dayFromStart: number, confDays: number): number {
  const k = dayFromStart;
  if (k < 0) {
    if (k === -1) return 0.45;
    if (k === -2) return 0.3;
    return 0.03 + 0.12 * ((14 + k) / 11); // -14 .. -3: slow build
  }
  if (k < confDays) return 1;
  const a = k - confDays + 1; // days after the last conference day
  if (a === 1) return 0.62;
  if (a === 2) return 0.48;
  if (a === 3) return 0.38;
  return 0.04 + 0.34 * Math.exp(-(a - 3) / 7);
}

export async function sampleInsights(
  sourceId: string,
  conferenceName: string,
  when: "before" | "after"
): Promise<Insights> {
  const { posters, sessions } = await loadConference(sourceId);
  const sessionById = new Map(sessions.map((s) => [s.id, s]));
  const base = clockFor(sessions, new Date());
  const startDay = base.startDay ? Date.parse(`${base.startDay}T00:00:00Z`) : Date.now();
  const endDay = base.endDay ? Date.parse(`${base.endDay}T00:00:00Z`) : startDay;
  const confDays = Math.max(1, Math.round((endDay - startDay) / DAY) + 1);
  // Before: the morning the conference opens. After: the end of the 30-day follow-up window.
  const asOf = when === "before" ? startDay : endDay + 31 * DAY;
  const clock: Clock = { ...base, asOf, phase: when };

  // Share of all engagement that happens before the conference opens
  const axis = dayAxis(clock);
  const weights = axis.map(({ t }) => shape(Math.round((t - startDay) / DAY), confDays));
  const total = weights.reduce((a, w) => a + w, 0);
  const preShare = axis.reduce((a, { t }, i) => a + (t < startDay ? weights[i] : 0), 0) / total;

  // Lifetime totals: ~600 attendees; each talk reaches a skewed share of them.
  // Before the conference, interest (stars, schedules) is mostly in place;
  // views, questions and contact requests mostly come later.
  const pre = { views: preShare, questions: preShare * 0.7, contacts: preShare * 0.3, saves: 0.4, stars: 0.8, scheduled: 0.85 };
  const f = (k: keyof typeof pre) => (when === "before" ? pre[k] : 1);
  // About 70% of presenters have uploaded by opening day, 85% a month later.
  // Talks without slides still collect stars and schedules from the program.
  const uploadedBy = (p: PosterRow, w: "before" | "after") => seeded(`${p.id}:up`) < (w === "before" ? 0.7 : 0.85);
  const uploaded = (p: PosterRow) => uploadedBy(p, when);
  const talks: InsightsTalk[] = posters.map((p) => {
    const r = (k: string) => seeded(`${p.id}:${k}`);
    const up = uploaded(p) ? 1 : 0;
    const viewers = Math.round(35 + Math.pow(r("v"), 1.8) * 260);
    const stars = Math.round(viewers * (0.15 + r("st") * 0.3));
    const times = talkTimes(p, sessionById, clock);
    const seen = Math.round(viewers * f("views") * up);
    const questions = Math.round(viewers * (0.01 + r("q") * 0.05) * f("questions") * up);
    return {
      id: p.id,
      title: p.title,
      author: p.author,
      sessionName: (p.sessionId && sessionById.get(p.sessionId)?.name) || "",
      startsAt: times.scheduled ? new Date(times.start).toISOString() : null,
      done: when === "after",
      viewers: seen,
      outsideSession: Math.round(seen * (0.45 + r("o") * 0.3)),
      questions,
      privateNotes: Math.round(questions * (0.3 + r("pn") * 0.25)),
      followups: Math.round(viewers * (0.01 + Math.pow(r("f"), 2) * 0.07) * f("contacts") * up),
      saves: Math.round(viewers * (0.08 + r("s") * 0.17) * f("saves") * up),
      stars: Math.round(stars * f("stars")),
      scheduled: Math.round(stars * (0.35 + r("sc") * 0.45) * f("scheduled")),
    };
  });

  const lifetimeOpens = posters
    .filter((p) => uploadedBy(p, "after"))
    .reduce((a, p) => a + Math.round(35 + Math.pow(seeded(`${p.id}:v`), 1.8) * 260), 0);
  const deckOpens = talks.reduce((a, t) => a + t.viewers, 0);
  const people = Math.min(640, Math.round(deckOpens / 6.5));

  // Daily activity (slide views, questions, contact requests), spread by the shape above
  const lifetimeActivity = lifetimeOpens * 5.3;
  const days: InsightsDay[] = axis.map(({ t, phase }, i) => {
    const future = t >= asOf;
    const noise = 0.88 + seeded(sourceId + isoDay(new Date(t))) * 0.24;
    const a = future ? 0 : (lifetimeActivity * weights[i] * noise) / total;
    return { date: isoDay(new Date(t)), label: dayLabel(new Date(t)), phase, activity: Math.round(a), future };
  });

  const sessionOf = new Map(posters.map((p) => [p.id, p.sessionId]));
  const result = assemble("sample", conferenceName, clock, talks, sessions, sessionOf, people, days, programCounts(posters, uploaded));
  return atConferenceScale(result, sourceId, posters.length, when);
}

/**
 * The demo program may hold only a handful of sessions. Headline numbers and
 * the day chart are shown at the size of a full conference (about 100 talks,
 * 50 posters, 1,000+ attendees); the talk and session tables keep the real
 * program's talks.
 */
function atConferenceScale(r: Insights, sourceId: string, n: number, when: "before" | "after"): Insights {
  const talks = 90 + Math.round(seeded(`${sourceId}:talks`) * 30);
  const posters = 40 + Math.round(seeded(`${sourceId}:posters`) * 25);
  const k = (talks + posters) / Math.max(1, n);
  const up = (count: number, share: number, salt: string) => Math.round(count * (share + (seeded(`${sourceId}:${salt}`) - 0.5) * 0.06));
  const t = r.totals;
  const scale = (x: number) => Math.round(x * k);
  const deckOpens = scale(t.deckOpens);
  return {
    ...r,
    totals: {
      ...t,
      program: {
        talks,
        posters,
        uploadedTalks: up(talks, when === "before" ? 0.72 : 0.86, "ut"),
        uploadedPosters: up(posters, when === "before" ? 0.6 : 0.78, "up"),
      },
      people: Math.min(1150, Math.round(deckOpens / 5.5)),
      deckOpens,
      questions: scale(t.questions),
      commentsPublic: scale(t.commentsPublic),
      commentsPrivate: scale(t.commentsPrivate),
      followups: scale(t.followups),
      talksWithFollowups: Math.min(talks + posters, scale(t.talksWithFollowups)),
      saves: scale(t.saves),
      stars: scale(t.stars),
      scheduled: scale(t.scheduled),
    },
    days: r.days.map((d) => ({ ...d, activity: scale(d.activity) })),
  };
}

/* ── Live: recorded events up to asOf ───────────────────────────────── */

export async function liveInsights(sourceId: string, conferenceName: string, asOfIn: Date): Promise<Insights> {
  const db = await getDb();
  const [{ posters, sessions }, whole] = await Promise.all([loadConference(sourceId, true), loadConference(sourceId)]);
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

  const [viewerRows, attendRows, questions, privateNotes, followups, saves, stars, distinct] = await Promise.all([
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
    countBy("comments", { visibilityType: "question", parentId: { $exists: false }, ...upTo("timestamp") }),
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
      privateNotes: privateNotes.get(p.id) ?? 0,
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
  return assemble("live", conferenceName, clock, talks, sessions, sessionOf, Number(distinct[0]?.n ?? 0), days, programCounts(whole.posters, (p) => !p.awaiting));
}
