import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "patchright";
import { PDFDocument } from "pdf-lib";

const baseUrl = process.env.MARKDOWN_PDF_BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  const external = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("request", (request) => { if (/external\.example/u.test(request.url())) external.push(request.url()); });
  const response = await page.goto(`${baseUrl}/tools/markdown/to-pdf`, { waitUntil: "networkidle" });
  assert.equal(response?.status(), 200);
  assert.match(await page.title(), /Markdown to PDF Converter/u);
  const source = page.locator("#markdown-pdf-source");
  const markdown = "# Report\n\nA **bold** and *italic* paragraph with `inline code`, ~~strikethrough~~, and [safe link](https://example.com).\n\n1. First\n   - Nested\n\n> A quote\n\n| Name | Value |\n| --- | --- |\n| A | B |\n\n- [x] Done\n- [ ] Todo\n\n```js\nconst answer = 42;\n```\n\n---\n\n<script>window.__mdPdfPwned=true</script> [bad](javascript:alert(1)) ![remote](https://external.example/image.png)";
  await source.fill(markdown);
  await page.locator(".markdown-prose h1").getByText("Report").waitFor();
  assert.equal(await page.evaluate(() => window.__mdPdfPwned), undefined);
  assert.equal(await page.locator('a[href^="javascript:"]').count(), 0);
  assert.deepEqual(external, []);
  await page.locator("#markdown-pdf-title").fill("Quarterly / Markdown report");
  await page.locator("#markdown-pdf-size").selectOption("letter");
  await page.locator("#markdown-pdf-orientation").selectOption("landscape");
  await page.getByRole("button", { name: "Generate PDF" }).click();
  await page.getByRole("status").filter({ hasText: /PDF ready/u }).waitFor();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF" }).click();
  const download = await downloadEvent;
  assert.equal(download.suggestedFilename(), "Quarterly Markdown report.pdf");
  const pdfBytes = await readFile(await download.path());
  assert.equal(pdfBytes.subarray(0, 5).toString("ascii"), "%PDF-");
  const pdf = await PDFDocument.load(pdfBytes);
  assert.equal(pdf.getTitle(), "Quarterly / Markdown report");
  assert.equal(pdf.getPageCount(), 1);
  assert.deepEqual(pdf.getPage(0).getSize(), { width: 792, height: 612 });
  assert.ok(pdf.getPage(0).node.Annots()?.size(), "safe Markdown links are clickable PDF annotations");
  assert.deepEqual(external, []);

  await page.setViewportSize({ width: 375, height: 800 });
  assert.equal(await page.evaluate(() => document.scrollingElement.scrollWidth <= innerWidth + 1), true, "375px view has no page overflow");
  await page.getByRole("tab", { name: "Preview" }).click();
  assert.equal(await source.inputValue(), markdown);
  await page.getByRole("tab", { name: "Markdown" }).click();
  assert.equal(await source.inputValue(), markdown);
  await source.fill("Unsupported 中文");
  await page.getByRole("button", { name: "Generate PDF" }).click();
  await page.getByRole("alert").filter({ hasText: /cannot render/u }).waitFor();
  await source.fill("x".repeat(1024 * 1024 + 1));
  assert.equal(await page.getByRole("button", { name: "Generate PDF" }).isDisabled(), true);
  await source.fill("");
  await page.getByRole("button", { name: "Generate PDF" }).click();
  await page.getByRole("alert").filter({ hasText: /Add Markdown/u }).waitFor();

  for (const route of ["/tools/markdown/editor", "/tools/markdown/to-html", "/tools/markdown/to-markdown", "/tools/pdf/text-to-pdf", "/tools/data/csv-viewer"]) {
    const regression = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
    assert.equal(regression?.status(), 200, `${route} loads`);
  }
  await page.goto(`${baseUrl}/tools/markdown`, { waitUntil: "networkidle" });
  await page.locator('a[href="/tools/markdown/to-pdf"]').first().waitFor();
  await page.goto(`${baseUrl}/tools`, { waitUntil: "networkidle" });
  await page.locator("#tool-search").fill("Markdown to PDF");
  await page.locator('.search-results a[href="/tools/markdown/to-pdf"]').waitFor();
  const sitemap = await page.request.get(`${baseUrl}/sitemap.xml`);
  assert.match(await sitemap.text(), /\/tools\/markdown\/to-pdf/u);
  assert.deepEqual(errors, []);
  console.log("Markdown-to-PDF browser QA passed (safe Markdown preview, structure, valid downloadable PDF, metadata, Letter landscape, limits, Unicode failure, mobile, catalogue/search/sitemap, Markdown/PDF/Data regression).");
} finally {
  await browser.close();
}
