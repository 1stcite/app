/**
 * Session timing — determines whether a session is upcoming or past
 * given the current time. Handles missing/partial session data gracefully.
 *
 * We deliberately do not distinguish an "in_progress" state because the
 * demo modes are before/after only — and for the UX, a live session
 * behaves like an upcoming one (button still says "Schedule").
 */

export type SessionTiming = "upcoming" | "past";

export type SessionLike = {
  date?: string; // "YYYY-MM-DD"
  startTime?: string; // "HH:MM"
  endTime?: string; // "HH:MM"
};

/**
 * Parse a session's date + time into a Date.
 * Returns null if the date is missing or invalid.
 *
 * Uses UTC interpretation so that this function returns the same
 * timestamp whether called on the server (Vercel, UTC) or the client
 * (user's local timezone). The session's "date" field is treated as
 * a wall-clock anchor that's the same for everyone — what matters
 * for demo modes is that the relative ordering of before/during/after
 * timestamps brackets the sessions correctly, and UTC achieves that
 * consistently across server and client.
 */
function parseSessionDate(dateStr: string, timeStr?: string): Date | null {
  if (!dateStr) return null;
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  let hours = 23;
  let minutes = 59;
  if (timeStr && /^\d{1,2}:\d{2}$/.test(timeStr)) {
    const [h, mn] = timeStr.split(":").map(Number);
    hours = h;
    minutes = mn;
  }
  return new Date(Date.UTC(year, month, day, hours, minutes, 0));
}

/**
 * Determine whether a session is upcoming or past relative to `now`.
 *
 * Rules:
 *   - No session data → upcoming (conservative default; never hide a talk)
 *   - Session has end time → uses exact end moment
 *   - Session has date but no end time → end-of-day is the cutoff
 *   - Session has no date → upcoming
 */
export function sessionTimingAt(session: SessionLike | null | undefined, now: Date): SessionTiming {
  if (!session || !session.date) return "upcoming";
  const endMoment = parseSessionDate(session.date, session.endTime);
  if (!endMoment) return "upcoming";
  return now.getTime() >= endMoment.getTime() ? "past" : "upcoming";
}

/**
 * Compute demo-mode clock timestamps relative to a list of real sessions.
 *
 *   - before: 1 hour before the earliest session starts
 *   - after:  1 hour after the latest session ends
 *   - during: midpoint between two consecutive same-day sessions — the
 *             first gap found that has a real (>0) duration. If no such
 *             gap exists, during is null and the caller should hide
 *             the mode in the UI.
 *
 * If the session list is empty or all sessions are missing dates, we
 * fall back to fixed offsets from real `now` so demos still work.
 */
export function computeDemoClockMoments(sessions: SessionLike[]): {
  before: Date;
  after: Date;
  during: Date | null;
} {
  const starts: number[] = [];
  const ends: number[] = [];

  for (const s of sessions) {
    if (!s.date) continue;
    const start = parseSessionDate(s.date, s.startTime || "00:00");
    const end = parseSessionDate(s.date, s.endTime || "23:59");
    if (start) starts.push(start.getTime());
    if (end) ends.push(end.getTime());
  }

  if (starts.length === 0 || ends.length === 0) {
    const real = Date.now();
    return {
      before: new Date(real - 24 * 60 * 60 * 1000),
      after: new Date(real + 24 * 60 * 60 * 1000),
      during: null,
    };
  }

  const earliest = Math.min(...starts);
  const latest = Math.max(...ends);

  // For "during", find the first pair of consecutive sessions on the
  // same calendar day with a real gap between them.
  const sorted = sessions
    .map(s => ({
      start: s.date ? parseSessionDate(s.date, s.startTime || "00:00") : null,
      end: s.date ? parseSessionDate(s.date, s.endTime || "23:59") : null,
      date: s.date || "",
    }))
    .filter(x => x.start && x.end && x.date)
    .sort((a, b) => (a.start!.getTime() - b.start!.getTime()));

  let during: Date | null = null;
  for (let i = 0; i + 1 < sorted.length; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (a.date !== b.date) continue; // must be same day
    const gapMs = b.start!.getTime() - a.end!.getTime();
    if (gapMs > 0) {
      during = new Date(a.end!.getTime() + Math.floor(gapMs / 2));
      break;
    }
  }

  return {
    before: new Date(earliest - 60 * 60 * 1000),
    after: new Date(latest + 60 * 60 * 1000),
    during,
  };
}

/** Human label for a session timing state. */
export function timingLabel(timing: SessionTiming): string {
  return timing === "upcoming" ? "Upcoming" : "Past";
}
