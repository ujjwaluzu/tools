import type { MetadataRoute } from "next";
import { categories, tools } from "@/lib/tools/registry";
import { siteUrl } from "@/lib/tools/metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${siteUrl}/tools`, changeFrequency: "weekly", priority: 1 },
    ...categories.map(({ slug }) => ({ url: `${siteUrl}/tools/${slug}`, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...tools.map(({ href }) => ({ url: `${siteUrl}${href}`, changeFrequency: "monthly" as const, priority: 0.8 })),
  ];
}
