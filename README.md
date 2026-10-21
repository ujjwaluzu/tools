# Ujjwal Tools

> Tiny tools for annoying tasks.

Ujjwal Tools is a local-first collection of focused browser utilities for images, PDFs, development, text, colour, and everyday work. The app is built with Next.js App Router and is intended for [tools.ujjwaluzu.in](https://tools.ujjwaluzu.in).

When a tool can run in the browser, it does. User inputs and files are not uploaded or stored by the application.

## Tool status

The lists below reflect the tool catalogue and implementation in this repository. **Available** means the tool has a working page in the app. Categories can appear in the catalogue before they have tools.

### Available now

| Category | Tools | State |
| --- | --- | --- |
| Images | Convert, resize, compress, crop, rotate/flip, adjust, image to Base64, Base64 to image, EXIF viewer, remove image metadata, favicon generator, PWA icon generator, thumbnail generator, Open Graph image generator | Implemented; browser-local processing |
| PDF | Merge PDF, split PDF, images to PDF, PDF to PNG, PDF to JPG | Implemented; browser-local processing |
| Developer | JSON formatter, word counter, JSON/CSV conversion, TypeScript/YAML generation, text, URL, encoding, regex, cron, and gitignore utilities | Implemented; browser-local processing |
| Web & SEO | URL and query parsing, metadata and social previews, JSON-LD, sitemap/robots utilities, metadata inspection | Implemented; some URL checks and remote image previews make browser requests |
| Data | CSV Viewer & Cleaner, File Information & Metadata | Implemented; browser-local processing, with documented CSV and file inspection limits |
| Security & Encoding | Base64, UUID, JWT decoder, hash and HMAC generators | Implemented; browser-local processing |
| Markdown | Markdown Editor & Preview, Markdown to HTML Converter, HTML to Markdown Converter, Markdown to PDF Converter | Implemented; browser-local editing, GFM preview, sanitized HTML export, safe HTML conversion, and structured PDF output |
| Color | HEX/RGB/HSL color converter | Implemented; browser-local processing |

### Coming soon / planned

These are roadmap ideas, not yet available tools or release commitments. Work is expected to be incremental.

- **Markdown:** DOCX conversion, table, TOC, and formatting utilities.
- **Data:** XLSX conversion and additional CSV/data utilities.
- **PDF and images:** PDF editing, OCR, and image background removal.
- **Git & GitHub:** small workflow helpers and GitHub tools.
- **Everyday and student:** focused utilities for common daily and study tasks.

The app also has catalogue categories for Web & SEO, Markdown, Git & GitHub, Data, Converters, Everyday, and Student. Some categories do not have a tool yet. New tools are added through the central registry.

## Local processing and privacy

File and text tools process data locally in the browser. This includes image conversion and editing, image metadata inspection, PDF merging and page extraction, image-to-PDF conversion, and PDF page rendering.

- Files are kept in browser memory while a tool is in use.
- Generated files are offered directly for download and are not persisted by the application.
- The app does not send tool input or file contents to analytics or external processors.
- Password-protected PDFs are rejected rather than bypassed.
- Image processing is limited to 25 MB per file and 24 megapixels to help protect browser memory.
- SVG input is sanitized before rasterization. EXIF reading currently supports JPEG metadata; removing metadata re-encodes to PNG.

See [the product documentation](docs/tools/README.md), [privacy guidance](docs/tools/PRIVACY.md), and [security rules](docs/tools/SECURITY.md) for the full product contract.
Markdown editor and converter [syntax, privacy, security, and size-limit behavior](docs/tools/MARKDOWN_EDITOR.md) are documented separately.

## Tech stack

- Next.js 16 with App Router
- React 19
- TypeScript with strict mode
- Plain CSS design tokens and responsive layouts
- `pdf-lib` for local PDF creation, merge, and page extraction
- Mozilla `pdfjs-dist` for local PDF page rendering
- `react-markdown` and `remark-gfm` for safe, local GitHub Flavored Markdown preview
- `unified`/Remark HTML serialization and DOMPurify for sanitized local Markdown-to-HTML export
- `turndown` and its GFM plugin for local HTML-to-Markdown conversion from inertly parsed input

## Getting started

Requirements:

- Node.js 22.13 or later
- npm

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000/tools](http://localhost:3000/tools).

The PDF.js worker is copied into `public/` automatically before development, production builds, and production starts.

## Commands

```bash
# Start the development server
npm run dev

# Check TypeScript
npm run typecheck

# Lint the project
npm run lint

# Create a production build
npm run build

# Serve the production build
npm run start
```

## Project structure

```text
src/
  app/
    tools/
      [category]/
        [tool]/
    sitemap.ts
  components/tools/
    implementations/     # Focused UI and state for each tool
      images/             # Image tool workspace
    pdf/                 # Reusable PDF UI: file lists, page selection, downloads
    ToolShell.tsx        # Shared page frame, privacy note, related tools
    primitives.tsx       # Dropzone, progress, errors, empty states, actions
  lib/tools/
    images/               # Local image decoding, validation, EXIF, and canvas processing
    registry.ts          # Source of truth for categories and tool definitions
    pdf/                 # Browser-only validation and processing services
scripts/
  copy-pdf-worker.mjs    # Makes the PDF.js worker available at the same origin
docs/tools/              # Product, UX, privacy, security, and roadmap docs
```

## Adding a tool

1. Add one `ToolDefinition` to [`src/lib/tools/registry.ts`](src/lib/tools/registry.ts).
2. Create a focused client implementation in `src/components/tools/implementations/`.
3. Register its lazy-loaded component in `src/components/tools/ToolRenderer.tsx`.
4. Keep processing logic in `src/lib/tools/<area>/` when it is reusable or non-trivial.
5. Run `npm run typecheck`, `npm run lint`, and `npm run build`.

The registry drives the catalogue, category pages, search, related tools, individual tool metadata, and sitemap. Do not add duplicate tool records elsewhere.

## PDF tool limits

PDF operations have intentional client-side limits to prevent browser memory exhaustion:

- PDFs: 50 MB per file, 100 MB total, up to 500 document pages.
- Merge: up to 20 PDFs per operation.
- Split: up to 250 selected pages per extraction.
- PDF to PNG/JPG: up to 30 rendered pages per operation and a combined rendering pixel limit.
- Images to PDF: up to 30 PNG, JPG, or WebP images, 20 MB each, 80 MB total.

PDF-to-image tools provide individual downloads. ZIP export is intentionally not included yet to avoid adding another client dependency.

## Verification

Before shipping changes, run:

```bash
npm run typecheck
npm run lint
npm run build
```

The repository does not currently include a browser test runner. Keep the local processing promise intact when adding tests: do not send fixture contents to an external service.

## License

Private project. All rights reserved.
