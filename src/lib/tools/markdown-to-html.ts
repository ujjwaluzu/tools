import DOMPurify, { type Config } from "dompurify";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { assertMarkdownInputSize, safeMarkdownUrl } from "./markdown.ts";

const markdownHtmlProcessor = unified().use(remarkParse).use(remarkGfm).use(remarkRehype).use(rehypeStringify);

const SANITIZE_OPTIONS: Config = {
  ALLOWED_TAGS: ["a", "blockquote", "br", "code", "del", "em", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "img", "input", "li", "ol", "p", "pre", "strong", "table", "thead", "tbody", "tr", "th", "td", "ul"],
  ALLOWED_ATTR: ["alt", "checked", "disabled", "href", "rel", "src", "target", "title", "type"],
  ALLOW_ARIA_ATTR: false,
  ALLOW_DATA_ATTR: false,
  ALLOW_UNKNOWN_PROTOCOLS: false,
  FORBID_TAGS: ["embed", "form", "iframe", "math", "object", "script", "style", "svg", "template"],
  FORBID_ATTR: ["style"],
  KEEP_CONTENT: true,
};

let sanitizerHooksInstalled = false;

function installSanitizerHooks() {
  if (typeof window === "undefined" || !DOMPurify.isSupported) {
    throw new Error("HTML sanitization is available only in a supported browser.");
  }
  if (sanitizerHooksInstalled) return;

  DOMPurify.addHook("uponSanitizeAttribute", (node, data) => {
    if (data.attrName === "href" && !safeMarkdownUrl(data.attrValue)) data.keepAttr = false;
    if (data.attrName === "src" && (!node.nodeName || node.nodeName.toLowerCase() !== "img" || !safeMarkdownUrl(data.attrValue, true))) data.keepAttr = false;
  });
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.nodeName.toLowerCase() === "a" && node.hasAttribute("href")) {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
  });
  sanitizerHooksInstalled = true;
}

export function escapeHtmlText(value: string): string {
  return value.replace(/[&<>"']/gu, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[character] ?? character);
}

export function sanitizeHtmlFragment(html: string): string {
  installSanitizerHooks();
  return DOMPurify.sanitize(html, SANITIZE_OPTIONS);
}

/** Raw serializer output. Call sanitizeHtmlFragment before previewing or exporting. */
export async function parseMarkdownToHtmlFragment(markdown: string): Promise<string> {
  assertMarkdownInputSize(markdown);
  return String(await markdownHtmlProcessor.process(markdown));
}

/** Parse with the same CommonMark/GFM plugins as the live editor, then cross the HTML sanitizer boundary. */
export async function convertMarkdownToSafeHtml(markdown: string, title = "Document") {
  const fragment = sanitizeHtmlFragment(await parseMarkdownToHtmlFragment(markdown));
  const safeTitle = title.trim() || "Document";
  return {
    fragment,
    document: createHtmlDocument(fragment, safeTitle),
    filename: markdownHtmlFilename(safeTitle),
  };
}

export function markdownHtmlFilename(title: string): string {
  const safeBase = title.normalize("NFKD").replace(/\p{Diacritic}/gu, "").toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-").replace(/^-+|-+$/gu, "").slice(0, 80).replace(/-+$/u, "");
  return `${safeBase || "document"}.html`;
}

function createHtmlDocument(sanitizedFragment: string, title: string): string {
  const escapedTitle = escapeHtmlText(title.trim() || "Document");
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapedTitle}</title>
    <style>
      :root { color-scheme: light; font: 16px/1.65 system-ui, sans-serif; color: #171717; background: #fff; }
      body { max-width: 900px; margin: 0 auto; padding: 32px 22px; }
      h1, h2, h3, h4, h5, h6 { line-height: 1.25; margin: 1.3em 0 .5em; }
      p, ul, ol, blockquote, pre, table { margin: 0 0 1em; }
      blockquote { margin-left: 0; padding-left: 1em; border-left: 3px solid #bbb; color: #555; }
      pre { max-width: 100%; overflow: auto; padding: 1em; background: #f4f4f4; border-radius: 6px; }
      code { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }
      :not(pre) > code { padding: .12em .3em; background: #f4f4f4; border-radius: 3px; }
      table { display: block; max-width: 100%; overflow-x: auto; border-collapse: collapse; }
      th, td { padding: .45em .65em; border: 1px solid #bbb; text-align: left; }
      th { background: #f4f4f4; }
      img { max-width: 100%; height: auto; }
      a { color: #174f9d; }
      @media print { body { max-width: none; padding: 0; } pre, table { break-inside: avoid; } }
      @media (max-width: 600px) { body { padding: 20px 14px; } }
    </style>
  </head>
  <body>
    <main>${sanitizedFragment}</main>
  </body>
</html>
`;
}
