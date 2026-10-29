/**
 * Client-upload token endpoint for Vercel Blob.
 *
 * The browser uploads the PDF straight to Blob storage (no 4.5 MB serverless
 * body limit). This route only decides whether to issue the upload token.
 * Allowed callers:
 *   - an admin session
 *   - a presenter holding this conference's presenter code (uploads open)
 *   - a presenter holding a valid manage-link token (replacing their deck)
 *   - a signed-in presenter replacing the deck of a talk they own (Edit page)
 */

import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getSessionUser } from "@/app/lib/auth";
import { canManagePoster, getRequestConference } from "@/app/lib/guards";
import { getDb } from "@/app/lib/db";
import { codesMatch, findPosterByManageToken, MAX_UPLOAD_BYTES } from "@/app/lib/presenter";

export const runtime = "nodejs";

async function isAuthorized(clientPayload: string | null): Promise<boolean> {
  const user = await getSessionUser().catch(() => null);
  if (user?.isAdmin) return true;

  let payload: { presenterCode?: string; manageToken?: string; posterId?: string } = {};
  try {
    payload = clientPayload ? JSON.parse(clientPayload) : {};
  } catch {
    return false;
  }

  if (payload.posterId && user) {
    const db = await getDb();
    const poster = await db.collection("posters").findOne({ id: String(payload.posterId) });
    return canManagePoster(user, poster);
  }

  if (payload.manageToken) {
    const poster = await findPosterByManageToken(String(payload.manageToken));
    return Boolean(poster);
  }

  if (payload.presenterCode) {
    const conf = await getRequestConference();
    if (!conf || conf.presenterUploadsOpen === false) return false;
    return codesMatch(String(payload.presenterCode), conf.presenterCode);
  }

  return false;
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as HandleUploadBody | null;
  if (!body) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        if (!(await isAuthorized(clientPayload))) {
          throw new Error("Not authorized to upload");
        }
        return {
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    const status = message.includes("Not authorized") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
