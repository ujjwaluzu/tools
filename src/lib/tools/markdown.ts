import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

export const MAX_MARKDOWN_INPUT_BYTES = 1024 * 1024;

/** Shared CommonMark/GFM parser used for analysis and document conversion. */
export function createMarkdownParser() {
  return unified().use(remarkParse).use(remarkGfm);
}

export function parseMarkdownTree(source: string) {
  assertMarkdownInputSize(source);
  return createMarkdownParser().parse(source);
}

export function countMarkdown(source: string) {
  return {
    characters: [...source].length,
    words: source.trim() ? source.trim().split(/\s+/u).length : 0,
    lines: source ? source.split(/\r\n|\r|\n/u).length : 0,
  };
}

export function markdownByteLength(source: string): number {
  return new TextEncoder().encode(source).byteLength;
}

export function assertMarkdownInputSize(source: string, maxBytes = MAX_MARKDOWN_INPUT_BYTES): number {
  const bytes = markdownByteLength(source);
  if (bytes > maxBytes) throw new RangeError(`Markdown source is ${formatMarkdownBytes(bytes)}. The input limit is ${formatMarkdownBytes(maxBytes)}.`);
  return bytes;
}

export function formatMarkdownBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Permit safe navigation links. Images are restricted to relative URLs to avoid third-party requests. */
export function safeMarkdownUrl(value: string, isImage = false): string {
  const candidate = value.trim().replace(/[\u0000-\u001f\u007f]/gu, "");
  if (!candidate) return "";
  if (isImage && (/^[a-z][a-z\d+.-]*:/iu.test(candidate) || candidate.startsWith("//") || candidate.includes("\\"))) return "";
  try {
    const parsed = new URL(candidate, "https://markdown.local/");
    const allowed = isImage ? ["https:"] : ["http:", "https:", "mailto:", "tel:"];
    if (!allowed.includes(parsed.protocol)) return "";
    if (isImage && parsed.origin !== "https://markdown.local") return "";
    return candidate;
  } catch {
    return "";
  }
}
