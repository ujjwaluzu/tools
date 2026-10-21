import assert from "node:assert/strict";
import { chromium } from "patchright";

const baseUrl = process.env.EVERYDAY_BASE_URL ?? "http://localhost:3000";
const everydayRoutes = ["calculator", "percentage-calculator", "age-calculator", "tip-calculator", "gst-calculator", "loan-calculator", "date-time", "random-generator"];
const reusedRoutes = ["unit-converter", "date-difference", "timezone-converter", "unix-timestamp", "currency"];
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 375, height: 850 }, permissions: ["clipboard-read", "clipboard-write"] });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.route("https://api.frankfurter.dev/**", (route) => route.fulfill({ json: { date: "2026-10-21", base: "USD", quote: "EUR", rate: 0.89 } }));
  for (const slug of everydayRoutes) {
    const response = await page.goto(`${baseUrl}/tools/everyday/${slug}`, { waitUntil: "networkidle" });
    assert.equal(response?.status(), 200, `${slug} route loads`);
    assert.ok(await page.locator("h1").innerText());
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `${slug} has no mobile overflow`);
  }
  await page.goto(`${baseUrl}/tools/everyday`);
  for (const slug of everydayRoutes) assert.ok(await page.locator(`a[href="/tools/everyday/${slug}"]`).count(), `Everyday category links ${slug}`);
  for (const slug of reusedRoutes) assert.ok(await page.locator(`a[href="/tools/converters/${slug}"]`).count(), `Everyday reuses Converters route ${slug}`);
  await page.goto(`${baseUrl}/tools`);
  const search = page.locator("#tool-search");
  for (const title of ["Calculator", "Percentage Calculator", "Age Calculator", "Date Difference", "Tip Calculator", "GST Calculator", "Loan Calculator", "Timezone Converter", "Unix Timestamp Converter", "Date and Time Utilities", "Unit Converter", "Currency Converter", "Random Generator"]) {
    await search.fill(title); assert.ok(await page.getByRole("link", { name: new RegExp(title, "u") }).count(), `search finds ${title}`);
  }
  await page.goto(`${baseUrl}/tools/everyday/calculator`);
  await page.getByLabel("Calculation").fill("2+3*4");
  assert.match(await page.locator(".everyday-result strong").innerText(), /14/u);
  await page.locator(".result-panel").first().getByRole("button", { name: "Copy result" }).click();
  assert.match(await page.evaluate(() => navigator.clipboard.readText()), /14/u);
  await page.getByRole("button", { name: "Reset" }).click();
  assert.equal(await page.getByLabel("Calculation").inputValue(), "");
  await page.goto(`${baseUrl}/tools/everyday/percentage-calculator`);
  assert.match(await page.locator(".everyday-result strong").innerText(), /30/u);
  await page.goto(`${baseUrl}/tools/converters/date-difference`);
  await page.locator("#start").fill("2024-01-01");
  await page.locator("#end").fill("2024-01-03");
  assert.match(await page.locator(".converter-output output").innerText(), /2 days/u);
  await page.goto(`${baseUrl}/tools/everyday/gst-calculator`);
  await page.getByLabel("Price before GST").fill("100");
  assert.match(await page.locator(".everyday-result strong").last().innerText(), /110/u);
  await page.getByLabel("Price before GST").fill("-1");
  assert.match(await page.locator(".error-state[role=alert]").innerText(), /nonnegative/u);
  await page.goto(`${baseUrl}/tools/everyday/random-generator`);
  await page.getByRole("button", { name: "Generate" }).click();
  assert.ok(await page.locator(".code-result").innerText());
  await page.emulateMedia({ colorScheme: "dark" }); assert.ok(await page.locator("body").isVisible());
  await page.emulateMedia({ colorScheme: "light" }); assert.ok(await page.locator("body").isVisible());
  const sitemap = await page.request.get(`${baseUrl}/sitemap.xml`);
  assert.equal(sitemap.status(), 200);
  for (const slug of everydayRoutes) assert.match(await sitemap.text(), new RegExp(`/tools/everyday/${slug}`, "u"));
  for (const slug of reusedRoutes) assert.match(await sitemap.text(), new RegExp(`/tools/converters/${slug}`, "u"));
  assert.deepEqual(errors, []);
  console.log(`Everyday browser QA passed: ${everydayRoutes.length} new routes and ${reusedRoutes.length} reused routes; category, search, sitemap, arithmetic, percentage, date difference, GST validation, copy, reset, random generation, light/dark, and 375px overflow.`);
} finally { await browser.close(); }
