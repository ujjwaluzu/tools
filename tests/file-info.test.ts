import assert from "node:assert/strict";
import test from "node:test";
import {
  assertFileInfoSize, compareFileFormat, detectFileFormat, exifAvailability, fileExtension,
  inspectPdfInformation, MAX_FILE_INFO_BYTES,
} from "../src/lib/tools/file-info.ts";

const bytes = (...values: number[]) => new Uint8Array(values);

test("detects PDF signature", () => {
  assert.equal(detectFileFormat(bytes(0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37))?.label, "PDF");
  assert.equal(detectFileFormat(new TextEncoder().encode("\n%PDF-1.7"))?.label, "PDF");
});

test("detects PNG signature", () => {
  assert.equal(detectFileFormat(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))?.label, "PNG");
});

test("detects JPEG signature", () => {
  assert.equal(detectFileFormat(bytes(0xff, 0xd8, 0xff, 0xe0))?.label, "JPEG");
});

test("detects both supported GIF signatures", () => {
  assert.equal(detectFileFormat(bytes(0x47, 0x49, 0x46, 0x38, 0x37, 0x61))?.label, "GIF");
  assert.equal(detectFileFormat(bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61))?.label, "GIF");
});

test("detects WebP and AVIF brands", () => {
  assert.equal(detectFileFormat(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50))?.label, "WebP");
  assert.equal(detectFileFormat(new TextEncoder().encode("0000ftypavif0000"))?.label, "AVIF");
});

test("returns unknown for empty, insufficient, or unsupported signatures", () => {
  assert.equal(detectFileFormat(bytes()), null);
  assert.equal(detectFileFormat(bytes(0xff, 0xd8)) , null);
  assert.equal(detectFileFormat(new TextEncoder().encode("not a known format")), null);
});

test("reports extension and signature mismatch while treating common extensions case-insensitively", () => {
  const png = detectFileFormat(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a));
  assert.deepEqual(compareFileFormat("PNG", "image/png", png), { extension: "consistent", mime: "consistent" });
  assert.deepEqual(compareFileFormat("jpg", "image/png", png), { extension: "mismatch", mime: "consistent" });
});

test("handles absent and misleading browser MIME types explicitly", () => {
  const pdf = detectFileFormat(bytes(0x25, 0x50, 0x44, 0x46, 0x2d));
  assert.equal(compareFileFormat("pdf", "", pdf).mime, "unknown");
  assert.equal(compareFileFormat("pdf", "application/octet-stream", pdf).mime, "unknown");
  assert.equal(compareFileFormat("pdf", "image/png", pdf).mime, "mismatch");
});

test("detects ZIP containers generically without asserting an Office format", () => {
  const zip = detectFileFormat(bytes(0x50, 0x4b, 0x03, 0x04, 0x00, 0x00));
  assert.equal(zip?.label, "ZIP-based container");
  assert.equal(compareFileFormat("docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", zip).extension, "consistent");
  assert.equal(detectFileFormat(new TextEncoder().encode("PKxx not zip")), null);
});

test("enforces the existing PDF-sized file inspection limit", () => {
  assert.equal(MAX_FILE_INFO_BYTES, 50 * 1024 * 1024);
  assert.doesNotThrow(() => assertFileInfoSize(MAX_FILE_INFO_BYTES));
  assert.throws(() => assertFileInfoSize(MAX_FILE_INFO_BYTES + 1), /50 MB inspection limit/);
  assert.throws(() => assertFileInfoSize(-1), /could not be determined/);
});

test("parses extensions without treating dotfiles or trailing dots as extensions", () => {
  assert.equal(fileExtension("photo.JPEG"), "jpeg");
  assert.equal(fileExtension(".env"), "");
  assert.equal(fileExtension("report."), "");
});

test("distinguishes readable, absent, unsupported, and unavailable EXIF", () => {
  assert.equal(exifAvailability("image/jpeg", { ISO: "100" }), "available");
  assert.equal(exifAvailability("image/jpeg", {}), "none-found");
  assert.equal(exifAvailability("image/png", {}), "unsupported");
  assert.equal(exifAvailability("image/jpeg", null), "unavailable");
});

test("reads PDF page count and available document metadata locally", async () => {
  const { PDFDocument } = await import("pdf-lib");
  const source = await PDFDocument.create();
  source.addPage([300, 400]);
  source.setTitle("Local test document");
  source.setAuthor("Ujjwal test");
  source.setSubject("Inspection fixture");
  source.setCreator("Unit test");
  source.setProducer("pdf-lib");
  source.setCreationDate(new Date("2024-01-02T03:04:05Z"));
  const saved = await source.save();
  const file = new File([saved.buffer.slice(saved.byteOffset, saved.byteOffset + saved.byteLength) as ArrayBuffer], "fixture.pdf", { type: "application/pdf" });
  const inspected = await inspectPdfInformation(file);
  assert.equal(inspected.pageCount, 1);
  assert.equal(inspected.title, "Local test document");
  assert.equal(inspected.author, "Ujjwal test");
  assert.equal(inspected.subject, "Inspection fixture");
  assert.equal(inspected.creator, "Unit test");
  assert.equal(inspected.producer, "pdf-lib");
  assert.equal(inspected.creationDate?.toISOString(), "2024-01-02T03:04:05.000Z");
});

test("rejects malformed PDF bytes with a readable parser error", async () => {
  const file = new File(["%PDF-1.7\nnot a real document"], "broken.pdf", { type: "application/pdf" });
  await assert.rejects(inspectPdfInformation(file));
});
