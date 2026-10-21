import assert from "node:assert/strict";
import { chromium } from "patchright";

// Start the app first (npm run dev) or set XML_INSPECTOR_BASE_URL to a running instance.
const baseUrl = process.env.XML_INSPECTOR_BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ acceptDownloads: true, permissions: ["clipboard-read", "clipboard-write"] });
  const page = await context.newPage({ viewport: { width: 1280, height: 900 } });
  const runtimeErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  const response = await page.goto(`${baseUrl}/tools/data/xml-inspector`, { waitUntil: "networkidle" });
  assert.equal(response?.status(), 200, "XML Inspector route should load");
  const input = page.locator("#xml-input");
  const output = page.locator(".code-result");

  async function convert(xml) {
    await input.fill(xml);
    await page.getByRole("button", { name: "Convert to JSON" }).click();
    await output.waitFor();
    return output.innerText();
  }
  async function format(xml) {
    await input.fill(xml);
    await page.getByRole("button", { name: "Format XML" }).click();
    await page.getByText("XML is well formed and formatted.").waitFor();
    return output.innerText();
  }
  async function validate(xml) {
    await input.fill(xml);
    await page.getByRole("button", { name: "Validate XML" }).click();
  }

  await validate("<root/>");
  await page.getByRole("status").filter({ hasText: "XML is well formed" }).waitFor();
  assert.match(await convert("<a><b>text</b></a>"), /"b": "text"/, "nested text maps to JSON");
  assert.match(await convert('<person id="7"><name>Ada</name><tag>one</tag><tag>two</tag></person>'), /"tag": \[\s*"one",\s*"two"\s*\]/, "example and repeated children map to arrays");
  assert.match(await convert("<root><empty/></root>"), /"empty": ""/, "empty elements remain distinct");
  assert.match(await convert('<p:root xmlns:p="urn:test" p:id="7"><p:child>v</p:child></p:root>'), /"p:id": "7"/, "qualified attribute names are retained");
  const declared = await convert('<?xml version="1.0"?><!-- comment --><?work now?><root/>');
  assert.match(declared, /"root": ""/, "declaration is not represented as an element");
  assert.doesNotMatch(declared, /comment|work/, "comments and processing instructions are omitted in JSON");
  assert.match(await convert("<root><![CDATA[a < b]]></root>"), /"root": "a < b"/, "CDATA maps as text");
  assert.match(await convert("<root>before<b/>after</root>"), /"#content": \[\s*"before",\s*\{\s*"b": ""\s*\},\s*"after"/, "mixed content preserves order");

  const pretty = await format('<?xml version="1.0"?><!--c--><?go now?><root><a/><b>text</b></root>');
  assert.match(pretty, /<root>\n  <a\/>\n  <b>text<\/b>\n<\/root>/, "element-only content is indented");
  assert.match(pretty, /<!--c-->/, "comments survive formatting");
  assert.match(pretty, /<\?go now\?>/, "processing instructions survive formatting");
  const cdata = await format("<root><![CDATA[a < b]]></root>");
  assert.match(cdata, /<!\[CDATA\[a < b\]\]>/, "CDATA survives formatting");
  const mixed = await format("<root>before<b/>after</root>");
  assert.equal(mixed, "<root>before<b/>after</root>", "formatting does not inject whitespace into mixed content");

  for (const malformed of ["<root>", "<root><child></root>", "<root><a></b></root>"]) {
    await validate(malformed);
    assert.match(await page.locator(".error-state").innerText(), /Malformed XML/i, `rejects malformed XML: ${malformed}`);
  }
  await validate("");
  assert.match(await page.locator(".error-state").innerText(), /Add XML content/i, "empty input is rejected clearly");

  await page.locator("input[type=file]").first().setInputFiles({
    name: "sample.xml", mimeType: "text/plain", buffer: Buffer.from("\uFEFF<uploaded><ok/></uploaded>"),
  });
  await page.waitForFunction(() => document.querySelector("#xml-input")?.value === "<uploaded><ok/></uploaded>");
  await page.getByRole("button", { name: "Validate XML" }).click();
  await page.getByRole("status").filter({ hasText: "XML is well formed" }).waitFor();
  assert.match(await format("<uploaded><ok/></uploaded>"), /<uploaded>/, "upload content is XML-parsed regardless of MIME and accepts BOM");
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download" }).click();
  assert.equal((await downloadEvent).suggestedFilename(), "formatted.xml");
  await page.getByRole("button", { name: "Copy" }).click();
  assert.match(await page.evaluate(() => navigator.clipboard.readText()), /<uploaded>/, "copy returns the generated output");

  await format("<root/>");
  await input.fill("<changed/>");
  await output.waitFor({ state: "detached" });
  await page.getByRole("button", { name: "Clear" }).click();
  assert.equal(await input.inputValue(), "", "clear resets the editor");

  await validate(`<r>${"<x>".repeat(256)}${"</x>".repeat(256)}</r>`);
  assert.match(await page.locator(".error-state").innerText(), /256-element limit/, "nesting over 256 elements is rejected");
  await validate("x".repeat(5 * 1024 * 1024 + 1));
  assert.match(await page.locator(".error-state").innerText(), /limit is/, "oversized input is rejected before parsing");

  await page.setViewportSize({ width: 360, height: 800 });
  assert.equal(await page.evaluate(() => document.scrollingElement.scrollWidth > innerWidth + 1), false, "narrow viewport has no horizontal overflow");

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${baseUrl}/tools/web/sitemap-validator`, { waitUntil: "networkidle" });
  await page.locator("textarea").first().fill('<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://example.com/</loc></url></urlset>');
  await page.getByRole("button", { name: "Validate sitemap" }).click();
  await page.getByText(/Valid XML sitemap structure/).waitFor();
  assert.deepEqual(runtimeErrors, [], "XML Inspector has no browser runtime errors");
  console.log("XML Inspector browser QA passed (format, validation, conversion, upload, exports, limits, mobile, sitemap regression).");
} finally {
  await browser.close();
}
