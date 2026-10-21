import type { Content, List, ListItem, PhrasingContent, Root, Table } from "mdast";
import { parseMarkdownTree, safeMarkdownUrl } from "../markdown.ts";
import { countUtf8Bytes, getTextPdfPageDimensions, MAX_TEXT_BYTES, sanitizePdfFilename, unsupportedCharacters, validateTextPdfOptions, type TextPdfOptions } from "./text-to-pdf.ts";
import { MAX_TEXT_PDF_PAGES } from "./text-to-pdf.ts";

export type MarkdownPdfOptions = Pick<TextPdfOptions, "pageSize" | "orientation" | "marginMm" | "font" | "fontSize" | "title" | "pageNumbers">;

export const DEFAULT_MARKDOWN_PDF_OPTIONS: MarkdownPdfOptions = {
  pageSize: "a4", orientation: "portrait", marginMm: 20, font: "Helvetica", fontSize: 11, title: "", pageNumbers: true,
};

type FontStyle = "normal" | "bold" | "italic" | "boldItalic" | "code";
type Run = { text: string; style: FontStyle; link?: string; strike?: boolean };
type Line = Run[];

function collectRuns(nodes: readonly PhrasingContent[], inherited: { bold?: boolean; italic?: boolean; strike?: boolean } = {}): Run[] {
  const runs: Run[] = [];
  const add = (text: string, style = getFontStyle(inherited), link?: string) => { if (text) runs.push({ text, style, link, strike: inherited.strike }); };
  for (const node of nodes) {
    switch (node.type) {
      case "text": add(node.value); break;
      case "inlineCode": add(node.value, "code"); break;
      case "break": add("\n"); break;
      case "strong": runs.push(...collectRuns(node.children, { ...inherited, bold: true })); break;
      case "emphasis": runs.push(...collectRuns(node.children, { ...inherited, italic: true })); break;
      case "delete": runs.push(...collectRuns(node.children, { ...inherited, strike: true })); break;
      case "link": {
        const href = safeMarkdownUrl(node.url);
        const children = collectRuns(node.children, inherited);
        if (href) for (const child of children) runs.push({ ...child, link: href });
        else runs.push(...children);
        break;
      }
      case "image": add(node.alt || "[image]"); break;
      case "html": add(node.value, "code"); break;
      default: {
        if ("children" in node) runs.push(...collectRuns(node.children as PhrasingContent[], inherited));
        else if ("value" in node) add(String(node.value));
      }
    }
  }
  return runs;
}

function getFontStyle(style: { bold?: boolean; italic?: boolean }): FontStyle {
  return style.bold && style.italic ? "boldItalic" : style.bold ? "bold" : style.italic ? "italic" : "normal";
}

function plainInline(nodes: readonly PhrasingContent[]): string {
  return collectRuns(nodes).map(({ text }) => text).join("").replace(/\s+/gu, " ").trim();
}

function itemPrefix(item: ListItem, index: number, ordered: boolean): string {
  if (item.checked === true) return "[x] ";
  if (item.checked === false) return "[ ] ";
  return ordered ? `${index + 1}. ` : "- ";
}

function normalizeText(value: string): string {
  return value.replace(/\t/gu, "    ").replace(/\r\n|\r/gu, "\n");
}

function wrapRuns(runs: Run[], maxWidth: number, size: number, measure: (text: string, style: FontStyle, size: number) => number): Line[] {
  const lines: Line[] = [[]];
  let lineWidth = 0;
  const current = () => lines[lines.length - 1];
  const newline = () => { lines.push([]); lineWidth = 0; };
  for (const run of runs) {
    const pieces = run.text.split("\n");
    pieces.forEach((piece, pieceIndex) => {
      if (piece) {
        const tokens = piece.match(/\s+|\S+/gu) ?? [];
        for (const token of tokens) {
          const tokenWidth = measure(token, run.style, size);
          if (!/^\s+$/u.test(token) && lineWidth > 0 && lineWidth + tokenWidth > maxWidth) newline();
          if (tokenWidth <= maxWidth) {
            current().push({ ...run, text: token });
            lineWidth += tokenWidth;
          } else {
            let chunk = "";
            for (const character of token) {
              if (chunk && measure(chunk + character, run.style, size) > maxWidth) {
                current().push({ ...run, text: chunk }); newline(); chunk = character;
              } else chunk += character;
            }
            if (chunk) { current().push({ ...run, text: chunk }); lineWidth += measure(chunk, run.style, size); }
          }
        }
      }
      if (pieceIndex < pieces.length - 1) newline();
    });
  }
  return lines.length ? lines : [[]];
}

