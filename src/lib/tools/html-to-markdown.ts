import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import { assertMarkdownInputSize, formatMarkdownBytes, safeMarkdownUrl } from "./markdown.ts";

export const MAX_HTML_INPUT_BYTES = 1024 * 1024;

export function assertHtmlInputSize(source: string, maxBytes = MAX_HTML_INPUT_BYTES): number {
  const bytes = new TextEncoder().encode(source).byteLength;
  if (bytes > maxBytes) throw new RangeError(`HTML source is ${formatMarkdownBytes(bytes)}. The input limit is ${formatMarkdownBytes(maxBytes)}.`);
  return bytes;
}

export function markdownFilename(source: string): string {
  const base = source.normalize("NFKD").replace(/\p{Diacritic}/gu, "").toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-").replace(/^-+|-+$/gu, "").slice(0, 80).replace(/-+$/u, "");
  return `${base || "document"}.md`;
}

/** Convert an inert parsed document. Active content and unsafe/remote image URLs are discarded first. */
export function convertHtmlToMarkdown(source: string): string {
  assertHtmlInputSize(source);
  const parsed = new DOMParser().parseFromString(source, "text/html");
  parsed.querySelectorAll("script, style, iframe, frame, frameset, object, embed, applet, svg, math, template, form, input, button, textarea, select, option, video, audio, source, track, canvas, noscript").forEach((node) => node.remove());

  for (const element of parsed.body.querySelectorAll("*")) {
    const tag = element.tagName.toLowerCase();
    const title = element.getAttribute("title");
    const href = tag === "a" ? element.getAttribute("href") : null;
    const src = tag === "img" ? element.getAttribute("src") : null;
    const alt = tag === "img" ? element.getAttribute("alt") : null;
    for (const attribute of [...element.attributes]) element.removeAttribute(attribute.name);
    if (title) element.setAttribute("title", title);
    if (href) {
      const safe = safeMarkdownUrl(href);
      if (safe) element.setAttribute("href", safe);
    }
    if (src && tag === "img") {
      const safe = safeMarkdownUrl(src, true);
      if (safe) element.setAttribute("src", safe);
      else element.remove();
      if (alt) element.setAttribute("alt", alt);
    }
  }

  const converter = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced", bulletListMarker: "-", emDelimiter: "*", strongDelimiter: "**", linkStyle: "inlined" });
  converter.use(gfm);
  const markdown = converter.turndown(parsed.body);
  assertMarkdownInputSize(markdown);
  return markdown;
}
