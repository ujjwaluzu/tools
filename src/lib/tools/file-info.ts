import { MAX_PDF_FILE_BYTES, MAX_PDF_PAGES } from "./pdf/types.ts";

export const MAX_FILE_INFO_BYTES = MAX_PDF_FILE_BYTES;
export const FILE_SIGNATURE_BYTES = 1024;

export type DetectedFormat = {
  label: string;
  mime: string;
  family: "pdf" | "image" | "zip";
};

export type FormatMatch = "consistent" | "mismatch" | "unknown";

const signatures: Array<{ bytes: number[]; format: DetectedFormat }> = [
  { bytes: [0x25, 0x50, 0x44, 0x46, 0x2d], format: { label: "PDF", mime: "application/pdf", family: "pdf" } },
  { bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], format: { label: "PNG", mime: "image/png", family: "image" } },
  { bytes: [0xff, 0xd8, 0xff], format: { label: "JPEG", mime: "image/jpeg", family: "image" } },
  { bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], format: { label: "GIF", mime: "image/gif", family: "image" } },
  { bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], format: { label: "GIF", mime: "image/gif", family: "image" } },
];

export function detectFileFormat(bytes: Uint8Array): DetectedFormat | null {
  if (bytes.length < 1) return null;
  for (let offset = 0; offset <= bytes.length - 8; offset += 1) {
    if (bytes[offset] === 0x25 && bytes[offset + 1] === 0x50 && bytes[offset + 2] === 0x44
      && bytes[offset + 3] === 0x46 && bytes[offset + 4] === 0x2d
      && bytes[offset + 5] >= 0x30 && bytes[offset + 5] <= 0x39
      && bytes[offset + 6] === 0x2e && bytes[offset + 7] >= 0x30 && bytes[offset + 7] <= 0x39) {
      return { label: "PDF", mime: "application/pdf", family: "pdf" };
    }
  }
  for (const signature of signatures) {
    if (signature.bytes.every((byte, index) => bytes[index] === byte)) return signature.format;
  }
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") {
    return { label: "WebP", mime: "image/webp", family: "image" };
  }
  if (bytes.length >= 12 && ascii(bytes, 4, 8) === "ftyp") {
    const brands = ascii(bytes, 8, Math.min(bytes.length, 64));
    if (brands.includes("avif") || brands.includes("avis")) return { label: "AVIF", mime: "image/avif", family: "image" };
  }
  if ((bytes.length >= 4 && ascii(bytes, 0, 4) === "PK\u0003\u0004")
    || (bytes.length >= 4 && ascii(bytes, 0, 4) === "PK\u0005\u0006")
    || (bytes.length >= 4 && ascii(bytes, 0, 4) === "PK\u0007\u0008")) {
    return { label: "ZIP-based container", mime: "application/zip", family: "zip" };
  }
  return null;
}

export function fileExtension(filename: string): string {
  const name = filename.split(/[\\/]/).pop() ?? "";
  const dot = name.lastIndexOf(".");
  return dot > 0 && dot < name.length - 1 ? name.slice(dot + 1).toLowerCase() : "";
}

export function compareFileFormat(extension: string, reportedMime: string, detected: DetectedFormat | null): {
  extension: FormatMatch;
  mime: FormatMatch;
} {
  if (!detected) return { extension: "unknown", mime: "unknown" };
  const extensionKinds = extensionFormats[extension.toLowerCase()];
  const extensionMatch: FormatMatch = !extensionKinds ? "unknown" : extensionKinds.includes(detected.family === "zip" ? "zip" : detected.mime) ? "consistent" : "mismatch";
  const mime = reportedMime.trim().toLowerCase().split(";", 1)[0];
  if (!mime || mime === "application/octet-stream" || mime === "binary/octet-stream") return { extension: extensionMatch, mime: "unknown" };
  const mimeKinds = mimeFormats[mime];
  const mimeMatch: FormatMatch = !mimeKinds ? "unknown" : mimeKinds.includes(detected.family === "zip" ? "zip" : detected.mime) ? "consistent" : "mismatch";
  return { extension: extensionMatch, mime: mimeMatch };
}

const extensionFormats: Record<string, string[]> = {
  pdf: ["application/pdf"], png: ["image/png"], jpg: ["image/jpeg"], jpeg: ["image/jpeg"],
  gif: ["image/gif"], webp: ["image/webp"], avif: ["image/avif"],
  zip: ["zip"], docx: ["zip"], xlsx: ["zip"], pptx: ["zip"], odt: ["zip"], ods: ["zip"], odp: ["zip"],
};
const mimeFormats: Record<string, string[]> = {
  "application/pdf": ["application/pdf"], "image/png": ["image/png"], "image/jpeg": ["image/jpeg"],
  "image/gif": ["image/gif"], "image/webp": ["image/webp"], "image/avif": ["image/avif"],
  "application/zip": ["zip"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["zip"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["zip"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ["zip"],
};

export function assertFileInfoSize(size: number): void {
  if (!Number.isFinite(size) || size < 0) throw new Error("The file size could not be determined.");
  if (size > MAX_FILE_INFO_BYTES) throw new Error(`This file is larger than the ${MAX_FILE_INFO_BYTES / (1024 * 1024)} MB inspection limit.`);
}

export function exifAvailability(format: string, metadata: Record<string, string> | null): "available" | "none-found" | "unsupported" | "unavailable" {
  if (format !== "image/jpeg") return "unsupported";
  if (metadata === null) return "unavailable";
  return Object.keys(metadata).length ? "available" : "none-found";
}

export type PdfInformation = {
  pageCount: number;
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
};

export async function inspectPdfInformation(file: Pick<File, "name" | "size" | "slice" | "arrayBuffer">): Promise<PdfInformation> {
  assertFileInfoSize(file.size);
  if (!file.size) throw new Error("The PDF file is empty.");
  const prefix = new Uint8Array(await file.slice(0, FILE_SIGNATURE_BYTES).arrayBuffer());
  const detected = detectFileFormat(prefix);
  if (detected?.family !== "pdf") throw new Error("The file does not have a PDF signature.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { PDFDocument } = await import("pdf-lib");
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: false, throwOnInvalidObject: true, updateMetadata: false });
  const pageCount = pdf.getPageCount();
  if (!Number.isInteger(pageCount) || pageCount < 1) throw new Error("No readable PDF pages were found.");
  if (pageCount > MAX_PDF_PAGES) throw new Error(`This PDF exceeds the ${MAX_PDF_PAGES} page inspection limit.`);
  const date = (value: Date | undefined): Date | undefined => value instanceof Date && Number.isFinite(value.getTime()) ? value : undefined;
  const info: PdfInformation = { pageCount };
  const fields: Array<[keyof PdfInformation, string | Date | undefined]> = [
    ["title", pdf.getTitle()], ["author", pdf.getAuthor()], ["subject", pdf.getSubject()],
    ["creator", pdf.getCreator()], ["producer", pdf.getProducer()],
    ["creationDate", date(pdf.getCreationDate())], ["modificationDate", date(pdf.getModificationDate())],
  ];
  for (const [key, value] of fields) {
    if (value !== undefined && value !== "") Object.assign(info, { [key]: value });
  }
  return info;
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.subarray(start, end));
}
