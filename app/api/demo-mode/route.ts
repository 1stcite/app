import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/auth";
import { getDb } from "@/app/lib/db";
import { computeDemoClockMoments } from "@/app/lib/sessionTiming";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const mode = body?.mode;
  if (mode !== "live" && mode !== "before" && mode !== "after") {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  // For before/after, compute the as_of timestamp from the current conference's sessions
  let asOf: Date | null = null;
  if (mode !== "live") {
    const subdomain = req.headers.get("x-subdomain") || "";
    const db = await getDb();
    const conf = await db.collection("conferences").findOne({ subdomain, active: true });
    const sourceId = conf?.sourceId ?? subdomain;
    const sessions = await db
      .collection("sessions")
      .find({ conferenceId: sourceId, deletedAt: { $exists: false } })
      .toArray();
    const moments = computeDemoClockMoments(
      sessions.map(s => ({ date: s.date, startTime: s.startTime, endTime: s.endTime }))
    );
    asOf = mode === "before" ? moments.before : moments.after;
  }

  const res = NextResponse.json({
    ok: true,
    mode,
    asOf: asOf ? asOf.toISOString() : null,
  });

  const isProd = process.env.NODE_ENV === "production";
  const common = {
    sameSite: "lax" as const,
    secure: isProd,
    path: "/",
    httpOnly: false, // readable by client so useDemoClock() works
    maxAge: 60 * 60 * 24 * 7,
  };

  if (mode === "live") {
    res.cookies.set({ name: "px_demo_mode", value: "", ...common, maxAge: 0 });
    res.cookies.set({ name: "px_as_of", value: "", ...common, maxAge: 0 });
  } else {
    res.cookies.set({ name: "px_demo_mode", value: mode, ...common });
    res.cookies.set({ name: "px_as_of", value: String(asOf!.getTime()), ...common });
  }

  return res;
}
