"use client";

import { upload } from "@vercel/blob/client";

export const MAX_PDF_MB = 40;

/**
 * Upload a PDF straight from the browser to Blob storage.
 * `auth` is checked by /api/blob-token before an upload token is issued.
 */
export async function uploadPdf(
  file: File,
  auth: { presenterCode?: string; manageToken?: string },
  onProgress?: (pct: number) => void
): Promise<string> {
  if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") {
    throw new Error("Please choose a PDF. In PowerPoint or Keynote, use File → Export → PDF.");
  }
  if (file.size > MAX_PDF_MB * 1024 * 1024) {
    throw new Error(`That file is ${(file.size / 1024 / 1024).toFixed(0)} MB. The limit is ${MAX_PDF_MB} MB; try exporting with reduced image quality.`);
  }
  const safeName = file.name.replace(/[^\w.\- ]+/g, "").replace(/\s+/g, "-") || "deck.pdf";
  const blob = await upload(`talks/${safeName}`, file, {
    access: "public",
    handleUploadUrl: "/api/blob-token",
    clientPayload: JSON.stringify(auth),
    contentType: "application/pdf",
    multipart: file.size > 8 * 1024 * 1024,
    onUploadProgress: (e) => onProgress?.(Math.round(e.percentage)),
  });
  return blob.url;
}
