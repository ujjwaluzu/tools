export function jsonError(error: unknown, source: string) {
  const message = error instanceof Error ? error.message : "Invalid JSON.";
  const match = /position (\d+)/i.exec(message);
  if (!match) return message;
  const index = Number(match[1]); const before = source.slice(0, index);
  return `${message} (line ${before.split("\n").length}, column ${index - before.lastIndexOf("\n")}).`;
}

export function flatten(value: unknown, key = "", out: Record<string, string> = {}): Record<string, string> {
  if (value === null || typeof value !== "object") { out[key] = value === null ? "" : String(value); return out; }
  if (Array.isArray(value)) { out[key] = JSON.stringify(value); return out; }
  for (const [child, item] of Object.entries(value as Record<string, unknown>)) flatten(item, key ? `${key}.${child}` : child, out);
  return out;
}

export function jsonToCsv(input: string) {
  const parsed: unknown = JSON.parse(input);
  if (!Array.isArray(parsed) || parsed.some((row) => !row || typeof row !== "object" || Array.isArray(row))) throw new Error("JSON to CSV accepts an array of objects. Nested objects are flattened with dot-separated keys; arrays are JSON strings.");
  const rows = parsed.map((row) => flatten(row)); const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const quote = (value: string) => /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
  return [columns, ...rows.map((row) => columns.map((column) => quote(row[column] ?? "")))].map((row) => row.join(",")).join("\n");
}

export function csvToJson(input: string) {
  const rows: string[][] = []; let row: string[] = []; let field = ""; let quoted = false;
  for (let i = 0; i < input.length; i += 1) { const char = input[i]; const next = input[i + 1];
    if (quoted) { if (char === '"' && next === '"') { field += '"'; i += 1; } else if (char === '"') quoted = false; else field += char; }
    else if (char === '"') { if (field) throw new Error("A quoted field must begin at the start of a value."); quoted = true; }
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n" || char === "\r") { if (char === "\r" && next === "\n") i += 1; row.push(field); rows.push(row); row = []; field = ""; }
    else field += char;
  }
  if (quoted) throw new Error("CSV ends inside a quoted field."); if (field || row.length) { row.push(field); rows.push(row); }
  if (rows.length < 1) throw new Error("Add a header row and at least one CSV row.");
  const headers = rows[0]; if (headers.some((header) => !header.trim())) throw new Error("CSV headers cannot be empty."); if (new Set(headers).size !== headers.length) throw new Error("CSV headers must be unique.");
  if (rows.slice(1).some((item) => item.length !== headers.length)) throw new Error("Every CSV row must contain the same number of fields as the header row.");
  return JSON.stringify(rows.slice(1).map((item) => Object.fromEntries(headers.map((header, index) => [header, item[index]]))), null, 2);
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
