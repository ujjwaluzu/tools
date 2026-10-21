# Markdown Editor & Preview

Route: `/tools/markdown/editor`.

The editor updates a live preview locally as you type. Desktop uses independently scrollable source and preview panes; narrow screens use Editor and Preview tabs that preserve the source. Copy Markdown copies the original source, Download saves it as `document.md`, and Clear resets the workspace. Editing is transient: the application does not save the source in browser storage or send it to a service.

## Supported syntax

The renderer supports CommonMark plus GitHub Flavored Markdown via `remark-gfm`: headings, paragraphs, emphasis, strikethrough, ordered and unordered/nested lists, blockquotes, inline and fenced code, horizontal rules, links, images, tables, and task lists. Code is displayed as text without syntax highlighting or execution.

Raw HTML is disabled and is not rendered as HTML. HTML-like text written with Markdown escapes (for example `&lt;tag&gt;`) remains visible as inert text. Links allow `http`, `https`, `mailto`, and `tel` protocols; executable and embedded-content schemes are removed. Links open in a new tab with `noopener noreferrer`. Only relative image paths are rendered; absolute and protocol-relative images are blocked to prevent third-party requests. Relative image paths on the same site may still request that local path.

## Limits and known behavior

Markdown source is limited to 1 MiB measured as UTF-8 bytes. Oversized source is preserved in the editor and counted, but preview rendering, copy, and download pause until it is reduced. The preview uses plain code blocks without syntax colors. Relative images resolve against the current site route. HTML-based Markdown extensions are intentionally unsupported.

The parser and renderer are `react-markdown` and `remark-gfm`. The renderer creates React elements from parsed Markdown nodes and never injects generated HTML into the DOM.

Other planned Markdown tools (conversion, export, table generation, TOC generation, and formatting) are tracked in the roadmap and are not part of this editor.

## Markdown to HTML converter

The companion converter is at `/tools/markdown/to-html`. It uses the same `remark-gfm` Markdown syntax and 1 MiB UTF-8 input limit, and creates a complete standalone HTML document with a UTF-8 declaration, responsive viewport, escaped optional title, and a small built-in responsive and print stylesheet. The generated body is sanitized with DOMPurify before it is assembled into the document. The same sanitized fragment drives the in-app preview; copy and download use the exact assembled document.

The sanitizer allows common Markdown semantic elements, safe links, relative images, and GFM task-list checkboxes. It removes raw HTML, scripts, event handlers, SVG/MathML, embedded content, unsafe URL schemes, and user style attributes. Generated links open in a new tab with `noopener noreferrer`; images must use relative paths, so the preview does not contact third-party image hosts. The stylesheet in the exported document is a fixed application template, not user Markdown. This policy is designed for this converter and does not replace downstream sanitization requirements.

## HTML to Markdown converter

Route: `/tools/markdown/to-markdown`.

The converter accepts up to 1 MiB of UTF-8 HTML and uses Turndown with its GFM plugin. The source is parsed by the browser's inert `DOMParser`; it is never inserted into the application DOM or rendered as a preview. Headings, paragraphs, emphasis, lists, blockquotes, safe links, relative images, tables, inline code, preformatted code, horizontal rules, and line breaks are converted where representable. Scripts, styles, SVG/MathML, forms, embedded content, media, and other active or unsupported elements are discarded. Unsafe link URLs are removed and non-relative image URLs are dropped to prevent external requests. HTML styling and some semantics are lossy by nature. Output is also limited to 1 MiB. Copy and `.md` download use the generated Markdown; the download filename is fixed to `document.md`. Processing is local and transient.
