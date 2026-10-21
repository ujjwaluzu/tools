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
/**
 * Browser-side URL policy for tools that make a direct request. Blocks literal
 * non-public IPv4/IPv6 addresses and local hostnames. It cannot inspect DNS
 * answers for arbitrary names, and fetch follows redirects without exposing
 * each destination for validation; this is a request guard, not SSRF protection.
 */
function parseIpv4(value: string): number[] | null {
  const parts = value.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) return null;
  const octets = parts.map(Number);
  return octets.every((octet) => octet >= 0 && octet <= 255) ? octets : null;
}

function isNonPublicIpv4(octets: number[]): boolean {
  const [a, b] = octets;
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168);
}

function parseIpv6(value: string): number[] | null {
  const input = value.startsWith("[") && value.endsWith("]") ? value.slice(1, -1) : value;
  if (!input.includes(":")) return null;
  let source = input;
  const dotted = /(?:^|:)(\d+\.\d+\.\d+\.\d+)$/.exec(source);
  if (dotted) {
    const octets = parseIpv4(dotted[1]);
    if (!octets) return null;
    source = source.slice(0, source.length - dotted[1].length) + `${((octets[0] << 8) | octets[1]).toString(16)}:${((octets[2] << 8) | octets[3]).toString(16)}`;
  }
  const halves = source.split("::");
  if (halves.length > 2) return null;
  const parseHalf = (half: string) => half ? half.split(":").map((group) => /^[\da-f]{1,4}$/i.test(group) ? parseInt(group, 16) : -1) : [];
  const left = parseHalf(halves[0]);
  const right = halves.length === 2 ? parseHalf(halves[1]) : [];
  if ([...left, ...right].some((group) => group < 0)) return null;
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || (halves.length === 2 && missing < 1)) return null;
  return [...left, ...Array(missing).fill(0), ...right];
}

function isNonPublicIpv6(groups: number[]): boolean {
  const unspecifiedOrLoopback = groups.slice(0, 7).every((group) => group === 0) && groups[7] <= 1;
  const uniqueLocal = (groups[0] & 0xfe00) === 0xfc00;
  const linkLocal = (groups[0] & 0xffc0) === 0xfe80;
  const mappedIpv4 = groups.slice(0, 5).every((group) => group === 0) && groups[5] === 0xffff;
  const mappedIsPrivate = mappedIpv4 && isNonPublicIpv4([groups[6] >> 8, groups[6] & 255, groups[7] >> 8, groups[7] & 255]);
  return unspecifiedOrLoopback || uniqueLocal || linkLocal || mappedIsPrivate;
}

function isLocalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.+$/, "");
  return host === "localhost" || host.endsWith(".localhost") || host === "localhost.localdomain" ||
    host.endsWith(".localhost.localdomain") || host === "localdomain" || host.endsWith(".local") || host === "local";
}

export function assertHttpUrl(value: string) {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("Use an absolute HTTP or HTTPS URL."); }
  if (!/^https?:$/.test(url.protocol)) throw new Error("Use an absolute HTTP or HTTPS URL.");
  const hostname = url.hostname.toLowerCase().replace(/\.+$/, "");
  const ipv4 = parseIpv4(hostname);
  const ipv6 = parseIpv6(hostname);
  if (isLocalHostname(hostname) || (ipv4 && isNonPublicIpv4(ipv4)) || (ipv6 && isNonPublicIpv6(ipv6))) {
    throw new Error("Local and private network URLs are not allowed.");
  }
  return url;
}
export function makeSitemap(base: string, rows: { path: string; lastmod?: string; changefreq?: string; priority?: string }[]) { const root = assertHttpUrl(base); const seen = new Set<string>(); const entries = rows.filter((row) => row.path.trim()).map((row) => { const url = new URL(row.path, root).toString(); if (seen.has(url)) throw new Error(`Duplicate URL: ${url}`); seen.add(url); const bits = [`    <loc>${escapeXml(url)}</loc>`]; if (row.lastmod) bits.push(`    <lastmod>${escapeXml(row.lastmod)}</lastmod>`); if (row.changefreq) bits.push(`    <changefreq>${escapeXml(row.changefreq)}</changefreq>`); if (row.priority) bits.push(`    <priority>${escapeXml(row.priority)}</priority>`); return `  <url>\n${bits.join("\n")}\n  </url>`; }); if (!entries.length) throw new Error("Add at least one page URL or path."); return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>`; }
