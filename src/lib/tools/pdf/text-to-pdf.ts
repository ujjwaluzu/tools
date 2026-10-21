import { MAX_PDF_PAGES } from "./types.ts";

export const MAX_TEXT_BYTES = 1024 * 1024;
export const MAX_TEXT_PDF_PAGES = MAX_PDF_PAGES;
export const MIN_FONT_SIZE = 8;
export const MAX_FONT_SIZE = 36;
export const MIN_CONTENT_SIZE_PT = 36;

export type TextPdfPageSize = "a4" | "letter";
export type TextPdfOrientation = "portrait" | "landscape";
export type TextPdfFont = "Helvetica" | "TimesRoman" | "Courier";

export type TextPdfOptions = {
  pageSize: TextPdfPageSize;
  orientation: TextPdfOrientation;
  marginMm: number;
  font: TextPdfFont;
  fontSize: number;
  lineSpacing: number;
  title: string;
  header: string;
  footer: string;
  pageNumbers: boolean;
};

export type TextPdfLayout = {
  width: number;
  height: number;
  pages: string[][];
  lineHeight: number;
  margin: number;
  headerY: number;
  footerY: number;
};

export const DEFAULT_TEXT_PDF_OPTIONS: TextPdfOptions = {
  pageSize: "a4",
  orientation: "portrait",
  marginMm: 20,
  font: "Helvetica",
  fontSize: 12,
  lineSpacing: 1.25,
  title: "",
  header: "",
  footer: "",
  pageNumbers: false,
};

const MM_TO_PT = 72 / 25.4;
const PAGE_SIZES: Record<TextPdfPageSize, [number, number]> = {
  a4: [595.2756, 841.8898],
  letter: [612, 792],
};

export function countUtf8Bytes(text: string): number {
  return new TextEncoder().encode(text).byteLength;
}

export function countCharacters(text: string): number {
  let count = 0;
  for (const character of text) if (character.length) count += 1;
  return count;
}

export function countLines(text: string): number {
  if (!text) return 0;
  let count = 1;
  for (let index = 0; index < text.length; index += 1) {
    if (text.charCodeAt(index) === 13) {
      count += 1;
      if (text.charCodeAt(index + 1) === 10) index += 1;
    } else if (text.charCodeAt(index) === 10) count += 1;
  }
  return count;
}

export function validateTextInput(text: string): void {
  if (!text.trim()) throw new Error("Enter some text before generating a PDF.");
  if (countUtf8Bytes(text) > MAX_TEXT_BYTES) {
    throw new Error("Your text is larger than the 1 MiB limit. Remove some text and try again; nothing was truncated.");
  }
}

export function getTextPdfPageDimensions(pageSize: TextPdfPageSize, orientation: TextPdfOrientation): [number, number] {
  const [short, long] = PAGE_SIZES[pageSize];
  return orientation === "portrait" ? [short, long] : [long, short];
}

export function validateTextPdfOptions(options: TextPdfOptions): void {
  if (!(options.pageSize in PAGE_SIZES)) throw new Error("Choose A4 or US Letter page size.");
  if (options.orientation !== "portrait" && options.orientation !== "landscape") throw new Error("Choose portrait or landscape orientation.");
  if (![10, 15, 20, 25, 30].includes(options.marginMm)) throw new Error("Choose a margin from 10 to 30 mm.");
  if (!["Helvetica", "TimesRoman", "Courier"].includes(options.font)) throw new Error("Choose a supported font.");
  if (!Number.isFinite(options.fontSize) || options.fontSize < MIN_FONT_SIZE || options.fontSize > MAX_FONT_SIZE) {
    throw new Error(`Font size must be between ${MIN_FONT_SIZE} and ${MAX_FONT_SIZE} pt.`);
  }
  if (![1, 1.25, 1.5].includes(options.lineSpacing)) throw new Error("Choose a supported line spacing.");
  const [width, height] = getTextPdfPageDimensions(options.pageSize, options.orientation);
  const margin = options.marginMm * MM_TO_PT;
  const verticalReserved = margin * 2 + (options.header.trim() ? 16 : 0) + (options.footer.trim() || options.pageNumbers ? 16 : 0);
  if (width - margin * 2 < MIN_CONTENT_SIZE_PT || height - verticalReserved < Math.max(MIN_CONTENT_SIZE_PT, options.fontSize * options.lineSpacing)) {
    throw new Error("These margins and options leave too little room for text. Choose a smaller margin or font size.");
  }
  if (/[\r\n]/u.test(options.header) || /[\r\n]/u.test(options.footer)) throw new Error("Header and footer must each fit on one line.");
}

