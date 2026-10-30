/**
 * Organizer insights for the current conference (subdomain).
 * GET /api/admin/insights?mode=sample|live  (admin only)
 *
 * As of now, or of the admin demo clock (Before / During / After) when set.
 */

import { NextRequest, NextResponse } from "next/server";
import { getRequestConference, requireAdmin } from "@/app/lib/guards";
import { liveInsights, sampleInsights } from "@/app/lib/insights";

export const dynamic = "force-dynamic";

function asOfFrom(req: NextRequest): Date {
  const mode = req.cookies.get("px_demo_mode")?.value;
  const t = Number(req.cookies.get("px_as_of")?.value);
  if ((mode === "before" || mode === "during" || mode === "after") && Number.isFinite(t)) return new Date(t);
  return new Date();
}

export async function GET(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const conf = await getRequestConference();
  if (!conf) return NextResponse.json({ error: "Open this page on a conference site." }, { status: 404 });

  const asOf = asOfFrom(req);
  const mode = req.nextUrl.searchParams.get("mode") === "live" ? "live" : "sample";
  const data =
    mode === "live"
      ? await liveInsights(conf.sourceId, conf.name, asOf)
      : await sampleInsights(conf.sourceId, conf.name, asOf);
  return NextResponse.json(data);
}