export async function createMarkdownPdf(markdown: string, options: MarkdownPdfOptions): Promise<{ blob: Blob; pageCount: number; filename: string }> {
  if (!markdown.trim()) throw new Error("Add Markdown before generating a PDF.");
  if (countUtf8Bytes(markdown) > MAX_TEXT_BYTES) throw new Error("Markdown source exceeds the 1 MiB input limit. Reduce the source; it is not truncated.");
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(markdown)) throw new Error("Markdown contains unsupported control characters. Remove them and try again.");
  validateTextPdfOptions({ ...options, lineSpacing: 1.25, header: "", footer: "" });
  if (options.title.length > 200 || /[\r\n]/u.test(options.title)) throw new Error("Document title must be a single line of at most 200 characters.");
  if (/[\u0000-\u001F\u007F]/u.test(options.title)) throw new Error("Document title cannot contain control characters.");

  const { PDFDocument, StandardFonts, rgb, PDFName, PDFString } = await import("pdf-lib");
  const document = await PDFDocument.create({ updateMetadata: false });
  const selectedFonts = options.font === "Helvetica"
    ? [StandardFonts.Helvetica, StandardFonts.HelveticaBold, StandardFonts.HelveticaOblique, StandardFonts.HelveticaBoldOblique, StandardFonts.Courier]
    : options.font === "TimesRoman"
      ? [StandardFonts.TimesRoman, StandardFonts.TimesRomanBold, StandardFonts.TimesRomanItalic, StandardFonts.TimesRomanBoldItalic, StandardFonts.Courier]
      : [StandardFonts.Courier, StandardFonts.CourierBold, StandardFonts.CourierOblique, StandardFonts.CourierBoldOblique, StandardFonts.Courier];
  const fonts = await Promise.all(selectedFonts.map((font) => document.embedFont(font)));
  const fontFor = (style: FontStyle) => fonts[style === "code" ? 4 : style === "bold" ? 1 : style === "italic" ? 2 : style === "boldItalic" ? 3 : 0];
  const allText = `${markdown}\n${options.title}`.replace(/[\r\n\t]/gu, " ");
  const unsupported = unsupportedCharacters(allText, (character) => {
    try { fonts[0].encodeText(character); return true; } catch { return false; }
  });
  if (unsupported.length) {
    const samples = unsupported.slice(0, 5).map((character) => `“${character}” (U+${character.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")})`).join(", ");
    throw new Error(`The selected built-in PDF font cannot render ${samples}${unsupported.length > 5 ? ` and ${unsupported.length - 5} more` : ""}. Use Latin text with supported Windows-1252 characters; emoji and many non-Latin scripts are not supported.`);
  }

  const root = parseMarkdownTree(markdown) as Root;
  const [width, height] = getTextPdfPageDimensions(options.pageSize, options.orientation);
  const margin = options.marginMm * 72 / 25.4;
  const contentWidth = width - margin * 2;
  const bottom = margin + (options.pageNumbers ? 20 : 0);
  const maxPages = MAX_TEXT_PDF_PAGES;
  const pages: ReturnType<typeof document.addPage>[] = [];
  let page = document.addPage([width, height]);
  pages.push(page);
  let y = height - margin;
  const lineHeight = (size: number) => size * 1.32;
  const addPage = () => {
    if (pages.length >= maxPages) throw new Error(`This Markdown would need more than ${maxPages} pages. Reduce the source or use a smaller font size.`);
    page = document.addPage([width, height]); pages.push(page); y = height - margin;
  };
  const ensureSpace = (heightNeeded: number) => { if (y - heightNeeded < bottom) addPage(); };
  const measure = (text: string, style: FontStyle, size: number) => fontFor(style).widthOfTextAtSize(text, size);
  const drawRule = (x1: number, x2: number) => {
    ensureSpace(10); y -= 5;
    page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: 0.7, color: rgb(0.72, 0.72, 0.72) });
    y -= 10;
  };

  function drawParagraph(runs: Run[], settings: { size?: number; bold?: boolean; indent?: number; quote?: boolean; gap?: number } = {}) {
    const size = settings.size ?? options.fontSize;
    const x = margin + (settings.indent ?? 0) + (settings.quote ? 12 : 0);
    const available = contentWidth - (x - margin);
    const styled = settings.bold ? runs.map((run) => ({ ...run, style: run.style === "code" ? "code" as const : run.style === "italic" ? "boldItalic" as const : "bold" as const })) : runs;
    const lines = wrapRuns(styled, available, size, measure);
    for (const line of lines) {
      ensureSpace(lineHeight(size));
      let xCursor = x;
      const baseline = y - size;
      if (settings.quote) page.drawLine({ start: { x: margin + (settings.indent ?? 0), y: y + 1 }, end: { x: margin + (settings.indent ?? 0), y: y - lineHeight(size) + 3 }, thickness: 2, color: rgb(0.65, 0.68, 0.72) });
      for (const run of line) {
        const font = fontFor(run.style);
        const runSize = run.style === "code" ? Math.max(8, size * 0.88) : size;
        const runWidth = font.widthOfTextAtSize(run.text, runSize);
        if (run.style === "code") page.drawRectangle({ x: xCursor - 1, y: baseline - 1, width: runWidth + 2, height: runSize + 3, color: rgb(0.94, 0.95, 0.96), opacity: 0.8 });
        page.drawText(run.text, { x: xCursor, y: baseline, size: runSize, font, color: run.link ? rgb(0.12, 0.30, 0.55) : rgb(0.10, 0.11, 0.13) });
        if (run.link && runWidth > 0) {
          const annotation = document.context.register(document.context.obj({
            Type: PDFName.of("Annot"), Subtype: PDFName.of("Link"), Rect: [xCursor, baseline - 1, xCursor + runWidth, baseline + runSize + 2],
            Border: [0, 0, 0], A: { Type: PDFName.of("Action"), S: PDFName.of("URI"), URI: PDFString.of(run.link) },
          }));
          page.node.addAnnot(annotation);
        }
        if (run.strike && runWidth > 0) page.drawLine({ start: { x: xCursor, y: baseline + runSize * 0.36 }, end: { x: xCursor + runWidth, y: baseline + runSize * 0.36 }, thickness: 0.55, color: rgb(0.2, 0.2, 0.2) });
        xCursor += runWidth;
      }
      y -= lineHeight(size);
    }
    y -= settings.gap ?? 4;
  }

  function renderCode(value: string) {
    const size = Math.max(8, options.fontSize * 0.84);
    const codeRuns: Run[] = normalizeText(value).split("\n").flatMap((line, index) => index ? [{ text: `\n${line}`, style: "code" as const }] : [{ text: line, style: "code" as const }]);
    const lines = wrapRuns(codeRuns, contentWidth - 14, size, measure);
    for (const line of lines) {
      ensureSpace(lineHeight(size) + 4);
      page.drawRectangle({ x: margin, y: y - lineHeight(size) + 2, width: contentWidth, height: lineHeight(size) + 3, color: rgb(0.95, 0.96, 0.97) });
      const text = line.map((run) => run.text).join("");
      if (text) page.drawText(text, { x: margin + 7, y: y - size, size, font: fontFor("code"), color: rgb(0.14, 0.15, 0.18) });
      y -= lineHeight(size) + 3;
    }
    y -= 5;
  }

  function renderTable(table: Table) {
    const rows = table.children.map((row) => row.children.map((cell) => plainInline(cell.children)));
    const columns = Math.max(1, ...rows.map((row) => row.length));
    const characterWidths = Array.from({ length: columns }, (_, column) => Math.max(5, ...rows.map((row) => (row[column] ?? "").slice(0, 80).length)));
    const total = characterWidths.reduce((sum, value) => sum + value, 0);
    const widths = characterWidths.map((value) => Math.max(48, (contentWidth - 2 * columns) * value / total));
    const widthScale = contentWidth / widths.reduce((sum, value) => sum + value, 0);
    for (let index = 0; index < widths.length; index += 1) widths[index] *= widthScale;
    const cellFontSize = Math.max(8, Math.min(10, options.fontSize * 0.84));
    const drawRow = (values: string[], header: boolean) => {
      const cellLines = widths.map((cellWidth, index) => wrapRuns([{ text: values[index] ?? "", style: header ? "bold" : "normal" }], cellWidth - 10, cellFontSize, measure).map((line) => line.map((run) => run.text).join("")));
      const maxLines = Math.max(1, ...cellLines.map((lines) => lines.length));
      const maxLinesPerPage = Math.max(1, Math.floor((height - margin - bottom - 8) / lineHeight(cellFontSize)));
      let consumed = 0;
      while (consumed < maxLines) {
        const segmentLines = Math.min(maxLinesPerPage, maxLines - consumed);
        const rowHeight = segmentLines * lineHeight(cellFontSize) + 8;
        if (y - rowHeight < bottom) { addPage(); }
        let x = margin;
        for (let column = 0; column < columns; column += 1) {
          const cellWidth = widths[column];
          if (header && consumed === 0) page.drawRectangle({ x, y: y - rowHeight, width: cellWidth, height: rowHeight, color: rgb(0.91, 0.93, 0.95) });
          page.drawRectangle({ x, y: y - rowHeight, width: cellWidth, height: rowHeight, borderColor: rgb(0.72, 0.74, 0.77), borderWidth: 0.5, opacity: 0, borderOpacity: 1 });
          for (let lineIndex = 0; lineIndex < segmentLines; lineIndex += 1) {
            const text = cellLines[column]?.[consumed + lineIndex] ?? "";
            if (text) page.drawText(text, { x: x + 5, y: y - 4 - cellFontSize - lineIndex * lineHeight(cellFontSize), size: cellFontSize, font: fontFor(header ? "bold" : "normal"), color: rgb(0.1, 0.11, 0.13) });
          }
          x += cellWidth;
        }
        y -= rowHeight; consumed += segmentLines;
        if (consumed < maxLines) addPage();
      }
    };
    rows.forEach((row, index) => drawRow(row, index === 0));
    y -= 8;
  }

  function renderList(list: List, depth: number, quote = false) {
    list.children.forEach((item, index) => {
      const prefix = itemPrefix(item, index, Boolean(list.ordered));
      const inline = item.children.find((child) => child.type === "paragraph");
      if (inline?.type === "paragraph") drawParagraph([{ text: prefix, style: "normal" }, ...collectRuns(inline.children)], { indent: depth * 14, quote });
      for (const child of item.children) {
        if (child === inline) continue;
        if (child.type === "list") renderList(child, depth + 1, quote);
        else renderBlock(child, depth * 14 + 14, quote);
      }
    });
    y -= 2;
  }

  function renderBlock(node: Content, indent = 0, quote = false) {
    switch (node.type) {
      case "heading": drawParagraph(collectRuns(node.children), { size: Math.max(12, options.fontSize + (7 - node.depth) * 2), bold: true, indent, quote, gap: 7 }); break;
      case "paragraph": drawParagraph(collectRuns(node.children), { indent, quote }); break;
      case "blockquote": for (const child of node.children) renderBlock(child, indent, true); y -= 2; break;
      case "list": renderList(node, indent ? Math.max(1, Math.round(indent / 14)) : 0, quote); break;
      case "code": renderCode(node.value); break;
      case "thematicBreak": drawRule(margin, width - margin); break;
      case "table": renderTable(node); break;
      case "html": drawParagraph([{ text: node.value, style: "code" }], { indent, quote }); break;
      default: if ("children" in node) for (const child of node.children as Content[]) renderBlock(child, indent, quote);
    }
  }

  if (options.title.trim()) drawParagraph([{ text: options.title.trim(), style: "bold" }], { size: Math.max(18, options.fontSize + 6), gap: 12 });
  let seenContent = false;
  for (const node of root.children) {
    if (seenContent) y -= 4;
    renderBlock(node);
    seenContent = true;
  }
  for (let index = 0; index < pages.length; index += 1) {
    const currentPage = pages[index];
    if (options.pageNumbers) {
      const label = `${index + 1} / ${pages.length}`;
      currentPage.drawText(label, { x: width - margin - fonts[0].widthOfTextAtSize(label, 9), y: margin / 2, size: 9, font: fonts[0], color: rgb(0.4, 0.4, 0.4) });
    }
  }
  document.setCreator("Ujjwal Tools");
  document.setProducer("Ujjwal Tools · pdf-lib");
  if (options.title.trim()) document.setTitle(options.title.trim());
  const bytes = await document.save();
  return { blob: new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], { type: "application/pdf" }), pageCount: pages.length, filename: sanitizePdfFilename(options.title.trim() || "Markdown document") };
}
