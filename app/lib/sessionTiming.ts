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
  return new Date(year, month, day, hours, minutes, 0);
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
 * Strategy: "before" mode sets the clock to 1 hour before the earliest session;
 * "after" mode sets it to 1 hour after the latest session end.
 *
 * If the session list is empty or all sessions are missing dates, we fall
 * back to fixed offsets from real `now` so demos still work.
 */
export function computeDemoClockMoments(sessions: SessionLike[]): {
  before: Date;
  after: Date;
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
    };
  }

  const earliest = Math.min(...starts);
  const latest = Math.max(...ends);

  return {
    before: new Date(earliest - 60 * 60 * 1000), // 1 hour before first session
    after: new Date(latest + 60 * 60 * 1000), // 1 hour after last session
  };
}

/** Human label for a session timing state. */
export function timingLabel(timing: SessionTiming): string {
  return timing === "upcoming" ? "Upcoming" : "Past";
}
