export const MAX_OCR_IMAGE_BYTES = 20 * 1024 * 1024;
export const OCR_LANGUAGE = "eng";

export function validateOcrImage(file: Pick<File, "type" | "size">, bytes?: Uint8Array): string | null {
  if (file.size === 0) return "Choose an image file with content.";
  if (file.size > MAX_OCR_IMAGE_BYTES) return "Image files must be 20 MB or smaller.";
  const allowed = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/bmp"]);
  if (!allowed.has(file.type.toLowerCase())) return "Choose a PNG, JPEG, WebP, GIF, or BMP image.";
  if (!bytes) return null;
  const starts = (...signature: number[]) => signature.every((byte, index) => bytes[index] === byte);
  const type = file.type.toLowerCase();
  const valid = type === "image/png" ? starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)
    : type === "image/jpeg" ? starts(0xff, 0xd8, 0xff)
      : type === "image/gif" ? new TextDecoder().decode(bytes.slice(0, 6)).match(/^GIF8[79]a$/u) !== null
        : type === "image/webp" ? new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
          : starts(0x42, 0x4d);
  return valid ? null : "The file contents do not match its image type.";
}

export type OcrProgress = { status: string; progress: number };
export type OcrWorker = { recognize: (image: File) => Promise<{ data: { text: string } }>; terminate: () => Promise<unknown> | unknown };
export type OcrWorkerFactory = (progress: (value: OcrProgress) => void) => Promise<OcrWorker>;
export const createEnglishOcrWorker: OcrWorkerFactory = async (progress) => {
  const { createWorker } = await import("tesseract.js");
  return createWorker(OCR_LANGUAGE, undefined, { workerPath: "/ocr/worker.min.js", corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0", langPath: "/ocr/lang", logger: (message) => progress({ status: message.status, progress: message.progress }) });
};

export async function recognizeImage(file: File, options: { createWorker?: OcrWorkerFactory; onProgress?: (value: OcrProgress) => void; signal?: AbortSignal } = {}): Promise<string> {
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const validationError = validateOcrImage(file, header);
  if (validationError) throw new Error(validationError);
  if (options.signal?.aborted) throw new DOMException("OCR cancelled.", "AbortError");
  const worker = await (options.createWorker ?? createEnglishOcrWorker)(options.onProgress ?? (() => undefined));
  if (options.signal?.aborted) { await worker.terminate(); throw new DOMException("OCR cancelled.", "AbortError"); }
  let cancelled = false;
  let termination: Promise<unknown> | null = null;
  const terminate = () => termination ??= Promise.resolve(worker.terminate());
  const abort = () => { cancelled = true; void terminate(); };
  options.signal?.addEventListener("abort", abort, { once: true });
  try {
    const result = await worker.recognize(file);
    if (cancelled || options.signal?.aborted) throw new DOMException("OCR cancelled.", "AbortError");
    return result.data.text.trim();
  } finally {
    options.signal?.removeEventListener("abort", abort);
    await terminate();
  }
}
