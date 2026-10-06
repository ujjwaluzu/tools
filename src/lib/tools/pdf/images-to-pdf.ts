import { MAX_IMAGE_FILE_BYTES, MAX_IMAGE_FILES, MAX_IMAGE_PIXELS, MAX_IMAGE_TOTAL_BYTES, MAX_IMAGE_TOTAL_PIXELS } from "@/lib/tools/pdf/types";
import { PdfToolError } from "@/lib/tools/pdf/validation";

export type PdfImageSettings = {
  pageSize: "a4" | "letter";
  orientation: "portrait" | "landscape";
  margin: number;
};

export async function detectImageType(file: File): Promise<"png" | "jpg" | "webp" | null> {
  if (file.size < 12 || file.size > MAX_IMAGE_FILE_BYTES) return null;
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47 && header[4] === 0x0d && header[5] === 0x0a && header[6] === 0x1a && header[7] === 0x0a) return "png";
  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) return "jpg";
  if (String.fromCharCode(...header.slice(0, 4)) === "RIFF" && String.fromCharCode(...header.slice(8, 12)) === "WEBP") return "webp";
  return null;
}

export function validateImageBatch(files: File[]): void {
  if (!files.length) throw new PdfToolError("Choose at least one image to make a PDF.");
  if (files.length > MAX_IMAGE_FILES) throw new PdfToolError(`Choose ${MAX_IMAGE_FILES} images or fewer at a time.`);
  if (files.some((file) => file.size > MAX_IMAGE_FILE_BYTES)) throw new PdfToolError("Each image must be 20 MB or smaller.");
  if (files.reduce((total, file) => total + file.size, 0) > MAX_IMAGE_TOTAL_BYTES) {
    throw new PdfToolError("The selected images exceed the 80 MB total limit. Remove an image and try again.");
  }
}

export async function makePdfFromImages(files: File[], settings: PdfImageSettings): Promise<Blob> {
  validateImageBatch(files);
  const { PDFDocument } = await import("pdf-lib");
  const document = await PDFDocument.create();
  const basePage = settings.pageSize === "a4" ? [595.28, 841.89] : [612, 792];
  const pageSize = settings.orientation === "portrait" ? basePage : [basePage[1], basePage[0]];
  let totalPixels = 0;

  for (const file of files) {
    const kind = await detectImageType(file);
    if (!kind) throw new PdfToolError(`${file.name} isn’t a readable PNG, JPG, or WebP image.`);

    let bitmap: ImageBitmap;
    try { bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }); }
    catch { throw new PdfToolError(`${file.name} couldn’t be opened as an image. It may be corrupted or unsupported.`); }
    if (bitmap.width * bitmap.height > MAX_IMAGE_PIXELS) {
      bitmap.close();
      throw new PdfToolError(`${file.name} has very large pixel dimensions. Use an image under 24 megapixels.`);
    }
    totalPixels += bitmap.width * bitmap.height;
    if (totalPixels > MAX_IMAGE_TOTAL_PIXELS) {
      bitmap.close();
      throw new PdfToolError("The selected images have too many combined pixels for a safe browser operation. Use fewer or smaller images.");
    }

    const canvas = window.document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d", { alpha: kind === "png" || kind === "webp" });
    if (!context) {
      bitmap.close();
      throw new PdfToolError("Your browser couldn’t prepare this image for the PDF.");
    }
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    const imageBlob = await canvasToPng(canvas);
    canvas.width = 0;
    canvas.height = 0;
    const embedded = await document.embedPng(await imageBlob.arrayBuffer());
    const page = document.addPage(pageSize as [number, number]);
    const availableWidth = pageSize[0] - settings.margin * 2;
    const availableHeight = pageSize[1] - settings.margin * 2;
    const scale = Math.min(availableWidth / embedded.width, availableHeight / embedded.height);
    const width = embedded.width * scale;
    const height = embedded.height * scale;
    page.drawImage(embedded, {
      x: (pageSize[0] - width) / 2,
      y: (pageSize[1] - height) / 2,
      width,
      height,
    });
  }

  const bytes = await document.save();
  return new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], { type: "application/pdf" });
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new PdfToolError("Your browser couldn’t encode one of the images.")), "image/png");
  });
}
