/**
 * Client upload handler for Vercel Blob.
 *
 * This route handles the token exchange for client-side uploads.
 * The actual file bytes go directly from the browser to Vercel Blob,
 * bypassing the 4.5MB serverless function body limit.
 *
 * Uses @vercel/blob's handleUpload which:
 * 1. Receives a request from the client SDK
 * 2. Generates a signed upload token
 * 3. Returns it so the client can upload directly to blob storage
 */

import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "SERVER_MISSING_TOKEN" },
      { status: 500 }
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname) => {
        // Could add auth checks here
        return {
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: 50 * 1024 * 1024, // 50MB
          tokenPayload: JSON.stringify({}),
        };
      },
      onUploadCompleted: async ({ blob }) => {
        // Could store metadata here, but we do it separately via /api/posters
        console.log("Upload completed:", blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
