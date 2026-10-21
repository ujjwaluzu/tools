import type { Content, List, ListItem, PhrasingContent, Root, Table as MdTable } from "mdast";
import { parseMarkdownTree, safeMarkdownUrl } from "./markdown.ts";

export const MAX_MARKDOWN_DOCX_BYTES = 1024 * 1024;

export type MarkdownDocxOptions = { title: string };

export function sanitizeDocxFilename(title: string): string {
  const safePdfName = title.trim() ? title.trim() : "Markdown document";
  let base = safePdfName.normalize("NFKD").replace(/\p{Diacritic}/gu, "").replace(/[\\/<>:"|?*\u0000-\u001F]/gu, "")
    .replace(/[. ]+$/u, "").replace(/\s+/gu, " ").trim().slice(0, 100) || "document";
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(base)) base = `document ${base}`;
  return base;
}

export async function createMarkdownDocx(markdown: string, options: MarkdownDocxOptions = { title: "" }): Promise<{ blob: Blob; filename: string }> {
  if (!markdown.trim()) throw new Error("Add Markdown before generating a DOCX file.");
  if (new TextEncoder().encode(markdown).byteLength > MAX_MARKDOWN_DOCX_BYTES) throw new Error("Markdown source exceeds the 1 MiB input limit. Reduce the source; it is not truncated.");
  if (options.title.length > 200 || /[\r\n]/u.test(options.title)) throw new Error("Document title must be a single line of at most 200 characters.");
  if (/[\u0000-\u001F\u007F]/u.test(options.title)) throw new Error("Document title cannot contain control characters.");
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(markdown)) throw new Error("Markdown contains unsupported control characters. Remove them and try again.");

  const {
    AlignmentType, BorderStyle, Document, ExternalHyperlink, HeadingLevel, LevelFormat, Paragraph, Packer,
    ShadingType, Table, TableCell, TableRow, TextRun, WidthType,
  } = await import("docx");
  type RunStyle = { bold?: boolean; italics?: boolean; strike?: boolean; code?: boolean; link?: boolean };
  type Inline = InstanceType<typeof TextRun> | InstanceType<typeof ExternalHyperlink>;
  let listCounter = 0;
  const numbering: { reference: string; levels: { level: number; format: (typeof LevelFormat)[keyof typeof LevelFormat]; text: string; start: number }[] }[] = [];

  const runs = (nodes: readonly PhrasingContent[], style: RunStyle = {}): Inline[] => {
    const output: Inline[] = [];
    for (const node of nodes) {
      switch (node.type) {
        case "text": output.push(new TextRun({ text: node.value, bold: style.bold, italics: style.italics, strike: style.strike, color: style.link ? "0563C1" : undefined, underline: style.link ? {} : undefined })); break;
        case "inlineCode": output.push(new TextRun({ text: node.value, bold: style.bold, italics: style.italics, strike: style.strike, font: "Consolas", shading: { fill: "F1F3F5", type: ShadingType.CLEAR } })); break;
        case "break": output.push(new TextRun({ text: "", break: 1 })); break;
        case "strong": output.push(...runs(node.children, { ...style, bold: true })); break;
        case "emphasis": output.push(...runs(node.children, { ...style, italics: true })); break;
        case "delete": output.push(...runs(node.children, { ...style, strike: true })); break;
        case "link": {
          const href = safeMarkdownUrl(node.url);
          const children = runs(node.children, { ...style, link: Boolean(href) });
          output.push(...(href ? [new ExternalHyperlink({ children, link: href })] : children));
          break;
        }
        case "image": output.push(new TextRun({ text: node.alt || "[image]", bold: style.bold, italics: style.italics, strike: style.strike })); break;
        case "html": output.push(new TextRun({ text: node.value, font: "Consolas" })); break;
        default: {
          if ("children" in node) output.push(...runs(node.children as PhrasingContent[], style));
          else if ("value" in node) output.push(new TextRun({ text: String(node.value) }));
        }
      }
    }
    return output;
  };

  const paragraph = (nodes: readonly PhrasingContent[], options: Record<string, unknown> = {}) => new Paragraph({ children: runs(nodes), spacing: { after: 160 }, ...options } as ConstructorParameters<typeof Paragraph>[0]);
  const plainCellRuns = (nodes: readonly PhrasingContent[], bold = false) => runs(nodes, { bold });
  const docxChildren: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [];

  const renderTable = (table: MdTable) => {
    const columns = Math.max(1, ...table.children.map((row) => row.children.length));
    const columnWidths = Array.from({ length: columns }, () => Math.floor(9360 / columns));
    columnWidths[columnWidths.length - 1] += 9360 - columnWidths.reduce((sum, width) => sum + width, 0);
    const border = { style: BorderStyle.SINGLE, size: 4, color: "CBD2D9" };
    const rows = table.children.map((row, rowIndex) => new TableRow({
      tableHeader: rowIndex === 0,
      children: Array.from({ length: columns }, (_, column) => {
        const cell = row.children[column];
        const align = table.align?.[column] === "center" ? AlignmentType.CENTER : table.align?.[column] === "right" ? AlignmentType.RIGHT : AlignmentType.LEFT;
        return new TableCell({
          width: { size: columnWidths[column], type: WidthType.DXA },
          shading: rowIndex === 0 ? { fill: "E9EDF2", type: ShadingType.CLEAR } : undefined,
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          borders: { top: border, bottom: border, left: border, right: border },
          children: [new Paragraph({ alignment: align, children: cell ? plainCellRuns(cell.children, rowIndex === 0) : [new TextRun("")] })],
        });
      }),
    }));
    return new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths, margins: { top: 80, bottom: 80, left: 100, right: 100 }, layout: "fixed" as never });
  };

  const orderedReference = (start: number) => {
    const reference = `markdown-ordered-${++listCounter}`;
    numbering.push({ reference, levels: Array.from({ length: 9 }, (_, level) => ({ level, format: LevelFormat.DECIMAL, text: `${Array.from({ length: level + 1 }, (__, index) => `%${index + 1}`).join(".")}.`, start: level === 0 ? start : 1 })) });
    return reference;
  };

  const renderList = (list: List, depth: number, reference?: string) => {
    const listReference = list.ordered ? reference ?? orderedReference(list.start ?? 1) : undefined;
    list.children.forEach((item: ListItem) => {
      const firstParagraph = item.children.find((child) => child.type === "paragraph");
      const marker = item.checked === true ? "[x] " : item.checked === false ? "[ ] " : "";
      const children = [...(marker ? [new TextRun({ text: marker })] : []), ...(firstParagraph?.type === "paragraph" ? runs(firstParagraph.children) : [])];
      const listOptions = list.ordered ? { numbering: { reference: listReference!, level: Math.min(depth, 8) } } : { bullet: { level: Math.min(depth, 8) } };
      docxChildren.push(new Paragraph({ children: children.length ? children : [new TextRun("")], ...listOptions, spacing: { after: 80 } }));
      for (const child of item.children) {
        if (child === firstParagraph) continue;
        if (child.type === "list") renderList(child, depth + 1);
        else renderBlock(child);
      }
    });
  };

  function renderBlock(node: Content, quote = false): void {
    switch (node.type) {
      case "heading": {
        const heading = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6][node.depth - 1];
        docxChildren.push(new Paragraph({ heading, children: runs(node.children), spacing: { before: 220, after: 100 }, keepNext: true }));
        break;
      }
      case "paragraph": docxChildren.push(paragraph(node.children, quote ? { indent: { left: 420 }, border: { left: { style: BorderStyle.SINGLE, size: 12, color: "AAB1BA", space: 8 } } } : {})); break;
      case "blockquote": for (const child of node.children) renderBlock(child, true); break;
      case "list": renderList(node, 0); break;
      case "code": {
        const lines = node.value.replace(/\t/gu, "    ").replace(/\r\n|\r/gu, "\n").split("\n");
        docxChildren.push(new Paragraph({ children: lines.flatMap((line, index) => index ? [new TextRun({ text: line, break: 1, font: "Consolas", size: 18 })] : [new TextRun({ text: line, font: "Consolas", size: 18 })]), shading: { fill: "F1F3F5", type: ShadingType.CLEAR }, indent: { left: 180 }, spacing: { after: 120 } }));
        break;
      }
      case "thematicBreak": docxChildren.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "AAB1BA", space: 1 } }, spacing: { after: 160 } })); break;
      case "table": docxChildren.push(renderTable(node)); break;
      case "html": docxChildren.push(new Paragraph({ children: [new TextRun({ text: node.value, font: "Consolas" })] })); break;
      default: if ("children" in node) for (const child of node.children as Content[]) renderBlock(child, quote);
    }
  }

  const root = parseMarkdownTree(markdown) as Root;
  if (options.title.trim()) docxChildren.push(new Paragraph({ text: options.title.trim(), style: "Title", spacing: { after: 300 } }));
  for (const node of root.children) renderBlock(node);
  const doc = new Document({
    creator: "Ujjwal Tools", title: options.title.trim() || undefined, description: "Generated locally from Markdown by Ujjwal Tools.",
    numbering: { config: numbering },
    sections: [{ properties: {}, children: docxChildren }],
  });
  const blob = await Packer.toBlob(doc);
  return { blob, filename: `${sanitizeDocxFilename(options.title)}.docx` };
}
