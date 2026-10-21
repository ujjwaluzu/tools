import assert from "node:assert/strict";
import { chromium } from "patchright";
import { PDFDocument, StandardFonts } from "pdf-lib";

const baseUrl = process.env.PDF_INSPECTOR_BASE_URL ?? "http://localhost:3000";
async function fixture(title = "Browser QA PDF", pageCount = 3) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(title); pdf.setAuthor("QA author");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (let index = 0; index < pageCount; index += 1) {
    const page = pdf.addPage(index === 1 ? [600, 400] : [300, 400]);
    if (index !== 2) page.drawText(index === 0 ? "First selectable page" : index === 1 ? "Second selectable page" : `Text page ${index + 1}`, { x: 30, y: 340, font });
  }
  return Buffer.from(await pdf.save());
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ acceptDownloads: true, permissions: ["clipboard-read", "clipboard-write"] });
  const page = await context.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto(`${baseUrl}/tools/pdf/inspect`, { waitUntil: "networkidle" });
  assert.equal(response?.status(), 200, "PDF Inspector route should load");
  const upload = page.locator("input[type=file]").first();
  await upload.setInputFiles({ name: "qa.pdf", mimeType: "application/pdf", buffer: await fixture() });
  await page.getByText("3 pages", { exact: true }).first().waitFor();
  assert.match(await page.locator(".file-info-section").nth(1).innerText(), /Browser QA PDF/);
  assert.match(await page.locator(".file-info-section").nth(1).innerText(), /QA author/);
  assert.match(await page.locator(".pdf-inspector-table-wrap").innerText(), /Landscape/);
  await page.locator("#pdf-inspector-range").fill("2, 3");
  await page.getByRole("button", { name: "Extract selected pages" }).click();
  await page.locator(".pdf-extracted-text").waitFor();
  const extracted = await page.locator(".pdf-extracted-text").inputValue();
  assert.match(extracted, /--- Page 2 ---[\s\S]*Second selectable page/);
  assert.match(extracted, /--- Page 3 ---[\s\S]*No selectable text/);
  await page.getByRole("button", { name: "Copy" }).click();
  assert.match(await page.evaluate(() => navigator.clipboard.readText()), /--- Page 2 ---/);
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: /Download/ }).click();
  assert.equal((await downloadEvent).suggestedFilename(), "qa-text.txt");
  await upload.setInputFiles({ name: "long.pdf", mimeType: "application/pdf", buffer: await fixture("Long extraction", 150) });
  await page.getByText("150 pages", { exact: true }).first().waitFor();
  await page.getByRole("button", { name: "Extract selected pages" }).click();
  await upload.setInputFiles({ name: "replacement.pdf", mimeType: "application/pdf", buffer: await fixture("Replacement") });
  await page.getByText("replacement.pdf", { exact: false }).first().waitFor();
  assert.equal(await page.locator(".pdf-extracted-text").count(), 0, "replacement clears stale extracted output");
  await page.getByRole("button", { name: "Clear file and results" }).click();
  await page.getByText("Choose a PDF to inspect").waitFor();
  await upload.setInputFiles({ name: "spoof.pdf", mimeType: "application/pdf", buffer: Buffer.from("not a PDF") });
  await page.getByRole("alert").filter({ hasText: /signature/i }).waitFor();
  assert.match(await page.locator(".file-info-section").first().innerText(), /spoof\.pdf/);
  await page.getByRole("button", { name: "Clear file and results" }).click();
  await page.setViewportSize({ width: 360, height: 800 });
  assert.equal(await page.evaluate(() => document.scrollingElement.scrollWidth > innerWidth + 1), false, "narrow viewport has no horizontal overflow");
  for (const route of ["merge", "split", "images-to-pdf", "to-png", "to-jpg"]) {
    const regression = await page.goto(`${baseUrl}/tools/pdf/${route}`, { waitUntil: "domcontentloaded" });
    assert.equal(regression?.status(), 200, `${route} PDF route should remain available`);
  }
  await page.goto(`${baseUrl}/tools/pdf`, { waitUntil: "domcontentloaded" });
  await page.locator('a[href="/tools/pdf/inspect"]').first().waitFor();
  await page.goto(`${baseUrl}/tools`, { waitUntil: "domcontentloaded" });
  await page.locator("#tool-search").fill("PDF Inspector");
  await page.locator('.search-results a[href="/tools/pdf/inspect"]').waitFor();
  await page.request.get(`${baseUrl}/sitemap.xml`).then(async (sitemap) => {
    assert.equal(sitemap.status(), 200);
    assert.match(await sitemap.text(), /\/tools\/pdf\/inspect/);
  });
  assert.deepEqual(errors, [], "PDF Inspector has no browser runtime errors");
  console.log("PDF Inspector browser QA passed (catalogue, search, sitemap, upload, signature error, metadata, varying sizes, text selection, empty page, copy, download, replacement, reset, mobile, existing PDF routes).");
} finally {
  await browser.close();
}
