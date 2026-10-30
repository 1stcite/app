/**
 * Import a conference program (organizers only).
 *
 * POST { sourceId, text, dryRun? }
 *   text: CSV, or rows pasted from a spreadsheet, one talk per row
 * → dryRun: { rows, preview, missing }   (nothing written)
 * → else:   { sessionsCreated, talksCreated, talksUpdated }
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";
import { requireAdmin } from "@/app/lib/guards";
import { importProgram, parseTable, rowsFromTable } from "@/app/lib/program";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const sourceId = String(body.sourceId ?? "").trim();
  const text = String(body.text ?? "");
  if (!sourceId) return NextResponse.json({ error: "Pick a conference first." }, { status: 400 });
  if (text.length > 2_000_000) return NextResponse.json({ error: "That file is too large." }, { status: 400 });

  // Dates without a year ("4/14") take the conference's year
  const db = await getDb();
  const conf = await db.collection("conferences").findOne({ sourceId, active: true });
  const year = conf?.endDate ? Number(String(conf.endDate).slice(0, 4)) : new Date().getFullYear();

  const { rows, missing } = rowsFromTable(parseTable(text), year);
  if (missing.length) {
    return NextResponse.json(
      { error: "The first row needs column names, including one called Title." },
      { status: 400 }
    );
  }
  if (rows.length === 0) return NextResponse.json({ error: "No talks found." }, { status: 400 });

  if (body.dryRun) {
    const sessions = new Set(rows.filter((r) => r.session).map((r) => `${r.session}|${r.date}`));
    return NextResponse.json({
      rows: rows.length,
      sessions: sessions.size,
      undated: rows.filter((r) => r.session && !r.date).length,
      preview: rows.slice(0, 8),
    });
  }

  const result = await importProgram(sourceId, rows);
  return NextResponse.json(result);
}
