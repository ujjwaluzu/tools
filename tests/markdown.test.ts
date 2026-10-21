import assert from "node:assert/strict";
import test from "node:test";
import { assertMarkdownInputSize, countMarkdown, formatMarkdownBytes, markdownByteLength, MAX_MARKDOWN_INPUT_BYTES, safeMarkdownUrl } from "../src/lib/tools/markdown.ts";

test("counts characters, words, and lines including empty input", () => {
  assert.deepEqual(countMarkdown(""), { characters: 0, words: 0, lines: 0 });
  assert.deepEqual(countMarkdown("One two\r\nthree\nfour"), { characters: 19, words: 4, lines: 3 });
  assert.deepEqual(countMarkdown("one\n"), { characters: 4, words: 1, lines: 2 });
});

test("counts UTF-8 bytes rather than UTF-16 code units", () => {
  assert.equal(markdownByteLength("é"), 2);
  assert.equal(markdownByteLength("😀"), 4);
  assert.equal(markdownByteLength("a😀é"), 7);
});

test("accepts the exact limit and rejects larger source without truncating", () => {
  assert.equal(MAX_MARKDOWN_INPUT_BYTES, 1024 * 1024);
  assert.equal(assertMarkdownInputSize("a".repeat(4), 4), 4);
  assert.throws(() => assertMarkdownInputSize("a".repeat(5), 4), /limit is 4 B/u);
  assert.throws(() => assertMarkdownInputSize("é", 1), /2 B/u);
  assert.equal(formatMarkdownBytes(1024 * 1024), "1.0 MB");
});

test("allows safe navigation links and blocks executable or embedded URL schemes", () => {
  for (const safe of ["https://example.com", "mailto:hello@example.com", "tel:+15555550123", "/docs", "#section"]) {
    assert.equal(safeMarkdownUrl(safe), safe);
  }
  for (const unsafe of ["javascript:alert(1)", "data:text/html,<script>", "vbscript:msgbox(1)"]) {
    assert.equal(safeMarkdownUrl(unsafe), "", `${unsafe} must be rejected`);
  }
  assert.equal(safeMarkdownUrl("https://example.com/image.png", true), "", "remote images must not trigger third-party requests");
  assert.equal(safeMarkdownUrl("//example.com/image.png", true), "");
  assert.equal(safeMarkdownUrl("\\\\example.com/image.png", true), "");
  assert.equal(safeMarkdownUrl("data:image/svg+xml,<svg>", true), "");
  assert.equal(safeMarkdownUrl("/images/local.png", true), "/images/local.png");
});
