"use client";

import { useEffect, useRef, useState } from "react";
import { Dropzone, EmptyState, ErrorState, LoadingState, ResetButton, formatBytes, type AcceptedFiles } from "@/components/tools/primitives";
import { MAX_IMAGE_BYTES, inspectImage, readJpegExif, validateDimensions, type ImageInfo } from "@/lib/tools/images/processing";
import { friendlyPdfError } from "@/lib/tools/pdf/validation";
import {
  assertFileInfoSize, compareFileFormat, detectFileFormat, exifAvailability, fileExtension,
  FILE_SIGNATURE_BYTES, inspectPdfInformation, MAX_FILE_INFO_BYTES, type DetectedFormat, type PdfInformation,
} from "@/lib/tools/file-info";

type Inspection = {
  detected: DetectedFormat | null;
  extensionMatch: "consistent" | "mismatch" | "unknown";
  mimeMatch: "consistent" | "mismatch" | "unknown";
  image?: ImageInfo;
  imageError?: string;
  exif?: Record<string, string> | null;
  pdf?: PdfInformation;
  pdfError?: string;
};

export function FileInfo() {
  const [file, setFile] = useState<File | null>(null);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const sequence = useRef(0);

  useEffect(() => () => { sequence.current += 1; }, []);

  async function inspectSelection(selection: AcceptedFiles) {
    const request = ++sequence.current;
    const candidate = selection.files[0];
    setFile(candidate ?? null);
    setInspection(null);
    setError(selection.rejected.join(" "));
    if (!candidate) { setWorking(false); return; }

    setWorking(true);
    try {
      assertFileInfoSize(candidate.size);
      const prefix = new Uint8Array(await candidate.slice(0, FILE_SIGNATURE_BYTES).arrayBuffer());
      if (request !== sequence.current) return;
      const detected = detectFileFormat(prefix);
      const match = compareFileFormat(fileExtension(candidate.name), candidate.type, detected);
      const result: Inspection = { detected, extensionMatch: match.extension, mimeMatch: match.mime };

      if (detected?.family === "image") {
        if (candidate.size > MAX_IMAGE_BYTES) {
          result.imageError = `Image details are unavailable above the existing ${formatBytes(MAX_IMAGE_BYTES)} image-processing limit.`;
          result.exif = detected.mime === "image/jpeg" ? null : {};
        } else {
          try {
            result.image = detected.label === "GIF" ? await inspectGif(candidate) : await inspectImage(candidate);
          } catch {
            result.imageError = "The browser could not decode this image. Its general file information is still available.";
          }
          if (detected.mime === "image/jpeg") {
            try { result.exif = readJpegExif(await candidate.arrayBuffer()); }
            catch { result.exif = null; }
          } else result.exif = {};
        }
      }

      if (detected?.family === "pdf") {
        try { result.pdf = await inspectPdfInformation(candidate); }
        catch (caught) { result.pdfError = friendlyPdfError(caught); }
      }
      if (request === sequence.current) {
        setInspection(result);
        setError("");
      }
    } catch (caught) {
      if (request === sequence.current) setError(caught instanceof Error ? caught.message : "Could not inspect this file.");
    } finally {
      if (request === sequence.current) setWorking(false);
    }
  }

  function reset() {
    sequence.current += 1;
    setFile(null);
    setInspection(null);
    setError("");
    setWorking(false);
  }

  return <div className="tool-workspace file-info-workspace">
    <p className="file-info-privacy">Inspection happens locally in this browser. The file and its metadata are not uploaded.</p>
    <Dropzone onFiles={inspectSelection} maxBytes={MAX_FILE_INFO_BYTES} disabled={false} />
    <div className="file-info-actions">
      <ResetButton onClick={reset} label="Clear file" disabled={!file && !error && !working} />
    </div>
    {working && <LoadingState label="Inspecting file locally…" />}
    {error && <ErrorState>{error}</ErrorState>}
    {file && inspection && <>
      <section className="file-info-section" aria-labelledby="file-general-heading">
        <div className="file-info-section-heading"><div><span className="eyebrow">Selected file</span><h2 id="file-general-heading">General information</h2></div><button type="button" className="button button-secondary" onClick={() => document.querySelector<HTMLInputElement>('.file-info-workspace input[type="file"]')?.click()}>Replace file</button></div>
        <dl className="file-info-grid">
          <InfoField label="Filename" value={file.name || "Unnamed file"} />
          <InfoField label="Extension" value={fileExtension(file.name) ? `.${fileExtension(file.name)}` : "No extension"} />
          <InfoField label="Browser-reported MIME type" value={file.type || "Not reported by browser"} />
          <InfoField label="Detected format" value={inspection.detected?.label ?? "Unknown"} />
          <InfoField label="File size" value={`${file.size.toLocaleString()} bytes (${formatBytes(file.size)})`} />
          <InfoField label="Last modified" value={Number.isFinite(file.lastModified) ? new Date(file.lastModified).toLocaleString() : "Not available"} />
          <InfoField label="Extension vs signature" value={matchLabel(inspection.extensionMatch)} tone={inspection.extensionMatch} />
          <InfoField label="Reported MIME vs signature" value={matchLabel(inspection.mimeMatch)} tone={inspection.mimeMatch} />
        </dl>
        {inspection.detected?.family === "zip" && <p className="file-info-note">The signature identifies a ZIP-based container only. It does not verify that this is a specific Office or OpenDocument file.</p>}
        {!inspection.detected && <p className="file-info-note">No supported signature was recognized in the first {FILE_SIGNATURE_BYTES} bytes. Format detection is limited and does not scan for malware or prove a file is safe.</p>}
        {inspection.detected && <p className="file-info-note">Signature detection is limited to supported formats and does not scan for malware or prove a file is safe. Browser MIME types may be empty or inaccurate.</p>}
      </section>

      {inspection.detected?.family === "image" && <section className="file-info-section" aria-labelledby="file-image-heading">
        <div className="file-info-section-heading"><div><span className="eyebrow">Image properties</span><h2 id="file-image-heading">Image details</h2></div></div>
        {inspection.image ? <dl className="file-info-grid">
          <InfoField label="Dimensions" value={`${inspection.image.width.toLocaleString()} × ${inspection.image.height.toLocaleString()} px`} />
          <InfoField label="Aspect ratio" value={formatRatio(inspection.image.width, inspection.image.height)} />
          <InfoField label="Pixel count" value={`${(inspection.image.width * inspection.image.height).toLocaleString()} (${(inspection.image.width * inspection.image.height / 1_000_000).toFixed(2)} MP)`} />
          <InfoField label="Decoded format" value={inspection.image.type.replace("image/", "").toUpperCase()} />
        </dl> : <p className="file-info-note">{inspection.imageError ?? "Image-specific properties are unavailable."}</p>}
        <ExifDetails format={inspection.detected.mime} metadata={inspection.exif ?? null} />
      </section>}

      {inspection.detected?.family === "pdf" && <section className="file-info-section" aria-labelledby="file-pdf-heading">
        <div className="file-info-section-heading"><div><span className="eyebrow">Document properties</span><h2 id="file-pdf-heading">PDF details</h2></div></div>
        {inspection.pdf ? <dl className="file-info-grid">
          <InfoField label="Pages" value={inspection.pdf.pageCount.toLocaleString()} />
          <OptionalInfoField label="Title" value={inspection.pdf.title} />
          <OptionalInfoField label="Author" value={inspection.pdf.author} />
          <OptionalInfoField label="Subject" value={inspection.pdf.subject} />
          <OptionalInfoField label="Creator" value={inspection.pdf.creator} />
          <OptionalInfoField label="Producer" value={inspection.pdf.producer} />
          <OptionalInfoField label="Creation date" value={formatPdfDate(inspection.pdf.creationDate)} />
          <OptionalInfoField label="Modification date" value={formatPdfDate(inspection.pdf.modificationDate)} />
          <p className="file-info-note file-info-note-wide">PDF metadata is optional and can be missing, inaccurate, or changed. Missing values do not establish a document’s history.</p>
        </dl> : <p className="file-info-error">{inspection.pdfError ?? "PDF properties could not be read."} General file information remains available.</p>}
        {inspection.pdf && <p className="file-info-note">This inspector reads document properties without rendering pages or modifying the original file.</p>}
      </section>}
    </>}
    {!file && !error && !working && <div className="file-info-empty"><EmptyState title="Choose a file to inspect">Supported signatures include PDF, JPEG, PNG, GIF, WebP, AVIF, and generic ZIP containers. Other files still show their browser-reported properties.</EmptyState></div>}
  </div>;
}

