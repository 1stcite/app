/**
 * Program import — turn an organizer's schedule (CSV, or pasted from a
 * spreadsheet) into sessions and talk slots with no slides yet. Presenters
 * then find their talk on the program and add slides to it.
 *
 * One row per talk. Columns (header names are flexible, case-insensitive):
 *   session    session or track name             (blank → unscheduled talk)
 *   date       2027-04-14, 4/14/2027, April 14 2027
 *   start, end 9:00, 9:00 AM, 14:30
 *   room       location
 *   title      talk title                         (required)
 *   speaker    presenter name(s)
 *   organization / company / affiliation
 *   email      presenter email (never shown publicly)
 *   type       talk | poster
 */

import { getDb } from "@/app/lib/db";

export type ProgramRow = {
  session: string;
  date: string; // YYYY-MM-DD or ""
  start: string; // HH:MM or ""
  end: string;
  room: string;
  title: string;
  speaker: string;
  organization: string;
  email: string;
  type: string;
};

const ALIASES: Record<keyof ProgramRow, string[]> = {
  session: ["session", "session name", "track", "session title", "block"],
  date: ["date", "day"],
  start: ["start", "start time", "time", "begins", "from"],
  end: ["end", "end time", "ends", "to"],
  room: ["room", "location", "venue", "place"],
  title: ["title", "talk", "talk title", "presentation", "presentation title", "poster title"],
  speaker: ["speaker", "speakers", "presenter", "presenters", "name", "author", "authors"],
  organization: ["organization", "organisation", "company", "affiliation", "institution", "org"],
  email: ["email", "e-mail", "speaker email", "presenter email"],
  type: ["type", "format", "kind"],
};

/** Parse CSV or tab-separated text (as pasted from Excel or Google Sheets). */
export function parseTable(text: string): string[][] {
  const src = text.replace(/\r\n?/g, "\n").replace(/^﻿/, "");
  const firstLine = src.split("\n", 1)[0] ?? "";
  const delim = (firstLine.match(/\t/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === delim) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some((c) => c));
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const pad = (n: number) => String(n).padStart(2, "0");

export function normDate(v: string, fallbackYear?: number): string {
  const s = v.trim();
  if (!s) return "";
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (m) {
    const y = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : fallbackYear;
    return y ? `${y}-${pad(+m[1])}-${pad(+m[2])}` : "";
  }
  // "April 14, 2027", "Wed, Apr 14 2027", "14 April 2027"
  const lower = s.toLowerCase();
  const mi = MONTHS.findIndex((mo) => new RegExp(`\\b${mo}`).test(lower));
  if (mi >= 0) {
    const nums = (lower.match(/\d+/g) ?? []).map(Number);
    const year = nums.find((n) => n > 1900) ?? fallbackYear;
    const day = nums.find((n) => n >= 1 && n <= 31);
    if (year && day) return `${year}-${pad(mi + 1)}-${pad(day)}`;
  }
  return "";
}

export function normTime(v: string): string {
  const m = v.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/);
  if (!m) return "";
  let h = +m[1];
  const min = m[2] ? +m[2] : 0;
  const ap = m[3]?.[0];
  if (ap === "p" && h < 12) h += 12;
  if (ap === "a" && h === 12) h = 0;
  if (h > 23 || min > 59) return "";
  return `${pad(h)}:${pad(min)}`;
}

export function rowsFromTable(table: string[][], fallbackYear?: number): { rows: ProgramRow[]; missing: string[] } {
  if (table.length < 2) return { rows: [], missing: ["title"] };
  const header = table[0].map((h) => h.toLowerCase().replace(/[^a-z -]/g, "").trim());
  const col = {} as Record<keyof ProgramRow, number>;
  for (const key of Object.keys(ALIASES) as (keyof ProgramRow)[]) {
    col[key] = header.findIndex((h) => ALIASES[key].includes(h));
  }
  // A single "time" column like "9:00-9:20 AM" fills start and end
  const missing = col.title < 0 ? ["title"] : [];
  const get = (r: string[], k: keyof ProgramRow) => (col[k] >= 0 ? (r[col[k]] ?? "").trim() : "");

  const rows: ProgramRow[] = [];
  for (const r of table.slice(1)) {
    const title = get(r, "title");
    if (!title) continue;
    let start = get(r, "start");
    let end = get(r, "end");
    const range = start.match(/^(.+?)\s*[-–]\s*(.+)$/);
    if (range && !end) {
      const suffix = range[2].match(/[ap]\.?m\.?/i)?.[0] ?? "";
      start = /[ap]\.?m/i.test(range[1]) ? range[1] : `${range[1]} ${suffix}`;
      end = range[2];
    }
    rows.push({
      session: get(r, "session"),
      date: normDate(get(r, "date"), fallbackYear),
      start: normTime(start),
      end: normTime(end),
      room: get(r, "room"),
      title: title.slice(0, 300),
      speaker: get(r, "speaker").slice(0, 200),
      organization: get(r, "organization").slice(0, 160),
      email: get(r, "email").toLowerCase().slice(0, 200),
      type: /poster/i.test(get(r, "type")) ? "poster" : "talk",
    });
  }
  return { rows, missing };
}

