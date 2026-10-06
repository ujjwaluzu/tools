export type ToolCategory =
  | "pdf"
  | "images"
  | "developer"
  | "web-seo"
  | "markdown"
  | "git-github"
  | "data"
  | "color"
  | "security"
  | "converters"
  | "everyday"
  | "student";

export type ToolDefinition = {
  slug: string;
  category: ToolCategory;
  title: string;
  description: string;
  metaTitle?: string;
  keywords: string[];
  icon: string;
  href: string;
  processing: "client" | "server";
  privacyNote: string;
  popular?: boolean;
};

export type CategoryDefinition = {
  slug: ToolCategory;
  name: string;
  description: string;
  icon: string;
};

export const categories: CategoryDefinition[] = [
  { slug: "pdf", name: "PDF", description: "Make everyday PDF tasks less fiddly.", icon: "▤" },
  { slug: "images", name: "Images", description: "Convert and tidy up image files.", icon: "▧" },
  { slug: "developer", name: "Developer", description: "Quick helpers for code and text.", icon: "{ }" },
  { slug: "web-seo", name: "Web & SEO", description: "Handy utilities for building for the web.", icon: "↗" },
  { slug: "markdown", name: "Markdown", description: "Write, format, and preview Markdown.", icon: "M↓" },
  { slug: "git-github", name: "Git & GitHub", description: "Small helpers for your GitHub workflow.", icon: "⌘" },
  { slug: "data", name: "Data", description: "Convert and clean up structured data.", icon: "▦" },
  { slug: "color", name: "Color", description: "Work with color values and palettes.", icon: "◉" },
  { slug: "security", name: "Security & Encoding", description: "Encode values and generate identifiers locally.", icon: "⌑" },
  { slug: "converters", name: "Converters", description: "Convert common values and units.", icon: "⇄" },
  { slug: "everyday", name: "Everyday", description: "Fast answers for day-to-day tasks.", icon: "✳" },
  { slug: "student", name: "Student", description: "Small tools for studying and writing.", icon: "▱" },
];

export const tools: ToolDefinition[] = [
  {
    slug: "merge", category: "pdf", title: "Merge PDF", metaTitle: "Merge PDF Files Online",
    description: "Combine multiple PDF files into one PDF directly in your browser.",
    keywords: ["pdf", "merge", "combine", "join", "documents"], icon: "▤+", href: "/tools/pdf/merge", processing: "client",
    privacyNote: "Processed locally in your browser. Your files are not uploaded.",
  },
  {
    slug: "split", category: "pdf", title: "Split PDF", metaTitle: "Split PDF Files Online",
    description: "Split and extract pages from a PDF directly in your browser.",
    keywords: ["pdf", "split", "extract", "pages", "range"], icon: "▤↕", href: "/tools/pdf/split", processing: "client",
    privacyNote: "Processed locally in your browser. Your files are not uploaded.",
  },
  {
    slug: "images-to-pdf", category: "pdf", title: "Images to PDF",
    description: "Turn PNG, JPG, and WebP images into a PDF in your browser.",
    keywords: ["image", "images", "png", "jpg", "jpeg", "webp", "pdf", "convert"], icon: "▧→▤", href: "/tools/pdf/images-to-pdf", processing: "client",
    privacyNote: "Processed locally in your browser. Your files are not uploaded.",
  },
  {
    slug: "to-png", category: "pdf", title: "PDF to PNG",
    description: "Render PDF pages as PNG images directly in your browser.",
    keywords: ["pdf", "png", "image", "render", "convert", "pages"], icon: "▤→▧", href: "/tools/pdf/to-png", processing: "client",
    privacyNote: "Processed locally in your browser. Your files are not uploaded.",
  },
  {
    slug: "to-jpg", category: "pdf", title: "PDF to JPG",
    description: "Render PDF pages as JPG images directly in your browser.",
    keywords: ["pdf", "jpg", "jpeg", "image", "render", "convert", "pages"], icon: "▤→▧", href: "/tools/pdf/to-jpg", processing: "client",
    privacyNote: "Processed locally in your browser. Your files are not uploaded.",
  },
  {
    slug: "json", category: "developer", title: "JSON Formatter", description: "Format, validate, and minify JSON without sending it anywhere.",
    keywords: ["json", "format", "pretty print", "minify", "validate", "developer"], icon: "{ }", href: "/tools/developer/json", processing: "client",
    privacyNote: "Processed locally in your browser. Your data was not uploaded.", popular: true,
  },
  {
    slug: "word-counter", category: "developer", title: "Word Counter", description: "Count words, characters, and lines as you type.",
    keywords: ["word count", "characters", "lines", "text", "writing"], icon: "¶", href: "/tools/developer/word-counter", processing: "client",
    privacyNote: "Processed locally in your browser. Your data was not uploaded.", popular: true,
  },
  {
    slug: "base64", category: "security", title: "Base64 Encoder / Decoder", description: "Encode text to Base64 or decode a Base64 value locally.",
    keywords: ["base64", "encode", "decode", "security", "text"], icon: "⇄", href: "/tools/security/base64", processing: "client",
    privacyNote: "Processed locally in your browser. Your data was not uploaded.", popular: true,
  },
  {
    slug: "uuid", category: "security", title: "UUID Generator", description: "Generate one or more random UUIDs in your browser.",
    keywords: ["uuid", "guid", "random", "identifier", "security"], icon: "✳", href: "/tools/security/uuid", processing: "client",
    privacyNote: "Generated locally in your browser. Nothing was uploaded.", popular: true,
  },
  {
    slug: "convert", category: "color", title: "Color Converter", description: "Convert between HEX, RGB, and HSL with a live preview.",
    keywords: ["color", "colour", "hex", "rgb", "hsl", "converter"], icon: "◉", href: "/tools/color/convert", processing: "client",
    privacyNote: "Processed locally in your browser. Your data was not uploaded.", popular: true,
  },
];

export function getCategory(slug: string): CategoryDefinition | undefined {
  return categories.find((category) => category.slug === slug);
}

export function getTool(categorySlug: string, toolSlug: string): ToolDefinition | undefined {
  return tools.find((tool) => tool.category === categorySlug && tool.slug === toolSlug);
}

export function getToolsForCategory(categorySlug: string): ToolDefinition[] {
  return tools.filter((tool) => tool.category === categorySlug);
}

export function getRelatedTools(tool: ToolDefinition, limit = 3): ToolDefinition[] {
  return tools.filter((candidate) => candidate.slug !== tool.slug)
    .sort((a, b) => Number(b.category === tool.category) - Number(a.category === tool.category))
    .slice(0, limit);
}