function InfoField({ label, value, tone }: { label: string; value: string; tone?: "consistent" | "mismatch" | "unknown" }) {
  return <div className="file-info-field"><dt>{label}</dt><dd className={tone ? `file-match-${tone}` : undefined}>{value}</dd></div>;
}

function OptionalInfoField({ label, value }: { label: string; value?: string }) {
  return value ? <InfoField label={label} value={value} /> : null;
}

function ExifDetails({ format, metadata }: { format: string; metadata: Record<string, string> | null }) {
  const availability = exifAvailability(format, metadata);
  if (availability === "available") return <div className="file-info-exif"><h3>Readable JPEG EXIF fields</h3><dl>{Object.entries(metadata ?? {}).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p>Only fields supported by the existing local EXIF reader are shown. GPS data is summarized as present and coordinates are not displayed.</p></div>;
  const message = availability === "none-found" ? "No readable EXIF fields were found in this JPEG." : availability === "unsupported" ? "EXIF inspection is currently limited to JPEG files." : "JPEG EXIF data could not be read; metadata availability is unknown.";
  return <p className="file-info-note">{message}</p>;
}

async function inspectGif(file: File): Promise<ImageInfo> {
  const bytes = new Uint8Array(await file.slice(0, 10).arrayBuffer());
  if (bytes.length < 10) throw new Error("GIF header is incomplete.");
  const width = bytes[6] | (bytes[7] << 8);
  const height = bytes[8] | (bytes[9] << 8);
  validateDimensions(width, height);
  if (typeof createImageBitmap !== "function") throw new Error("This browser cannot decode GIF images here.");
  const bitmap = await createImageBitmap(file);
  try {
    validateDimensions(bitmap.width, bitmap.height);
    return { width: bitmap.width, height: bitmap.height, type: "image/gif" };
  } finally { bitmap.close(); }
}

function matchLabel(match: Inspection["extensionMatch"]): string {
  return match === "consistent" ? "Appears consistent" : match === "mismatch" ? "Does not match detected signature" : "Unable to compare reliably";
}

function formatRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
}

function formatPdfDate(date?: Date): string | undefined {
  return date ? date.toLocaleString() : undefined;
}
