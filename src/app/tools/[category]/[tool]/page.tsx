import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolRenderer } from "@/components/tools/ToolRenderer";
import { ToolShell } from "@/components/tools/ToolShell";
import { getCategory, getTool, tools } from "@/lib/tools/registry";
import { getToolFaqs } from "@/lib/tools/faqs";
import { JsonLd } from "@/components/JsonLd";
import { canonicalUrl, siteUrl } from "@/lib/tools/metadata";

export function generateStaticParams() { return tools.map(({ category, href, slug }) => ({ category: href.split("/")[2] || category, tool: slug })); }

export async function generateMetadata({ params }: { params: Promise<{ category: string; tool: string }> }): Promise<Metadata> {
  const { category, tool: slug } = await params;
  const tool = getTool(category, slug);
  return tool ? {
    title: tool.metaTitle ?? tool.title,
    description: tool.description,
    keywords: tool.keywords,
    alternates: { canonical: tool.href },
    openGraph: { title: `${tool.title} - Ujjwal Tools`, description: tool.description, url: tool.href, siteName: "Ujjwal Tools", type: "website" },
    twitter: { card: "summary", title: `${tool.title} - Ujjwal Tools`, description: tool.description },
  } : {};
}

export default async function ToolPage({ params }: { params: Promise<{ category: string; tool: string }> }) {
  const { category, tool: slug } = await params;
  const tool = getTool(category, slug);
  if (!tool) notFound();
  const faqs = getToolFaqs(tool);
  const categoryDefinition = getCategory(tool.category);
  const toolSchema = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "SoftwareApplication", name: tool.title, description: tool.description, url: canonicalUrl(tool.href), applicationCategory: "UtilitiesApplication", applicationSubCategory: tool.category, operatingSystem: "Web browser", isAccessibleForFree: true, inLanguage: "en", publisher: { "@id": `${siteUrl}/#organization` } },
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Tools", item: canonicalUrl("/tools") }, { "@type": "ListItem", position: 2, name: categoryDefinition?.name ?? tool.category, item: canonicalUrl(`/tools/${tool.category}`) }, { "@type": "ListItem", position: 3, name: tool.title, item: canonicalUrl(tool.href) }] },
      { "@type": "FAQPage", mainEntity: faqs.map(({ question, answer }) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) },
    ],
  };
  return <><JsonLd data={toolSchema} /><ToolShell tool={tool}><ToolRenderer slug={tool.slug} category={tool.category} /></ToolShell></>;
}
