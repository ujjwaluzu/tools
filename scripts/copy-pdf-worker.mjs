import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const projectRoot = process.cwd();
const workerSource = join(projectRoot, "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const publicDirectory = join(projectRoot, "public");
const workerDestination = join(publicDirectory, "pdf.worker.min.mjs");

await mkdir(publicDirectory, { recursive: true });
await copyFile(workerSource, workerDestination);
