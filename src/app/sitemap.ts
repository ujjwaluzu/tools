import type { MetadataRoute } from "next";
import { categories, tools } from "@/lib/tools/registry";
import { siteUrl } from "@/lib/tools/metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  const uniqueTools = Array.from(new Map(tools.map((tool) => [tool.href, tool])).values());
  const activeCategories = categories.filter((category) => uniqueTools.some((tool) => tool.category === category.slug));
  return [
    { url: `${siteUrl}/tools`, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/legal`, changeFrequency: "yearly", priority: 0.2 },
    ...activeCategories.map(({ slug }) => ({ url: `${siteUrl}/tools/${slug}`, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...uniqueTools.map(({ href }) => ({ url: `${siteUrl}${href}`, changeFrequency: "monthly" as const, priority: 0.8 })),
  ];
}