export function unsupportedCharacters(text: string, canEncode: (value: string) => boolean): string[] {
  const unsupported = new Set<string>();
  for (const character of text) if (!canEncode(character)) unsupported.add(character);
  return [...unsupported];
}

export function wrapTextLine(text: string, maxWidth: number, fontSize: number, measure: (text: string, fontSize: number) => number): string[] {
  return [...wrapTextLineIterator(text, maxWidth, fontSize, measure)];
}

function* wrapTextLineIterator(text: string, maxWidth: number, fontSize: number, measure: (text: string, fontSize: number) => number): Generator<string> {
  if (!text) { yield ""; return; }
  const lines: string[] = [];
  let line = "";
  const flush = () => { lines.push(line.trimEnd()); line = ""; };

  const words = /\S+\s*/gu;
  let match: RegExpExecArray | null;
  while ((match = words.exec(text)) !== null) {
    const word = match[0];
    if (!line && /^\s+$/u.test(word)) continue;
    const candidate = line + word;
    if (measure(candidate, fontSize) <= maxWidth) { line = candidate; continue; }
    if (line.trim()) { flush(); yield lines.pop()!; }
    let piece = "";
    for (const character of word.trimStart()) {
      if (piece && measure(piece + character, fontSize) > maxWidth) {
        yield piece;
        piece = character;
      } else piece += character;
    }
    line = piece;
  }
  if (line || !lines.length) flush();
  yield* lines;
}

export function layoutText(text: string, options: TextPdfOptions, measure: (text: string, fontSize: number) => number): TextPdfLayout {
  validateTextInput(text);
  validateTextPdfOptions(options);
  const [width, height] = getTextPdfPageDimensions(options.pageSize, options.orientation);
  const margin = options.marginMm * MM_TO_PT;
  const maxWidth = width - margin * 2;
  const lineHeight = options.fontSize * options.lineSpacing;
  const headerY = height - margin + 2;
  const footerY = margin - 2;
  const top = height - margin - (options.header.trim() ? 16 : 0);
  const bottom = margin + (options.footer.trim() || options.pageNumbers ? 16 : 0);
  if (options.header && measure(options.header, options.fontSize) > maxWidth) throw new Error("The header is too long to fit on one line. Shorten it and try again.");
  const footerMaxWidth = maxWidth - (options.pageNumbers ? 48 : 0);
  if (options.footer && measure(options.footer, options.fontSize) > footerMaxWidth) throw new Error("The footer is too long to fit beside the page number. Shorten it and try again.");

  const pages: string[][] = [[]];
  let y = top;
  const addLine = (line: string) => {
    if (y - lineHeight < bottom - 0.001) {
      if (pages[pages.length - 1].length === 0) throw new Error("The selected page settings leave too little room for text.");
      pages.push([]);
      if (pages.length > MAX_TEXT_PDF_PAGES) throw new Error(`This text would need more than ${MAX_TEXT_PDF_PAGES} pages. Reduce the text or use a smaller font size.`);
      y = top;
    }
    pages[pages.length - 1].push(line);
    y -= lineHeight;
  };

  let start = 0;
  for (let index = 0; index <= text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (index < text.length && code !== 10 && code !== 13) continue;
    const sourceLine = text.slice(start, index);
    for (const line of wrapTextLineIterator(sourceLine, maxWidth, options.fontSize, measure)) addLine(line);
    if (index >= text.length) break;
    if (code === 13 && text.charCodeAt(index + 1) === 10) index += 1;
    start = index + 1;
  }
  if (pages.length > MAX_TEXT_PDF_PAGES) throw new Error(`This text would need more than ${MAX_TEXT_PDF_PAGES} pages. Reduce the text or use a smaller font size.`);
  return { width, height, pages, lineHeight, margin, headerY, footerY };
}

