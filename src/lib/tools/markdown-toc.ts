import { parseMarkdownTree } from "./markdown.ts";

export type MarkdownHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type MarkdownHeading = { level: MarkdownHeadingLevel; text: string; slug: string };

type Node = { type: string; depth?: number; value?: string; alt?: string; children?: Node[] };

function visibleText(node: Node): string {
  if (node.type === "html" || node.type === "break") return "";
  if (node.type === "image" || node.type === "imageReference") return node.alt ?? "";
  if (typeof node.value === "string") return node.value;
  return node.children?.map(visibleText).join("") ?? "";
}

/** GitHub-inspired heading anchor: lowercase, remove punctuation, and hyphenate spaces. */
export function createHeadingSlug(value: string): string {
  return value.toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}_\s-]/gu, "")
    .trim()
    .replace(/\s+/gu, "-") || "section";
}

export function extractMarkdownHeadings(source: string): MarkdownHeading[] {
  const tree = parseMarkdownTree(source) as unknown as Node;
  const headings: MarkdownHeading[] = [];
  const used = new Set<string>();

  function walk(node: Node) {
    if (node.type === "heading" && node.depth && node.depth >= 1 && node.depth <= 6) {
      const text = node.children?.map(visibleText).join("").trim() ?? "";
      if (text) {
        const base = createHeadingSlug(text);
        let slug = base;
        let suffix = 0;
        while (used.has(slug)) { suffix += 1; slug = `${base}-${suffix}`; }
        used.add(slug);
        headings.push({ level: node.depth as MarkdownHeadingLevel, text, slug });
      }
    }
    node.children?.forEach(walk);
  }

  walk(tree);
  return headings;
}

export function generateMarkdownToc(headings: readonly MarkdownHeading[], includedLevels: readonly MarkdownHeadingLevel[]): string {
  const included = new Set(includedLevels);
  const eligible = headings.filter(({ level }) => included.has(level));
  if (!eligible.length) return "";
  const stack: MarkdownHeadingLevel[] = [];
  return eligible.map(({ level, text, slug }) => {
    const label = text.replace(/[\\[\]]/gu, "\\$&");
    while (stack.length && stack[stack.length - 1] >= level) stack.pop();
    stack.push(level);
    return `${"  ".repeat(stack.length - 1)}- [${label}](#${slug})`;
  }).join("\n");
}
