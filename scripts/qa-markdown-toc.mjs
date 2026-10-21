import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "patchright";

const baseUrl = process.env.MARKDOWN_TOC_BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ acceptDownloads: true, permissions: ["clipboard-read", "clipboard-write"] });
  const page = await context.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  const response = await page.goto(`${baseUrl}/tools/markdown/toc-generator`, { waitUntil: "networkidle" });
  assert.equal(response?.status(), 200);
  assert.match(await page.title(), /Markdown Table of Contents Generator/u);
  const source = page.locator("#markdown-toc-source");
  const markdown = "# Start\n\n### A/B punctuation!\n\n### A/B punctuation!\n\n#### Next\n\n```md\n# Hidden heading\n```\n\n## **Inline** `code` [link](https://example.com)\n\n## 中文 हिन्दी";
  await source.fill(markdown);
  await page.getByLabel("H4", { exact: true }).check();
  await page.getByRole("button", { name: "Generate TOC" }).click();
  const output = page.locator("#markdown-toc-output");
  let toc = await output.inputValue();
  assert.match(toc, /- \[Start\]\(#start\)/u);
  assert.match(toc, /  - \[A\/B punctuation!\]\(#ab-punctuation\)/u);
  assert.match(toc, /  - \[A\/B punctuation!\]\(#ab-punctuation-1\)/u);
  assert.match(toc, /    - \[Next\]\(#next\)/u);
  assert.match(toc, /\[Inline code link\]\(#inline-code-link\)/u);
  assert.match(toc, /\[中文 हिन्दी\]\(#中文-हिन्दी\)/u);
  assert.doesNotMatch(toc, /Hidden heading/u);
  await page.getByLabel("H1", { exact: true }).uncheck();
  assert.doesNotMatch(await output.inputValue(), /\[Start\]/u);
  await page.getByRole("button", { name: "Copy TOC" }).click();
  toc = await output.inputValue();
  assert.equal((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/gu, "\n"), toc);
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download .md" }).click();
  const download = await downloadEvent;
  assert.equal(download.suggestedFilename(), "table-of-contents.md");
  assert.equal((await readFile(await download.path(), "utf8")).replace(/\r\n/gu, "\n"), toc);

  await page.getByLabel("H2", { exact: true }).uncheck();
  await page.getByLabel("H3", { exact: true }).uncheck();
  await page.getByLabel("H4", { exact: true }).uncheck();
  assert.equal(await output.count(), 0, "output is empty when all levels are excluded");
  await page.getByRole("button", { name: "Generate TOC" }).click();
  await page.getByRole("status").filter({ hasText: /No eligible headings/u }).waitFor();
  await source.fill("");
  await page.getByRole("button", { name: "Generate TOC" }).click();
  await page.getByRole("status").filter({ hasText: /Add Markdown/u }).waitFor();
  await source.fill("x".repeat(1024 * 1024 + 1));
  assert.equal(await page.getByRole("button", { name: "Generate TOC" }).isDisabled(), true);
  await page.setViewportSize({ width: 375, height: 800 });
  assert.equal(await page.evaluate(() => document.scrollingElement.scrollWidth <= innerWidth + 1), true, "375px view has no page overflow");
  await page.getByRole("tab", { name: "TOC" }).click();
  assert.equal(await source.inputValue(), "x".repeat(1024 * 1024 + 1));
  await page.getByRole("tab", { name: "Markdown" }).click();

  for (const route of ["/tools/markdown/editor", "/tools/markdown/to-html", "/tools/markdown/to-markdown", "/tools/markdown/to-pdf"]) {
    const regression = await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
    assert.equal(regression?.status(), 200, `${route} loads`);
  }
  await page.goto(`${baseUrl}/tools/markdown`);
  await page.locator('a[href="/tools/markdown/toc-generator"]').first().waitFor();
  await page.goto(`${baseUrl}/tools`);
  await page.locator("#tool-search").fill("Markdown TOC Generator");
  await page.locator('.search-results a[href="/tools/markdown/toc-generator"]').waitFor();
  const sitemap = await page.request.get(`${baseUrl}/sitemap.xml`);
  assert.match(await sitemap.text(), /\/tools\/markdown\/toc-generator/u);
  assert.deepEqual(errors, []);
  console.log("Markdown TOC browser QA passed (AST heading extraction, hierarchy, duplicates, Unicode, code fence exclusion, levels, copy/download, empty state, limits, mobile, catalogue/search/sitemap, Markdown regressions).");
} finally {
  await browser.close();
}
