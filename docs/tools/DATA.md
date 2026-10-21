# Data Tools

## Available

### File Information & Metadata

Route: `/tools/data/file-info`.

Select or drop one local file up to 50 MB. The tool reports its name, extension, browser-reported MIME type, byte and human-readable size, local last-modified time, and a conservative format guess based on at most the first 1,024 bytes. Recognized signatures include PDF, JPEG, PNG, GIF, WebP, AVIF, and generic ZIP-based containers. ZIP recognition does not identify a specific Office document. Unknown signatures remain unknown; matching extension/MIME labels are comparisons, not proof that a file is safe or valid.

Recognized images show dimensions, aspect ratio, pixel count, and decoded format when browser decoding succeeds. Image decoding follows the existing 25 MB and 24 megapixel image limits. JPEG EXIF uses the existing limited local reader; only supported fields appear, GPS coordinates are not shown, and unavailable EXIF is distinguished from no readable fields.

PDF inspection reuses `pdf-lib` and the existing 50 MB per-file and 500-page limits. It shows page count and available title, author, subject, creator, producer, creation date, and modification date without rendering pages or changing the source. Encrypted, malformed, unsupported, or over-limit PDFs may not expose properties. Missing metadata says nothing reliable about a document's edit history.

The browser-reported MIME type can be empty or inaccurate. Signature detection is limited and is not malware scanning or a security guarantee. Files and metadata are inspected locally and are not uploaded. Formats without a recognized signature still show general browser file properties.

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

### XML Inspector

Route: `/tools/data/xml-inspector`.

Paste XML or select/drop a local file to format XML, check XML well-formedness, or convert it to JSON. Pasted and uploaded content share the same parser and validation path. The 5 MiB limit is measured from actual UTF-8 bytes before parsing; oversized input is rejected without truncation. A leading UTF-8 BOM is accepted. Uploaded files are decoded as UTF-8 with the browser `TextDecoder`; by default, invalid byte sequences may be replaced with U+FFFD rather than rejected.

Parsing uses the browser's native `DOMParser` in XML mode. Validation means only that the document is well formed; it does not check an XSD, DTD, sitemap rules, or application schema. Error text and location details vary between browsers, and the tool does not invent line or column numbers.

XML-to-JSON mapping: the root qualified name is the top-level key. Attributes are stored in `@attributes` using their qualified names. A text-only element maps to its text string; an empty element maps to `""`. Elements with attributes or children map to objects, with text under `#text` when it appears alongside attributes. Children use their qualified names as keys; one child is a single value and repeated siblings become an array. Element traversal follows document order. Mixed text/child content is represented in order as a `#content` array containing text strings and one-key child objects. Comments and processing instructions are omitted; the XML declaration is document metadata and is not converted. Text values stay strings; numbers and booleans are not inferred. JSON objects group same-name children, so they do not retain interleaving between different child names as a separate sequence.

Formatting preserves element order, names, attributes, namespaces, comments, processing instructions, and mixed text/CDATA where supported by the browser DOM. Indentation is added to element-only content. Serialization can normalize quote style, XML declaration details, or empty-element spelling. Well-formed XML that is deeply nested beyond 256 elements is rejected to bound traversal work.

All parsing and conversion happen locally. The tool does not resolve external entities or DTDs, load URLs or schemas, execute scripts, or render XML as HTML. Parser error details depend on the browser; browser text decoding can replace invalid UTF-8 as described above.

## Planned

Potential future work includes XLSX conversion, CSV sorting and column-specific duplicate removal. These are not currently available tools.

Keep CSV processing local. Add tests for parsing, limits, cleaning semantics, and export behavior before expanding the supported format or row count.
