import assert from "node:assert/strict";
import test from "node:test";
import type { PDFObject } from "pdf-lib";
import {
  countCharacters, countLines, countUtf8Bytes, createTextPdf, DEFAULT_TEXT_PDF_OPTIONS, getTextPdfPageDimensions, layoutText, MAX_TEXT_BYTES,
  sanitizePdfFilename, unsupportedCharacters, validateTextInput, validateTextPdfOptions, wrapTextLine,
} from "../src/lib/tools/pdf/text-to-pdf.ts";

function options(overrides: Partial<typeof DEFAULT_TEXT_PDF_OPTIONS> = {}) { return { ...DEFAULT_TEXT_PDF_OPTIONS, ...overrides }; }
const measure = (text: string, size: number) => text.length * size * 0.5;

test("rejects empty input and enforces the UTF-8 size limit without truncation", () => {
  assert.throws(() => validateTextInput(" \n\t"), /Enter some text/);
  assert.equal(countUtf8Bytes("Aé😀"), 7);
  assert.equal(countCharacters("Aé😀"), 3);
  assert.equal(countLines("one\r\ntwo\nthree\rfour"), 4);
  assert.equal(countLines(""), 0);
  assert.equal(countUtf8Bytes("é".repeat(MAX_TEXT_BYTES / 2)), MAX_TEXT_BYTES);
  assert.throws(() => validateTextInput("é".repeat(MAX_TEXT_BYTES / 2 + 1)), /1 MiB/);
});

test("reports page dimensions for A4 portrait, A4 landscape, and US Letter", () => {
  assert.deepEqual(getTextPdfPageDimensions("a4", "portrait").map(Math.round), [595, 842]);
  assert.deepEqual(getTextPdfPageDimensions("a4", "landscape").map(Math.round), [842, 595]);
  assert.deepEqual(getTextPdfPageDimensions("letter", "portrait"), [612, 792]);
  assert.deepEqual(getTextPdfPageDimensions("letter", "landscape"), [792, 612]);
});

test("validates margins, font size, and layout options", () => {
  validateTextPdfOptions(options());
  assert.throws(() => validateTextPdfOptions(options({ marginMm: 35 })), /margin/);
  assert.throws(() => validateTextPdfOptions(options({ fontSize: 37 })), /between 8 and 36/);
  assert.throws(() => validateTextPdfOptions(options({ fontSize: Number.NaN })), /between 8 and 36/);
  assert.throws(() => validateTextPdfOptions(options({ lineSpacing: 3 })), /line spacing/);
});

test("wraps text by measured width and splits long unbroken words", () => {
  assert.deepEqual(wrapTextLine("one two three", 36, 12, measure), ["one", "two", "three"]);
  assert.deepEqual(wrapTextLine("abcdefgh", 18, 12, measure), ["abc", "def", "gh"]);
  assert.ok(wrapTextLine("w iii", 15, 12, (value, size) => [...value].reduce((sum, char) => sum + (char === "w" ? 10 : 2) * size / 12, 0)).length > 1);
});

test("preserves explicit line breaks and consecutive blank lines", () => {
  const layout = layoutText("First paragraph\ncontinues here\n\n\nSecond paragraph", options(), measure);
  assert.deepEqual(layout.pages[0], ["First paragraph", "continues here", "", "", "Second paragraph"]);
});

test("flows long text to pages and does not add a blank page when the bottom fits exactly", () => {
  const onePageLineCount = Math.floor((getTextPdfPageDimensions("a4", "portrait")[1] - 2 * (20 * 72 / 25.4)) / 15);
  const exactFit = Array.from({ length: onePageLineCount }, (_, index) => `Line ${index}`).join("\n");
  assert.equal(layoutText(exactFit, options(), measure).pages.length, 1);
  assert.equal(layoutText(`${exactFit}\nNext`, options(), measure).pages.length, 2);
  assert.ok(layoutText("A line of text.\n".repeat(1200), options(), measure).pages.length > 1);
  assert.throws(() => layoutText("x ".repeat(300_000), options({ fontSize: 36 }), measure), /more than 500 pages/);
});

