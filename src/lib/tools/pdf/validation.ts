import { MAX_PDF_FILE_BYTES, MAX_PDF_FILES, MAX_PDF_PAGES, MAX_PDF_TOTAL_BYTES } from "@/lib/tools/pdf/types";

export class PdfToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfToolError";
  }
}

export async function verifyPdfHeader(file: File): Promise<boolean> {
  if (file.size < 8 || file.size > MAX_PDF_FILE_BYTES) return false;
  const headerBytes = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
  return new TextDecoder("latin1").decode(headerBytes).includes("%PDF-");
}

export async function readPdfBytes(file: File): Promise<Uint8Array> {
  if (file.size === 0) throw new PdfToolError(`${file.name} is empty.`);
  if (file.size > MAX_PDF_FILE_BYTES) {
    throw new PdfToolError(`${file.name} is larger than the 50 MB per-file limit.`);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const header = new TextDecoder("latin1").decode(bytes.subarray(0, Math.min(bytes.length, 1024)));
  if (!header.includes("%PDF-")) {
    throw new PdfToolError(`${file.name} doesn’t appear to be a PDF. Choose a readable PDF file.`);
  }
  return bytes;
}

export function validatePdfBatch(files: File[]): void {
  if (files.length > MAX_PDF_FILES) {
    throw new PdfToolError(`Choose ${MAX_PDF_FILES} PDFs or fewer at a time.`);
  }
  const totalBytes = files.reduce((total, file) => total + file.size, 0);
  if (totalBytes > MAX_PDF_TOTAL_BYTES) {
    throw new PdfToolError("The selected PDFs exceed the 100 MB total limit. Remove a file and try again.");
  }
  for (const file of files) {
    if (file.size > MAX_PDF_FILE_BYTES) {
      throw new PdfToolError(`${file.name} is larger than the 50 MB per-file limit.`);
    }
  }
}

export function assertPageCount(pageCount: number): void {
  if (!Number.isInteger(pageCount) || pageCount < 1) {
    throw new PdfToolError("We couldn’t find any readable pages in this PDF.");
  }
  if (pageCount > MAX_PDF_PAGES) {
    throw new PdfToolError(`This PDF has more than ${MAX_PDF_PAGES} pages. Use a smaller document to protect browser memory.`);
  }
}

export function parsePageRanges(value: string, pageCount: number): number[] {
  if (!value.trim()) throw new PdfToolError("Enter one or more page numbers or ranges.");
  const selected = new Set<number>();
  const parts = value.split(",");

  for (const part of parts) {
    const token = part.trim();
    if (!token) throw new PdfToolError("There’s an empty item in the page range. Use values such as 1-3, 5, 8-10.");
    const range = token.match(/^(\d+)\s*(?:-\s*(\d+))?$/);
    if (!range) throw new PdfToolError(`“${token}” isn’t a valid page number or range. Use values such as 1-3, 5, 8-10.`);

    const first = Number(range[1]);
    const last = range[2] ? Number(range[2]) : first;
    if (first < 1 || last < 1) throw new PdfToolError("Page numbers start at 1.");
    if (last < first) throw new PdfToolError(`The range ${token} goes backwards. Put the smaller page number first.`);
    if (last > pageCount) throw new PdfToolError(`Page ${last} is beyond this PDF’s last page (${pageCount}).`);
    for (let page = first; page <= last; page += 1) selected.add(page);
  }

  const pages = [...selected].sort((a, b) => a - b);
  if (pages.length > MAX_PDF_PAGES) throw new PdfToolError(`Select ${MAX_PDF_PAGES} pages or fewer at a time.`);
  return pages;
}

export function formatPageRanges(pages: number[]): string {
  if (!pages.length) return "";
  const sorted = [...new Set(pages)].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let end = sorted[0];
  for (const page of sorted.slice(1)) {
    if (page === end + 1) end = page;
    else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = page;
      end = page;
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  return ranges.join(", ");
}

export function friendlyPdfError(error: unknown): string {
  if (error instanceof PdfToolError) return error.message;
  const message = error instanceof Error ? `${error.name} ${error.message}`.toLowerCase() : "";
  if (message.includes("password") || message.includes("encrypt")) {
    return "This PDF is password-protected. These tools can’t process encrypted PDFs.";
  }
  if (message.includes("memory") || message.includes("allocation") || message.includes("too large")) {
    return "This PDF is too large for the available browser memory. Try a smaller file or fewer pages.";
  }
  return "We couldn’t read this PDF. It may be corrupted, encrypted, or unsupported.";
}

export function safeBaseName(filename: string): string {
  const withoutExtension = filename.replace(/\.pdf$/i, "");
  const safe = withoutExtension.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").trim().replace(/\.+$/g, "");
  return safe.slice(0, 80) || "document";
}
