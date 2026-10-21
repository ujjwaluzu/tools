# PDF Tools

## Core

### Text to PDF Generator

Route: `/tools/pdf/text-to-pdf`.

Enter or paste plain text and generate a locally processed PDF. Newlines and blank lines are retained; long lines wrap to the selected page width, with text flowing across pages. Choose A4 or US Letter, portrait or landscape, 10–30 mm margins, Helvetica, Times Roman, or Courier, 8–36 pt type, and single, 1.25×, or 1.5× line spacing. A title is added as PDF metadata and used for a sanitized download filename; it is not duplicated in the body. Optional one-line headers and footers repeat on every page. Page numbers use the final page count and appear at bottom right.

Text is limited to 1 MiB of UTF-8 and generated documents to 500 pages. The standard built-in PDF fonts support basic Latin and many Windows-1252 accents and punctuation. The generator checks font encoding and reports unsupported characters, including emoji and many non-Latin scripts, instead of silently replacing them. There are no external font downloads. Text wrapping follows the selected font's measured glyph widths; this is a plain-text layout and does not interpret Markdown, infer rich paragraphs, or provide word-processing features. Text, settings, and output remain in browser memory and are not uploaded or persisted.

### Markdown to PDF Converter

Route: `/tools/markdown/to-pdf`.

The converter uses the shared CommonMark/GFM syntax tree and draws headings, paragraphs, emphasis, ordered and unordered lists, task-list markers, nested lists, blockquotes, inline and fenced code, horizontal rules, tables, and safe links into a paginated PDF. It supports A4 or US Letter, portrait or landscape, 10–30 mm margins, Helvetica/Times Roman/Courier, 9–16 pt body text, optional title metadata, and page numbers. The title also supplies a sanitized filename. Links with allowed `http`, `https`, `mailto`, or `tel` schemes become PDF link annotations; unsafe destinations are shown as plain link text. No user HTML is executed and no images or external resources are fetched; image alt text is used in place of image content.

Markdown is limited to 1 MiB UTF-8 and output to 500 pages. Built-in standard fonts support basic Latin and many Windows-1252 accents; unsupported characters are identified and fail generation instead of being replaced. Tables wrap cell text and may continue over page boundaries. The lightweight PDF layout is readable but does not promise browser-to-Word parity or sophisticated table column fitting. Raw HTML blocks are displayed as literal text. All processing is local and transient.

### PDF Inspector & Text Extraction

Route: `/tools/pdf/inspect`.

Select or drop a local document to inspect its filename, byte and human-readable size, parsed page count, supported document metadata, and page dimensions/orientation in PDF points. Metadata fields include title, author, subject, creator, producer, creation date, and modification date. Empty fields are reported as not present; parser failures are shown as unavailable while the selected file's general properties remain visible. Metadata can be absent, incomplete, or changed; missing values do not establish document history. Page dimensions are summarized when uniform and listed per page when they vary. The tool does not render page thumbnails or infer a PDF version.

Extract selectable text from all pages or a comma-separated list of page numbers and ranges (for example `1-3, 5`). Page numbers are checked against the parsed document, and each run is limited to 250 selected pages within the existing 500-page and 50 MB PDF limits. Output includes a `--- Page N ---` boundary for every selected page, including pages without selectable text, and can be copied or downloaded as a text file. Extraction uses PDF.js text content locally in the browser. PDF text positions may not reflect reading order; columns, tables, and positioned content can be imperfect. Scanned pages without embedded text are reported as having no selectable text. For an image-only page, use the [Student Image to Text OCR tool](STUDENT.md#image-to-text-ocr) after obtaining an image of the page; OCR supports printed English and is approximate.

PDF parsing and text extraction stay in the browser; documents are not uploaded. A PDF signature is only a format check and does not prove a document is safe. Encrypted, malformed, unsupported, or over-limit PDFs may not expose PDF-specific properties. Version and other low-level technical details are omitted when the current libraries do not expose them reliably.

- Merge PDFs
- Split PDF
- Extract pages
- Delete pages
- Reorder pages
- Rotate pages
- Compress PDF
- PDF → PNG
- PDF → JPG
- PDF → WebP
- PNG/JPG → PDF
- Images → PDF

## Editing

- Add watermark
- Add page numbers
- Add text
- Add signature
- PDF metadata viewer/editor

## Protection

- Password protect PDF
- Remove PDF password only when the user provides the required password/authorization

## Extraction

- PDF → text
- PDF → Markdown
- PDF → HTML

Support drag/drop, multiple files where appropriate, page thumbnails, reordering, progress, and downloads. Do not claim perfect PDF preservation for every PDF.
