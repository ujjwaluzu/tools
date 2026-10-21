import assert from "node:assert/strict";
import test from "node:test";
import { assertXmlInputSize, MAX_XML_INPUT_BYTES, MAX_XML_NESTING, stripUtf8Bom } from "../src/lib/tools/xml.ts";

test("accepts input at the byte limit and rejects content above it without truncating", () => {
  assert.equal(assertXmlInputSize("12345", 5), 5);
  assert.throws(() => assertXmlInputSize("123456", 5), /limit is/);
  assert.equal(MAX_XML_INPUT_BYTES, 5 * 1024 * 1024);
});

test("measures UTF-8 bytes rather than JavaScript character count", () => {
  assert.equal(assertXmlInputSize("é", 2), 2);
  assert.throws(() => assertXmlInputSize("é", 1), /input is/);
});

test("strips only an optional leading UTF-8 BOM", () => {
  assert.equal(stripUtf8Bom("\uFEFF<root/>"), "<root/>");
  assert.equal(stripUtf8Bom(" <root/>"), " <root/>");
  assert.equal(stripUtf8Bom("<root>\uFEFF</root>"), "<root>\uFEFF</root>");
});

test("uses the documented nesting cap", () => {
  assert.equal(MAX_XML_NESTING, 256);
});
