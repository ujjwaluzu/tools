import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "patchright";
import JSZip from "jszip";

const baseUrl = process.env.MARKDOWN_DOCX_BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  const external = [];
  let unrelatedHeroAsset404 = false;
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() === 404 && response.url().endsWith("/space/orbital-station-mobile.webp")) unrelatedHeroAsset404 = true;
  });
  page.on("console", (message) => {
    if (message.type() === "error" && !(unrelatedHeroAsset404 && message.text().includes("Failed to load resource"))) errors.push(message.text());
  });
  page.on("request", (request) => { if (/external\.example/u.test(request.url())) external.push(request.url()); });
  const response = await page.goto(`${baseUrl}/tools/markdown/to-docx`, { waitUntil: "networkidle" });
  assert.equal(response?.status(), 200);
  assert.match(await page.title(), /Markdown to DOCX Converter/u);
  const source = page.locator("#markdown-docx-source");
  const markdown = "# Report\n\n**Bold** and *italic* with `inline code` and [safe link](https://example.com). [bad](javascript:alert(1))\n\n1. First\n   - Nested\n\n> Quote\n\n| Name | Value |\n| --- | --- |\n| A | B |\n\n- [x] Done\n- [ ] Todo\n\n```js\nconst answer = 42;\n  keep indent\n```\n\n---\n\n<script>window.__docxPwned=true</script> ![remote](https://external.example/image.png)";
  await source.fill(markdown);
  await page.locator(".markdown-prose h1").getByText("Report").waitFor();
  assert.equal(await page.evaluate(() => window.__docxPwned), undefined);
  assert.equal(await page.locator('a[href^="javascript:"]').count(), 0);
  assert.deepEqual(external, []);
  await page.locator("#markdown-docx-title").fill("Quarterly / Markdown report");
  await page.getByRole("button", { name: "Generate DOCX" }).click();
  await page.getByRole("status").filter({ hasText: /DOCX ready/u }).waitFor();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download .docx" }).click();
  const download = await downloadEvent;
  assert.equal(download.suggestedFilename(), "Quarterly Markdown report.docx");
  const bytes = await readFile(await download.path());
  assert.equal(bytes.subarray(0, 2).toString("ascii"), "PK", "download is a ZIP-based DOCX package");
  const zip = await JSZip.loadAsync(bytes);
  const document = await zip.file("word/document.xml").async("string");
  const relationships = await zip.file("word/_rels/document.xml.rels").async("string");
  assert.match(document, /w:pStyle w:val="Heading1"/u);
  assert.match(document, /<w:tbl>/u);
  assert.match(document, /keep indent/u);
  assert.match(relationships, /Target="https:\/\/example\.com" TargetMode="External"/u);
  assert.doesNotMatch(relationships, /javascript:|external\.example/iu);
  assert.deepEqual(external, []);

  await page.setViewportSize({ width: 375, height: 800 });
  assert.equal(await page.evaluate(() => document.scrollingElement.scrollWidth <= innerWidth + 1), true, "375px view has no page overflow");
  await page.getByRole("tab", { name: "Preview" }).click();
  assert.equal(await source.inputValue(), markdown);
  await page.getByRole("tab", { name: "Markdown" }).click();
  assert.equal(await source.inputValue(), markdown);
  await source.fill("x".repeat(1024 * 1024 + 1));
  assert.equal(await page.getByRole("button", { name: "Generate DOCX" }).isDisabled(), true);
  await source.fill("");
  await page.getByRole("button", { name: "Generate DOCX" }).click();
  await page.getByRole("alert").filter({ hasText: /Add Markdown/u }).waitFor();

  for (const route of ["/tools/markdown/editor", "/tools/markdown/to-html", "/tools/markdown/to-markdown", "/tools/markdown/to-pdf", "/tools/pdf/text-to-pdf", "/tools/data/csv-viewer"]) {
    const regression = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
    assert.equal(regression?.status(), 200, `${route} loads`);
  }
  await page.goto(`${baseUrl}/tools/markdown`, { waitUntil: "networkidle" });
  await page.locator('a[href="/tools/markdown/to-docx"]').first().waitFor();
  await page.goto(`${baseUrl}/tools`, { waitUntil: "networkidle" });
  await page.locator("#tool-search").fill("Markdown to DOCX");
  await page.locator('.search-results a[href="/tools/markdown/to-docx"]').waitFor();
  const sitemap = await page.request.get(`${baseUrl}/sitemap.xml`);
  assert.match(await sitemap.text(), /\/tools\/markdown\/to-docx/u);
  assert.deepEqual(errors, []);
  console.log("Markdown-to-DOCX browser QA passed (safe preview, valid OOXML archive, heading/table/hyperlink XML, download, 1 MiB limit, mobile, catalogue/search/sitemap, Markdown/PDF/Data regression).");
} finally {
  await browser.close();
}