test("reserves usable body space for repeated headers and footers", () => {
  const layout = layoutText("Body", options({ header: "Report", footer: "Confidential", pageNumbers: true }), measure);
  assert.ok(layout.pages.length === 1);
  assert.equal(layout.headerY, layout.height - layout.margin + 2);
  assert.equal(layout.footerY, layout.margin - 2);
  assert.throws(() => layoutText("Body", options({ header: "h".repeat(300) }), measure), /header is too long/);
  assert.throws(() => validateTextPdfOptions(options({ footer: "one\ntwo" })), /one line/);
});

test("detects unsupported characters without substituting them", () => {
  const supported = (character: string) => character.codePointAt(0)! <= 0xff || [0x2013, 0x2014, 0x2018, 0x2019, 0x201c, 0x201d, 0x20ac].includes(character.codePointAt(0)!);
  assert.deepEqual(unsupportedCharacters("Café \u2014 déjà vu €", supported), []);
  assert.deepEqual(unsupportedCharacters("Hello नमस्ते 😀", supported), ["न", "म", "स", "्", "त", "े", "😀"]);
});

test("sanitizes title filenames and falls back to document.pdf", () => {
  assert.equal(sanitizePdfFilename("  Quarterly / Plan: Q4?  "), "Quarterly Plan Q4.pdf");
  assert.equal(sanitizePdfFilename("../"), "document.pdf");
  assert.equal(sanitizePdfFilename("CON"), "document CON.pdf");
});

test("generates a reopenable PDF with dimensions, page count, title metadata, header, footer, and page numbers", async () => {
  const generated = await createTextPdf("Café \u2014 résumé “quoted” €\n\nSecond paragraph\n".repeat(120), options({
    title: "Quarterly report", header: "Ujjwal Tools", footer: "Local copy", pageNumbers: true, pageSize: "letter", orientation: "landscape",
  }));
  const { PDFArray, PDFDocument, PDFRawStream, PDFStream, decodePDFRawStream } = await import("pdf-lib");
  const reopened = await PDFDocument.load(await generated.blob.arrayBuffer(), { updateMetadata: false });
  assert.ok(reopened.getPageCount() > 1);
  assert.equal(generated.pageCount, reopened.getPageCount());
  assert.equal(reopened.getTitle(), "Quarterly report");
  assert.equal(reopened.getCreator(), "Ujjwal Tools");
  assert.match(reopened.getProducer() ?? "", /Ujjwal Tools/);
  for (const [index, page] of reopened.getPages().entries()) {
    assert.ok(Math.abs(page.getWidth() - 792) < 0.01);
    assert.ok(Math.abs(page.getHeight() - 612) < 0.01);
    const content = page.node.Contents();
    assert.ok(content);
    const streams = content instanceof PDFArray ? content.asArray() : [content];
    const source = streams.map((stream) => {
      const raw = stream instanceof PDFRawStream ? stream : reopened.context.lookup(stream as PDFObject, PDFStream);
      assert.ok(raw instanceof PDFRawStream);
      return new TextDecoder("latin1").decode(decodePDFRawStream(raw).decode());
    }).join("\n");
    assert.ok(source.includes("556A6A77616C20546F6F6C73"), "header is repeated on each page");
    assert.ok(source.includes("4C6F63616C20636F7079"), "footer is repeated on each page");
    const pageLabelHex = Buffer.from(`${index + 1} / ${reopened.getPageCount()}`).toString("hex").toUpperCase();
    assert.ok(source.includes(pageLabelHex), "page label uses final page count");
  }
  assert.ok(generated.blob.size > 500);
});

test("reports unsupported scripts and emoji as a generation failure", async () => {
  await assert.rejects(createTextPdf("Hello 😀", options()), /cannot render.*U\+1F600.*emoji and many non-Latin scripts/u);
});
