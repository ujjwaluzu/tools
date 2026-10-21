import remarkStringify from "remark-stringify";
import { createMarkdownParser, assertMarkdownInputSize, safeMarkdownUrl } from "./markdown.ts";

type Node = { type: string; url?: string; position?: { start?: { offset?: number }; end?: { offset?: number } }; children?: Node[] };

const style = {
  bullet: "-",
  bulletOrdered: ".",
  emphasis: "*",
  fences: true,
  fence: "`",
  listItemIndent: "one",
  rule: "-",
  ruleRepetition: 3,
  strong: "*",
  tableCellPadding: true,
  tablePipeAlign: true,
} as const;

function assertSafeDestinations(node: Node): void {
  if ((node.type === "link" || node.type === "definition") && typeof node.url === "string" && !safeMarkdownUrl(node.url)) {
    throw new RangeError("This Markdown contains an unsupported or unsafe link URL. Use http, https, mailto, tel, or a relative link.");
  }
  if (node.type === "image" && typeof node.url === "string" && !safeMarkdownUrl(node.url, true)) {
    throw new RangeError("This Markdown contains an unsupported image URL. Use a relative image path so the formatter cannot trigger an external request.");
  }
  node.children?.forEach(assertSafeDestinations);
}

function containsMathNotation(source: string, root: Node): boolean {
  const characters = source.split("");
  function maskCode(node: Node) {
    if ((node.type === "code" || node.type === "inlineCode") && Number.isInteger(node.position?.start?.offset) && Number.isInteger(node.position?.end?.offset)) {
      const start = node.position!.start!.offset!;
      const end = node.position!.end!.offset!;
      for (let index = start; index < end; index += 1) if (characters[index] !== "\n" && characters[index] !== "\r") characters[index] = " ";
    }
    node.children?.forEach(maskCode);
  }
  maskCode(root);
  const markdownOutsideCode = characters.join("");
  const displayMath = /(?<!\\)\$\$[\s\S]+?(?<!\\)\$\$/u;
  const inlineMath = /(?<!\\)\$(?!\$)[^\n$]+?(?<!\\)\$(?!\$)/u;
  return displayMath.test(markdownOutsideCode) || inlineMath.test(markdownOutsideCode);
}

/** Normalize Markdown syntax using the same CommonMark/GFM parser used by the other tools. */
export function formatMarkdown(source: string): string {
  return formatMarkdownResult(source).markdown;
}

export function formatMarkdownResult(source: string): { markdown: string; mathPreserved: boolean } {
  assertMarkdownInputSize(source);
  if (!source.trim()) return { markdown: "", mathPreserved: false };
  const parser = createMarkdownParser().use(remarkStringify, style);
  const tree = parser.parse(source) as unknown as Node;
  assertSafeDestinations(tree);
  if (containsMathNotation(source, tree)) return { markdown: source, mathPreserved: true };
  const result = String(parser.stringify(tree as never)).replace(/\r\n?/gu, "\n").replace(/\n*$/u, "\n");
  assertMarkdownInputSize(result);
  return { markdown: result, mathPreserved: false };
}
