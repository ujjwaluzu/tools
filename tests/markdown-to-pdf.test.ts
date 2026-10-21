import assert from "node:assert/strict";
import test from "node:test";
import type { PDFObject } from "pdf-lib";
import { parseMarkdownTree } from "../src/lib/tools/markdown.ts";
import { createMarkdownPdf, DEFAULT_MARKDOWN_PDF_OPTIONS, type MarkdownPdfOptions } from "../src/lib/tools/pdf/markdown-to-pdf.ts";

const options = (update: Partial<MarkdownPdfOptions> = {}): MarkdownPdfOptions => ({ ...DEFAULT_MARKDOWN_PDF_OPTIONS, ...update });

test("the shared parser retains GFM tables, task lists, and ignores fenced pseudo-headings", () => {
  const tree = parseMarkdownTree("# Heading\n\n- [x] Done\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n```md\n# Not a heading\n```");
  assert.equal(tree.children[0]?.type, "heading");
  assert.equal(tree.children[1]?.type, "list");
  assert.equal(tree.children[2]?.type, "table");
  assert.equal(tree.children[3]?.type, "code");
});

test("creates a reopenable structured Markdown PDF with metadata and safe link annotations", async () => {
  const markdown = "# Report\n\nA **bold** and *italic* paragraph with `code`, ~~removed~~, and [safe link](https://example.com).\n\n1. First\n   - Nested\n\n> Quote\n\n| Item | Value |\n| --- | --- |\n| A | B |\n\n- [x] Done\n- [ ] Todo\n\n```js\nconst answer = 42;\n  keep indent\n```\n\n---\n\n<script>alert(1)</script>";
  const result = await createMarkdownPdf(markdown, options({ title: "Markdown report" }));
  assert.match(result.filename, /Markdown report\.pdf/u);
  const { PDFArray, PDFDocument, PDFDict, PDFName, PDFRawStream, PDFString, PDFStream, decodePDFRawStream } = await import("pdf-lib");
  const bytes = new Uint8Array(await result.blob.arrayBuffer());
  const reopened = await PDFDocument.load(bytes);
  assert.equal(reopened.getPageCount(), 1);
  assert.equal(reopened.getTitle(), "Markdown report");
  assert.deepEqual(reopened.getPage(0).getSize(), { width: 595.2756, height: 841.8898 });
  const annotations = reopened.getPage(0).node.Annots();
  assert.ok(annotations && annotations.size() > 0, "safe links become PDF link annotations");
  const annotation = reopened.context.lookup(annotations.get(0)!, PDFDict);
  const action = annotation.lookup(PDFName.of("A"), PDFDict);
  const uri = action.lookup(PDFName.of("URI"), PDFString).decodeText();
  assert.equal(uri, "https://example.com");
  const content = reopened.getPage(0).node.Contents();
  assert.ok(content);
  const streams = content instanceof PDFArray ? content.asArray() : [content];
  const decoded = streams.map((stream) => {
    const raw = stream instanceof PDFRawStream ? stream : reopened.context.lookup(stream as PDFObject, PDFStream);
    assert.ok(raw instanceof PDFRawStream);
    return new TextDecoder("latin1").decode(decodePDFRawStream(raw).decode());
  }).join("\n");
  for (const text of ["Report", "bold", "italic", "First", "Nested", "Quote", "Item", "Value", "Done", "Todo", "const answer = 42;", "  keep indent", "1 / 1"]) {
    assert.ok(decoded.includes(Buffer.from(text).toString("hex").toUpperCase()), `PDF page content contains ${text}`);
  }
});

test("respects US Letter landscape settings and paginates long Markdown without an empty trailing page", async () => {
  const markdown = Array.from({ length: 700 }, (_, index) => `Paragraph ${index + 1}: ${"long words wrap within page margins. ".repeat(4)}`).join("\n\n");
  const result = await createMarkdownPdf(markdown, options({ pageSize: "letter", orientation: "landscape", marginMm: 15 }));
  const { PDFDocument } = await import("pdf-lib");
  const reopened = await PDFDocument.load(new Uint8Array(await result.blob.arrayBuffer()));
  assert.ok(result.pageCount > 1);
  assert.equal(reopened.getPageCount(), result.pageCount);
  assert.ok(result.pageCount < 500);
  assert.deepEqual(reopened.getPage(0).getSize(), { width: 792, height: 612 });
});

test("validates empty, oversized, unsupported Unicode, and malformed Markdown input", async () => {
  await assert.rejects(createMarkdownPdf("  ", options()), /Add Markdown/u);
  await assert.rejects(createMarkdownPdf("x".repeat(1024 * 1024 + 1), options()), /1 MiB/u);
  await assert.rejects(createMarkdownPdf("Unsupported 中文", options()), /cannot render.*emoji and many non-Latin scripts/u);
  await assert.rejects(createMarkdownPdf("# Control\u0001 character", options()), /control characters/u);
  const malformed = await createMarkdownPdf("# open\n\n**unfinished", options());
  assert.ok(malformed.blob.size > 0);
});

test("accepts representative supported Unicode accents and punctuation", async () => {
  const result = await createMarkdownPdf("# Café\n\nRésumé \u2014 £25 “quoted” text.", options());
  assert.ok(result.blob.size > 0);
});
