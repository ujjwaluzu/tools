import { MAX_CSV_COLUMNS, MAX_CSV_DATA_ROWS, parseCsv } from "./csv.ts";
import { formatMarkdownBytes, MAX_MARKDOWN_INPUT_BYTES } from "./markdown.ts";
import { serializeMarkdownTable, type MarkdownTableAlignment } from "./markdown-table.ts";

export type TableInputFormat = "tsv" | "csv" | "html";
export type ParsedTableInput = { rows: string[][]; warning?: string };
const MAX_TABLE_ROWS = MAX_CSV_DATA_ROWS + 1;

function validateTableSize(source: string): void {
  const bytes = new TextEncoder().encode(source).byteLength;
  if (bytes > MAX_MARKDOWN_INPUT_BYTES) throw new RangeError(`Input is ${formatMarkdownBytes(bytes)}. The limit is ${formatMarkdownBytes(MAX_MARKDOWN_INPUT_BYTES)}.`);
}

function validateRows(rows: string[][]): ParsedTableInput {
  if (rows.length === 0) throw new RangeError("No table data was found. Paste at least one row.");
  if (rows.length > MAX_TABLE_ROWS) throw new RangeError(`Input exceeds the ${MAX_CSV_DATA_ROWS.toLocaleString()} row limit.`);
  const width = rows[0]?.length ?? 0;
  if (width === 0) throw new RangeError("The table must contain at least one column.");
  if (width > MAX_CSV_COLUMNS) throw new RangeError(`Input exceeds the ${MAX_CSV_COLUMNS} column limit.`);
  const mismatch = rows.findIndex((row) => row.length !== width);
  if (mismatch >= 0) throw new RangeError(`Row ${mismatch + 1} has ${rows[mismatch].length} cells; expected ${width}. Add or remove delimiters so every row has the same number of columns.`);
  return { rows };
}

export function parseTsv(source: string): ParsedTableInput {
  validateTableSize(source);
  const normalized = source.replace(/^\uFEFF/u, "");
  if (!normalized.trim() && !normalized.includes("\t")) throw new RangeError("TSV input is empty.");
  const lines = normalized.split(/\r\n|\r|\n/u);
  if (/(?:\r\n|\r|\n)$/u.test(normalized)) lines.pop();
  return validateRows(lines.map((line) => line.split("\t")));
}

export function parseCsvTable(source: string, firstRowIsHeader: boolean): ParsedTableInput {
  validateTableSize(source);
  if (!source.trim()) throw new RangeError("CSV input is empty.");
  const parsed = parseCsv(source, {
    maxBytes: MAX_MARKDOWN_INPUT_BYTES,
    maxRows: MAX_CSV_DATA_ROWS,
    maxColumns: MAX_CSV_COLUMNS,
    validateHeaders: firstRowIsHeader,
  });
  return { rows: [parsed.headers, ...parsed.rows] };
}

/** Parse HTML in an inert document and extract text only; never attach it to the live DOM. */
export function parseHtmlTable(source: string, firstRowIsHeader: boolean): ParsedTableInput {
  validateTableSize(source);
  if (!source.trim()) throw new RangeError("HTML input is empty.");
  const document = new DOMParser().parseFromString(source, "text/html");
  const table = document.querySelector("table");
  if (!table) throw new RangeError("No HTML table was found. Include a <table> with at least one row.");
  table.querySelectorAll("script,style,iframe,object,embed,svg,math,template,form,button,input,textarea,select,video,audio").forEach((element) => element.remove());
  const rows = Array.from(table.rows, (row) => Array.from(row.cells, (cell) => cell.textContent ?? ""));
  const checked = validateRows(rows);
  return { ...checked, warning: firstRowIsHeader ? undefined : "The first row will be included as data; column labels will be generated." };
}

export function tableInputToMarkdown(rows: readonly (readonly string[])[], firstRowIsHeader: boolean, alignments: readonly MarkdownTableAlignment[], trimValues = false): string {
  if (!rows.length) throw new RangeError("No table data was found.");
  const cells = trimValues ? rows.map((row) => row.map((cell) => cell.trim())) : rows.map((row) => [...row]);
  const width = cells[0].length;
  if (width === 0 || cells.some((row) => row.length !== width)) throw new RangeError("Table rows must have the same nonzero number of columns.");
  const headers = firstRowIsHeader ? cells[0] : Array.from({ length: width }, (_, index) => `Column ${index + 1}`);
  const body = firstRowIsHeader ? cells.slice(1) : cells;
  return serializeMarkdownTable(headers, body, alignments);
}
