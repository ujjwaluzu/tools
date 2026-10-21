import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "patchright";
import { PDFDocument } from "pdf-lib";

const baseUrl = process.env.TEXT_PDF_BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ acceptDownloads: true, locale: "en-IN" });
  const page = await context.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error" && /hydration|did not match/iu.test(message.text())) errors.push(message.text()); });
  const response = await page.goto(`${baseUrl}/tools/pdf/text-to-pdf`, { waitUntil: "networkidle" });
  assert.equal(response?.status(), 200, "Text-to-PDF route should load");
  assert.equal(await page.title().then((title) => /Text to PDF Generator/u.test(title)), true);
  await page.locator('.tool-page-heading h1').getByText("Text to PDF Generator").waitFor();
  await page.locator("#text-pdf-input").fill("First paragraph\ncontinues here\n\nSecond paragraph");
  assert.match(await page.locator("#text-pdf-counts").innerText(), /6 words/u);
  assert.match(await page.locator("#text-pdf-counts").innerText(), /4 lines/u);
  await page.locator("#text-pdf-size").selectOption("letter");
  await page.locator("#text-pdf-orientation").selectOption("landscape");
  await page.locator("#text-pdf-title").fill("Browser QA / report");
  await page.locator("#text-pdf-header").fill("Ujjwal Tools QA");
  await page.locator("#text-pdf-footer").fill("Private local document");
  await page.locator(".text-pdf-page-number input").check();
  await page.getByRole("button", { name: "Generate PDF" }).click();
  await page.getByRole("status").filter({ hasText: /PDF ready · 1 page/u }).waitFor();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: /Download Browser QA report\.pdf/u }).click();
  const download = await downloadEvent;
  assert.equal(download.suggestedFilename(), "Browser QA report.pdf");
  const pdf = await PDFDocument.load(await readFile(await download.path()));
  assert.equal(pdf.getPageCount(), 1);
  assert.equal(pdf.getTitle(), "Browser QA / report");
  assert.equal(Math.round(pdf.getPage(0).getWidth()), 792);
  assert.equal(Math.round(pdf.getPage(0).getHeight()), 612);

  await page.locator("#text-pdf-input").fill("Long text ".repeat(9000));
  await page.locator("#text-pdf-title").fill("Multi page");
  await page.getByRole("button", { name: "Generate PDF" }).click();
  const multiStatus = page.getByRole("status").filter({ hasText: /PDF ready · (?!1 page)/u });
  await multiStatus.waitFor();
  assert.match(await multiStatus.innerText(), /pages/u);

  await page.getByRole("button", { name: /Clear text and settings/u }).click();
  assert.equal(await page.locator("#text-pdf-input").inputValue(), "");
  await page.locator("#text-pdf-input").fill("Regenerated document");
  await page.getByRole("button", { name: "Generate PDF" }).click();
  await page.getByRole("status").filter({ hasText: /PDF ready/u }).waitFor();
  const secondDownloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: /Download document\.pdf/u }).click();
  assert.equal((await secondDownloadEvent).suggestedFilename(), "document.pdf");

  await page.locator("#text-pdf-input").fill("Unsupported emoji 😀");
  await page.getByRole("button", { name: "Generate PDF" }).click();
  await page.getByRole("alert").filter({ hasText: /cannot render.*U\+1F600/u }).waitFor();
  assert.equal(await page.locator("#text-pdf-input").inputValue(), "Unsupported emoji 😀", "failure preserves input");
  await page.locator("#text-pdf-input").fill("");
  await page.getByRole("button", { name: "Generate PDF" }).waitFor();

  await page.setViewportSize({ width: 375, height: 800 });
  assert.equal(await page.evaluate(() => document.scrollingElement.scrollWidth > innerWidth + 1), false, "narrow viewport has no horizontal overflow");
  for (const route of ["inspect", "merge", "split", "images-to-pdf", "to-png", "to-jpg"]) {
    const regression = await page.goto(`${baseUrl}/tools/pdf/${route}`, { waitUntil: "domcontentloaded" });
    assert.equal(regression?.status(), 200, `${route} PDF route should remain available`);
  }
  await page.goto(`${baseUrl}/tools/pdf`, { waitUntil: "domcontentloaded" });
  await page.locator('a[href="/tools/pdf/text-to-pdf"]').first().waitFor();
  await page.goto(`${baseUrl}/tools`, { waitUntil: "domcontentloaded" });
  await page.locator("#tool-search").fill("Text to PDF");
  await page.locator('.search-results a[href="/tools/pdf/text-to-pdf"]').waitFor();
  const sitemap = await page.request.get(`${baseUrl}/sitemap.xml`);
  assert.equal(sitemap.status(), 200);
  assert.match(await sitemap.text(), /\/tools\/pdf\/text-to-pdf/u);
  assert.deepEqual(errors, [], "Text-to-PDF has no browser runtime errors");
  console.log("Text-to-PDF browser QA passed (route, counts, options, metadata, generation, PDF reopen, download, multi-page output, reset, regeneration, unsupported character error, mobile, catalogue, search, sitemap, existing PDF routes).");
} finally {
  await browser.close();
}
