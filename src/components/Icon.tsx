import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "file" | "image" | "code" | "globe" | "markdown" | "branch"
  | "table" | "palette" | "shield" | "arrows" | "sparkles" | "book"
  | "search" | "arrow-up-right" | "moon" | "sun" | "upload" | "x"
  | "chevron-up" | "chevron-down";

const paths: Record<IconName, ReactNode> = {
  file: <><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M13 2v7h7M8 14h8M8 18h8"/></>,
  image: <><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></>,
  code: <><path d="m8 17-5-5 5-5M16 7l5 5-5 5M14 4l-4 16"/></>,
  globe: <><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>,
  markdown: <><path d="M3 5h18v14H3z"/><path d="M7 15V9l2 3 2-3v6M16 9v6m-2-2 2 2 2-2"/></>,
  branch: <><circle cx="6" cy="3" r="2"/><circle cx="6" cy="21" r="2"/><circle cx="18" cy="6" r="2"/><path d="M6 5v14m12-11a6 6 0 0 1-6 6H8"/></>,
  table: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></>,
  palette: <><path d="M12 3a9 9 0 1 0 0 18h1.5a2.5 2.5 0 0 0 1.8-4.2 1 1 0 0 1 .7-1.8H18a3 3 0 0 0 3-3A9 9 0 0 0 12 3Z"/><path d="M7.5 10h.01M10 7.5h.01M14 7.5h.01M16.5 10h.01"/></>,
  shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/></>,
  arrows: <><path d="M7 7h14l-4-4M17 17H3l4 4M21 7l-4 4M3 17l4-4"/></>,
  sparkles: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3ZM19 14l1.1 2.9L23 18l-2.9 1.1L19 22l-1.1-2.9L15 18l2.9-1.1L19 14Z"/></>,
  book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/><path d="M8 7h8M8 11h8"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  "arrow-up-right": <><path d="M7 17 17 7M7 7h10v10"/></>,
  moon: <><path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"/></>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></>,
  upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/></>,
  x: <><path d="m18 6-12 12M6 6l12 12"/></>,
  "chevron-up": <path d="m18 15-6-6-6 6"/>,
  "chevron-down": <path d="m6 9 6 6 6-6"/>,
};

export function Icon({ name, size = 18, ...props }: SVGProps<SVGSVGElement> & { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>{paths[name]}</svg>;
}

const categoryIcons: Record<string, IconName> = {
  pdf: "file", images: "image", developer: "code", "web-seo": "globe", markdown: "markdown",
  "git-github": "branch", data: "table", color: "palette", security: "shield", converters: "arrows",
  everyday: "sparkles", student: "book",
};

export function CategoryIcon({ category, size = 18 }: { category: string; size?: number }) {
  return <Icon name={categoryIcons[category] ?? "sparkles"} size={size} />;
}

export function ToolIcon({ category, slug, size = 18 }: { category: string; slug: string; size?: number }) {
  const key = slug.toLowerCase();
  const name: IconName = key.includes("image") || key === "convert" && category === "images" || category === "images"
    ? "image"
    : key.includes("pdf") || category === "pdf" ? "file"
      : key.includes("csv") || key.includes("table") ? "table"
        : key.includes("markdown") || key.includes("editor") || key.includes("html") ? "markdown"
          : key.includes("color") ? "palette"
            : key.includes("hash") || key.includes("uuid") || key.includes("base64") || key.includes("jwt") ? "shield"
              : key.includes("url") || key.includes("query") || key.includes("http") || category === "web-seo" ? "globe"
                : category === "git-github" ? "branch"
                  : category === "student" ? "book"
                    : category === "converters" ? "arrows"
                      : category === "everyday" ? "sparkles"
                        : category === "data" ? "table"
                          : "code";
  return <Icon name={name} size={size} />;
}
