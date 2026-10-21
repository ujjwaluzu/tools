import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "patchright";

const baseUrl = process.env.MARKDOWN_HTML_BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ acceptDownloads: true, permissions: ["clipboard-read", "clipboard-write"] });
  const page = await context.newPage({ viewport: { width: 1280, height: 900 } });
  const runtimeErrors = [];
  const externalRequests = [];
  const badResponses = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") runtimeErrors.push(message.text()); });
  page.on("response", (response) => { if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`); });
  page.on("request", (request) => { if (/external\.example/u.test(request.url())) externalRequests.push(request.url()); });

  const response = await page.goto(`${baseUrl}/tools/markdown/to-html`, { waitUntil: "networkidle" });
  assert.equal(response?.status(), 200, "Markdown to HTML route loads");
  assert.match(await page.title(), /Markdown to HTML Converter/u, "page metadata is generated");
  const source = page.locator("#markdown-html-source");
  const title = page.locator("#html-document-title");
  const sample = [
    "# HTML conversion", "", "**Bold**, *italic*, ~~removed~~, and `inline code`.", "", "1. Ordered", "   - Nested", "2. Second", "", "> Blockquote", "", "```js", "const answer = 42;", "```", "", "| Feature | Works |", "| --- | --- |", "| GFM table | yes |", "", "- [x] Checked", "- [ ] Open", "", "[Safe link](https://example.com)", "", "![local](/favicon-16x16.png)", "![remote](https://external.example/remote.png)", "![bad](javascript:alert(1))", "![svg data](data:image/svg+xml,%3Csvg%20onload=alert(1)%3E)", "", "Escaped \\* asterisk.", "", "<script>window.__htmlPwned=true</script>", "<img src=x onerror=window.__htmlPwned=true>", "<svg><script>window.__htmlPwned=true</script></svg>", "<iframe src=\"https://external.example/\"></iframe>", "<object data=\"x\"></object><embed src=\"x\">", "<p style=\"background:url(https://external.example/x)\" onclick=\"alert(1)\">raw html</p>", "[run](javascript:alert(1))",
  ].join("\n");
  const hostileTitle = `</title><script>window.__htmlPwned=true</script> & 'title'`;
  await source.fill(sample);
  await title.fill(hostileTitle);
  await page.getByRole("button", { name: "Convert to HTML" }).click();
  await page.getByText(/Sanitized HTML is ready/u).waitFor();

  const htmlSource = page.locator(".html-source-output code");
  await htmlSource.waitFor();
  const documentHtml = await htmlSource.textContent();
  assert.ok(documentHtml);
  assert.match(documentHtml, /^<!doctype html>/u);
  assert.match(documentHtml, /<html lang="en">/u);
  assert.match(documentHtml, /<meta charset="utf-8">/u);
  assert.match(documentHtml, /name="viewport"/u);
  assert.match(documentHtml, /<title>&lt;\/title&gt;&lt;script&gt;window\.__htmlPwned=true&lt;\/script&gt; &amp; &#39;title&#39;<\/title>/u, "title is escaped as text");
  assert.match(documentHtml, /<h1>HTML conversion<\/h1>/u);
  assert.match(documentHtml, /<pre><code>const answer = 42;\n<\/code><\/pre>/u, "fenced code whitespace is preserved in the output document");
  assert.match(documentHtml, /<table>/u);
  assert.match(documentHtml, /type="checkbox"/u);
  assert.match(documentHtml, /href="https:\/\/example\.com"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/u);
  assert.match(documentHtml, /src="\/favicon-16x16\.png"/u, "relative image remains supported");
  assert.doesNotMatch(documentHtml, /external\.example|javascript:|data:image|onerror|onclick|<script|<svg|<iframe|<object|<embed/iu, "active content and remote image URLs are removed");
  assert.doesNotMatch(documentHtml, /style\s*=/iu, "untrusted style attributes are removed");
  assert.equal((documentHtml.match(/<style>/gu) ?? []).length, 1, "only the fixed, self-contained document stylesheet remains");
  assert.deepEqual(externalRequests, [], "Markdown does not trigger third-party requests");
  assert.equal(await page.evaluate(() => window.__htmlPwned), undefined, "hostile Markdown and title do not execute");

  const parsedDocument = await page.evaluate((html) => {
    const document = new DOMParser().parseFromString(html, "text/html");
    return { title: document.title, structure: document.documentElement.lang, charset: document.characterSet, scripts: document.scripts.length, forms: document.forms.length };
  }, documentHtml);
  assert.deepEqual(parsedDocument, { title: hostileTitle, structure: "en", charset: "UTF-8", scripts: 0, forms: 0 });

  const preview = page.locator(".html-preview-content");
  await page.getByRole("tab", { name: "Preview", exact: true }).first().click();
  await preview.locator("h1").getByText("HTML conversion").waitFor();
  assert.equal(await preview.locator("script, svg, iframe, object, embed, form").count(), 0, "preview contains no active content");
  assert.equal(await preview.locator("[onerror], [onclick], [style]").count(), 0, "preview has no unsafe attributes");
  assert.equal(await preview.locator('a[href^="javascript:"]').count(), 0, "preview rejects script URLs");
  assert.equal(await preview.locator('img[src^="https:"]').count(), 0, "preview blocks remote images");
  const safeLink = preview.locator('a[href="https://example.com"]');
  assert.equal(await safeLink.getAttribute("target"), "_blank");
  assert.equal(await safeLink.getAttribute("rel"), "noopener noreferrer");
  assert.deepEqual(externalRequests, [], "preview does not request third-party content");

  await page.getByRole("tab", { name: "HTML source" }).click();
  await page.getByRole("button", { name: "Copy HTML" }).click();
  assert.equal((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/gu, "\n"), documentHtml, "clipboard receives the displayed sanitized document (platform line endings may normalize)");
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download HTML" }).click();
  const download = await downloadEvent;
  assert.match(download.suggestedFilename(), /^[a-z0-9-]+\.html$/u, "download filename is sanitized and has no path characters");
  assert.equal(await readFile(await download.path(), "utf8"), documentHtml, "download matches copied and displayed HTML exactly");

  await page.setViewportSize({ width: 375, height: 800 });
  assert.equal(await page.evaluate(() => document.scrollingElement.scrollWidth <= innerWidth + 1), true, "375px layout has no horizontal overflow");
  await page.getByRole("tab", { name: "Markdown" }).click();
  assert.equal(await source.inputValue(), sample, "switching to editor preserves source");
  await page.getByRole("tab", { name: "HTML", exact: true }).click();
  await htmlSource.waitFor();
  assert.equal(await source.inputValue(), sample);
  await page.getByRole("tab", { name: "Preview", exact: true }).first().click();
  await preview.locator("h1").waitFor();
  assert.equal(await source.inputValue(), sample);

  await page.getByRole("tab", { name: "Markdown" }).click();
  await source.fill("x".repeat(1024 * 1024 + 1));
  assert.equal(await page.getByRole("button", { name: "Convert to HTML" }).isDisabled(), true);
  assert.equal(await page.getByRole("button", { name: "Copy HTML" }).isDisabled(), true);
  assert.match(await page.locator("#html-markdown-size").innerText(), /input limit is 1\.0 MB/u);
  assert.equal((await source.inputValue()).length, 1024 * 1024 + 1, "over-limit input is preserved");

  await source.fill("");
  await page.getByRole("button", { name: "Convert to HTML" }).waitFor();
  await page.getByRole("button", { name: "Convert to HTML" }).click();
  await page.getByRole("alert").filter({ hasText: /Add Markdown/u }).waitFor();
  await page.getByRole("button", { name: "Clear" }).click();
  assert.equal(await source.inputValue(), "", "clear resets input");
  assert.equal(await htmlSource.count(), 0, "clear removes generated output");

  await page.goto(`${baseUrl}/tools/markdown`, { waitUntil: "networkidle" });
  await page.locator('a[href="/tools/markdown/to-html"]').first().waitFor();
  await page.goto(`${baseUrl}/tools`, { waitUntil: "networkidle" });
  await page.locator("#tool-search").fill("Markdown to HTML");
  await page.locator('.search-results a[href="/tools/markdown/to-html"]').waitFor();
  const sitemap = await page.request.get(`${baseUrl}/sitemap.xml`);
  assert.equal(sitemap.status(), 200);
  assert.match(await sitemap.text(), /\/tools\/markdown\/to-html/u);

  await page.goto(`${baseUrl}/tools/markdown/editor`, { waitUntil: "networkidle" });
  await page.locator("#markdown-source").fill("# Existing editor");
  await page.getByRole("tab", { name: "Preview" }).click();
  await page.locator(".markdown-preview-content h1").getByText("Existing editor").waitFor();
  for (const route of ["/tools/pdf/inspect", "/tools/data/file-info"]) {
    const regression = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
    assert.equal(regression?.status(), 200, `${route} remains functional`);
  }
  assert.deepEqual(runtimeErrors, [], `Markdown converter has no browser console/runtime errors; failed responses: ${badResponses.join(", ")}`);
  console.log("Markdown-to-HTML browser QA passed (document structure, GFM, URL policy, hostile DOM, title escaping, preview/copy/download parity, 1 MiB limit, mobile, registry/search/sitemap, editor/PDF/data regression).");
} finally {
  await browser.close();
}
