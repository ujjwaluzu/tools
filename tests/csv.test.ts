import assert from "node:assert/strict";
import test from "node:test";
import { csvToJson, jsonToCsv } from "../src/lib/tools/developer.ts";
import { MAX_CSV_COLUMNS, MAX_CSV_DATA_ROWS, MAX_CSV_INPUT_BYTES, parseCsv, serializeCsv, serializeSpreadsheetSafeCsv } from "../src/lib/tools/csv.ts";

test("parses simple CSV and quoted commas", () => {
  assert.deepEqual(parseCsv('name,note\nAda,"Hello, world"'), {
    headers: ["name", "note"], rows: [["Ada", "Hello, world"]],
  });
});

test("parses doubled quotes and newlines inside quoted fields", () => {
  assert.deepEqual(parseCsv('name,note\nAda,"She said ""hello""\nand left"'), {
    headers: ["name", "note"], rows: [["Ada", 'She said "hello"\nand left']],
  });
});

test("accepts LF, CRLF, CR and preserves embedded CRLF", () => {
  assert.deepEqual(parseCsv("a,b\r\n1,2\n3,4\r5,6").rows, [["1", "2"], ["3", "4"], ["5", "6"]]);
  assert.deepEqual(parseCsv('a,b\r\n1,"x\r\ny"').rows, [["1", "x\r\ny"]]);
});

test("preserves empty cells and a trailing delimiter", () => {
  assert.deepEqual(parseCsv("a,b,c\n,tail,").rows, [["", "tail", ""]]);
});

test("supports Unicode and an optional leading UTF-8 BOM", () => {
  assert.deepEqual(parseCsv("\uFEFFname,city\nZoë,東京"), { headers: ["name", "city"], rows: [["Zoë", "東京"]] });
});

test("ignores blank physical lines but retains whitespace-only records as data", () => {
  assert.deepEqual(parseCsv("a,b\n\n1,2\n   ,3\n").rows, [["1", "2"], ["   ", "3"]]);
  assert.throws(() => parseCsv("\n\r\n"), /CSV is empty/);
});

test("accepts header-only input and rejects empty input", () => {
  assert.deepEqual(parseCsv("id,name\n"), { headers: ["id", "name"], rows: [] });
  assert.throws(() => parseCsv(""), /CSV is empty/);
});

test("rejects duplicate, whitespace-only, and empty headers with locations", () => {
  assert.throws(() => parseCsv("id,id\n1,2"), /Duplicate CSV header: id \(line 1, column 2\)/);
  assert.throws(() => parseCsv("id,   \n1,2"), /whitespace-only \(line 1, column 2\)/);
  assert.throws(() => parseCsv("id,\n1,"), /headers cannot be empty or whitespace-only/);
  assert.throws(() => parseCsv("id, id \n1,2"), /Duplicate CSV header: id/);
});

test("rejects inconsistent row widths with row locations", () => {
  assert.throws(() => parseCsv("a,b\n1,2\n3",), /Expected 2 fields but found 1 \(line 3, column 2\)/);
});

test("rejects unclosed quoted fields", () => {
  assert.throws(() => parseCsv('a,b\n1,"unfinished'), /ends inside a quoted field \(line 2, column 14\)/);
});

test("rejects quotes that begin after field text", () => {
  assert.throws(() => parseCsv('a,b\n1,ab"c"'), /quote may only begin at the start of a field \(line 2, column 5\)/);
});

test("rejects characters after a closing quote", () => {
  assert.throws(() => parseCsv('a,b\n1,"ok"x'), /Unexpected character after a closing quote \(line 2, column 7\)/);
});

test("enforces configured row and column limits while parsing", () => {
  assert.throws(() => parseCsv("a,b\n1,2", { maxColumns: 1 }), /column limit/);
  assert.throws(() => parseCsv("a\n1\n2", { maxRows: 1 }), /data row limit/);
  assert.throws(() => parseCsv("a\n1", { maxBytes: 2 }), /2 bytes input limit/);
  assert.deepEqual([MAX_CSV_INPUT_BYTES, MAX_CSV_DATA_ROWS, MAX_CSV_COLUMNS], [10 * 1024 * 1024, 25_000, 100]);
});

test("serializes and parses commas, quotes, newlines, Unicode and empty values", () => {
  const table = { headers: ["name", "note", "empty"], rows: [["Zoë", 'a,"b"\nc', ""]] };
  const csv = serializeCsv(table, { lineEnding: "\n" });
  assert.equal(csv, 'name,note,empty\nZoë,"a,""b""\nc",');
  assert.deepEqual(parseCsv(csv), table);
  assert.deepEqual(parseCsv(serializeCsv(table)), table);
});

test("rejects invalid tables during serialization", () => {
  assert.throws(() => serializeCsv({ headers: ["a", "a"], rows: [] }), /headers must be unique/);
  assert.throws(() => serializeCsv({ headers: ["a", "b"], rows: [["only one"]] }), /expected 2/);
});

test("spreadsheet-safe export protects formula prefixes and leading controls", () => {
  const table = {
    headers: ["value"],
    rows: [["=1+1"], [" +SUM(A1:A2)"], ["\t@cmd"], ["\r=cmd"], ["-cmd"], ["-12.5"], ["ordinary"], ["+7"]],
  };
  assert.equal(serializeSpreadsheetSafeCsv(table, { lineEnding: "\n" }), [
    "value", "'=1+1", "' +SUM(A1:A2)", "'\t@cmd", `"'\r=cmd"`, "'-cmd", "-12.5", "ordinary", "'+7",
  ].join("\n"));
  assert.equal(serializeCsv({ headers: ["value"], rows: [["=1+1"]] }, { lineEnding: "\n" }), "value\n=1+1");
});

test("JSON-to-CSV preserves converter behavior and nested value conventions", () => {
  assert.equal(jsonToCsv('[{"name":"Ada","meta":{"active":true},"tags":["a","b"],"count":-2}]'),
    'name,meta.active,tags,count\nAda,true,"[""a"",""b""]",-2');
});

test("JSON-to-CSV can opt into spreadsheet-safe text export without changing numbers", () => {
  assert.equal(jsonToCsv('[{"label":"=SUM(A1:A2)","amount":-2}]', { spreadsheetSafe: true }), "label,amount\n'=SUM(A1:A2),-2");
});

test("JSON-to-CSV treats prototype-named keys as ordinary data", () => {
  assert.equal(jsonToCsv('[{"__proto__":"value"}]'), "__proto__\nvalue");
});

test("CSV-to-JSON preserves quoted values and returns an empty array for header-only CSV", () => {
  assert.equal(csvToJson('name,note\r\nAda,"Hello, ""world"""'), JSON.stringify([{ name: "Ada", note: 'Hello, "world"' }], null, 2));
  assert.equal(csvToJson("id,name\n"), "[]");
});
