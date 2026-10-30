import { Suspense } from "react";
import { getRequestConference, defaultLiveUntil } from "@/app/lib/guards";
import { getDb } from "@/app/lib/db";
import PresentClient, { type Slot } from "./PresentClient";

export const dynamic = "force-dynamic";

export const metadata = { title: "Share your talk · 1stCite" };

const fmtDay = (d: string) => {
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
};
const fmtTime = (t: string) => {
  const m = t.match(/^(\d{2}):(\d{2})$/);
  if (!m) return "";
  const h = +m[1];
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
};

/** Talks on the program that don't have slides yet. */
async function openSlots(sourceId: string): Promise<Slot[]> {
  const db = await getDb();
  const talks = await db
    .collection("posters")
    .find(
      { source: sourceId, awaitingSlides: true, deletedAt: { $exists: false } },
      { projection: { id: 1, title: 1, presenterName: 1, presenterOrg: 1, sessionId: 1, talkStart: 1, sortOrder: 1 } }
    )
    .sort({ sortOrder: 1 })
    .limit(2000)
    .toArray();
  const sessionIds = [...new Set(talks.map((t) => t.sessionId).filter(Boolean))];
  const sessions = sessionIds.length
    ? await db.collection("sessions").find({ id: { $in: sessionIds } }).toArray()
    : [];
  const byId = new Map(sessions.map((s) => [String(s.id), s]));
  return talks.map((t) => {
    const s = t.sessionId ? byId.get(String(t.sessionId)) : undefined;
    const when = [s?.date ? fmtDay(String(s.date)) : "", fmtTime(String(t.talkStart ?? s?.startTime ?? ""))]
      .filter(Boolean)
      .join(", ");
    return {
      id: String(t.id),
      title: String(t.title ?? ""),
      speaker: String(t.presenterName ?? ""),
      organization: String(t.presenterOrg ?? ""),
      session: s ? String(s.name ?? "") : "",
      when,
    };
  });
}

export default async function PresentPage() {
  const conf = await getRequestConference().catch(() => null);
  // Open by default for any conference; organizers can close it or add a code.
  const open = Boolean(conf) && conf?.presenterUploadsOpen !== false;
  const liveUntil = defaultLiveUntil(conf);
  const slots = open && conf ? await openSlots(conf.sourceId).catch(() => []) : [];

  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <PresentClient
        conferenceName={conf?.name ?? "1stCite"}
        logo={conf?.logo ?? "/1stcite-logo.png"}
        open={open}
        codeRequired={Boolean(conf?.presenterCode)}
        slots={slots}
        liveUntilLabel={
          liveUntil
            ? liveUntil.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
            : null
        }
      />
    </Suspense>
  );
}
