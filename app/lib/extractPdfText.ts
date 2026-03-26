/**
 * Extract plain text from a PDF given its public URL.
 * Uses pdfjs-dist legacy build, which works in Node.js (no DOM required).
 * Returns null on any failure so callers can degrade gracefully.
 */
export async function extractPdfText(fileUrl: string): Promise<string | null> {
  try {
    // Dynamic import so this module is never bundled into Edge runtime code
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs" as string);

    // Disable the worker — not needed for server-side text extraction
    pdfjsLib.GlobalWorkerOptions.workerSrc = "";

    const response = await fetch(fileUrl);
    if (!response.ok) return null;

    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdf = await loadingTask.promise;

    const pageTexts: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => ("str" in item ? item.str : ""))
        .join(" ");
      pageTexts.push(pageText);
    }

    await pdf.destroy();

    return pageTexts.join("\n").trim() || null;
  } catch (err) {
    console.error("extractPdfText failed:", err);
    return null;
  }
}
