import assert from "node:assert/strict";
import { chromium } from "patchright";

const baseUrl = process.env.CONVERTERS_BASE_URL ?? "http://localhost:3000";
const paths = ["px-rem", "rem-em", "bytes", "milliseconds", "unit-converter", "unix-timestamp", "timezone-converter", "date-difference", "json-query-string", "cron-generator", "cron-explainer", "css-units", "currency"];
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 375, height: 850 }, permissions: ["clipboard-read", "clipboard-write"] });
  const page = await context.newPage();
  const errors = [];
  const outside = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("status of 503 (Service Unavailable)")) errors.push(m.text()); });
  await page.route("https://api.frankfurter.dev/**", async (route) => {
    if (route.request().url().endsWith("/usd/eur")) await route.fulfill({ json: { date: "2026-10-21", base: "USD", quote: "EUR", rate: 0.89 } });
    else await route.fulfill({ status: 422, json: { message: "invalid currency" } });
  });
  page.on("request", (r) => { if (new URL(r.url()).origin !== new URL(baseUrl).origin && !r.url().startsWith("https://api.frankfurter.dev/")) outside.push(r.url()); });
  for (const slug of paths) {
    const response = await page.goto(`${baseUrl}/tools/converters/${slug}`, { waitUntil: "networkidle" });
    assert.equal(response?.status(), 200, `${slug} route loads`);
    assert.ok(await page.locator("h1").innerText());
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `${slug} has no mobile overflow`);
  }
  await page.goto(`${baseUrl}/tools/converters`);
  for (const slug of paths) assert.ok(await page.locator(`a[href="/tools/converters/${slug}"]`).count(), `category links ${slug}`);
  await page.goto(`${baseUrl}/tools`);
  await page.locator("#tool-search").fill("timestamp converter");
  assert.ok(await page.getByRole("link", { name: /Unix Timestamp Converter/u }).count());
  await page.goto(`${baseUrl}/tools/converters/px-rem`);
  await page.locator("#value").fill("32");
  assert.match(await page.locator(".converter-output output").innerText(), /2\.0000 rem/u);
  await page.getByRole("button", { name: "Copy", exact: true }).click();
  assert.match(await page.evaluate(() => navigator.clipboard.readText()), /2\.0000 rem/u);
  await page.goto(`${baseUrl}/tools/converters/cron-explainer`);
  await page.locator("#cron").fill("60 * * * *");
  assert.match(await page.locator(".error-state").innerText(), /between/u);
  await page.goto(`${baseUrl}/tools/converters/unix-timestamp`);
  await page.locator("#timestamp-input").fill("1704067200");
  assert.match(await page.locator(".converter-output").last().innerText(), /2024-01-01T00:00:00\.000Z/u);
  await page.locator("#timestamp-unit").selectOption("milliseconds");
  assert.match(await page.locator(".converter-output").last().innerText(), /1970-01-20/u);
  await page.goto(`${baseUrl}/tools/converters/currency`);
  await page.getByRole("button", { name: "Fetch current rate" }).click();
  await page.getByText(/Source rate date: 2026-10-21/u).waitFor();
  await page.route("https://api.frankfurter.dev/**", (route) => route.fulfill({ status: 503, body: "offline" }));
  await page.getByRole("button", { name: "Fetch current rate" }).click();
  await page.getByText(/Last successful result is stale/u).waitFor();
  await page.emulateMedia({ colorScheme: "dark" });
  assert.ok(await page.locator("body").isVisible());
  await page.emulateMedia({ colorScheme: "light" });
  const sitemap = await page.request.get(`${baseUrl}/sitemap.xml`);
  assert.equal(sitemap.status(), 200);
  for (const slug of paths) assert.match(await sitemap.text(), new RegExp(`/tools/converters/${slug}`, "u"));
  assert.deepEqual(errors, []);
  assert.deepEqual(outside, []);
  console.log("Converters browser QA passed: 13 routes, category/search/sitemap, mobile width, input/error, copy, currency success/stale failure, dark/light rendering, and external-request boundary.");
} finally { await browser.close(); }
