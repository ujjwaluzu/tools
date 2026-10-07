export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 24_000_000;
export const MAX_IMAGE_EDGE = 12_000;

export type ImageInfo = { width: number; height: number; type: string };
export type ImageOutput = { name: string; blob: Blob };

export async function inspectImage(file: File): Promise<ImageInfo> {
  if (!file.size) throw new Error("This file is empty.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("This image is too large to process safely in your browser. The limit is 25 MB.");
  const type = await sniffType(file);
  if (!type) throw new Error("This file is not a supported PNG, JPEG, WebP, AVIF, or SVG image.");
  const headerDimensions = await readHeaderDimensions(file, type);
  if (headerDimensions) validateDimensions(headerDimensions.width, headerDimensions.height);
  const bitmap = await decodeImage(file, type);
  const info = { width: bitmap.width, height: bitmap.height, type };
  bitmap.close();
  validateDimensions(info.width, info.height);
  return info;
}

export async function sniffType(file: File): Promise<string | null> {
  const bytes = new Uint8Array(await file.slice(0, Math.min(file.size, 4096)).arrayBuffer());
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  if (String.fromCharCode(...bytes.slice(4, 12)).includes("ftypavif")) return "image/avif";
  const leading = new TextDecoder().decode(bytes).replace(/^\uFEFF?\s*/, "");
  if (leading.startsWith("<svg") || (leading.startsWith("<?xml") && leading.includes("<svg"))) return "image/svg+xml";
  return null;
}

export async function decodeImage(file: File, type?: string): Promise<ImageBitmap> {
  const actualType = type ?? await sniffType(file);
  if (!actualType) throw new Error("This file is not a supported image.");
  const headerDimensions = await readHeaderDimensions(file, actualType);
  if (headerDimensions) validateDimensions(headerDimensions.width, headerDimensions.height);
  if (actualType === "image/svg+xml") {
    const source = await file.text();
    if (source.length > 2_000_000) throw new Error("This SVG is too large to process safely.");
    const safeSvg = sanitizeSvg(source);
    const blob = new Blob([safeSvg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const width = image.naturalWidth || 1024;
      const height = image.naturalHeight || 1024;
      validateDimensions(width, height);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Your browser could not prepare this image.");
      context.drawImage(image, 0, 0);
      return await createImageBitmap(canvas);
    } finally { URL.revokeObjectURL(url); }
  }
  try { return await createImageBitmap(file, { imageOrientation: "from-image" }); }
  catch { throw new Error("We couldn't open this image. It may be corrupted or unsupported by this browser."); }
}

async function readHeaderDimensions(file: File, type: string): Promise<{ width: number; height: number } | null> {
  const bytes = new Uint8Array(await file.slice(0, Math.min(file.size, 1_000_000)).arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (type === "image/svg+xml") {
    const document = new DOMParser().parseFromString(new TextDecoder().decode(bytes), "image/svg+xml");
    if (document.querySelector("parsererror") || document.documentElement.localName !== "svg") throw new Error("This SVG file is malformed.");
    const root = document.documentElement;
    const viewBox = root.getAttribute("viewBox")?.trim().split(/[\s,]+/).map(Number);
    const width = Number.parseFloat(root.getAttribute("width") ?? "") || (viewBox?.length === 4 ? viewBox[2] : 1024);
    const height = Number.parseFloat(root.getAttribute("height") ?? "") || (viewBox?.length === 4 ? viewBox[3] : 1024);
    return { width: Math.ceil(width), height: Math.ceil(height) };
  }
  if (type === "image/png" && bytes.length >= 24) return { width: view.getUint32(16), height: view.getUint32(20) };
  if (type === "image/jpeg") {
    let offset = 2;
    while (offset + 4 < bytes.length) {
      if (bytes[offset] !== 0xff) { offset += 1; continue; }
      const marker = bytes[offset + 1];
      if (marker === 0xda || marker === 0xd9) break;
      const length = view.getUint16(offset + 2);
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && length >= 7) {
        return { height: view.getUint16(offset + 5), width: view.getUint16(offset + 7) };
      }
      if (length < 2) break;
      offset += 2 + length;
    }
  }
  if (type === "image/webp" && bytes.length >= 30 && String.fromCharCode(...bytes.slice(12, 16)) === "VP8X") {
    const width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
    const height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
    return { width, height };
  }
  if (type === "image/avif") {
    const marker = [0x69, 0x73, 0x70, 0x65];
    for (let offset = 4; offset + 16 <= bytes.length; offset++) {
      if (marker.every((byte, index) => bytes[offset + index] === byte)) return { width: view.getUint32(offset + 8), height: view.getUint32(offset + 12) };
    }
    throw new Error("We couldn't safely verify this AVIF image's dimensions in the browser. Try a PNG, JPG, or WebP image.");
  }
  if (type === "image/webp" && !bytes.slice(12, 16).every((byte, index) => byte === [0x56, 0x50, 0x38, 0x58][index])) {
    throw new Error("We couldn't safely verify this WebP image's dimensions. Try a PNG or JPG image.");
  }
  return null;
}

function sanitizeSvg(source: string): string {
  if (/<!DOCTYPE|<!ENTITY/i.test(source)) throw new Error("This SVG contains unsupported document declarations.");
  const doc = new DOMParser().parseFromString(source, "image/svg+xml");
  if (doc.querySelector("parsererror") || doc.documentElement.localName !== "svg") throw new Error("This SVG file is malformed.");
  doc.querySelectorAll("script,foreignObject,iframe,object,embed,audio,video,style").forEach((node) => node.remove());
  for (const element of Array.from(doc.querySelectorAll("*"))) {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      if (name.startsWith("on") || ((name === "href" || name.endsWith(":href")) && !value.startsWith("#")) || /url\s*\(\s*['"]?(?!#)/i.test(value)) element.removeAttribute(attribute.name);
    }
  }
  const root = doc.documentElement;
  if (!root.getAttribute("width")) root.setAttribute("width", "1024");
  if (!root.getAttribute("height")) root.setAttribute("height", "1024");
  return new XMLSerializer().serializeToString(root);
}

export function validateDimensions(width: number, height: number): void {
  if (!width || !height || width > MAX_IMAGE_EDGE || height > MAX_IMAGE_EDGE || width * height > MAX_IMAGE_PIXELS) {
    throw new Error("This image has too many pixels to process safely in your browser. Use an image under 24 megapixels and 12,000 pixels per side.");
  }
}

export async function canvasBlob(canvas: HTMLCanvasElement, type = "image/png", quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => {
    if (!blob) { reject(new Error("We couldn't export this image. Try another format or a smaller image.")); return; }
    if (blob.type !== type) { reject(new Error(`This browser cannot reliably export ${type.replace("image/", "").toUpperCase()} images. Choose a different output format.`)); return; }
    resolve(blob);
  }, type, quality));
}

export async function renderImage(file: File, draw: (context: CanvasRenderingContext2D, bitmap: ImageBitmap) => void, width?: number, height?: number, type = "image/png", quality = 0.92): Promise<Blob> {
  const bitmap = await decodeImage(file);
  const outputWidth = width ?? bitmap.width;
  const outputHeight = height ?? bitmap.height;
  validateDimensions(outputWidth, outputHeight);
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const context = canvas.getContext("2d");
  if (!context) { bitmap.close(); throw new Error("Your browser could not prepare this image."); }
  try { draw(context, bitmap); return await canvasBlob(canvas, type, quality); }
  finally { bitmap.close(); canvas.width = 0; canvas.height = 0; }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function safeImageName(name: string, suffix = "output", extension = "png"): string {
  const base = name.replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "image";
  return `${base}-${suffix}.${extension}`;
}

export function readJpegExif(buffer: ArrayBuffer): Record<string, string> {
  const data = new DataView(buffer);
  const result: Record<string, string> = {};
  if (data.byteLength < 4 || data.getUint16(0) !== 0xffd8) return result;
  let offset = 2;
  while (offset + 4 < data.byteLength) {
    const marker = data.getUint16(offset);
    if (marker === 0xffda || marker === 0xffd9) break;
    const length = data.getUint16(offset + 2);
    const start = offset + 4;
    if (marker === 0xffe1 && length >= 8 && String.fromCharCode(...new Uint8Array(buffer, start, 6)) === "Exif\0\0") {
      const tiff = start + 6;
      const little = data.getUint16(tiff) === 0x4949;
      const u16 = (position: number) => data.getUint16(position, little);
      const u32 = (position: number) => data.getUint32(position, little);
      const ifd = tiff + u32(tiff + 4);
      const entries = u16(ifd);
      const tags: Record<number, string> = { 0x010f: "Camera make", 0x0110: "Camera model", 0x0112: "Orientation", 0x0131: "Software", 0x0132: "Date/time", 0x829a: "Exposure time", 0x8827: "ISO", 0x9003: "Date/time original", 0x920a: "Focal length", 0x829d: "Aperture", 0xa434: "Lens" };
      for (let i = 0; i < entries; i++) {
        const entry = ifd + 2 + i * 12;
        if (entry + 12 > data.byteLength) break;
        const tag = u16(entry);
        if (tag === 0x8769) { parseExifIfd(data, tiff, u32(entry + 8), little, result); continue; }
        if (tag === 0x8825) { result.GPS = "Location metadata present (potentially sensitive)"; continue; }
        if (tags[tag]) { const value = readExifValue(data, tiff, entry, little); if (value) result[tags[tag]] = value; }
      }
      break;
    }
    if (length < 2) break;
    offset += 2 + length;
  }
  return result;
}

function parseExifIfd(data: DataView, tiff: number, relative: number, little: boolean, result: Record<string, string>): void {
  const ifd = tiff + relative;
  if (ifd + 2 > data.byteLength) return;
  const count = Math.min(data.getUint16(ifd, little), 100);
  const tags: Record<number, string> = { 0x829a: "Exposure time", 0x8827: "ISO", 0x9003: "Date/time original", 0x920a: "Focal length", 0x829d: "Aperture", 0xa434: "Lens" };
  for (let i = 0; i < count; i++) {
    const entry = ifd + 2 + i * 12;
    if (entry + 12 > data.byteLength) return;
    const label = tags[data.getUint16(entry, little)];
    if (label) { const value = readExifValue(data, tiff, entry, little); if (value) result[label] = value; }
  }
}

function readExifValue(data: DataView, tiff: number, entry: number, little: boolean): string {
  const format = data.getUint16(entry + 2, little);
  const count = data.getUint32(entry + 4, little);
  const sizes: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };
  const size = (sizes[format] ?? 0) * count;
  const location = size <= 4 ? entry + 8 : tiff + data.getUint32(entry + 8, little);
  if (!size || size > 4096 || location + size > data.byteLength) return "";
  if (format === 2) return new TextDecoder().decode(new Uint8Array(data.buffer, location, count)).replace(/\0+$/, "").trim();
  if (format === 3) return String(data.getUint16(location, little));
  if (format === 4) return String(data.getUint32(location, little));
  if (format === 5 || format === 10) {
    const numerator = format === 5 ? data.getUint32(location, little) : data.getInt32(location, little);
    const denominator = format === 5 ? data.getUint32(location + 4, little) : data.getInt32(location + 4, little);
    return denominator ? `${(numerator / denominator).toFixed(2)}${format === 5 ? "" : ""}` : "";
  }
  return "";
}
