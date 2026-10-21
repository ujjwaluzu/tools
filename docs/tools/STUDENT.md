# Student Tools

The Student Tools category is available at `/tools/student`.

## Reused tools

- [PDF Inspector & Text Extraction](/tools/pdf/inspect) is also listed here. It extracts selectable PDF text locally, supports page ranges, and does not OCR scanned pages. Text order can be imperfect for columns, tables, and complex layouts.
- [Word Counter](/tools/developer/word-counter) is also listed here. Words are Unicode letter/number groups; contractions and hyphenated compounds count as one. Punctuation alone is not a word. Reading time is an estimate rounded up to a full minute at the chosen speed.
- [Markdown to PDF](/tools/markdown/to-pdf) is also listed here. It uses the existing local PDF renderer, with raw HTML disabled and unsafe URLs rejected. See [PDF tool notes](PDF.md) for supported elements, fonts, limits, and layout constraints.

## Image to Text (OCR)

Route: `/tools/student/image-to-text`.

OCR runs in a Web Worker with Tesseract.js and the English `eng` model. The worker and model are copied from installed packages into same-origin static assets during dev/build/start setup. Tesseract's WebAssembly core loads from the pinned jsDelivr package only when the user starts extraction. The selected image stays in the browser and is never sent to an OCR service. The browser may cache the core for later use; the first run needs a network connection and OCR reports an error if the core cannot load. Only English is offered. OCR is approximate and works best with clear printed text; handwriting, low contrast, unusual fonts, and complex layouts can reduce accuracy. Supported image types are PNG, JPEG, WebP, GIF, and BMP up to 20 MB.

## Notes and writing

Notes to Markdown preserves words and line breaks. It adds a title only when requested, and converts only recognizable list or checkbox prefixes. Its preview uses the app's safe Markdown renderer with raw HTML disabled.

Citation Formatting Helper offers draft APA 7, MLA 9, and Chicago author-date templates for common books, journal articles, websites, reports, and (in the general helper) edited-book chapters. APA 7 Reference Builder offers books, journal articles, webpages, and organizational reports. These are limited deterministic templates; they do not model every source variant, author role, edition, access date, or institution-specific rule. Enter authors in `Given Middle Family` or `Family, Given Middle` order, separated by semicolons. For an organization, mark the author field as an organization. Missing metadata is not fabricated. Every generated reference remains a draft that must be checked against current official examples, the relevant style manual, and local requirements. The tools do not verify source existence.

Text Utilities keeps original input available and applies one explicit transformation at a time. Find and replace treats search text literally. Title case capitalizes after whitespace and punctuation; sentence case lowercases other letters, so acronyms can change.

## Study tools and storage

Flashcard Generator uses deterministic local patterns (explicit pairs, lines, or paragraphs); it is not AI-powered. Review and edit cards before studying. JSON imports are validated and limited to 500 cards.

Study Timer uses a monotonic clock and does not save sessions. Browser throttling or device sleep can still affect when a completion is displayed.

Notes Organizer stores note text in this browser's local storage under `ujjwal-student-notes-v1`. Notes are not synced or uploaded. Export JSON for backup; import is limited to 2 MB and 500 notes. Clearing browser data removes saved notes. The tool has a delete-all control and confirms individual note deletion.
