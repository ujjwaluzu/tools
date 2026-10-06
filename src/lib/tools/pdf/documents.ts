import type { PDFDocument } from "pdf-lib";
import { MAX_EXTRACT_PAGES, MAX_PDF_FILES } from "@/lib/tools/pdf/types";
import { assertPageCount, PdfToolError, readPdfBytes, validatePdfBatch } from "@/lib/tools/pdf/validation";

async function loadPdfDocument(file: File): Promise<PDFDocument> {
  const bytes = await readPdfBytes(file);
  const { PDFDocument: PdfDocumentConstructor } = await import("pdf-lib");
  const document = await PdfDocumentConstructor.load(bytes, {
    ignoreEncryption: false,
    throwOnInvalidObject: true,
    updateMetadata: false,
  });
  assertPageCount(document.getPageCount());
  return document;
}

export async function inspectPdf(file: File): Promise<number> {
  const document = await loadPdfDocument(file);
  return document.getPageCount();
}

export async function mergePdfFiles(files: File[], onStep?: (completed: number, total: number) => void): Promise<Blob> {
  if (files.length < 2) throw new PdfToolError("Choose at least two PDFs to merge.");
  if (files.length > MAX_PDF_FILES) throw new PdfToolError(`Choose ${MAX_PDF_FILES} PDFs or fewer at a time.`);
  validatePdfBatch(files);

  const { PDFDocument: PdfDocumentConstructor } = await import("pdf-lib");
  const merged = await PdfDocumentConstructor.create();
  for (const [index, file] of files.entries()) {
    const source = await loadPdfDocument(file);
    const copiedPages = await merged.copyPages(source, source.getPageIndices());
    copiedPages.forEach((page) => merged.addPage(page));
    onStep?.(index + 1, files.length);
  }
  const bytes = await merged.save();
  return new Blob([toArrayBuffer(bytes)], { type: "application/pdf" });
}

export async function extractPdfPages(file: File, selectedPages: number[]): Promise<Blob> {
  if (!selectedPages.length) throw new PdfToolError("Select at least one page to extract.");
  if (selectedPages.length > MAX_EXTRACT_PAGES) {
    throw new PdfToolError(`Select ${MAX_EXTRACT_PAGES} pages or fewer at a time to keep this operation within browser memory limits.`);
  }
  const source = await loadPdfDocument(file);
  const pageCount = source.getPageCount();
  assertPageCount(pageCount);
  if (selectedPages.some((page) => !Number.isInteger(page) || page < 1 || page > pageCount)) {
    throw new PdfToolError(`Choose page numbers from 1 to ${pageCount}.`);
  }

  const { PDFDocument: PdfDocumentConstructor } = await import("pdf-lib");
  const output = await PdfDocumentConstructor.create();
  const indices = [...new Set(selectedPages)].sort((a, b) => a - b).map((page) => page - 1);
  const copiedPages = await output.copyPages(source, indices);
  copiedPages.forEach((page) => output.addPage(page));
  const bytes = await output.save();
  return new Blob([toArrayBuffer(bytes)], { type: "application/pdf" });
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
