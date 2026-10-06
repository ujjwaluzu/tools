export type PdfOutput = {
  name: string;
  blob: Blob;
};

export type PdfPageProgress = {
  completed: number;
  total: number;
  page: number;
};

export type PdfImageType = "png" | "jpg";

export const MAX_PDF_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_PDF_TOTAL_BYTES = 100 * 1024 * 1024;
export const MAX_PDF_FILES = 20;
export const MAX_PDF_PAGES = 500;
export const MAX_EXTRACT_PAGES = 250;
export const MAX_RENDER_PAGES = 30;
export const MAX_RENDER_PAGE_PIXELS = 16_000_000;
export const MAX_RENDER_TOTAL_PIXELS = 40_000_000;
export const MAX_IMAGE_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_IMAGE_TOTAL_BYTES = 80 * 1024 * 1024;
export const MAX_IMAGE_FILES = 30;
export const MAX_IMAGE_PIXELS = 24_000_000;
export const MAX_IMAGE_TOTAL_PIXELS = 30_000_000;
