import assert from "node:assert/strict";
import test from "node:test";
import { escapeHtmlText, markdownHtmlFilename, parseMarkdownToHtmlFragment } from "../src/lib/tools/markdown-to-html.ts";

test("serializes headings, paragraphs, emphasis, and strikethrough with the editor's GFM parser", async () => {
  const html = await parseMarkdownToHtmlFragment("# Heading\n\nA **bold**, *italic*, and ~~removed~~ paragraph.");
  assert.match(html, /<h1>Heading<\/h1>/u);
  assert.match(html, /<strong>bold<\/strong>/u);
  assert.match(html, /<em>italic<\/em>/u);
  assert.match(html, /<del>removed<\/del>/u);
});

test("serializes ordered, unordered, and nested lists", async () => {
  const html = await parseMarkdownToHtmlFragment("1. First\n   - Nested\n2. Second");
  assert.match(html, /<ol>[\s\S]*<ul>[\s\S]*<li>Nested<\/li>[\s\S]*<\/ul>[\s\S]*<\/ol>/u);
});

test("serializes blockquotes, inline code, fenced code, and horizontal rules", async () => {
  const html = await parseMarkdownToHtmlFragment("> quote\n\n`inline`\n\n```js\nconst x = 1;\n```\n\n---");
  assert.match(html, /<blockquote>[\s\S]*quote[\s\S]*<\/blockquote>/u);
  assert.match(html, /<code>inline<\/code>/u);
  assert.match(html, /<pre><code class="language-js">const x = 1;\n<\/code><\/pre>/u);
  assert.match(html, /<hr>/u);
});

test("serializes GFM tables, task lists, links, relative images, and escaped Markdown", async () => {
  const html = await parseMarkdownToHtmlFragment("| A | B |\n| --- | --- |\n| 1 | 2 |\n\n- [x] Done\n- [ ] Todo\n\n[link](/path) ![image](./image.png)\n\nEscaped \\* star.");
  assert.match(html, /<table>/u);
  assert.match(html, /<th>A<\/th>/u);
  assert.match(html, /type="checkbox"[^>]*checked/u);
  assert.match(html, /type="checkbox"/u);
  assert.match(html, /href="\/path"/u);
  assert.match(html, /src="\.\/image\.png"/u);
  assert.match(html, /Escaped \* star\./u);
});

test("raw HTML is omitted by the shared Markdown-to-HTML parser", async () => {
  const html = await parseMarkdownToHtmlFragment('<script>alert(1)</script><b onclick="run()">raw</b>');
  assert.doesNotMatch(html, /<script|<b|onclick/iu);
});

test("escapes HTML title text and derives a path-safe filename", () => {
  assert.equal(escapeHtmlText(`A & <"title"> 'x'`), "A &amp; &lt;&quot;title&quot;&gt; &#39;x&#39;");
  assert.equal(markdownHtmlFilename("Hello, Markdown!"), "hello-markdown.html");
  assert.equal(markdownHtmlFilename("../../"), "document.html");
  assert.equal(markdownHtmlFilename("Résumé"), "resume.html");
});
