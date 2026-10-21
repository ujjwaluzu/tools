# Markdown Editor & Preview

Route: `/tools/markdown/editor`.

The editor updates a live preview locally as you type. Desktop uses independently scrollable source and preview panes; narrow screens use Editor and Preview tabs that preserve the source. Copy Markdown copies the original source, Download saves it as `document.md`, and Clear resets the workspace. Editing is transient: the application does not save the source in browser storage or send it to a service.

## Supported syntax

The renderer supports CommonMark plus GitHub Flavored Markdown via `remark-gfm`: headings, paragraphs, emphasis, strikethrough, ordered and unordered/nested lists, blockquotes, inline and fenced code, horizontal rules, links, images, tables, and task lists. Code is displayed as text without syntax highlighting or execution.

Raw HTML is disabled and is not rendered as HTML. HTML-like text written with Markdown escapes (for example `&lt;tag&gt;`) remains visible as inert text. Links allow `http`, `https`, `mailto`, and `tel` protocols; executable and embedded-content schemes are removed. Links open in a new tab with `noopener noreferrer`. Only relative image paths are rendered; absolute and protocol-relative images are blocked to prevent third-party requests. Relative image paths on the same site may still request that local path.

## Limits and known behavior

Markdown source is limited to 1 MiB measured as UTF-8 bytes. Oversized source is preserved in the editor and counted, but preview rendering, copy, and download pause until it is reduced. The preview uses plain code blocks without syntax colors. Relative images resolve against the current site route. HTML-based Markdown extensions are intentionally unsupported.

The parser and renderer are `react-markdown` and `remark-gfm`. The renderer creates React elements from parsed Markdown nodes and never injects generated HTML into the DOM.

Other Markdown tools (conversion, document export, table generation, TOC generation, and formatting) are separate routes and are not part of this editor.

Markdown parsing for analysis and document conversion uses the same `remark-parse` plus `remark-gfm` parser configured in `src/lib/tools/markdown.ts`. Raw HTML stays disabled in the live renderer and HTML export follows the DOMPurify policy above.

## Markdown to HTML converter

The companion converter is at `/tools/markdown/to-html`. It uses the same `remark-gfm` Markdown syntax and 1 MiB UTF-8 input limit, and creates a complete standalone HTML document with a UTF-8 declaration, responsive viewport, escaped optional title, and a small built-in responsive and print stylesheet. The generated body is sanitized with DOMPurify before it is assembled into the document. The same sanitized fragment drives the in-app preview; copy and download use the exact assembled document.

The sanitizer allows common Markdown semantic elements, safe links, relative images, and GFM task-list checkboxes. It removes raw HTML, scripts, event handlers, SVG/MathML, embedded content, unsafe URL schemes, and user style attributes. Generated links open in a new tab with `noopener noreferrer`; images must use relative paths, so the preview does not contact third-party image hosts. The stylesheet in the exported document is a fixed application template, not user Markdown. This policy is designed for this converter and does not replace downstream sanitization requirements.

## HTML to Markdown converter

Route: `/tools/markdown/to-markdown`.

The converter accepts up to 1 MiB of UTF-8 HTML and uses Turndown with its GFM plugin. The source is parsed by the browser's inert `DOMParser`; it is never inserted into the application DOM or rendered as a preview. Headings, paragraphs, emphasis, lists, blockquotes, safe links, relative images, tables, inline code, preformatted code, horizontal rules, and line breaks are converted where representable. Scripts, styles, SVG/MathML, forms, embedded content, media, and other active or unsupported elements are discarded. Unsafe link URLs are removed and non-relative image URLs are dropped to prevent external requests. HTML styling and some semantics are lossy by nature. Output is also limited to 1 MiB. Copy and `.md` download use the generated Markdown; the download filename is fixed to `document.md`. Processing is local and transient.

## Markdown to DOCX converter

Route: `/tools/markdown/to-docx`.

The converter uses the shared CommonMark/GFM syntax tree and the `docx` library to create a valid Office Open XML Word document in the browser. Headings map to Word Heading 1–6 styles; paragraphs, bold/italic/strikethrough, inline and fenced code, ordered and unordered/nested lists, task-list markers, blockquotes, tables, horizontal rules, and hyperlinks receive Word formatting. Only `http`, `https`, `mailto`, and `tel` links are written as hyperlinks; unsafe destinations are emitted as plain text. Raw HTML is included as literal text and never executed. Images are represented by alt text and are not fetched or embedded. Code fence language labels and browser-specific layout details are not preserved, and output is not pixel-identical to the preview. The optional title appears as a Title-style paragraph and document metadata. Input is limited to 1 MiB UTF-8. The sanitized `.docx` filename and document remain local and transient.

## Markdown Table Generator

Route: `/tools/markdown/table-generator`.

Edit headers, rows, and per-column alignment to create a GitHub Flavored Markdown table. Pipes and backslashes are escaped; line breaks within cells become `<br>`, a common Markdown table convention. Empty cells are preserved. The table begins with two columns and two data rows; rows and columns can be added or removed while keeping at least one of each. Copy and `.md` download contain the generated table. Processing is local and transient.
