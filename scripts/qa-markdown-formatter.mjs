import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "patchright";

const baseUrl = process.env.MARKDOWN_FORMATTER_BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ acceptDownloads: true, permissions: ["clipboard-read", "clipboard-write"] });
  const page = await context.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  const externalRequests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("request", (request) => { if (/example\.com/u.test(request.url())) externalRequests.push(request.url()); });
  const response = await page.goto(`${baseUrl}/tools/markdown/formatter`, { waitUntil: "networkidle" });
  assert.equal(response?.status(), 200);
  assert.match(await page.title(), /Markdown Formatter/u);
  const source = page.locator("#markdown-formatter-source");
  const input = "# Title\nparagraph   with **bold**\n- first\n   - nested\n\n~~~js\nconst  value = `two  spaces`;\n  keep indentation\n~~~\n\n|a|b|\n|--|--:|\n|x|y|\n\n[Safe](https://example.com/a_(b)?x=1&y=2)";
  await source.fill(input);
  await page.getByRole("button", { name: "Format Markdown" }).click();
  const output = page.locator("#markdown-formatter-output");
  let formatted = await output.inputValue();
  assert.match(formatted, /^# Title\n\nparagraph/u);
  assert.match(formatted, /- first\n  - nested/u);
  assert.match(formatted, /const  value = `two  spaces`;\n  keep indentation/u);
  assert.match(formatted, /\| a \|  b \|\n\| - \| -: \|\n\| x \|  y \|/u);
  await page.getByRole("button", { name: "Copy", exact: true }).click();
  assert.equal((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/gu, "\n"), formatted);
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download .md" }).click();
  const download = await downloadEvent;
  assert.equal(download.suggestedFilename(), "formatted.md");
  assert.equal((await readFile(await download.path(), "utf8")).replace(/\r\n/gu, "\n"), formatted);

  await source.fill("# Equation\n\nInline $x_{a}$ and display:\n\n$$\nx^2 + y^2\n$$");
  await page.getByRole("button", { name: "Format Markdown" }).click();
  assert.equal(await page.locator("#markdown-formatter-output").inputValue(), await source.inputValue());
  await page.getByRole("status").filter({ hasText: /math notation was detected/iu }).waitFor();
  await source.fill("# Raw HTML\n\n<script>window.__formatterPwned=true</script>");
  await page.getByRole("button", { name: "Format Markdown" }).click();
  assert.equal(await page.evaluate(() => window.__formatterPwned), undefined);
  assert.match(await page.locator("#markdown-formatter-output").inputValue(), /<script>window\.__formatterPwned=true<\/script>/u);
  await source.fill("[unsafe](javascript:alert(1))");
  await page.getByRole("button", { name: "Format Markdown" }).click();
  await page.getByRole("alert").filter({ hasText: /unsafe link URL/u }).waitFor();
  await source.fill("![remote](https://example.com/image.png)");
  await page.getByRole("button", { name: "Format Markdown" }).click();
  await page.getByRole("alert").filter({ hasText: /relative image path/u }).waitFor();
  assert.deepEqual(externalRequests, []);
  await source.fill("");
  await page.getByRole("button", { name: "Format Markdown" }).click();
  await page.getByRole("alert").filter({ hasText: /Add Markdown/u }).waitFor();
  await source.fill("x".repeat(1024 * 1024 + 1));
  assert.equal(await page.getByRole("button", { name: "Format Markdown" }).isDisabled(), true);
  await page.setViewportSize({ width: 375, height: 800 });
  assert.equal(await page.evaluate(() => document.scrollingElement.scrollWidth <= innerWidth + 1), true, "375px view has no page overflow");
  await page.getByRole("tab", { name: "Formatted" }).click();
  assert.equal(await source.inputValue(), "x".repeat(1024 * 1024 + 1));
  await page.getByRole("tab", { name: "Input" }).click();

  for (const route of ["/tools/markdown/editor", "/tools/markdown/to-html", "/tools/markdown/to-markdown", "/tools/markdown/toc-generator"]) {
    const regression = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
    assert.equal(regression?.status(), 200, `${route} loads`);
  }
  await page.goto(`${baseUrl}/tools/markdown`);
  await page.locator('a[href="/tools/markdown/formatter"]').first().waitFor();
  await page.goto(`${baseUrl}/tools`);
  await page.locator("#tool-search").fill("Markdown Formatter");
  await page.locator('.search-results a[href="/tools/markdown/formatter"]').waitFor();
  const sitemap = await page.request.get(`${baseUrl}/sitemap.xml`);
  assert.match(await sitemap.text(), /\/tools\/markdown\/formatter/u);
  assert.deepEqual(errors, []);
  console.log("Markdown Formatter browser QA passed (block/GFM formatting, preserved code and raw text, math passthrough, safe URLs, copy/download, empty/input limits, mobile, catalogue/search/sitemap, Markdown regressions).");
} finally {
  await browser.close();
}
