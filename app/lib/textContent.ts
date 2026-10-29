import { getDb } from "@/app/lib/db";
import { extractPdfText } from "@/app/lib/extractPdfText";

/**
 * Search text for a talk = summary + slide notes + text extracted from the PDF.
 * PDF text is kept separately in `pdfText` so editing the summary never
 * throws it away.
 */
export async function rebuildTextContent(posterId: string) {
  const db = await getDb();
  const p = await db.collection("posters").findOne({ id: posterId });
  if (!p) return;
  const notes = Object.values((p.notes ?? {}) as Record<string, string>).join(" ");
  const text = [p.abstract, notes, p.pdfText].filter(Boolean).join("\n").trim();
  await db
    .collection("posters")
    .updateOne({ id: posterId }, text ? { $set: { textContent: text, textIndexedAt: new Date() } } : { $unset: { textContent: "" } });
}

/** Extract text from the talk's PDF in the background, then rebuild search text. */
export function reindexPdfInBackground(posterId: string, fileUrl: string) {
  extractPdfText(fileUrl)
    .then(async (pdfText) => {
      const db = await getDb();
      await db.collection("posters").updateOne({ id: posterId }, { $set: { pdfText: pdfText || "" } });
      await rebuildTextContent(posterId);
    })
    .catch((e) => console.error("PDF text extraction failed for", posterId, e));
}
