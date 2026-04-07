import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";

export type ConferenceConfig = {
  subdomain: string;
  name: string;
  logo: string;
  sessionLabel?: string;
  sourceId: string;
  isRepo: boolean;
  active: boolean;
};

// Default fallback config when no subdomain matches
const DEFAULT_CONFIG: ConferenceConfig = {
  subdomain: "",
  name: "1stCite",
  logo: "/1stcite-logo.png",
  sourceId: "1stcite",
  isRepo: false,
  active: true,
};

export async function GET(req: NextRequest) {
  const subdomain = req.nextUrl.searchParams.get("subdomain") ?? "";

  try {
    const db = await getDb();

    // Special case: presentrxiv is always the repo
    if (subdomain === "presentrxiv" || subdomain === "www") {
      return NextResponse.json({
        subdomain,
        name: "PresentrXiv",
        logo: "/presentrxiv-logo.png",
        sourceId: "",
        isRepo: true,
        active: true,
      } as ConferenceConfig);
    }

    if (subdomain) {
      const conf = await db.collection("conferences").findOne({ subdomain, active: true });
      if (conf) {
        return NextResponse.json(conf as unknown as ConferenceConfig);
      }
    }

    return NextResponse.json(DEFAULT_CONFIG);
  } catch {
    return NextResponse.json(DEFAULT_CONFIG);
  }
}

// Admin: create or update a conference
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { subdomain, name, logo, sessionLabel, sourceId, isRepo } = body;

  if (!subdomain || !name || !sourceId) {
    return NextResponse.json({ error: "subdomain, name, sourceId required" }, { status: 400 });
  }

  const db = await getDb();
  await db.collection("conferences").updateOne(
    { subdomain },
    {
      $set: {
        subdomain,
        name,
        logo: logo || "/1stcite-logo.png",
        sessionLabel: sessionLabel || "",
        sourceId,
        isRepo: isRepo ?? false,
        active: true,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  return NextResponse.json({ ok: true });
}
