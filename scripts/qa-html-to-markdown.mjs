import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "patchright";

const baseUrl = process.env.HTML_MARKDOWN_BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ acceptDownloads: true, permissions: ["clipboard-read", "clipboard-write"] });
  const page = await context.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  const external = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("request", (request) => { if (/external\.example/u.test(request.url())) external.push(request.url()); });
  const response = await page.goto(`${baseUrl}/tools/markdown/to-markdown`, { waitUntil: "networkidle" });
  assert.equal(response?.status(), 200);
  assert.match(await page.title(), /HTML to Markdown Converter/u);
  const source = page.locator("#html-markdown-source");
  const hostile = '<h1>Title</h1><p><strong>Bold</strong>, <em>italic</em>, <code>inline</code>, and <a href="https://example.com">link</a>.</p><ol><li>First<ul><li>Nested</li></ul></li><li>Second</li></ol><blockquote><p>Quoted</p></blockquote><table><thead><tr><th>Name</th><th>Value</th></tr></thead><tbody><tr><td>A</td><td>B</td></tr></tbody></table><pre><code>const x = 1;\n  keep spacing</code></pre><hr><p>line<br>break</p><img src="/local.png" alt="local"><img src="https://external.example/remote.png" alt="remote"><a href="javascript:alert(1)">unsafe</a><script>window.__htmlMarkdownPwned=true</script><img src=x onerror="window.__htmlMarkdownPwned=true"><iframe src="https://external.example/"></iframe><svg onload="alert(1)"><script>alert(1)</script></svg><form><input value="x"></form>';
  await source.fill(hostile);
  await page.getByRole("button", { name: "Convert to Markdown" }).click();
  await page.getByRole("status").waitFor();
  const output = page.locator(".html-source-output code");
  await output.waitFor();
  const markdown = await output.textContent();
  assert.ok(markdown);
  for (const expected of ["# Title", "**Bold**", "*italic*", "`inline`", "[link](https://example.com)", "| Name | Value |", "const x = 1;", "keep spacing", "![local](/local.png)", "line  \nbreak"]) assert.ok(markdown.includes(expected), `converted Markdown contains ${expected}`);
  assert.match(markdown, /\n\s+-\s+Nested/u, "nested list item remains a list item");
  assert.doesNotMatch(markdown, /external\.example|javascript:|<script|onerror|iframe|window\.__htmlMarkdownPwned/u);
  assert.equal(await page.evaluate(() => window.__htmlMarkdownPwned), undefined);
  assert.deepEqual(external, []);

  await page.getByRole("button", { name: "Copy Markdown" }).click();
  assert.equal((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/gu, "\n"), markdown);
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download .md" }).click();
  const download = await downloadEvent;
  assert.equal(download.suggestedFilename(), "document.md");
  assert.equal(await readFile(await download.path(), "utf8"), markdown);

  await source.fill("<h2>Malformed<p>Open <strong>format</p><ul><li>one<li>two</ul>");
  await page.getByRole("button", { name: "Convert to Markdown" }).click();
  await page.locator(".html-source-output code").waitFor();
  assert.match(await page.locator(".html-source-output code").textContent(), /Malformed[\s\S]*Open[\s\S]*format[\s\S]*one[\s\S]*two/u, "malformed HTML is recovered as readable text");

  await page.setViewportSize({ width: 375, height: 800 });
  assert.equal(await page.evaluate(() => document.scrollingElement.scrollWidth <= innerWidth + 1), true, "375px view has no page overflow");
  assert.equal(await page.locator('[aria-label="HTML input"]').isVisible(), true);
  assert.equal(await page.locator('[aria-label="Markdown output"]').isVisible(), true);
  await source.fill("x".repeat(1024 * 1024 + 1));
  assert.equal(await page.getByRole("button", { name: "Convert to Markdown" }).isDisabled(), true);
  assert.match(await page.locator("#html-markdown-size").innerText(), /conversion is paused/u);
  await source.fill("");
  await page.getByRole("button", { name: "Convert to Markdown" }).click();
  await page.getByRole("alert").filter({ hasText: /Add HTML/u }).waitFor();
  assert.equal(await source.inputValue(), "");
  assert.equal(await output.count(), 0, "editing input clears stale output");

  for (const route of ["/tools/markdown/editor", "/tools/markdown/to-html", "/tools/pdf/text-to-pdf", "/tools/data/csv-viewer"]) {
    const regression = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
    assert.equal(regression?.status(), 200, `${route} loads`);
  }
  await page.goto(`${baseUrl}/tools/markdown`, { waitUntil: "networkidle" });
  await page.locator('a[href="/tools/markdown/to-markdown"]').first().waitFor();
  await page.goto(`${baseUrl}/tools`, { waitUntil: "networkidle" });
  await page.locator("#tool-search").fill("HTML to Markdown");
  await page.locator('.search-results a[href="/tools/markdown/to-markdown"]').waitFor();
  const sitemap = await page.request.get(`${baseUrl}/sitemap.xml`);
  assert.match(await sitemap.text(), /\/tools\/markdown\/to-markdown/u);
  assert.deepEqual(errors, []);
  console.log("HTML-to-Markdown browser QA passed (GFM structures, hostile HTML and URL filtering, copy/download, 1 MiB limit, mobile, registry/search/sitemap, Markdown/PDF/Data regression).");
} finally {
  await browser.close();
}
