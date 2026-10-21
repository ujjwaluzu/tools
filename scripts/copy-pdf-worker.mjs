import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const projectRoot = process.cwd();
const workerSource = join(projectRoot, "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const publicDirectory = join(projectRoot, "public");
const workerDestination = join(publicDirectory, "pdf.worker.min.mjs");

await mkdir(publicDirectory, { recursive: true });
await copyFile(workerSource, workerDestination);

const ocrDirectory = join(publicDirectory, "ocr");
const ocrLanguageDirectory = join(ocrDirectory, "lang");
await mkdir(ocrLanguageDirectory, { recursive: true });
await copyFile(join(projectRoot, "node_modules", "tesseract.js", "dist", "worker.min.js"), join(ocrDirectory, "worker.min.js"));
await copyFile(join(projectRoot, "node_modules", "@tesseract.js-data", "eng", "4.0.0_best_int", "eng.traineddata.gz"), join(ocrLanguageDirectory, "eng.traineddata.gz"));