/**
 * Create sessions and talk slots. Re-importing the same program is safe:
 * sessions match on name + date + start, talks on title within a session,
 * and talks that already have slides are never touched.
 */
export async function importProgram(sourceId: string, rows: ProgramRow[]) {
  const db = await getDb();
  const now = new Date();
  let sessionsCreated = 0;
  let talksCreated = 0;
  let talksUpdated = 0;

  const sessionIdFor = new Map<string, string>();
  const existingSessions = await db
    .collection("sessions")
    .find({ conferenceId: sourceId, deletedAt: { $exists: false } })
    .toArray();
  const key = (name: string, date: string, start: string) => `${name.toLowerCase()}|${date}|${start}`;
  for (const s of existingSessions) sessionIdFor.set(key(String(s.name), String(s.date ?? ""), String(s.startTime ?? "")), String(s.id));

  // Sessions span their talks: earliest start to latest end
  const spans = new Map<string, { name: string; date: string; start: string; end: string; room: string; order: number }>();
  rows.forEach((r, i) => {
    if (!r.session) return;
    const k = `${r.session.toLowerCase()}|${r.date}`;
    const cur = spans.get(k);
    const last = r.end || r.start; // a talk with no end time still extends the session to its start
    if (!cur) spans.set(k, { name: r.session, date: r.date, start: r.start, end: last, room: r.room, order: i });
    else {
      if (r.start && (!cur.start || r.start < cur.start)) cur.start = r.start;
      if (last && (!cur.end || last > cur.end)) cur.end = last;
      if (!cur.room && r.room) cur.room = r.room;
    }
  });

  const spanSession = new Map<string, string>();
  let n = 0;
  for (const [k, sp] of spans) {
    const existing = sessionIdFor.get(key(sp.name, sp.date, sp.start));
    if (existing) {
      spanSession.set(k, existing);
      continue;
    }
    const id = `sess_${Date.now()}_${n++}`;
    await db.collection("sessions").insertOne({
      id,
      conferenceId: sourceId,
      name: sp.name,
      date: sp.date,
      startTime: sp.start,
      endTime: sp.end,
      location: sp.room,
      sortOrder: sp.order,
      createdAt: now,
      importedAt: now,
    });
    sessionIdFor.set(key(sp.name, sp.date, sp.start), id);
    spanSession.set(k, id);
    sessionsCreated++;
  }

  let order = 0;
  for (const r of rows) {
    const sessionId = r.session ? spanSession.get(`${r.session.toLowerCase()}|${r.date}`) : undefined;
    const author = r.organization ? `${r.speaker}, ${r.organization}` : r.speaker;
    const fields = {
      title: r.title,
      author,
      presenterName: r.speaker || undefined,
      presenterOrg: r.organization || undefined,
      ...(r.email ? { scheduledEmail: r.email } : {}),
      talkType: r.type,
      ...(sessionId ? { sessionId } : {}),
      ...(r.start ? { talkStart: r.start } : {}),
      ...(r.end ? { talkEnd: r.end } : {}),
      sortOrder: order++,
    };
    const match = await db.collection("posters").findOne({
      source: sourceId,
      title: r.title,
      ...(sessionId ? { sessionId } : { sessionId: { $exists: false } }),
    });
    if (match) {
      if (match.awaitingSlides) {
        await db.collection("posters").updateOne({ _id: match._id }, { $set: { ...fields, updatedAt: now } });
        talksUpdated++;
      }
      continue;
    }
    await db.collection("posters").insertOne({
      id: `${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}${order}`,
      ...fields,
      source: sourceId,
      awaitingSlides: true,
      uploadedAt: now,
      importedAt: now,
    });
    talksCreated++;
  }

  return { sessionsCreated, talksCreated, talksUpdated };
}
