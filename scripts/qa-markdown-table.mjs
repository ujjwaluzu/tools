import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "patchright";

const baseUrl = process.env.MARKDOWN_TABLE_BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ acceptDownloads: true, permissions: ["clipboard-read", "clipboard-write"] });
  const page = await context.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  const response = await page.goto(`${baseUrl}/tools/markdown/table-generator`, { waitUntil: "networkidle" });
  assert.equal(response?.status(), 200);
  assert.match(await page.title(), /Markdown Table Generator/u);
  const output = page.locator("#markdown-table-output");
  assert.match(await output.inputValue(), /\| :--- \| :--- \|/u);
  await page.getByRole("button", { name: "Add row" }).click();
  await page.getByRole("button", { name: "Add column" }).click();
  await page.locator("#markdown-table-header-2").fill("Path|Label");
  await page.locator("#markdown-table-align-1").selectOption("center");
  await page.locator("#markdown-table-align-2").selectOption("right");
  await page.locator("#markdown-table-cell-0-0").fill("one\\two\nnext");
  await page.locator("#markdown-table-cell-0-2").fill("A|B");
  const markdown = await output.inputValue();
  assert.match(markdown, /\| :--- \| :---: \| ---: \|/u);
  assert.match(markdown, /one\\\\two<br>next/u);
  assert.match(markdown, /A\\\|B/u);
  await page.getByRole("button", { name: "Copy Markdown" }).click();
  assert.equal((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/gu, "\n"), markdown);
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download .md" }).click();
  const download = await downloadEvent;
  assert.equal(download.suggestedFilename(), "table.md");
  assert.equal((await readFile(await download.path(), "utf8")).replace(/\r\n/gu, "\n"), markdown);
  await page.getByRole("button", { name: "Remove row 3" }).click();
  await page.getByRole("button", { name: "Remove column 3" }).click();
  assert.doesNotMatch(await output.inputValue(), /Path\\\|Label/u);
  await page.setViewportSize({ width: 375, height: 800 });
  assert.equal(await page.evaluate(() => document.scrollingElement.scrollWidth <= innerWidth + 1), true, "375px view has no page overflow");
  assert.equal(await page.locator(".markdown-table-editor-scroll").evaluate((element) => element.scrollWidth > element.clientWidth), true, "wide editor is bounded in its own scroll area");
  await page.getByRole("button", { name: "Reset table" }).click();
  assert.equal(await page.locator("#markdown-table-header-0").inputValue(), "Feature");
  assert.deepEqual(errors, []);

  await page.goto(`${baseUrl}/tools/markdown`);
  await page.locator('a[href="/tools/markdown/table-generator"]').first().waitFor();
  await page.goto(`${baseUrl}/tools`);
  await page.locator("#tool-search").fill("Markdown Table Generator");
  await page.locator('.search-results a[href="/tools/markdown/table-generator"]').waitFor();
  const sitemap = await page.request.get(`${baseUrl}/sitemap.xml`);
  assert.match(await sitemap.text(), /\/tools\/markdown\/table-generator/u);
  console.log("Markdown Table Generator browser QA passed (escaping, alignment, row/column controls, copy/download, reset, mobile overflow, catalogue/search/sitemap).");
} finally {
  await browser.close();
}
