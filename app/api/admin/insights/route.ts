/**
 * Organizer insights for the current conference (subdomain).
 * GET /api/admin/insights?mode=sample|live  (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getRequestConference, requireAdmin } from "@/app/lib/guards";
import { liveInsights, sampleInsights } from "@/app/lib/insights";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const conf = await getRequestConference();
  if (!conf) return NextResponse.json({ error: "Open this page on a conference site." }, { status: 404 });

  const mode = req.nextUrl.searchParams.get("mode") === "live" ? "live" : "sample";
  const data =
    mode === "live" ? await liveInsights(conf.sourceId, conf.name) : await sampleInsights(conf.sourceId, conf.name);
  return NextResponse.json(data);
}
