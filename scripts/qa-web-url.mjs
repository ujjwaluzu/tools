import assert from "node:assert/strict";
import { chromium } from "patchright";

// Start the app first (npm run dev) or set WEB_URL_BASE_URL to a running instance.
const baseUrl = process.env.WEB_URL_BASE_URL ?? "http://localhost:3000";
const baseOrigin = new URL(baseUrl).origin;
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const attemptedTargets = [];
  await page.route("**/*", async (route) => {
    if (new URL(route.request().url()).origin !== baseOrigin) {
      attemptedTargets.push(route.request().url());
      await route.abort();
      return;
    }
    await route.continue();
  });

  for (const { path, inputSelector, buttonName, url } of [
    { path: "/tools/web-seo/http-status", inputSelector: "#http-status-input", buttonName: "Check in browser", url: "http://127.1/" },
    { path: "/tools/web-seo/http-headers", inputSelector: "input", buttonName: "View accessible headers", url: "http://[fc00::1]/" },
  ]) {
    await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
    await page.locator(inputSelector).first().fill(url);
    await page.getByRole("button", { name: buttonName }).click();
    await page.locator(".error-state").waitFor();
    assert.deepEqual(attemptedTargets, [], `${path} must reject its blocked URL before fetch`);
  }

  console.log("HTTP URL browser QA passed; blocked inputs issued no intercepted target requests.");
} finally {
  await browser.close();
}
