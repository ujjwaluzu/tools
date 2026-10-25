import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/tools/metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      other: {
        "Content-Signal": "ai-train=no, search=yes, ai-input=yes",
      },
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
