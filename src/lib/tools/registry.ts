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
  { slug: "data", name: "Data", description: "Inspect, convert, and clean data files.", icon: "▦" },
  { slug: "color", name: "Color", description: "Work with color values and palettes.", icon: "◉" },
  { slug: "security", name: "Security & Encoding", description: "Encode values and generate identifiers locally.", icon: "⌑" },
  { slug: "converters", name: "Converters", description: "Convert common values and units.", icon: "⇄" },
  { slug: "everyday", name: "Everyday", description: "Fast answers for day-to-day tasks.", icon: "✳" },
  { slug: "student", name: "Student", description: "Small tools for studying and writing.", icon: "▱" },
];

export const tools: ToolDefinition[] = [
  {
    slug: "editor", category: "markdown", title: "Markdown Editor & Preview", metaTitle: "Markdown Editor and Live Preview Online",
    description: "Write Markdown and preview GitHub-style formatting live in your browser.",
    keywords: ["markdown", "editor", "preview", "gfm", "github flavored markdown", "write", "render", "live"], icon: "M↓", href: "/tools/markdown/editor", processing: "client",
    privacyNote: "Markdown editing and preview happen locally in your browser. Your source is not uploaded or saved.",
  },
  ...[
    ["convert", "Convert Images", "Convert images between common formats directly in your browser.", "Convert Images Online — Ujjwal Tools", ["image", "convert", "png", "jpg", "webp", "avif", "svg"]],
    ["resize", "Resize Images", "Resize images quickly in your browser without uploading them.", "Resize Images Online — Ujjwal Tools", ["image", "resize", "dimensions", "scale"]],
    ["compress", "Compress Images", "Compress images locally in your browser and compare the actual file size.", "Compress Images Online — Ujjwal Tools", ["image", "compress", "quality", "file size"]],
    ["crop", "Crop Images", "Crop images to a preset or custom aspect ratio in your browser.", "Crop Images Online — Ujjwal Tools", ["image", "crop", "aspect ratio"]],
    ["transform", "Transform Images", "Rotate and flip images locally in your browser.", "Transform Images Online — Ujjwal Tools", ["image", "rotate", "flip"]],
    ["adjust", "Adjust Images", "Tune brightness, contrast, saturation, grayscale, and blur.", "Adjust Images Online — Ujjwal Tools", ["image", "brightness", "contrast", "saturation", "blur"]],
    ["base64", "Image to Base64", "Encode an image as a Data URL or raw Base64 locally.", "Image to Base64 — Ujjwal Tools", ["image", "base64", "data url", "encode"]],
    ["base64-to-image", "Base64 to Image", "Decode image Base64 locally and preview the resulting image.", "Base64 to Image — Ujjwal Tools", ["image", "base64", "decode", "data url"]],
    ["exif", "EXIF Viewer", "View supported image metadata locally in your browser.", "EXIF Viewer — Ujjwal Tools", ["image", "exif", "metadata", "gps", "camera"]],
    ["remove-exif", "Remove Image Metadata", "Re-encode an image to remove metadata where supported.", "Remove Image Metadata — Ujjwal Tools", ["image", "exif", "metadata", "remove"]],
    ["favicon", "Favicon Generator", "Generate 16, 32, and 48 pixel PNG favicons from an image.", "Favicon Generator — Ujjwal Tools", ["favicon", "png", "icon", "website"]],
    ["pwa-icons", "PWA Icon Generator", "Generate 192 and 512 pixel app icons and a manifest snippet.", "PWA Icon Generator — Ujjwal Tools", ["pwa", "app icon", "manifest", "png"]],
    ["thumbnail", "Thumbnail Generator", "Create image thumbnails with fit or crop sizing.", "Thumbnail Generator — Ujjwal Tools", ["thumbnail", "resize", "crop", "image"]],
    ["og", "OG Image Generator", "Create a clean Open Graph image for a webpage or article.", "OG Image Generator — Ujjwal Tools", ["open graph", "og", "social image", "social preview"]],
  ].map(([slug, title, description, metaTitle, keywords]) => ({
    slug: slug as string, category: "images" as const, title: title as string, description: description as string,
    metaTitle: metaTitle as string, keywords: keywords as string[], icon: "▧", href: `/tools/images/${slug}`,
    processing: "client" as const, privacyNote: "Processed locally in your browser. Your image was not uploaded.",
  })),
  {
    slug: "merge", category: "pdf", title: "Merge PDF", metaTitle: "Merge PDF Files Online",
    description: "Combine multiple PDF files into one PDF directly in your browser.",
    keywords: ["pdf", "merge", "combine", "join", "documents"], icon: "▤+", href: "/tools/pdf/merge", processing: "client",
    privacyNote: "Processed locally in your browser. Your files are not uploaded.",
  },
  {
    slug: "inspect", category: "pdf", title: "PDF Inspector & Text Extraction", metaTitle: "PDF Inspector and Text Extraction Online",
    description: "Inspect PDF properties and extract selectable text from chosen pages in your browser.",
    keywords: ["pdf", "inspect", "metadata", "properties", "extract text", "text extraction", "pages", "dimensions"], icon: "PDF", href: "/tools/pdf/inspect", processing: "client",
    privacyNote: "PDF inspection and text extraction happen locally in your browser. Your document is not uploaded.",
  },
  {
    slug: "text-to-pdf", category: "pdf", title: "Text to PDF Generator", metaTitle: "Text to PDF Generator Online",
    description: "Turn plain text into a formatted PDF locally in your browser.",
    keywords: ["pdf", "text to pdf", "plain text", "document", "generate", "download", "local"], icon: "T→PDF", href: "/tools/pdf/text-to-pdf", processing: "client",
    privacyNote: "Your text is converted to PDF locally in your browser. It is not uploaded or saved.",
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
  ...[
    ["developer","json-to-csv","JSON to CSV","Convert an array of JSON objects to correctly escaped CSV."], ["developer","csv-to-json","CSV to JSON","Parse CSV with quoted fields and turn rows into JSON."], ["developer","json-to-typescript","JSON to TypeScript","Infer TypeScript interfaces from a JSON sample."], ["developer","json-to-yaml","JSON to YAML","Convert valid JSON to readable YAML locally."],
    ["developer","case-converter","Case Converter","Convert text between common developer-friendly cases."], ["developer","remove-duplicate-lines","Duplicate Line Remover","Keep the first occurrence of each line."], ["developer","sort-lines","Line Sorter","Sort text lines alphabetically or numerically."], ["developer","remove-empty-lines","Empty Line Remover","Remove empty or whitespace-only lines."], ["developer","find-replace","Find and Replace","Replace literal text or test regular expressions locally."], ["developer","diff","Diff Checker","Compare two texts and see added and removed lines."],
    ["developer","url-encode","URL Encoder / Decoder","Encode or decode URL components safely."], ["developer","html-entities","HTML Entity Encoder / Decoder","Encode HTML-significant characters or decode common entities."], ["developer","unicode","Unicode Converter","Inspect code points and convert U+XXXX notation."], ["developer","regex","Regex Tester","Test JavaScript regular expressions in your browser."], ["developer","cron-explainer","Cron Expression Explainer","Explain standard five-field cron expressions."], ["developer","cron-generator","Cron Expression Generator","Generate common five-field cron schedules."], ["developer","gitignore","Gitignore Generator","Build a deduplicated .gitignore for common stacks."],
    ["web-seo","url-parser","URL Parser","Inspect an absolute URL without fetching it."], ["web-seo","query-string","Query String Parser","Parse query strings or turn JSON objects into query text."], ["web-seo","user-agent","User-Agent Parser","Infer browser, OS, and device hints from a user-agent."], ["web-seo","http-status","HTTP Status Checker","Try a browser-side availability request and explain CORS limitations."], ["web-seo","robots-tester","robots.txt Tester","Test basic Allow and Disallow rules against a path."], ["web-seo","sitemap-validator","Sitemap Validator","Validate pasted XML sitemap structure locally."],
    ["web-seo","meta-generator","Meta Tag Generator","Generate escaped title, description, canonical, Open Graph, and X metadata."], ["web-seo","og-preview","Open Graph Preview","Preview an approximate Open Graph sharing card and its tags."], ["web-seo","x-card-preview","X Card Preview","Preview summary card metadata for X/Twitter."], ["web-seo","json-ld","JSON-LD Generator","Create basic Schema.org JSON-LD locally."], ["web-seo","sitemap-generator","Sitemap Generator","Generate an XML sitemap from manually supplied URLs."], ["web-seo","robots-generator","robots.txt Generator","Generate crawler directives and sitemap declarations."], ["web-seo","canonical-checker","Canonical URL Checker","Check canonical tags in pasted HTML locally."], ["web-seo","seo-preview","SEO Snippet Preview","Preview an illustrative search result snippet."], ["web-seo","slug-generator","Slug Generator","Create normalized URL-friendly slugs."], ["web-seo","http-headers","HTTP Headers Viewer","View browser-accessible response headers with CORS guidance."], ["web-seo","metadata-inspector","Website Metadata Inspector","Inspect pasted HTML metadata without executing it."], ["web-seo","social-metadata-checker","Favicon & Social Metadata Checker","Review declared favicon, Open Graph, and X metadata in pasted HTML."],
    ["security","jwt-decoder","JWT Decoder","Decode JWT header and payload locally without verifying signatures."], ["security","hash","Hash Generator","Generate SHA-256, SHA-384, or SHA-512 hashes locally."], ["security","hmac","HMAC Generator","Generate HMAC values locally with Web Crypto."],
  ].map(([category, slug, title, description]) => ({ slug, category: category as ToolCategory, title, description, keywords: [slug, title.toLowerCase(), "developer", "local"], icon: "{ }", href: `/tools/${category === "web-seo" ? "web" : category}/${slug}`, processing: "client" as const, privacyNote: "Processed locally in your browser. Your data was not uploaded." })),
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
    slug: "csv-viewer", category: "data", title: "CSV Viewer & Cleaner", metaTitle: "CSV Viewer and Cleaner Online",
    description: "Preview, filter, and clean CSV files locally in your browser.",
    keywords: ["csv", "spreadsheet", "viewer", "filter", "deduplicate", "cleaner", "data"], icon: "▦", href: "/tools/data/csv-viewer", processing: "client",
    privacyNote: "Your CSV is processed locally in your browser. Its contents are not uploaded.",
  },
  {
    slug: "file-info", category: "data", title: "File Information & Metadata", metaTitle: "File Information and Metadata Viewer",
    description: "Inspect local file properties and supported image or PDF metadata in your browser.",
    keywords: ["file", "information", "metadata", "mime", "signature", "image dimensions", "pdf pages"], icon: "▤", href: "/tools/data/file-info", processing: "client",
    privacyNote: "File inspection happens locally in your browser. Your file and metadata are not uploaded.",
  },
  {
    slug: "xml-inspector", category: "data", title: "XML Inspector", metaTitle: "XML Formatter, Validator and JSON Converter",
    description: "Format and validate XML, or convert it to JSON locally in your browser.",
    keywords: ["xml", "format", "pretty print", "validate", "json", "convert", "data", "parser"], icon: "< >", href: "/tools/data/xml-inspector", processing: "client",
    privacyNote: "XML is parsed locally in your browser. Your input is not uploaded.",
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
  const normalizedCategory = categorySlug === "web" ? "web-seo" : categorySlug;
  return tools.find((tool) => tool.category === normalizedCategory && tool.slug === toolSlug);
}

export function getToolsForCategory(categorySlug: string): ToolDefinition[] {
  return tools.filter((tool) => tool.category === categorySlug);
}

export function getRelatedTools(tool: ToolDefinition, limit = 3): ToolDefinition[] {
  return tools.filter((candidate) => candidate.href !== tool.href)
    .sort((a, b) => Number(b.category === tool.category) - Number(a.category === tool.category))
    .slice(0, limit);
}
