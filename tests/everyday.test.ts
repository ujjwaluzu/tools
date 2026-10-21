import assert from "node:assert/strict";
import test from "node:test";
import { ageBetween, addCalendarDate, convertUnits, dateDifference, evaluateExpression, gstCalculation, loanCalculation, parseCalendarDate, parseRateResponse, percentage, randomInteger, shuffle, tipCalculation, timestampToDate, zonedDateTimeToUtc } from "../src/lib/tools/everyday.ts";

test("calculator handles precedence, parentheses, unary signs, decimals, and percent", () => {
  assert.equal(evaluateExpression("2+3*4"), 14);
  assert.equal(evaluateExpression("(2+3)*4"), 20);
  assert.equal(evaluateExpression("-2.5 * -4"), 10);
  assert.equal(evaluateExpression("200*10%"), 20);
  assert.equal(evaluateExpression("50%"), 0.5);
  assert.throws(() => evaluateExpression("1/0"), /zero/);
  assert.throws(() => evaluateExpression("2+"));
  assert.throws(() => evaluateExpression("1".repeat(241)), /too long/);
  assert.throws(() => evaluateExpression("(".repeat(34) + "1" + ")".repeat(34)), /nested/);
  assert.throws(() => evaluateExpression("1;alert(1)"));
});

test("percentage modes and zero denominators", () => {
  assert.equal(percentage("of", 15, 200).value, 30);
  assert.equal(percentage("reverse", 30, 200).value, 15);
  assert.equal(percentage("change", 80, 100).value, 25);
  assert.equal(percentage("adjust", 100, -15).value, 85);
  assert.throws(() => percentage("reverse", 2, 0));
  assert.throws(() => percentage("change", 0, 2));
});

test("tip, GST, and amortizing loan calculations", () => {
  assert.deepEqual(tipCalculation(100, 20, 4), { tip: 20, total: 120, perPerson: 30 });
  assert.throws(() => tipCalculation(10, 10, 0));
  assert.deepEqual(gstCalculation(100, 10, false), { base: 100, gst: 10, total: 110 });
  const inclusive = gstCalculation(110, 10, true);
  assert.ok(Math.abs(inclusive.base - 100) < 1e-10); assert.ok(Math.abs(inclusive.gst - 10) < 1e-10);
  assert.ok(Math.abs(loanCalculation(1200, 0, 12).payment - 100) < 1e-9);
  assert.ok(Math.abs(loanCalculation(10000, 12, 12).payment - 888.48788678) < 1e-6);
  assert.throws(() => loanCalculation(-1, 5, 12));
});

test("calendar-only date helpers validate dates, leap days, and month ends", () => {
  assert.throws(() => parseCalendarDate("2023-02-29"));
  assert.deepEqual(ageBetween(parseCalendarDate("2000-02-29"), parseCalendarDate("2021-02-28")), { years: 21, months: 0, days: 0, totalDays: 7670 });
  assert.throws(() => ageBetween(parseCalendarDate("2027-01-01"), parseCalendarDate("2026-01-01")), /future/);
  assert.deepEqual(addCalendarDate(parseCalendarDate("2024-01-31"), 1, "months"), { year: 2024, month: 2, day: 29 });
  assert.deepEqual(addCalendarDate(parseCalendarDate("2023-12-31"), 1, "days"), { year: 2024, month: 1, day: 1 });
  assert.equal(dateDifference(parseCalendarDate("2024-01-01"), parseCalendarDate("2024-01-03")).days, 2);
  assert.equal(dateDifference(parseCalendarDate("2024-01-01"), parseCalendarDate("2024-01-03"), true).days, 3);
  assert.equal(dateDifference(parseCalendarDate("2024-01-03"), parseCalendarDate("2024-01-01")).reversed, true);
});

test("timestamps require an explicit unit and reject unsupported ranges", () => {
  assert.equal(timestampToDate(1, "seconds").getTime(), 1000);
  assert.equal(timestampToDate(1, "milliseconds").getTime(), 1);
  assert.throws(() => timestampToDate(Infinity, "seconds"));
  assert.throws(() => timestampToDate(1e100, "milliseconds"));
});

test("timezone conversion honors offsets and reports DST gaps and overlaps", () => {
  assert.equal(zonedDateTimeToUtc("2024-01-01", "12:00", "Asia/Kolkata").instant.toISOString(), "2024-01-01T06:30:00.000Z");
  assert.equal(zonedDateTimeToUtc("2024-03-10", "02:30", "America/New_York").nonexistent, true);
  const overlap = zonedDateTimeToUtc("2024-11-03", "01:30", "America/New_York");
  assert.equal(overlap.ambiguous, true);
  assert.equal(overlap.instant.toISOString(), "2024-11-03T05:30:00.000Z");
});

test("unit conversions and temperature bounds", () => {
  assert.equal(convertUnits(1, "length", "km", "m"), 1000);
  assert.ok(Math.abs(convertUnits(1, "mass", "lb", "kg") - 0.45359237) < 1e-12);
  assert.ok(Math.abs(convertUnits(convertUnits(23, "temperature", "C", "F"), "temperature", "F", "C") - 23) < 1e-10);
  assert.throws(() => convertUnits(-274, "temperature", "C", "K"), /absolute zero/);
  assert.throws(() => convertUnits(1, "length", "kg", "m"));
});

test("rate schema and unbiased random integer rejection sampling", () => {
  assert.deepEqual(parseRateResponse({ base: "USD", quote: "EUR", rate: 0.9, date: "2026-01-02" }, "USD", "EUR"), { base: "USD", quote: "EUR", rate: 0.9, date: "2026-01-02" });
  assert.throws(() => parseRateResponse({ base: "USD", quote: "EUR", rate: 0, date: "x" }, "USD", "EUR"));
  const stream = [0xffffffff, 7];
  assert.equal(randomInteger(0, 9, () => stream.shift()!), 7);
  assert.throws(() => randomInteger(10, 1, () => 1));
  assert.deepEqual(shuffle(["a", "b", "c"], (max) => max - 1).sort(), ["a", "b", "c"]);
});
