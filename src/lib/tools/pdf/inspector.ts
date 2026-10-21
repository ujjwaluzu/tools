import { inspectPdfInformation, type PdfInformation } from "../file-info.ts";

export type PdfPageInfo = PdfInformation["pages"][number];
export type PdfInspection = PdfInformation & { metadata: Omit<PdfInformation, "pageCount" | "pages"> };

export async function inspectPdfDocument(file: File): Promise<PdfInspection> {
  const info = await inspectPdfInformation(file);
  const metadata = Object.fromEntries(Object.entries({
    title: info.title, author: info.author, subject: info.subject, creator: info.creator, producer: info.producer,
    creationDate: info.creationDate, modificationDate: info.modificationDate,
  }).filter(([, value]) => value !== undefined && value !== "")) as PdfInspection["metadata"];
  return { ...info, metadata };
}

export function formatPdfExtraction(pages: Array<{ page: number; text: string }>): string {
  return pages.map(({ page, text }) => `--- Page ${page} ---\n${text.trim() || "[No selectable text found on this page.]"}`).join("\n\n");
}

export function formatPdfTextItems(items: Array<{ str?: string; transform?: number[] }>): string {
  const positioned = items.map((item, index) => ({ text: item.str ?? "", x: item.transform?.[4] ?? index, y: item.transform?.[5] ?? 0 }))
    .filter((item) => item.text.length > 0).sort((a, b) => Math.abs(b.y - a.y) > 2 ? b.y - a.y : a.x - b.x);
  const lines: Array<{ y: number; parts: Array<{ x: number; text: string }> }> = [];
  for (const item of positioned) {
    let line = lines.find((candidate) => Math.abs(candidate.y - item.y) <= 2);
    if (!line) { line = { y: item.y, parts: [] }; lines.push(line); }
    line.parts.push({ x: item.x, text: item.text });
  }
  return lines.sort((a, b) => b.y - a.y).map((line) => line.parts.sort((a, b) => a.x - b.x)
    .map((part) => part.text).join(" ").replace(/[ \t]+/g, " ").trim()).filter(Boolean).join("\n");
}
