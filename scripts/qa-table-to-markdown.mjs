import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "patchright";

const baseUrl = process.env.TABLE_MARKDOWN_BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ acceptDownloads: true, permissions: ["clipboard-read", "clipboard-write"] });
  const page = await context.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  const externalRequests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("request", (request) => { if (/external\.example/u.test(request.url())) externalRequests.push(request.url()); });
  const response = await page.goto(`${baseUrl}/tools/markdown/table-to-markdown`, { waitUntil: "networkidle" });
  assert.equal(response?.status(), 200);
  assert.match(await page.title(), /Table to Markdown Converter/u);
  const source = page.locator("#table-markdown-source");
  await source.fill("Name\tNote\r\nAda\t\r\nBo\t Editor");
  await page.getByRole("button", { name: "Convert to Markdown" }).click();
  const output = page.locator("#table-markdown-output");
  assert.match(await output.inputValue(), /\| Ada \|  \|/u);
  assert.match(await page.getByRole("status").textContent(), /3 rows and 2 columns/u);
  await page.locator(".table-markdown-alignments select").nth(1).selectOption("center");
  assert.match(await output.inputValue(), /\| :--- \| :---: \|/u);
  const markdown = await output.inputValue();
  await page.getByRole("button", { name: "Copy Markdown" }).click();
  assert.equal((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/gu, "\n"), markdown);
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download .md" }).click();
  const download = await downloadEvent;
  assert.equal(download.suggestedFilename(), "table.md");
  assert.equal((await readFile(await download.path(), "utf8")).replace(/\r\n/gu, "\n"), markdown);

  await page.locator("#table-markdown-format").selectOption("csv");
  await source.fill('Name,Note\nAda,"said ""hello, world""\nand left"');
  await page.getByRole("button", { name: "Convert to Markdown" }).click();
  assert.match(await output.inputValue(), /said "hello, world"/u);
  assert.match(await output.inputValue(), /<br>and left/u);
  await page.getByLabel("First row is the header").uncheck();
  await source.fill(",,\n1,2,3");
  await page.getByRole("button", { name: "Convert to Markdown" }).click();
  assert.match(await output.inputValue(), /\| Column 1 \| Column 2 \| Column 3 \|/u);
  assert.match(await output.inputValue(), /\|  \|  \|  \|/u);
  await page.getByLabel("First row is the header").check();
  await source.fill("A,B\n1,2\n3");
  await page.getByRole("button", { name: "Convert to Markdown" }).click();
  await page.getByRole("alert").filter({ hasText: /Expected 2 fields but found 1/u }).waitFor();

  await page.locator("#table-markdown-format").selectOption("tsv");
  await source.fill("a\tb\nc");
  await page.getByRole("button", { name: "Convert to Markdown" }).click();
  await page.getByRole("alert").filter({ hasText: /Row 2 has 1 cells; expected 2/u }).waitFor();
  await page.locator("#table-markdown-format").selectOption("html");
  await source.fill('<table><tr><th>Name</th><th>Note</th></tr><tr><td>Ada<script>window.__tablePwned=true</script><img src="https://external.example/track.png" onerror="window.__tablePwned=true"></td><td><a href="javascript:alert(1)">A|B</a></td></tr></table><iframe src="https://external.example/frame"></iframe>');
  await page.getByRole("button", { name: "Convert to Markdown" }).click();
  assert.match(await output.inputValue(), /Ada \| A\\\|B/u);
  assert.doesNotMatch(await output.inputValue(), /window\.__tablePwned|javascript:|track\.png/u);
  assert.equal(await page.evaluate(() => window.__tablePwned), undefined);
  assert.deepEqual(externalRequests, []);
  await source.fill("<p>no table</p>");
  await page.getByRole("button", { name: "Convert to Markdown" }).click();
  await page.getByRole("alert").filter({ hasText: /No HTML table was found/u }).waitFor();

  await source.fill("x".repeat(1024 * 1024 + 1));
  assert.equal(await page.getByRole("button", { name: "Convert to Markdown" }).isDisabled(), true);
  await page.setViewportSize({ width: 375, height: 800 });
  assert.equal(await page.evaluate(() => document.scrollingElement.scrollWidth <= innerWidth + 1), true, "375px view has no page overflow");
  await page.getByRole("tab", { name: "Markdown" }).click();
  assert.equal(await source.inputValue(), "x".repeat(1024 * 1024 + 1));
  await page.getByRole("tab", { name: "Input" }).click();

  for (const route of ["/tools/markdown/editor", "/tools/markdown/to-html", "/tools/markdown/to-markdown", "/tools/data/csv-viewer"]) {
    const regression = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
    assert.equal(regression?.status(), 200, `${route} loads`);
  }
  await page.goto(`${baseUrl}/tools/markdown`);
  await page.locator('a[href="/tools/markdown/table-to-markdown"]').first().waitFor();
  await page.goto(`${baseUrl}/tools`);
  await page.locator("#tool-search").fill("Table to Markdown");
  await page.locator('.search-results a[href="/tools/markdown/table-to-markdown"]').waitFor();
  const sitemap = await page.request.get(`${baseUrl}/sitemap.xml`);
  assert.match(await sitemap.text(), /\/tools\/markdown\/table-to-markdown/u);
  assert.deepEqual(errors, []);
  console.log("Table-to-Markdown browser QA passed (TSV/CSV, escaped multiline and empty cells, inert HTML/security, alignment, copy/download, errors/limits, mobile, category/search/sitemap, Markdown/Data regressions).");
} finally {
  await browser.close();
}
