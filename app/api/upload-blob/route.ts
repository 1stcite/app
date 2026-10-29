import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireAdmin } from "@/app/lib/guards";

export const runtime = "nodejs";

// Server-side upload used by the organizer bulk-upload page (admin only).
// Presenters upload directly from the browser via /api/blob-token, which
// also avoids the 4.5 MB serverless request-body limit.
export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: "SERVER_MISSING_TOKEN", hasToken: false },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const blob = await put(`posters/${Date.now()}-${file.name}`, file, {
      access: "public",
      token,
    });

    return NextResponse.json({ url: blob.url });
  } catch (e: unknown) {
    console.error("Blob upload error:", e);
    return NextResponse.json(
      { error: "UPLOAD_FAILED", details: String((e as Error)?.message ?? e) },
      { status: 500 }
    );
  }
}
