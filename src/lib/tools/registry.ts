export type ToolCategory =
  | "pdf"
  | "images"
  | "developer"
  | "web-seo"
  | "markdown"
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
  additionalCategories?: ToolCategory[];
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
  { slug: "data", name: "Data", description: "Inspect, convert, and clean data files.", icon: "▦" },
  { slug: "color", name: "Color", description: "Work with color values and palettes.", icon: "◉" },
  { slug: "security", name: "Security & Encoding", description: "Encode values and generate identifiers locally.", icon: "⌑" },
  { slug: "converters", name: "Converters", description: "Convert common values and units.", icon: "⇄" },
  { slug: "everyday", name: "Everyday", description: "Fast answers for day-to-day tasks.", icon: "✳" },
  { slug: "student", name: "Student Tools", description: "Extract, format, cite, and study with small local tools.", icon: "▱" },
];

export const tools: ToolDefinition[] = [
  ...[
    ["px-rem", "PX ↔ REM Converter", "Convert pixels and rem using a configurable root font size.", ["px", "pixels", "rem", "root font size", "css units"]],
    ["rem-em", "REM ↔ EM Converter", "Compare root-relative rem values with parent-relative em sizing.", ["rem", "em", "font size", "css units"]],
    ["bytes", "Bytes & Storage Unit Converter", "Convert decimal kB through TB and binary KiB through TiB.", ["bytes", "kb", "mb", "gb", "tb", "kib", "mib", "gib", "binary", "decimal"]],
    ["milliseconds", "Milliseconds & Time Converter", "Convert fractional durations from milliseconds through days.", ["milliseconds", "seconds", "minutes", "hours", "days", "duration"]],
    ["unit-converter", "Common Measurement Converter", "Convert length, mass, and temperature units with correct temperature formulas.", ["unit converter", "length", "weight", "mass", "temperature", "celsius", "fahrenheit", "kelvin"]],
    ["unix-timestamp", "Unix Timestamp Converter", "Convert ISO dates to Unix seconds and milliseconds with UTC and local time.", ["unix", "timestamp", "epoch", "seconds", "milliseconds", "date"]],
    ["timezone-converter", "Timezone Converter", "Convert local date and time across IANA timezones and daylight-saving transitions.", ["timezone", "time zone", "iana", "dst", "daylight saving", "world clock"]],
    ["date-difference", "Date Difference Calculator", "Compare calendar dates by elapsed days and calendar years, months, and days.", ["date difference", "days between", "calendar", "inclusive", "duration"]],
    ["json-query-string", "JSON ↔ Query String Converter", "Convert flat JSON objects and URL query strings while preserving repeated keys.", ["json", "query string", "url params", "repeated keys", "encode", "decode"]],
    ["cron-generator", "Cron Expression Generator", "Generate and validate common five-field cron schedules.", ["cron", "schedule", "generator", "five field", "minutes", "daily"]],
    ["cron-explainer", "Cron Expression Explainer", "Validate and explain five-field cron syntax, lists, ranges, and steps.", ["cron", "explain", "parser", "schedule", "validate"]],
    ["css-units", "CSS Units Converter", "Convert CSS lengths with explicit font and viewport assumptions.", ["css", "units", "px", "rem", "em", "vw", "vh", "cm", "percent"]],
    ["currency", "Live Currency Converter", "Fetch a current indicative exchange rate on demand and convert an amount.", ["currency", "exchange rate", "forex", "money", "usd", "eur", "inr", "live"]],
  ].map(([slug, title, description, keywords]) => ({ slug: slug as string, category: "converters" as const, title: title as string, description: description as string, metaTitle: `${title as string} Online`, keywords: keywords as string[], icon: "⇄", href: `/tools/converters/${slug as string}`, processing: "client" as const, privacyNote: slug === "currency" ? "Rates are fetched from Frankfurter only when you request a refresh. Your amount and other tool inputs are not sent." : "Conversion runs locally in your browser. Your input is not uploaded or saved.", ...(["unit-converter", "unix-timestamp", "timezone-converter", "date-difference", "currency"].includes(slug as string) ? { additionalCategories: ["everyday" as const] } : {}) })),
  {
    slug: "editor", category: "markdown", title: "Markdown Editor & Preview", metaTitle: "Markdown Editor and Live Preview Online",
    description: "Write Markdown and preview GitHub-style formatting live in your browser.",
    keywords: ["markdown", "editor", "preview", "gfm", "github flavored markdown", "write", "render", "live"], icon: "M↓", href: "/tools/markdown/editor", processing: "client",
    privacyNote: "Markdown editing and preview happen locally in your browser. Your source is not uploaded or saved.",
  },
  {
    slug: "to-html", category: "markdown", title: "Markdown to HTML Converter", metaTitle: "Markdown to HTML Converter Online",
    description: "Convert Markdown to a complete, sanitized HTML document locally in your browser.",
    keywords: ["markdown", "html", "convert", "converter", "gfm", "export", "sanitize", "download"], icon: "M→H", href: "/tools/markdown/to-html", processing: "client",
    privacyNote: "Markdown conversion and HTML sanitization happen locally in your browser. Your content is not uploaded or saved.",
  },
  {
    slug: "to-markdown", category: "markdown", title: "HTML to Markdown Converter", metaTitle: "HTML to Markdown Converter Online",
    description: "Convert pasted HTML into readable Markdown locally in your browser.",
    keywords: ["html", "markdown", "convert", "converter", "turndown", "gfm", "table", "download"], icon: "H→M", href: "/tools/markdown/to-markdown", processing: "client",
    privacyNote: "HTML is parsed and converted locally in your browser. Input is not rendered, uploaded, or saved.",
  },
  {
    slug: "to-pdf", category: "markdown", additionalCategories: ["student"], title: "Markdown to PDF Converter", metaTitle: "Markdown to PDF Converter Online",
    description: "Create a structured, paginated PDF from Markdown locally in your browser.",
    keywords: ["markdown", "pdf", "convert", "document", "export", "gfm", "download"], icon: "M→PDF", href: "/tools/markdown/to-pdf", processing: "client",
    privacyNote: "Markdown parsing and PDF generation happen locally in your browser. Your content is not uploaded or saved.",
  },
  {
    slug: "to-docx", category: "markdown", title: "Markdown to DOCX Converter", metaTitle: "Markdown to DOCX Converter Online",
    description: "Create a formatted Microsoft Word document from Markdown locally in your browser.",
    keywords: ["markdown", "docx", "word", "document", "convert", "gfm", "download"], icon: "M→W", href: "/tools/markdown/to-docx", processing: "client",
    privacyNote: "Markdown parsing and DOCX generation happen locally in your browser. Your content is not uploaded or saved.",
  },
  {
    slug: "table-generator", category: "markdown", title: "Markdown Table Generator", metaTitle: "Markdown Table Generator Online",
    description: "Build, align, and export escaped Markdown tables in your browser.",
    keywords: ["markdown", "table", "generator", "builder", "alignment", "gfm", "copy", "download"], icon: "M▦", href: "/tools/markdown/table-generator", processing: "client",
    privacyNote: "Table editing and Markdown generation happen locally in your browser. Your content is not uploaded or saved.",
  },
  {
    slug: "table-to-markdown", category: "markdown", title: "Table to Markdown Converter", metaTitle: "Table to Markdown Converter Online",
    description: "Convert TSV, CSV, or pasted HTML tables into escaped Markdown locally.",
    keywords: ["table", "markdown", "tsv", "csv", "html", "convert", "gfm", "alignment"], icon: "▦→M", href: "/tools/markdown/table-to-markdown", processing: "client",
    privacyNote: "Tabular input is parsed locally in your browser. Your data is not uploaded or saved.",
  },
  {
    slug: "toc-generator", category: "markdown", title: "Markdown TOC Generator", metaTitle: "Markdown Table of Contents Generator",
    description: "Generate nested, duplicate-safe Markdown table-of-contents links from real heading syntax.",
    keywords: ["markdown", "toc", "table of contents", "heading", "anchors", "slug", "gfm"], icon: "M≡", href: "/tools/markdown/toc-generator", processing: "client",
    privacyNote: "Heading extraction and TOC generation happen locally in your browser. Your Markdown is not uploaded or saved.",
  },
  {
    slug: "formatter", category: "markdown", title: "Markdown Formatter", metaTitle: "Markdown Formatter Online",
    description: "Normalize Markdown headings, lists, block spacing, and GFM tables locally.",
    keywords: ["markdown", "formatter", "format", "normalize", "gfm", "prettify", "tables", "lists"], icon: "M≋", href: "/tools/markdown/formatter", processing: "client",
    privacyNote: "Markdown formatting runs locally in your browser. Source and output are not uploaded or saved.",
  },
  ...[
    ["convert", "Convert Images", "Convert images between common formats directly in your browser.", "Convert Images Online - Ujjwal Tools", ["image", "convert", "png", "jpg", "webp", "avif", "svg"]],
    ["resize", "Resize Images", "Resize images quickly in your browser without uploading them.", "Resize Images Online - Ujjwal Tools", ["image", "resize", "dimensions", "scale"]],
    ["compress", "Compress Images", "Compress images locally in your browser and compare the actual file size.", "Compress Images Online - Ujjwal Tools", ["image", "compress", "quality", "file size"]],
    ["crop", "Crop Images", "Crop images to a preset or custom aspect ratio in your browser.", "Crop Images Online - Ujjwal Tools", ["image", "crop", "aspect ratio"]],
    ["transform", "Transform Images", "Rotate and flip images locally in your browser.", "Transform Images Online - Ujjwal Tools", ["image", "rotate", "flip"]],
    ["adjust", "Adjust Images", "Tune brightness, contrast, saturation, grayscale, and blur.", "Adjust Images Online - Ujjwal Tools", ["image", "brightness", "contrast", "saturation", "blur"]],
    ["base64", "Image to Base64", "Encode an image as a Data URL or raw Base64 locally.", "Image to Base64 - Ujjwal Tools", ["image", "base64", "data url", "encode"]],
    ["base64-to-image", "Base64 to Image", "Decode image Base64 locally and preview the resulting image.", "Base64 to Image - Ujjwal Tools", ["image", "base64", "decode", "data url"]],
    ["exif", "EXIF Viewer", "View supported image metadata locally in your browser.", "EXIF Viewer - Ujjwal Tools", ["image", "exif", "metadata", "gps", "camera"]],
    ["remove-exif", "Remove Image Metadata", "Re-encode an image to remove metadata where supported.", "Remove Image Metadata - Ujjwal Tools", ["image", "exif", "metadata", "remove"]],
    ["favicon", "Favicon Generator", "Generate 16, 32, and 48 pixel PNG favicons from an image.", "Favicon Generator - Ujjwal Tools", ["favicon", "png", "icon", "website"]],
    ["pwa-icons", "PWA Icon Generator", "Generate 192 and 512 pixel app icons and a manifest snippet.", "PWA Icon Generator - Ujjwal Tools", ["pwa", "app icon", "manifest", "png"]],
    ["thumbnail", "Thumbnail Generator", "Create image thumbnails with fit or crop sizing.", "Thumbnail Generator - Ujjwal Tools", ["thumbnail", "resize", "crop", "image"]],
    ["og", "OG Image Generator", "Create a clean Open Graph image for a webpage or article.", "OG Image Generator - Ujjwal Tools", ["open graph", "og", "social image", "social preview"]],
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
    slug: "inspect", category: "pdf", additionalCategories: ["student"], title: "PDF Inspector & Text Extraction", metaTitle: "PDF Inspector and Text Extraction Online",
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
    slug: "word-counter", category: "developer", additionalCategories: ["student"], title: "Word Counter", description: "Count words, characters, sentences, paragraphs, and reading time as you type.",
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
  ...[
    ["calculator", "Calculator", "Calculate expressions with decimals, parentheses, percentages, and keyboard input.", ["calculator", "math", "arithmetic", "percentage", "expression", "sum", "divide", "multiply"]],
    ["percentage-calculator", "Percentage Calculator", "Find a percentage, compare values, or increase and decrease by a percentage.", ["percent", "percentage of", "percentage change", "reverse percentage", "discount", "increase", "decrease"]],
    ["age-calculator", "Age Calculator", "Calculate age in years, months, and days between calendar dates.", ["age", "birthday", "date of birth", "dob", "years old", "days alive"]],
    ["tip-calculator", "Tip Calculator", "Calculate a tip, bill total, and per-person share.", ["tip", "gratuity", "bill split", "restaurant", "per person"]],
    ["gst-calculator", "GST Calculator", "Add GST to a price or extract GST from a tax-inclusive amount.", ["gst", "tax", "inclusive", "exclusive", "sales tax"]],
    ["loan-calculator", "Loan Calculator", "Estimate monthly loan repayments, total interest, and an optional amortization schedule.", ["loan", "mortgage", "repayment", "interest", "amortization", "emi"]],
    ["date-time", "Date and Time Utilities", "Add or subtract calendar time and inspect useful date details.", ["date", "calendar", "add days", "month end", "leap year", "day of year", "weekday"]],
    ["random-generator", "Random Generator", "Generate unbiased random integers, pick a list item, or shuffle a list locally.", ["random", "number generator", "pick a winner", "shuffle", "list picker", "crypto randomness"]],
  ].map(([slug, title, description, keywords]) => ({
    slug: slug as string, category: "everyday" as const, title: title as string, description: description as string,
    keywords: keywords as string[], icon: "✳", href: `/tools/everyday/${slug}`, processing: "client" as const,
    privacyNote: slug === "currency" ? "Only the selected currency pair is sent to Frankfurter to retrieve a public exchange rate. Amounts stay in your browser." : "Calculations run locally in your browser. Your inputs are not uploaded or saved.",
  })),
  ...[
    ["image-to-text", "Image to Text (OCR)", "Extract printed English text from an image locally in your browser.", ["ocr", "image to text", "extract text", "photo", "scan", "english"]],
    ["notes-to-markdown", "Notes to Markdown", "Format plain notes into readable Markdown with optional, explicit structure.", ["notes", "markdown", "format", "paragraphs", "lists", "checklist", "study"]],
    ["citation-helper", "Citation Formatting Helper", "Create editable APA 7, MLA 9, or Chicago author-date citation drafts from source details.", ["citation", "reference", "apa", "mla", "chicago", "bibliography", "journal", "book", "website"]],
    ["apa-reference", "APA 7 Reference Builder", "Build a source-specific APA 7 reference and in-text citation draft.", ["apa", "apa 7", "reference", "citation", "book", "journal", "website", "report"]],
    ["text-utilities", "Text Utilities", "Transform text locally with case, line, whitespace, and literal find-and-replace tools.", ["text", "case converter", "sort lines", "duplicate lines", "find replace", "whitespace"]],
    ["study-timer", "Study Timer", "Use a private focus timer with Pomodoro, break, and custom duration presets.", ["study", "timer", "pomodoro", "focus", "break", "countdown"]],
    ["flashcard-generator", "Flashcard Generator", "Make editable revision cards from notes with simple local rules.", ["flashcards", "revision", "study cards", "quiz", "question answer", "term definition"]],
    ["notes-organizer", "Notes Organizer", "Create, search, tag, and export study notes stored only in this browser.", ["notes", "organizer", "study notes", "tags", "local storage", "search"]],
  ].map(([slug, title, description, keywords]) => ({
    slug: slug as string, category: "student" as const, title: title as string,
    metaTitle: `${title as string} Online`, description: description as string,
    keywords: keywords as string[], icon: "book", href: `/tools/student/${slug as string}`, processing: "client" as const,
    privacyNote: slug === "notes-organizer" ? "Notes are stored only in this browser's local storage. They are not synced or uploaded; export or delete them at any time." : slug === "image-to-text" ? "Image processing stays in your browser. OCR loads the Tesseract.js worker and English language model from jsDelivr on demand; the image itself is not uploaded." : "This tool runs locally in your browser. Your input is not uploaded or saved.",
  })),
];

export function getCategory(slug: string): CategoryDefinition | undefined {
  return categories.find((category) => category.slug === slug);
}

export function getTool(categorySlug: string, toolSlug: string): ToolDefinition | undefined {
  const normalizedCategory = categorySlug === "web" ? "web-seo" : categorySlug;
  return tools.find((tool) => tool.category === normalizedCategory && tool.slug === toolSlug);
}

export function getToolsForCategory(categorySlug: string): ToolDefinition[] {
  return tools.filter((tool) => tool.category === categorySlug || tool.additionalCategories?.includes(categorySlug as ToolCategory));
}

export function getRelatedTools(tool: ToolDefinition, limit = 3): ToolDefinition[] {
  const belongsTo = (candidate: ToolDefinition, category: ToolCategory) => candidate.category === category || candidate.additionalCategories?.includes(category);
  return tools.filter((candidate) => candidate.href !== tool.href)
    .sort((a, b) => Number(belongsTo(b, tool.category)) - Number(belongsTo(a, tool.category)))
    .slice(0, limit);
}
