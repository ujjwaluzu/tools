import assert from "node:assert/strict";
import test from "node:test";
import { formatPdfExtraction, formatPdfTextItems, inspectPdfDocument } from "../src/lib/tools/pdf/inspector.ts";
import { MAX_PDF_FILE_BYTES } from "../src/lib/tools/pdf/types.ts";
import { parsePageRanges } from "../src/lib/tools/pdf/validation.ts";

async function pdfFile(pages: Array<[number, number]>, metadata = false) {
  const { PDFDocument } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  pages.forEach((size, index) => { const page = doc.addPage(size); if (index === 0) page.drawText("Hello PDF"); });
  if (metadata) {
    doc.setTitle("Inspector fixture"); doc.setAuthor("Test author"); doc.setSubject("Text extraction test");
    doc.setCreator("Unit tests"); doc.setProducer("pdf-lib"); doc.setCreationDate(new Date("2024-01-02T03:04:05Z"));
    doc.setModificationDate(new Date("2024-02-03T04:05:06Z"));
  }
  const saved = await doc.save();
  return new File([saved.buffer.slice(saved.byteOffset, saved.byteOffset + saved.byteLength) as ArrayBuffer], "fixture.pdf", { type: "application/pdf" });
}

test("loads a valid PDF and reports page count, metadata, dimensions, and orientation", async () => {
  const info = await inspectPdfDocument(await pdfFile([[300, 400], [600, 400]], true));
  assert.equal(info.pageCount, 2);
  assert.equal(info.metadata.title, "Inspector fixture");
  assert.equal(info.metadata.author, "Test author");
  assert.equal(info.metadata.subject, "Text extraction test");
  assert.equal(info.metadata.creator, "Unit tests");
  assert.equal(info.metadata.producer, "pdf-lib");
  assert.equal(info.metadata.creationDate?.toISOString(), "2024-01-02T03:04:05.000Z");
  assert.equal(info.metadata.modificationDate?.toISOString(), "2024-02-03T04:05:06.000Z");
  assert.deepEqual(info.pages.map(({ page, width, height, orientation }) => ({ page, width, height, orientation })), [
    { page: 1, width: 300, height: 400, orientation: "Portrait" },
    { page: 2, width: 600, height: 400, orientation: "Landscape" },
  ]);
});

test("preserves absent metadata as absent and reports consistent page dimensions", async () => {
  const info = await inspectPdfDocument(await pdfFile([[595, 842], [595, 842]]));
  assert.equal(info.pageCount, 2);
  assert.equal(info.metadata.title, undefined);
  assert.equal(info.metadata.author, undefined);
  assert.equal(Object.hasOwn(info.metadata, "title"), false);
  assert.equal(info.pages[0].orientation, "Portrait");
  assert.deepEqual({ width: info.pages[0].width, height: info.pages[0].height, orientation: info.pages[0].orientation },
    { width: info.pages[1].width, height: info.pages[1].height, orientation: info.pages[1].orientation });
});

test("rejects an incorrect PDF signature before parsing", async () => {
  const file = new File(["this is not a pdf"], "wrong.pdf");
  await assert.rejects(inspectPdfDocument(file), /doesn.t appear to be a PDF/i);
});

test("reports malformed PDF parsing without accepting the header alone", async () => {
  const file = new File(["%PDF-1.7\nnot a real document"], "broken.pdf");
  await assert.rejects(inspectPdfDocument(file));
});

test("enforces the 50 MB limit before reading the complete file", async () => {
  const oversized = { name: "large.pdf", size: MAX_PDF_FILE_BYTES + 1, slice: () => { throw new Error("must not read"); }, arrayBuffer: () => { throw new Error("must not read"); } } as unknown as File;
  await assert.rejects(inspectPdfDocument(oversized), /50 MB per-file limit/);
});

test("validates selected page ranges against actual page count", () => {
  assert.deepEqual(parsePageRanges("2-3, 1, 3", 4), [1, 2, 3]);
  assert.throws(() => parsePageRanges("", 4), /Enter one or more/);
  assert.throws(() => parsePageRanges("1, 7", 4), /beyond/);
  assert.throws(() => parsePageRanges("4-2", 4), /goes backwards/);
});

test("orders text into lines and separates every selected page with accurate numbering", () => {
  const text = formatPdfTextItems([
    { str: "world", transform: [1, 0, 0, 1, 40, 700] }, { str: "Hello", transform: [1, 0, 0, 1, 10, 700] },
    { str: "second line", transform: [1, 0, 0, 1, 10, 680] },
  ]);
  assert.equal(text, "Hello world\nsecond line");
  assert.equal(formatPdfExtraction([{ page: 2, text }, { page: 5, text: "" }]), "--- Page 2 ---\nHello world\nsecond line\n\n--- Page 5 ---\n[No selectable text found on this page.]");
});
