import assert from "node:assert/strict";
import test from "node:test";
import { colorFormats, convertCssLength, convertDuration, convertStorage, convertUnits, dateDifference, jsonToQuery, parseColor, parseCron, parseCurrencyRate, pxToRem, queryToJson, remToEm, timestampFromDate, timestampToDate, zonedDateTimeToUtc } from "../src/lib/tools/converters.ts";

test("font size conversion honors configured root and parent sizes", () => {
  assert.equal(pxToRem(24, 12), 2);
  assert.equal(remToEm(1.5, 16, 24), 1);
  assert.equal(pxToRem(0, 18), 0);
});
test("storage units distinguish decimal and binary powers", () => {
  assert.equal(convertStorage(1_000_000, "B", "MB"), 1);
  assert.equal(convertStorage(1_048_576, "B", "MiB"), 1);
});
test("duration converter preserves fractional durations", () => assert.equal(convertDuration(1500, "milliseconds", "seconds"), 1.5));
test("length and mass conversions use standard reference values", () => {
  assert.equal(convertUnits(1, "length", "in", "cm"), 2.54);
  assert.equal(convertUnits(1, "mass", "kg", "g"), 1000);
});
test("temperature conversion handles affine values and absolute zero", () => {
  assert.equal(convertUnits(32, "temperature", "F", "C"), 0);
  assert.equal(convertUnits(0, "temperature", "C", "K"), 273.15);
  assert.throws(() => convertUnits(-274, "temperature", "C", "K"), /absolute zero/u);
  assert.throws(() => convertUnits(Number.NaN, "length", "m", "cm"), /finite/u);
});
test("CSS lengths require context and identify approximations", () => {
  assert.throws(() => convertCssLength(1, "vw", "px", {}), /viewport/u);
  assert.throws(() => convertCssLength(50, "%", "px", {}), /reference dimension/u);
  assert.deepEqual(convertCssLength(2, "rem", "px", { rootPx: 16 }), { value: 32, exact: false });
  assert.deepEqual(convertCssLength(1, "in", "px", {}), { value: 96, exact: true });
});
test("JSON and query conversion preserve repeats, empties and reserved characters", () => {
  const query = jsonToQuery('{"tag":["a&b","two"],"empty":"","q":"x y"}');
  assert.match(query, /tag=a%26b/u);
  assert.deepEqual(JSON.parse(queryToJson(`?${query}`)), { tag: ["a&b", "two"], empty: "", q: "x y" });
  assert.throws(() => jsonToQuery('{"nested":{"x":1}}'), /Nested objects/u);
  assert.throws(() => jsonToQuery("[]"), /JSON object/u);
  assert.throws(() => queryToJson("bad=%E0%A4%A"), /malformed percent encoding/u);
});
test("cron dialect validates values, lists, ranges and steps while rejecting unsupported syntax", () => {
  assert.equal(parseCron("*/5 9-17 1,15 * 1-5").breakdown.length, 5);
  assert.throws(() => parseCron("60 * * * *"), /between/u);
  assert.throws(() => parseCron("? * * * *"), /Unsupported/u);
  assert.throws(() => parseCron("*/0 * * * *"), /Step/u);
});
test("timestamp parsing and date differences use ISO and calendar semantics", () => {
  assert.equal(timestampFromDate("2024-01-01T00:00:00Z"), 1704067200000);
  assert.equal(timestampToDate(1704067200, "seconds").toISOString(), "2024-01-01T00:00:00.000Z");
  assert.equal(timestampToDate(1704067200000, "milliseconds").toISOString(), "2024-01-01T00:00:00.000Z");
  assert.throws(() => timestampToDate(Number.POSITIVE_INFINITY, "seconds"), /finite/u);
  assert.throws(() => timestampFromDate("not a date"), /valid date/u);
  assert.deepEqual(dateDifference("2024-02-28", "2024-03-01"), { days: 2, weeks: 0, remainingDays: 2, years: 0, months: 0, calendarDays: 2, reversed: false });
  assert.equal(dateDifference("2024-01-01", "2024-01-01").days, 0);
  assert.equal(dateDifference("2024-01-01", "2024-01-01", true).days, 1);
  assert.equal(dateDifference("2024-02-01", "2024-01-31").reversed, true);
});
test("IANA timezone conversion identifies DST gaps and repeats", () => {
  const gap = zonedDateTimeToUtc("2024-03-10", "02:30", "America/New_York");
  assert.equal(gap.nonexistent, true);
  const repeated = zonedDateTimeToUtc("2024-11-03", "01:30", "America/New_York");
  assert.equal(repeated.ambiguous, true);
  assert.equal(repeated.instant.toISOString(), "2024-11-03T05:30:00.000Z");
});
test("currency rates require a dated valid provider response", () => {
  assert.deepEqual(parseCurrencyRate({ date: "2026-10-21", base: "USD", quote: "EUR", rate: 0.9 }, "USD", "EUR"), { base: "USD", quote: "EUR", date: "2026-10-21", rate: 0.9 });
  assert.throws(() => parseCurrencyRate({ date: "2026-10-21", base: "USD", quote: "EUR", rate: null }, "USD", "EUR"), /valid rate/u);
});
test("color conversion covers HEX, RGB, HSL, hue wrap and grayscale", () => {
  assert.deepEqual(parseColor("#abc", "HEX"), { r: 170, g: 187, b: 204 });
  assert.deepEqual(parseColor("hsl(360 100% 50%)", "HSL"), parseColor("#ff0000", "HEX"));
  assert.equal(colorFormats({ r: 128, g: 128, b: 128 }).HSL, "hsl(0 0% 50%)");
  assert.throws(() => parseColor("rgb(256,0,0)", "RGB"), /0 to 255/u);
  assert.throws(() => parseColor("#12345", "HEX"), /3- or 6-digit/u);
});
