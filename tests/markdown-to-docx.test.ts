import assert from "node:assert/strict";
import JSZip from "jszip";
import test from "node:test";
import { createMarkdownDocx, MAX_MARKDOWN_DOCX_BYTES, sanitizeDocxFilename } from "../src/lib/tools/markdown-to-docx.ts";

test("creates a valid DOCX archive with heading styles, lists, tables, formatting, and safe hyperlinks", async () => {
  const markdown = "# Report\n\nA **bold**, *italic*, ~~removed~~, `code`, and [safe link](https://example.com). [unsafe](javascript:alert(1))\n\n1. First\n   - Nested\n\n> Quoted paragraph\n\n| Name | Value |\n| :--- | ---: |\n| A | B |\n\n- [x] Done\n- [ ] Todo\n\n```js\nconst answer = 42;\n  keep indent\n```\n\n---\n\n<script>alert(1)</script>";
  const result = await createMarkdownDocx(markdown, { title: "Markdown report" });
  assert.equal(result.filename, "Markdown report.docx");
  const zip = await JSZip.loadAsync(new Uint8Array(await result.blob.arrayBuffer()));
  assert.ok(zip.file("[Content_Types].xml"));
  const document = await zip.file("word/document.xml")!.async("string");
  const styles = await zip.file("word/styles.xml")!.async("string");
  const numbering = await zip.file("word/numbering.xml")!.async("string");
  const relationships = await zip.file("word/_rels/document.xml.rels")!.async("string");
  const properties = await zip.file("docProps/core.xml")!.async("string");
  assert.match(document, /w:pStyle w:val="Heading1"/u);
  assert.match(document, /<w:b\s*\/?\s*>/u);
  assert.match(document, /<w:i\s*\/?\s*>/u);
  assert.match(document, /<w:strike\s*\/?\s*>/u);
  assert.match(document, /<w:tbl>/u);
  assert.match(document, /<w:numPr>/u);
  assert.match(document, /keep indent/u);
  assert.match(document, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/u);
  assert.match(styles, /w:styleId="Heading1"/u);
  assert.match(numbering, /w:numFmt w:val="decimal"/u);
  assert.match(relationships, /Target="https:\/\/example\.com" TargetMode="External"/u);
  assert.doesNotMatch(relationships, /javascript:/iu);
  assert.match(properties, /<dc:title>Markdown report<\/dc:title>/u);
});

test("supports Unicode and recovers malformed Markdown as a valid Word document", async () => {
  const result = await createMarkdownDocx("# Café\n\nRésumé \u2014 中文 🌌\n\n**unfinished", { title: "Résumé" });
  const zip = await JSZip.loadAsync(new Uint8Array(await result.blob.arrayBuffer()));
  assert.match(await zip.file("word/document.xml")!.async("string"), /中文/u);
  assert.match(result.filename, /Resume\.docx/u);
});

test("enforces empty, input-size, and title validation", async () => {
  await assert.rejects(createMarkdownDocx("  "), /Add Markdown/u);
  await assert.rejects(createMarkdownDocx("x".repeat(MAX_MARKDOWN_DOCX_BYTES + 1)), /1 MiB/u);
  await assert.rejects(createMarkdownDocx("# Title", { title: "Two\nlines" }), /single line/u);
  await assert.rejects(createMarkdownDocx("# Title", { title: "Bad\u0001title" }), /control characters/u);
});

test("sanitizes DOCX filenames", () => {
  assert.equal(sanitizeDocxFilename("  Annual / Plan: Q4?  "), "Annual Plan Q4");
  assert.equal(sanitizeDocxFilename("../"), "document");
});
