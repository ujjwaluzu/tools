import assert from "node:assert/strict";
import test from "node:test";
import { serializeMarkdownTable } from "../src/lib/tools/markdown-table.ts";

test("serializes headers, rows, all alignments, and empty cells", () => {
  assert.equal(serializeMarkdownTable(["Name", "Role", "Score"], [["Ari", "Writer", ""], ["Bo", "Editor", "10"]], ["left", "center", "right"]),
    "| Name | Role | Score |\n| :--- | :---: | ---: |\n| Ari | Writer |  |\n| Bo | Editor | 10 |");
});

test("escapes pipes and backslashes and represents line breaks inside cells", () => {
  assert.equal(serializeMarkdownTable(["A|B", "Path"], [["one\ntwo", "C:\\docs"]]),
    "| A\\|B | Path |\n| :--- | :--- |\n| one<br>two | C:\\\\docs |");
});

test("rejects empty headers, inconsistent rows, and incomplete alignment settings", () => {
  assert.throws(() => serializeMarkdownTable([], []), /at least one column/u);
  assert.throws(() => serializeMarkdownTable(["A", "B"], [["only one"]]), /same number/u);
  assert.throws(() => serializeMarkdownTable(["A", "B"], [], ["left"]), /each table column/u);
});
