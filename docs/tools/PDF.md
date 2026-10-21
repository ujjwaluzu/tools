# PDF Tools

## Core

### PDF Inspector & Text Extraction

Route: `/tools/pdf/inspect`.

Select or drop a local document to inspect its filename, byte and human-readable size, parsed page count, supported document metadata, and page dimensions/orientation in PDF points. Metadata fields include title, author, subject, creator, producer, creation date, and modification date. Empty fields are reported as not present; parser failures are shown as unavailable while the selected file's general properties remain visible. Metadata can be absent, incomplete, or changed; missing values do not establish document history. Page dimensions are summarized when uniform and listed per page when they vary. The tool does not render page thumbnails or infer a PDF version.

Extract selectable text from all pages or a comma-separated list of page numbers and ranges (for example `1-3, 5`). Page numbers are checked against the parsed document, and each run is limited to 250 selected pages within the existing 500-page and 50 MB PDF limits. Output includes a `--- Page N ---` boundary for every selected page, including pages without selectable text, and can be copied or downloaded as a text file. Extraction uses PDF.js text content locally in the browser. PDF text positions may not reflect reading order; columns, tables, and positioned content can be imperfect. Scanned pages without embedded text are reported as having no selectable text. OCR is not included.

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
