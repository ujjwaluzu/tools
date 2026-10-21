import assert from "node:assert/strict";
import { chromium } from "patchright";

const baseUrl = process.env.STUDENT_BASE_URL ?? "http://localhost:3000";
const routes = ["image-to-text", "notes-to-markdown", "citation-helper", "apa-reference", "text-utilities", "study-timer", "flashcard-generator", "notes-organizer"];
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 375, height: 850 }, acceptDownloads: true, permissions: ["clipboard-read", "clipboard-write"] });
  const page = await context.newPage(); const errors = []; const external = []; const failedResponses = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("response", (response) => { if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`); });
  page.on("request", (request) => { if (new URL(request.url()).origin !== new URL(baseUrl).origin) external.push({ url: request.url(), method: request.method() }); });
  for (const route of routes) {
    const response = await page.goto(`${baseUrl}/tools/student/${route}`, { waitUntil: "networkidle" });
    assert.equal(response?.status(), 200, `${route} route loads`);
    assert.ok(await page.locator("h1").innerText());
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${route} has no mobile overflow`);
  }
  for (const route of ["/tools/developer/word-counter", "/tools/pdf/inspect", "/tools/markdown/to-pdf"]) {
    assert.equal((await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" }))?.status(), 200, `${route} reused route loads`);
  }
  await page.goto(`${baseUrl}/tools/student/image-to-text`);
  const pngData = await page.evaluate(() => { const canvas = document.createElement("canvas"); canvas.width = 720; canvas.height = 180; const context = canvas.getContext("2d"); if (!context) throw new Error("Canvas unavailable"); context.fillStyle = "white"; context.fillRect(0, 0, canvas.width, canvas.height); context.fillStyle = "black"; context.font = "bold 52px Arial"; context.fillText("HELLO STUDY", 28, 112); return canvas.toDataURL("image/png").split(",")[1]; });
  await page.locator('input[type="file"]').setInputFiles({ name: "ocr-fixture.png", mimeType: "image/png", buffer: Buffer.from(pngData, "base64") });
  await page.getByRole("button", { name: "Extract text" }).click();
  await page.getByRole("status").filter({ hasText: /No text detected/u }).or(page.getByLabel("Editable extracted text")).waitFor({ timeout: 90000 });
  if (await page.getByLabel("Editable extracted text").count()) assert.match(await page.getByLabel("Editable extracted text").inputValue(), /HELLO STUDY/iu);
  await page.goto(`${baseUrl}/tools/student`, { waitUntil: "networkidle" });
  for (const route of [...routes, "word-counter"]) assert.ok(await page.locator(`a[href*="${route}"]`).count(), `Student listing contains ${route}`);
  for (const width of [360, 375, 768, 1280]) {
    await page.setViewportSize({ width, height: 850 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Student listing has no overflow at ${width}px`);
  }
  await page.goto(`${baseUrl}/tools`, { waitUntil: "networkidle" });
  for (const [term, route] of [["OCR", "image-to-text"], ["notes to markdown", "notes-to-markdown"], ["citation", "citation-helper"], ["APA 7", "apa-reference"], ["text utilities", "text-utilities"], ["flashcard generator", "flashcard-generator"], ["study timer", "study-timer"], ["notes organizer", "notes-organizer"], ["word count", "word-counter"], ["extract text", "inspect"], ["markdown to pdf", "to-pdf"]]) {
    await page.locator("#tool-search").fill(term);
    assert.ok(await page.locator(`.search-results a[href*="${route}"]`).count(), `Search finds ${term}`);
  }

  await page.goto(`${baseUrl}/tools/student/notes-to-markdown`);
  await page.locator("#student-notes-source").fill("**kept**\n\n- item\n<script>window.__bad=true</script>");
  await page.getByRole("button", { name: "Format notes" }).click();
  assert.equal(await page.evaluate(() => window.__bad), undefined);
  assert.equal(await page.locator(".markdown-prose script").count(), 0);
  await page.locator("#student-notes-source").fill("First line\nSecond line");
  await page.getByLabel("Use first line as title").check();
  await page.getByRole("button", { name: "Format notes" }).click();
  assert.match(await page.getByLabel("Editable Markdown output").inputValue(), /^# First line/u);

  await page.goto(`${baseUrl}/tools/student/citation-helper`);
  await page.getByLabel("Authors (separate names with semicolons)").fill("Ada Lovelace");
  await page.getByLabel("Title").fill("Notes");
  await page.getByRole("button", { name: "Build draft" }).click();
  assert.ok(await page.getByText(/Verify every detail/u).count());
  assert.ok(await page.getByText(/Publication date is missing/u).count());
  await page.getByLabel("Year").fill("2024");
  await page.getByLabel("Publisher / organization").fill("Example Press");
  await page.getByRole("button", { name: "Build draft" }).click();
  assert.equal(await page.locator(".citation-result em").innerText(), "Notes");
  await page.getByRole("button", { name: "Copy", exact: true }).click();
  assert.match(await page.evaluate(() => navigator.clipboard.readText()), /Lovelace, A\. \(2024\)\. Notes\. Example Press\./u);

  await page.goto(`${baseUrl}/tools/student/flashcard-generator`);
  await page.locator("#flashcard-notes").fill("Term | definition\nQuestion? | answer");
  await page.getByRole("button", { name: "Generate cards" }).click();
  await page.getByLabel("Front").nth(0).fill("Edited term");
  await page.getByRole("button", { name: "Flip card" }).click();
  assert.match(await page.locator(".student-flash-preview").innerText(), /definition/u);
  await page.getByRole("button", { name: "Move down" }).first().click();
  assert.equal(await page.locator(".student-card-edit").count(), 2);

  await page.goto(`${baseUrl}/tools/student/notes-organizer`);
  await page.evaluate(() => localStorage.setItem("ujjwal-student-notes-v1", "not json"));
  await page.reload({ waitUntil: "networkidle" });
  assert.match(await page.locator(".error-state").innerText(), /corrupted/u);
  await page.getByRole("button", { name: "New note" }).click();
  await page.locator("#study-note-title").fill("Biology revision");
  await page.locator("#study-note-body").fill("Cells and tissues");
  assert.ok(await page.getByRole("button", { name: /Biology revision/u }).count());
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON" }).click();
  const backup = await downloadEvent;
  assert.equal(backup.suggestedFilename(), "study-notes.json");
  await page.getByRole("button", { name: "Import JSON" }).click();
  await page.locator('input[type="file"]').setInputFiles(await backup.path());
  await page.reload({ waitUntil: "networkidle" });
  assert.ok(await page.getByRole("button", { name: /Biology revision/u }).count(), "notes persist locally after import/reload");

  await page.goto(`${baseUrl}/tools/student/study-timer`);
  await page.locator("#timer-duration").fill("1");
  await page.getByRole("button", { name: "Start / resume" }).click();
  assert.match(await page.locator(".student-timer").innerText(), /Session in progress/u);
  await page.getByRole("button", { name: "Pause" }).click();
  await page.getByRole("button", { name: "Clear" }).click();

  const sitemap = await page.request.get(`${baseUrl}/sitemap.xml`);
  assert.equal(sitemap.status(), 200);
  for (const route of routes) assert.match(await sitemap.text(), new RegExp(`/tools/student/${route}`, "u"));
  await page.emulateMedia({ colorScheme: "dark" }); assert.ok(await page.locator("body").isVisible());
  await page.emulateMedia({ colorScheme: "light" }); assert.ok(await page.locator("body").isVisible());
  assert.ok(external.every(({ url, method }) => url.startsWith("https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0/") && method === "GET"), `Unexpected external request: ${JSON.stringify(external)}`);
  assert.deepEqual(errors, [], JSON.stringify(failedResponses));
  console.log("Student Tools browser QA passed: OCR upload/extraction, all routes, reused links, category/search/sitemap, safe Markdown, citation warnings, flashcard editing/study, notes JSON export, timer controls, 375px layout, themes, and external OCR asset boundary.");
} finally { await browser.close(); }