export function countWords(text: string): number {
  let count = 0;
  for (const word of text.matchAll(/\S+/gu)) if (word[0].length) count += 1;
  return count;
}

export function sanitizePdfFilename(title: string): string {
  let base = title.normalize("NFKD").replace(/[\\/<>:"|?*\u0000-\u001F]/gu, "").replace(/[. ]+$/u, "").replace(/\s+/gu, " ").trim().slice(0, 100);
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(base)) base = `document ${base}`;
  return base ? `${base}.pdf` : "document.pdf";
}

export async function createTextPdf(text: string, options: TextPdfOptions): Promise<{ blob: Blob; pageCount: number }> {
  validateTextInput(text);
  validateTextPdfOptions(options);
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const document = await PDFDocument.create({ updateMetadata: false });
  const fontNames = {
    Helvetica: StandardFonts.Helvetica,
    TimesRoman: StandardFonts.TimesRoman,
    Courier: StandardFonts.Courier,
  };
  const font = await document.embedFont(fontNames[options.font]);
  const allText = [text, options.header, options.footer].join("\n").replace(/[\r\n]/gu, "");
  const unsupported = unsupportedCharacters(allText, (character) => {
    try { font.encodeText(character); return true; } catch { return false; }
  });
  if (unsupported.length) {
    const samples = unsupported.slice(0, 5).map((character) => `“${character}” (U+${character.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")})`).join(", ");
    throw new Error(`The selected built-in font cannot render ${samples}${unsupported.length > 5 ? ` and ${unsupported.length - 5} more` : ""}. Use Latin text with supported Windows-1252 accents and punctuation; emoji and many non-Latin scripts are not supported.`);
  }
  const layout = layoutText(text, options, (value, size) => font.widthOfTextAtSize(value, size));
  document.setCreator("Ujjwal Tools");
  document.setProducer("Ujjwal Tools · pdf-lib");
  if (options.title.trim()) document.setTitle(options.title.trim());

  for (let index = 0; index < layout.pages.length; index += 1) {
    const page = document.addPage([layout.width, layout.height]);
    if (options.header) page.drawText(options.header, { x: layout.margin, y: layout.headerY, font, size: options.fontSize, color: rgb(0.25, 0.25, 0.25) });
    let y = layout.height - layout.margin - (options.header.trim() ? 16 : 0);
    for (const line of layout.pages[index]) {
      if (line) page.drawText(line, { x: layout.margin, y: y - options.fontSize, font, size: options.fontSize, color: rgb(0.08, 0.08, 0.08) });
      y -= layout.lineHeight;
    }
    if (options.footer) page.drawText(options.footer, { x: layout.margin, y: layout.footerY, font, size: options.fontSize, color: rgb(0.3, 0.3, 0.3) });
    if (options.pageNumbers) {
      const label = `${index + 1} / ${layout.pages.length}`;
      const labelWidth = font.widthOfTextAtSize(label, options.fontSize);
      page.drawText(label, { x: layout.width - layout.margin - labelWidth, y: layout.footerY, font, size: options.fontSize, color: rgb(0.3, 0.3, 0.3) });
    }
    if (index % 20 === 19) await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  const bytes = await document.save();
  return { blob: new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], { type: "application/pdf" }), pageCount: layout.pages.length };
}
