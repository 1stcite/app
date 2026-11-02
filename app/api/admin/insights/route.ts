/**
 * Organizer insights for the current conference (subdomain). Admin only.
 *
 * Demo conferences (the default) show sample data:
 *   GET /api/admin/insights?when=before|during|after
 * Real conferences (demoInsights off) show live data as of now.
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

  if (conf.demoInsights === false) {
    return NextResponse.json(await liveInsights(conf.sourceId, conf.name, new Date()));
  }
  const w = req.nextUrl.searchParams.get("when");
  const when = w === "before" || w === "during" ? w : "after";
  return NextResponse.json(await sampleInsights(conf.sourceId, conf.name, when));
}
