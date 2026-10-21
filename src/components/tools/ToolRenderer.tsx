"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { ToolCategory } from "@/lib/tools/registry";
import type { Mode } from "@/components/tools/implementations/DeveloperSuite";
import type { WebMode } from "@/components/tools/implementations/WebSuite";
import type { ConverterMode } from "@/components/tools/implementations/ConvertersSuite";

const toolComponents: Record<string, ComponentType> = {
  json: dynamic(() => import("@/components/tools/implementations/JsonFormatter").then((module) => module.JsonFormatter)),
  base64: dynamic(() => import("@/components/tools/implementations/Base64Tool").then((module) => module.Base64Tool)),
  uuid: dynamic(() => import("@/components/tools/implementations/UuidGenerator").then((module) => module.UuidGenerator)),
  convert: dynamic(() => import("@/components/tools/implementations/ColorConverter").then((module) => module.ColorConverter)),
  "word-counter": dynamic(() => import("@/components/tools/implementations/WordCounter").then((module) => module.WordCounter)),
  merge: dynamic(() => import("@/components/tools/implementations/pdf/MergePdf").then((module) => module.MergePdf)),
  split: dynamic(() => import("@/components/tools/implementations/pdf/SplitPdf").then((module) => module.SplitPdf)),
  inspect: dynamic(() => import("@/components/tools/implementations/pdf/PdfInspector").then((module) => module.PdfInspector)),
  "text-to-pdf": dynamic(() => import("@/components/tools/implementations/pdf/TextToPdf").then((module) => module.TextToPdf)),
  "images-to-pdf": dynamic(() => import("@/components/tools/implementations/pdf/ImagesToPdf").then((module) => module.ImagesToPdf)),
  "to-png": dynamic(() => import("@/components/tools/implementations/pdf/PdfToImages").then((module) => module.PdfToPngTool)),
  "to-jpg": dynamic(() => import("@/components/tools/implementations/pdf/PdfToImages").then((module) => module.PdfToJpgTool)),
  "csv-viewer": dynamic(() => import("@/components/tools/implementations/CsvViewer").then((module) => module.CsvViewer)),
  "file-info": dynamic(() => import("@/components/tools/implementations/FileInfo").then((module) => module.FileInfo)),
  "xml-inspector": dynamic(() => import("@/components/tools/implementations/XmlInspector").then((module) => module.XmlInspector)),
  editor: dynamic(() => import("@/components/tools/implementations/MarkdownEditor").then((module) => module.MarkdownEditor)),
  "to-html": dynamic(() => import("@/components/tools/implementations/MarkdownToHtml").then((module) => module.MarkdownToHtml)),
  "to-markdown": dynamic(() => import("@/components/tools/implementations/HtmlToMarkdown").then((module) => module.HtmlToMarkdown)),
  "to-pdf": dynamic(() => import("@/components/tools/implementations/pdf/MarkdownToPdf").then((module) => module.MarkdownToPdf)),
  "to-docx": dynamic(() => import("@/components/tools/implementations/MarkdownToDocx").then((module) => module.MarkdownToDocx)),
  "table-generator": dynamic(() => import("@/components/tools/implementations/MarkdownTableGenerator").then((module) => module.MarkdownTableGenerator)),
  "table-to-markdown": dynamic(() => import("@/components/tools/implementations/TableToMarkdown").then((module) => module.TableToMarkdown)),
  "toc-generator": dynamic(() => import("@/components/tools/implementations/MarkdownTocGenerator").then((module) => module.MarkdownTocGenerator)),
  formatter: dynamic(() => import("@/components/tools/implementations/MarkdownFormatter").then((module) => module.MarkdownFormatter)),
};

const ImageTool = dynamic<{ tool: string }>(() => import("@/components/tools/implementations/images/ImageSuite").then((module) => module.ImageSuite), { ssr: false });
const DeveloperSuite = dynamic<{ mode: Mode }>(() => import("@/components/tools/implementations/DeveloperSuite").then((module) => module.DeveloperSuite), { ssr: false });
const WebSuite = dynamic<{ mode: WebMode }>(() => import("@/components/tools/implementations/WebSuite").then((module) => module.WebSuite), { ssr: false });
const ConvertersSuite = dynamic<{ mode: ConverterMode }>(() => import("@/components/tools/implementations/ConvertersSuite").then((module) => module.ConvertersSuite), { ssr: false });

const suiteTools = new Set(["json-to-csv", "csv-to-json", "json-to-typescript", "json-to-yaml", "case-converter", "remove-duplicate-lines", "sort-lines", "remove-empty-lines", "find-replace", "diff", "url-encode", "html-entities", "unicode", "regex", "cron-explainer", "cron-generator", "gitignore", "url-parser", "query-string", "user-agent", "http-status", "robots-tester", "sitemap-validator", "jwt-decoder", "hash", "hmac"]);
const webTools = new Set(["meta-generator", "og-preview", "x-card-preview", "json-ld", "sitemap-generator", "robots-generator", "canonical-checker", "seo-preview", "slug-generator", "http-headers", "metadata-inspector", "social-metadata-checker"]);

export function ToolRenderer({ slug, category }: { slug: string; category: ToolCategory }) {
  if (category === "converters") return <ConvertersSuite mode={slug as ConverterMode} />;
  if (category === "images") return <ImageTool tool={slug} />;
  if (suiteTools.has(slug)) return <DeveloperSuite mode={slug as Mode} />;
  if (webTools.has(slug)) return <WebSuite mode={slug as WebMode} />;
  const Tool = toolComponents[slug];
  return Tool ? <Tool /> : <div className="empty-state" role="alert">This tool is registered but its implementation is not available yet.</div>;
}
