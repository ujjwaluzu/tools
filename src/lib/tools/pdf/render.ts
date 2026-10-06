import type { PdfImageType, PdfPageProgress } from "@/lib/tools/pdf/types";
import { MAX_PDF_PAGES, MAX_RENDER_PAGE_PIXELS, MAX_RENDER_PAGES, MAX_RENDER_TOTAL_PIXELS } from "@/lib/tools/pdf/types";
import { PdfToolError, readPdfBytes, safeBaseName } from "@/lib/tools/pdf/validation";

type PdfJsModule = typeof import("pdfjs-dist");

async function loadPdfJs(): Promise<PdfJsModule> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  return pdfjs;
}

async function openPdfJsDocument(file: File) {
  const bytes = await readPdfBytes(file);
  const pdfjs = await loadPdfJs();
  const loadingTask = pdfjs.getDocument({
    data: bytes,
    enableXfa: false,
    stopAtErrors: true,
    useSystemFonts: true,
    maxImageSize: MAX_RENDER_PAGE_PIXELS,
    verbosity: 0,
  });
  const document = await loadingTask.promise;
  if (document.numPages < 1 || document.numPages > MAX_PDF_PAGES) {
    await loadingTask.destroy();
    throw new PdfToolError(`This PDF must contain between 1 and ${MAX_PDF_PAGES} pages for browser processing.`);
  }
  return { document, loadingTask };
}

export async function inspectPdfForRendering(file: File): Promise<number> {
  const { document, loadingTask } = await openPdfJsDocument(file);
  const pageCount = document.numPages;
  await loadingTask.destroy();
  return pageCount;
}

export async function renderPdfPages(
  file: File,
  selectedPages: number[],
  format: PdfImageType,
  quality: number,
  onProgress?: (progress: PdfPageProgress) => void,
): Promise<Array<{ name: string; blob: Blob }>> {
  if (!selectedPages.length) throw new PdfToolError("Select at least one page to convert.");
  if (selectedPages.length > MAX_RENDER_PAGES) {
    throw new PdfToolError(`Select ${MAX_RENDER_PAGES} pages or fewer at a time to protect browser memory.`);
  }
  const { document, loadingTask } = await openPdfJsDocument(file);
  const pages = [...new Set(selectedPages)].sort((a, b) => a - b);
  if (pages.some((page) => !Number.isInteger(page) || page < 1 || page > document.numPages)) {
    await loadingTask.destroy();
    throw new PdfToolError(`Choose page numbers from 1 to ${document.numPages}.`);
  }

  const base = safeBaseName(file.name);
  const mimeType = format === "png" ? "image/png" : "image/jpeg";
  const outputs: Array<{ name: string; blob: Blob }> = [];
  let renderedPixels = 0;
  try {
    for (const [index, pageNumber] of pages.entries()) {
      const page = await document.getPage(pageNumber);
      const originalViewport = page.getViewport({ scale: 1 });
      const pagePixels = originalViewport.width * originalViewport.height;
      const remainingPixels = MAX_RENDER_TOTAL_PIXELS - renderedPixels;
      const scale = Math.min(1.5, Math.sqrt(MAX_RENDER_PAGE_PIXELS / pagePixels), Math.sqrt(remainingPixels / pagePixels));
      if (!Number.isFinite(scale) || scale < 0.25) {
        throw new PdfToolError(`Page ${pageNumber} is too large to render with this selection. Convert fewer pages at a time.`);
      }
      const viewport = page.getViewport({ scale });
      const canvas = window.document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const context = canvas.getContext("2d", { alpha: format === "png" });
      if (!context) throw new PdfToolError("Your browser couldn’t create an image canvas for this page.");
      const outputPixels = canvas.width * canvas.height;
      if (format === "jpg") {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
      }

      await page.render({ canvas, canvasContext: context, viewport }).promise;
      const blob = await canvasToBlob(canvas, mimeType, format === "jpg" ? quality : undefined);
      canvas.width = 0;
      canvas.height = 0;
      page.cleanup();
      renderedPixels += outputPixels;
      outputs.push({ name: `${base}-page-${pageNumber}.${format}`, blob });
      onProgress?.({ completed: index + 1, total: pages.length, page: pageNumber });
    }
    return outputs;
  } finally {
    await loadingTask.destroy();
  }
}

export async function renderPdfThumbnails(file: File, pageCount: number, limit = 8): Promise<Blob[]> {
  const { document, loadingTask } = await openPdfJsDocument(file);
  const count = Math.min(pageCount, document.numPages, limit);
  const thumbnails: Blob[] = [];
  try {
    for (let number = 1; number <= count; number += 1) {
      const page = await document.getPage(number);
      const initialViewport = page.getViewport({ scale: 1 });
      const pagePixels = initialViewport.width * initialViewport.height;
      const scale = Math.min(0.24, 120 / initialViewport.width, Math.sqrt(180_000 / pagePixels));
      const viewport = page.getViewport({ scale });
      const canvas = window.document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) continue;
      await page.render({ canvas, canvasContext: context, viewport }).promise;
      thumbnails.push(await canvasToBlob(canvas, "image/jpeg", 0.7));
      canvas.width = 0;
      canvas.height = 0;
      page.cleanup();
    }
    return thumbnails;
  } finally {
    await loadingTask.destroy();
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new PdfToolError("Your browser couldn’t create the image file. Try a smaller PDF."));
    }, type, quality);
  });
}
