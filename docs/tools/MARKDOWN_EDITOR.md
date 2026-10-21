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
