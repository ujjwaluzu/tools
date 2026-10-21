import assert from "node:assert/strict";
import test from "node:test";
import { parseCsvTable, parseTsv, tableInputToMarkdown } from "../src/lib/tools/table-to-markdown.ts";

test("parses TSV with CRLF, Unix endings, and empty cells without trimming values", () => {
  assert.deepEqual(parseTsv(" Name \tRole\r\nAda\t\r\nBo\t Editor\n").rows, [[" Name ", "Role"], ["Ada", ""], ["Bo", " Editor"]]);
});

test("preserves an all-empty TSV row and reports uneven rows with their row number", () => {
  assert.deepEqual(parseTsv("\t\n\t").rows, [["", ""], ["", ""]]);
  assert.throws(() => parseTsv("a\tb\nc"), /Row 2 has 1 cells; expected 2/u);
});

test("uses the shared CSV parser for quotes, escaped quotes, quoted commas, and quoted newlines", () => {
  assert.deepEqual(parseCsvTable('Name,Note\r\nAda,"said ""hello, world""\nand left"', true).rows,
    [["Name", "Note"], ["Ada", 'said "hello, world"\nand left']]);
});

test("can treat an empty or repeated first CSV row as data when header mode is off", () => {
  assert.deepEqual(parseCsvTable(",,\n1,2,3", false).rows, [["", "", ""], ["1", "2", "3"]]);
  assert.throws(() => parseCsvTable(",,\n1,2,3", true), /headers cannot be empty/u);
});

test("rejects malformed CSV and inconsistent row widths rather than shifting cells", () => {
  assert.throws(() => parseCsvTable('a,b\n1,"unfinished', true), /ends inside a quoted field/u);
  assert.throws(() => parseCsvTable("a,b\n1,2\n3", true), /Expected 2 fields but found 1/u);
});

test("generates headers when the first row contains data and supports optional trimming and alignment", () => {
  assert.equal(tableInputToMarkdown([[" A ", "B|C"], [" x ", " y "]], false, ["center", "right"]),
    "| Column 1 | Column 2 |\n| :---: | ---: |\n|  A  | B\\|C |\n|  x  |  y  |");
  assert.equal(tableInputToMarkdown([[" A ", "B|C"]], false, ["left", "left"], true),
    "| Column 1 | Column 2 |\n| :--- | :--- |\n| A | B\\|C |");
});

test("enforces the 1 MiB input limit", () => {
  assert.throws(() => parseTsv("x".repeat(1024 * 1024 + 1)), /limit is 1\.0 MB/u);
});
