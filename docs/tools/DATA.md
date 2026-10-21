# Data Tools

## Available

### CSV Viewer & Cleaner

Route: `/tools/data/csv-viewer`.

The viewer accepts pasted CSV or a local `.csv` file. It parses the same strict CSV format in both cases and keeps the contents in browser memory; data is not uploaded.

Supported behavior:

- UTF-8 text, with an optional leading UTF-8 BOM.
- Comma-delimited records, quoted commas, doubled quote escapes, and LF, CRLF, or CR line endings.
- Newlines inside quoted values and empty cells, including trailing empty cells.
- Empty physical lines are ignored. Whitespace-only records are preserved as data.
- A header row is required. A header-only file is valid and has zero data rows. Empty files, blank-only files, empty headers, duplicate headers, inconsistent field counts, and malformed quoting are rejected.
- Header names are preserved as written; names that are empty or duplicate after trimming are rejected (case-sensitive).
- Limits: 10 MB input, 25,000 data rows, and 100 columns. The tool rejects over-limit input rather than truncating it.
- The preview shows 50 rows per page. Filtering searches every column case-insensitively and only changes the view.
- Cleaning can remove fully blank rows, remove exact duplicate rows (case-sensitive, all columns; first occurrence retained), and trim surrounding whitespace from cell values. Headers are preserved.
- Export can include all cleaned rows or only filtered rows.

Spreadsheet-safe export is enabled by default. It prefixes formula-like text and leading tab/carriage-return values with an apostrophe, while preserving numeric values and numeric-looking negative text. This changes exported text. Spreadsheet applications differ, so the prefix is a precaution and not a universal guarantee. Turn it off when an unchanged CSV representation is required.

The parser and serializer are shared by CSV-to-JSON and JSON-to-CSV. The parser defaults to the same 10 MB, 25,000 data row, and 100 column caps; the viewer also checks file size before reading. JSON objects are flattened with dot-separated nested object keys; arrays are serialized as JSON text in one cell, and `null` becomes an empty cell. JSON-to-CSV can opt into the same spreadsheet-safe text policy. CSV-to-JSON values remain strings; a header-only file converts to an empty JSON array.

## Planned

Potential future work includes XLSX conversion, CSV sorting and column-specific duplicate removal. These are not currently available tools.

Keep CSV processing local. Add tests for parsing, limits, cleaning semantics, and export behavior before expanding the supported format or row count.
