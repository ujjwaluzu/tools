import { parseCsv, serializeCsv, serializeSpreadsheetSafeCsv, type CsvCell } from "./csv.ts";

export function jsonError(error: unknown, source: string) {
  const message = error instanceof Error ? error.message : "Invalid JSON.";
  const match = /position (\d+)/i.exec(message);
  if (!match) return message;
  const index = Number(match[1]); const before = source.slice(0, index);
  return `${message} (line ${before.split("\n").length}, column ${index - before.lastIndexOf("\n")}).`;
}

export function flatten(value: unknown, key = "", out: Record<string, CsvCell> = {}): Record<string, CsvCell> {
  if (value === null || typeof value !== "object") { setFlatValue(out, key, value as CsvCell); return out; }
  if (Array.isArray(value)) { setFlatValue(out, key, JSON.stringify(value)); return out; }
  for (const [child, item] of Object.entries(value as Record<string, unknown>)) {
    const flattenedKey = key ? `${key}.${child}` : child;
    if (Object.hasOwn(out, flattenedKey)) throw new Error(`Nested JSON fields produce the same CSV header: ${flattenedKey}`);
    flatten(item, flattenedKey, out);
  }
  return out;
}

function setFlatValue(out: Record<string, CsvCell>, key: string, value: CsvCell): void {
  Object.defineProperty(out, key, { value, enumerable: true, configurable: true, writable: true });
}

export function jsonToCsv(input: string, options: { spreadsheetSafe?: boolean } = {}) {
  const parsed: unknown = JSON.parse(input);
  if (!Array.isArray(parsed) || parsed.some((row) => !row || typeof row !== "object" || Array.isArray(row))) throw new Error("JSON to CSV accepts an array of objects. Nested objects are flattened with dot-separated keys; arrays are JSON strings.");
  if (!parsed.length) throw new Error("JSON to CSV needs at least one object so it can determine the headers.");
  const rows = parsed.map((row) => flatten(row));
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  if (!columns.length) throw new Error("JSON objects need at least one field to create CSV headers.");
  const table = { headers: columns, rows: rows.map((row) => columns.map((column) => row[column] ?? "")) };
  return options.spreadsheetSafe ? serializeSpreadsheetSafeCsv(table) : serializeCsv(table);
}

export function csvToJson(input: string) {
  const table = parseCsv(input);
  return JSON.stringify(table.rows.map((row) => Object.fromEntries(table.headers.map((header, index) => [header, row[index]]))), null, 2);
}

type Infer = { text: string; optional?: boolean };
function infer(value: unknown, name: string, declarations: string[], seen: Set<string>): Infer {
  if (value === null) return { text: "null" }; if (Array.isArray(value)) { const values = [...new Set(value.map((item) => infer(item, `${name}Item`, declarations, seen).text))]; return { text: `(${values.join(" | ") || "unknown"})[]` }; }
  if (typeof value === "object") { const typeName = name.replace(/[^A-Za-z0-9]/g, "") || "Value"; if (!seen.has(typeName)) { seen.add(typeName); const lines = Object.entries(value as Record<string, unknown>).map(([key, item]) => `  ${JSON.stringify(key)}: ${infer(item, `${typeName}${key[0]?.toUpperCase() ?? ""}${key.slice(1)}`, declarations, seen).text};`); declarations.push(`interface ${typeName} {\n${lines.join("\n")}\n}`); } return { text: typeName }; }
  return { text: typeof value === "string" ? "string" : typeof value === "number" ? "number" : typeof value === "boolean" ? "boolean" : "unknown" };
}
export function jsonToTypescript(input: string, root = "Root") { const parsed = JSON.parse(input); const declarations: string[] = []; infer(parsed, root, declarations, new Set()); return declarations.reverse().join("\n\n"); }

export function yaml(value: unknown, depth = 0): string {
  const indent = "  ".repeat(depth); const scalar = (item: unknown) => item === null ? "null" : typeof item === "string" ? JSON.stringify(item) : String(item);
  if (value === null || typeof value !== "object") return scalar(value);
  if (Array.isArray(value)) return value.map((item) => item && typeof item === "object" ? `${indent}-\n${yaml(item, depth + 1)}` : `${indent}- ${scalar(item)}`).join("\n");
  return Object.entries(value as Record<string, unknown>).map(([key, item]) => item && typeof item === "object" ? `${indent}${JSON.stringify(key)}:\n${yaml(item, depth + 1)}` : `${indent}${JSON.stringify(key)}: ${scalar(item)}`).join("\n");
}

export function titleWords(input: string) { return input.trim().replace(/([a-z])([A-Z])/g, "$1 $2").split(/[\s_\-]+/).filter(Boolean); }
export function cronExplain(input: string) { const parts = input.trim().split(/\s+/); if (parts.length !== 5 || parts.some((part) => !/^[\d*/,-]+$/.test(part))) throw new Error("Use five cron fields with numbers, *, lists, ranges, and steps."); const labels = ["minute", "hour", "day of month", "month", "day of week"]; return parts.map((part, index) => `${labels[index]}: ${part === "*" ? "every value" : part}`).join("; "); }
export function base64Url(input: string) { const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - input.length % 4) % 4); return new TextDecoder().decode(Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))); }
