"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

const toolComponents: Record<string, ComponentType> = {
  json: dynamic(() => import("@/components/tools/implementations/JsonFormatter").then((module) => module.JsonFormatter)),
  base64: dynamic(() => import("@/components/tools/implementations/Base64Tool").then((module) => module.Base64Tool)),
  uuid: dynamic(() => import("@/components/tools/implementations/UuidGenerator").then((module) => module.UuidGenerator)),
  convert: dynamic(() => import("@/components/tools/implementations/ColorConverter").then((module) => module.ColorConverter)),
  "word-counter": dynamic(() => import("@/components/tools/implementations/WordCounter").then((module) => module.WordCounter)),
  merge: dynamic(() => import("@/components/tools/implementations/pdf/MergePdf").then((module) => module.MergePdf)),
  split: dynamic(() => import("@/components/tools/implementations/pdf/SplitPdf").then((module) => module.SplitPdf)),
  "images-to-pdf": dynamic(() => import("@/components/tools/implementations/pdf/ImagesToPdf").then((module) => module.ImagesToPdf)),
  "to-png": dynamic(() => import("@/components/tools/implementations/pdf/PdfToImages").then((module) => module.PdfToPngTool)),
  "to-jpg": dynamic(() => import("@/components/tools/implementations/pdf/PdfToImages").then((module) => module.PdfToJpgTool)),
};

export function ToolRenderer({ slug }: { slug: string }) {
  const Tool = toolComponents[slug];
  return Tool ? <Tool /> : null;
}
