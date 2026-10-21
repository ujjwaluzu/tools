# Developer Tools

## JSON

Formatter, validator, minifier, JSON → CSV, CSV → JSON, JSON → TypeScript, JSON → YAML.

## Text

Word count, character count, case converter, remove duplicate lines, sort lines, remove empty lines, find/replace, diff checker.

## Encoding

Base64 encode/decode, URL encode/decode, JWT decoder, HTML entity encode/decode, Unicode converter.

## Web

URL parser, query-string parser, HTTP status checker, user-agent parser, robots.txt tester, sitemap validator.

## Other

Regex tester, UUID generator, hash generator, cron helper.

Pure transformations should happen locally when possible.

## CSV conversion behavior

`JSON to CSV` and `CSV to JSON` share the parser and serializer in `src/lib/tools/csv.ts` with the Data-category CSV Viewer & Cleaner.

- CSV parsing is strict about quote placement and closing quotes. Errors include a physical line and column when available.
- UTF-8 BOMs are accepted. Empty physical lines are ignored; whitespace-only records remain data. Empty fields are preserved.
- CSV-to-JSON requires a nonempty, unique header row and consistent row widths. Header-only CSV is valid and converts to `[]`; CSV values are strings.
- JSON-to-CSV accepts arrays of objects. Nested objects are flattened with dot-separated keys, arrays become JSON text, and `null` becomes an empty cell. JSON numeric and boolean values keep their scalar representation.
- JSON-to-CSV exposes an opt-in spreadsheet-safe text mode. It prefixes formula-like text with an apostrophe but leaves numeric values intact. This precaution is not guaranteed across every spreadsheet application.
- The shared parser defaults to 10 MB, 25,000 data rows, and 100 columns; the viewer also checks uploaded file size before reading.
