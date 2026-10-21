import assert from "node:assert/strict";
import test from "node:test";
import { createMarkdownParser, MAX_MARKDOWN_INPUT_BYTES, parseMarkdownTree } from "../src/lib/tools/markdown.ts";
import { formatMarkdown } from "../src/lib/tools/markdown-formatter.ts";

type TestNode = { type?: string; value?: string; url?: string; children?: TestNode[] };

function valuesOfType(node: TestNode, type: string): string[] {
  const values = node.type === type && typeof node.value === "string" ? [node.value] : [];
  return [...values, ...(node.children ?? []).flatMap((child) => valuesOfType(child, type))];
}

function urlsOfType(node: TestNode, type: string): string[] {
  const values = node.type === type && typeof node.url === "string" ? [node.url] : [];
  return [...values, ...(node.children ?? []).flatMap((child) => urlsOfType(child, type))];
}

test("normalizes headings, blank lines, nested list indentation, blockquotes, rules, and GFM table spacing", () => {
  const source = "# Title\nparagraph with   **bold**\n- first\n   - nested\n>quote\n***\n|a|b|\n|--|--:|\n|x|y|";
  const output = formatMarkdown(source);
  assert.match(output, /^# Title\n\nparagraph/u);
  assert.match(output, /- first\n  - nested/u);
  assert.match(output, /> quote/u);
  assert.match(output, /\| a \|  b \|\n\| - \| -: \|\n\| x \|  y \|/u);
  assert.equal(formatMarkdown(output), output, "formatted output is stable on a second pass");
});

test("preserves fenced code values, inline code values, raw HTML text, and Markdown link destinations", () => {
  const source = [
    "# Preserve",
    "",
    "Inline ` two  spaces ` and [link](https://example.com/a_(b)?x=1&y=2)",
    "",
    "~~~ts",
    "const  total = a  + b;",
    "  keep leading spaces",
    "~~~",
    "",
    "<section data-example=\"true\">HTML example</section>",
  ].join("\n");
  const before = createMarkdownParser().parse(source);
  const formatted = formatMarkdown(source);
  const after = parseMarkdownTree(formatted);
  assert.deepEqual(valuesOfType(after as never, "code"), valuesOfType(before as never, "code"));
  assert.deepEqual(valuesOfType(after as never, "inlineCode"), valuesOfType(before as never, "inlineCode"));
  assert.deepEqual(urlsOfType(after as never, "link"), urlsOfType(before as never, "link"));
  assert.ok(formatted.includes("<section data-example=\"true\">HTML example</section>"));
  assert.notEqual(formatted, source, "ordinary Markdown still receives normalized formatting");
});

test("passes documents containing inline or display math through unchanged", () => {
  const inline = "# Equation\n\nInline $x_{a}$ stays exact";
  const display = "# Equation\n\n$$\nx^2 + y^2\n$$";
  assert.equal(formatMarkdown(inline), inline);
  assert.equal(formatMarkdown(display), display);
});

test("preserves task-list content and formats emphasis consistently", () => {
  const output = formatMarkdown("- [x] **done**\n- [ ] _pending_");
  assert.match(output, /- \[x\] \*\*done\*\*/u);
  assert.match(output, /- \[ \] \*pending\*/u);
});

test("rejects unsafe link and remote image destinations without executing them", () => {
  assert.throws(() => formatMarkdown("[bad](javascript:alert(1))"), /unsafe link URL/u);
  assert.throws(() => formatMarkdown("![remote](https://example.com/image.png)"), /relative image path/u);
  assert.equal(formatMarkdown("[safe](https://example.com)"), "[safe](https://example.com)\n");
});

test("formats malformed Markdown deterministically and enforces the 1 MiB UTF-8 limit", () => {
  assert.equal(formatMarkdown("**unfinished"), "\\*\\*unfinished\n");
  assert.throws(() => formatMarkdown("x".repeat(MAX_MARKDOWN_INPUT_BYTES + 1)), /input limit/u);
});

test("returns an empty result for empty source and does not mistake math-like code for document math", () => {
  const output = formatMarkdown("");
  assert.equal(output, "");
  assert.equal(typeof output, "string");
  const code = "# Title\n\n```txt\n$x^2$\n```";
  assert.match(formatMarkdown(code), /^# Title/u);
  assert.match(formatMarkdown(code), /```txt\n\$x\^2\$\n```/u);
});
