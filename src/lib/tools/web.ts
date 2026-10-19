export function escapeHtml(value: string) { return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char] ?? char); }
export function escapeXml(value: string) { return escapeHtml(value); }

export type Metadata = { title?: string; description?: string; canonical: string[]; robots?: string; viewport?: string; language?: string; og: Record<string, string>; twitter: Record<string, string>; favicons: string[]; jsonLd: string[] };
export function parseMetadata(html: string): Metadata {
  const tags = [...html.matchAll(/<(meta|link|title|html|script)\b([^>]*)>([^<]*)/gi)];
  const value = (attributes: string, key: string) => new RegExp(`\\b${key}\\s*=\\s*(["'])(.*?)\\1`, "i").exec(attributes)?.[2];
  const result: Metadata = { canonical: [], og: {}, twitter: {}, favicons: [], jsonLd: [] };
  for (const [, tag, attrs, text] of tags) { const lower = tag.toLowerCase(); const name = value(attrs, "name"); const property = value(attrs, "property"); const content = value(attrs, "content") ?? "";
    if (lower === "title") result.title = text.trim(); else if (lower === "html") result.language = value(attrs, "lang");
    else if (lower === "link" && (value(attrs, "rel") ?? "").toLowerCase().split(/\s+/).includes("canonical")) result.canonical.push(value(attrs, "href") ?? "");
    else if (lower === "link" && /icon/i.test(value(attrs, "rel") ?? "")) result.favicons.push(value(attrs, "href") ?? "");
    else if (lower === "meta" && name === "description") result.description = content; else if (lower === "meta" && name === "robots") result.robots = content; else if (lower === "meta" && name === "viewport") result.viewport = content;
    else if (lower === "meta" && property?.toLowerCase().startsWith("og:")) result.og[property.toLowerCase()] = content;
    else if (lower === "meta" && name?.toLowerCase().startsWith("twitter:")) result.twitter[name.toLowerCase()] = content;
    else if (lower === "script" && /application\/ld\+json/i.test(value(attrs, "type") ?? "")) result.jsonLd.push(text.trim());
  } return result;
}

export function slugify(value: string, separator = "-", lower = true, normalize = true, max = 0) { let output = normalize ? value.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : value; output = output.replace(/[^\p{L}\p{N}]+/gu, separator).replace(new RegExp(`${separator}+`, "g"), separator).replace(new RegExp(`^${separator}|${separator}$`, "g"), ""); if (lower) output = output.toLocaleLowerCase(); return max > 0 ? output.slice(0, max).replace(new RegExp(`${separator}$`), "") : output; }
export function assertHttpUrl(value: string) { const url = new URL(value); if (!/^https?:$/.test(url.protocol)) throw new Error("Use an absolute HTTP or HTTPS URL."); if (url.hostname === "localhost" || /(^|\.)localhost$/i.test(url.hostname) || /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(url.hostname) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(url.hostname) || /^\[?::1\]?$/.test(url.hostname)) throw new Error("Local and private network URLs are not allowed."); return url; }
export function makeSitemap(base: string, rows: { path: string; lastmod?: string; changefreq?: string; priority?: string }[]) { const root = assertHttpUrl(base); const seen = new Set<string>(); const entries = rows.filter((row) => row.path.trim()).map((row) => { const url = new URL(row.path, root).toString(); if (seen.has(url)) throw new Error(`Duplicate URL: ${url}`); seen.add(url); const bits = [`    <loc>${escapeXml(url)}</loc>`]; if (row.lastmod) bits.push(`    <lastmod>${escapeXml(row.lastmod)}</lastmod>`); if (row.changefreq) bits.push(`    <changefreq>${escapeXml(row.changefreq)}</changefreq>`); if (row.priority) bits.push(`    <priority>${escapeXml(row.priority)}</priority>`); return `  <url>\n${bits.join("\n")}\n  </url>`; }); if (!entries.length) throw new Error("Add at least one page URL or path."); return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>`; }
