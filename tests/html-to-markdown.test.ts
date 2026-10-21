import assert from "node:assert/strict";
import test from "node:test";
import { assertHtmlInputSize, markdownFilename, MAX_HTML_INPUT_BYTES } from "../src/lib/tools/html-to-markdown.ts";
import { safeMarkdownUrl } from "../src/lib/tools/markdown.ts";

test("checks HTML UTF-8 input size and reports an explicit limit", () => {
  assert.equal(assertHtmlInputSize("é"), 2);
  assert.equal(assertHtmlInputSize("x".repeat(MAX_HTML_INPUT_BYTES)), MAX_HTML_INPUT_BYTES);
  assert.throws(() => assertHtmlInputSize("é", 1), /input limit/u);
});

test("uses a safe Markdown filename", () => {
  assert.equal(markdownFilename("document"), "document.md");
  assert.equal(markdownFilename("../../"), "document.md");
});

test("the shared Markdown URL policy rejects executable URLs and remote images", () => {
  assert.equal(safeMarkdownUrl("javascript:alert(1)"), "");
  assert.equal(safeMarkdownUrl("https://example.com/image.png", true), "");
  assert.equal(safeMarkdownUrl("https://example.com/page"), "https://example.com/page");
});
