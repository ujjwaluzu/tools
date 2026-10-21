import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "patchright";

const baseUrl = process.env.MARKDOWN_BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ acceptDownloads: true, permissions: ["clipboard-read", "clipboard-write"] });
  const page = await context.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  const thirdPartyImageRequests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => { if (/external\.example/u.test(request.url())) thirdPartyImageRequests.push(request.url()); });

  const response = await page.goto(`${baseUrl}/tools/markdown/editor`, { waitUntil: "networkidle" });
  assert.equal(response?.status(), 200, "Markdown editor route loads");
  assert.match(await page.title(), /Markdown Editor/u, "route metadata is generated");
  assert.match(await page.locator(".markdown-privacy").innerText(), /stay in this browser/u);
  const editor = page.locator("#markdown-source");
  assert.equal(await page.locator(".markdown-empty").count(), 1, "empty preview has a helpful empty state");

  const sample = [
    "# Preview title", "", "A **bold** and *italic* sentence with ~~strike~~ and `code`.", "", "1. First", "   - Nested item", "2. Second", "", "> A blockquote", "", "```js", "const x = 1;", "```", "", "[Safe link](https://example.com)", "", "| Name | Value |", "| --- | --- |", "| one | two |", "", "- [x] Done", "- [ ] Todo", "", "Escaped \\* asterisk.", "", "![remote](https://external.example/image.png)", "", "```", "wide-line-" + "x".repeat(300), "```",
  ].join("\n");
  await editor.fill(sample);
  const originalSource = await editor.inputValue();
  const preview = page.locator(".markdown-preview-content");
  await preview.locator("h1").getByText("Preview title").waitFor();
  assert.equal(await preview.locator("strong").innerText(), "bold");
  assert.equal(await preview.locator("em").innerText(), "italic");
  assert.equal(await preview.locator("del").innerText(), "strike");
  assert.equal(await preview.locator("ol > li").count(), 2);
  assert.equal(await preview.locator("ol ul li").innerText(), "Nested item");
  assert.equal(await preview.locator("blockquote").innerText(), "A blockquote");
  assert.equal((await preview.locator("pre code").first().innerText()).trimEnd(), "const x = 1;");
  assert.equal(await preview.locator("table tbody tr").count(), 1);
  assert.equal(await preview.locator('input[type="checkbox"]').count(), 2);
  assert.equal(await preview.locator('input[type="checkbox"]').nth(0).isChecked(), true);
  assert.match(await preview.innerText(), /\* asterisk\./u);
  const safeLink = preview.locator('a[href="https://example.com"]');
  assert.equal(await safeLink.getAttribute("target"), "_blank");
  assert.match(await safeLink.getAttribute("rel"), /noopener/u);
  assert.equal(await preview.locator("img").count(), 0, "remote images are blocked");
  assert.deepEqual(thirdPartyImageRequests, [], "Markdown does not cause third-party image requests");
  const counts = await page.locator("#markdown-counts").innerText();
  assert.match(counts, new RegExp(`${[...originalSource].length} characters`, "u"));
  assert.match(counts, /\d+ words/u);
  assert.match(counts, /\d+ lines/u);
  assert.equal(await preview.evaluate((node) => node.scrollWidth <= node.clientWidth + 1), true, "wide code and tables stay inside preview scroll area");

  await page.getByRole("button", { name: "Copy Markdown" }).click();
  assert.equal((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/gu, "\n"), originalSource, "copy returns the original Markdown source (line endings may be normalized by the platform)");
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download .md" }).click();
  const download = await downloadEvent;
  assert.equal(download.suggestedFilename(), "document.md");
  assert.equal(await readFile(await download.path(), "utf8"), originalSource, "download preserves original source");

  const malicious = [
    "<script>window.__markdownPwned = true</script>",
    '<img src="x" onerror="window.__markdownPwned = true">',
    "[run](javascript:window.__markdownPwned=true)",
    "![bad](javascript:alert(1))",
    "<svg><script>window.__markdownPwned=true</script></svg>",
    "&lt;img src=x onerror=alert(1)&gt;",
    "<a href=\"javascript:alert(1)\" onclick=\"alert(1)\">unsafe</a>",
  ].join("\n\n");
  await editor.fill(malicious);
  assert.equal(await preview.locator("script, svg, img").count(), 0, "raw HTML and dangerous image URLs create no active elements");
  assert.equal(await preview.locator("[onerror], [onclick]").count(), 0, "event-handler attributes are never rendered");
  assert.equal(await preview.locator('a[href^="javascript:"]').count(), 0, "executable links are rejected");
  assert.match(await preview.innerText(), /<img src=x onerror=alert\(1\)>/u, "escaped HTML-like text stays inert and visible");
  assert.equal(await page.evaluate(() => window.__markdownPwned), undefined, "malicious Markdown does not execute");

  await editor.fill("x".repeat(1024 * 1024 + 1));
  assert.match(await page.locator("#markdown-size-note").innerText(), /source is 1\.0 MB.*limit is 1\.0 MB/u);
  assert.equal(await preview.getByText("Preview paused").count(), 1);
  assert.equal(await page.getByRole("button", { name: "Copy Markdown" }).isDisabled(), true);
  assert.equal((await editor.inputValue()).length, 1024 * 1024 + 1, "oversized text is preserved without truncation");

  await editor.fill("## Kept while switching");
  await page.setViewportSize({ width: 375, height: 800 });
  assert.equal(await page.evaluate(() => document.scrollingElement.scrollWidth <= innerWidth + 1), true, "375px viewport has no horizontal page overflow");
  await page.getByRole("tab", { name: "Preview" }).click();
  await page.locator("#markdown-preview-pane.is-active-mobile .markdown-preview-content h2").waitFor();
  assert.equal(await editor.inputValue(), "## Kept while switching", "switching tabs preserves source");
  await page.getByRole("tab", { name: "Editor" }).click();
  assert.equal(await editor.inputValue(), "## Kept while switching");
  await page.getByRole("button", { name: "Clear" }).click();
  assert.equal(await editor.inputValue(), "", "clear resets source");
  assert.equal(await page.locator(".markdown-empty").count(), 1, "clear restores the empty preview");

  await page.goto(`${baseUrl}/tools/markdown`, { waitUntil: "networkidle" });
  await page.locator('a[href="/tools/markdown/editor"]').first().waitFor();
  await page.goto(`${baseUrl}/tools`, { waitUntil: "networkidle" });
  await page.locator("#tool-search").fill("Markdown Editor");
  await page.locator('.search-results a[href="/tools/markdown/editor"]').waitFor();
  const sitemap = await page.request.get(`${baseUrl}/sitemap.xml`);
  assert.equal(sitemap.status(), 200);
  assert.match(await sitemap.text(), /\/tools\/markdown\/editor/u);
  for (const route of ["/tools/pdf/inspect", "/tools/data/file-info"]) {
    const regression = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
    assert.equal(regression?.status(), 200, `${route} still loads`);
  }
  assert.deepEqual(errors, [], "Markdown editor has no browser runtime errors");
  console.log("Markdown browser QA passed (route, preview syntax, safe DOM, no remote images, counts, size limit, copy, download, mobile, reset, catalogue, search, sitemap, PDF and data regression).");
} finally {
  await browser.close();
}
