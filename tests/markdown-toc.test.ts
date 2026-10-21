import assert from "node:assert/strict";
import test from "node:test";
import { MAX_MARKDOWN_INPUT_BYTES } from "../src/lib/tools/markdown.ts";
import { createHeadingSlug, extractMarkdownHeadings, generateMarkdownToc } from "../src/lib/tools/markdown-toc.ts";

test("extracts nested headings and preserves heading levels when intermediate levels are skipped", () => {
  const headings = extractMarkdownHeadings("# Title\n\n### Detail\n\n#### More");
  assert.deepEqual(headings.map(({ level, text }) => [level, text]), [[1, "Title"], [3, "Detail"], [4, "More"]]);
  assert.equal(generateMarkdownToc(headings, [1, 3, 4]), "- [Title](#title)\n  - [Detail](#detail)\n    - [More](#more)");
});

test("creates deterministic punctuation and duplicate slugs without colliding with authored suffixes", () => {
  const headings = extractMarkdownHeadings("# Hello, World!\n\n# Hello World\n\n# Hello World-1");
  assert.deepEqual(headings.map(({ slug }) => slug), ["hello-world", "hello-world-1", "hello-world-1-1"]);
  assert.equal(createHeadingSlug("  A/B \u2014 C  "), "ab-c");
});

test("preserves non-Latin letters and combining marks", () => {
  assert.equal(createHeadingSlug("中文 हिन्दी Cafe\u0301"), "中文-हिन्दी-cafe\u0301");
});

test("ignores fenced code and parses inline code, emphasis, links, and setext headings", () => {
  const headings = extractMarkdownHeadings("```md\n# Hidden\n```\n\n## **Bold** `code` [link](https://example.com)\n\nVisible\n-------");
  assert.deepEqual(headings.map(({ text }) => text), ["Bold code link", "Visible"]);
});

test("filters excluded heading levels and returns an empty string when no selected level matches", () => {
  const headings = extractMarkdownHeadings("# One\n\n## Two\n\n### Three");
  assert.equal(generateMarkdownToc(headings, [2, 3]), "- [Two](#two)\n  - [Three](#three)");
  assert.equal(generateMarkdownToc(headings, [4, 5, 6]), "");
});

test("ignores empty and malformed headings while recovering valid content", () => {
  assert.deepEqual(extractMarkdownHeadings("#\n\n### Valid\n\n## **unfinished" ).map(({ text }) => text), ["Valid", "**unfinished"]);
  assert.equal(extractMarkdownHeadings("ordinary text").length, 0);
});

test("returns no headings for empty source and enforces the shared Markdown byte limit", () => {
  assert.deepEqual(extractMarkdownHeadings(""), []);
  assert.throws(() => extractMarkdownHeadings("x".repeat(MAX_MARKDOWN_INPUT_BYTES + 1)), /input limit/u);
});
