import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolRenderer } from "@/components/tools/ToolRenderer";
import { ToolShell } from "@/components/tools/ToolShell";
import { getTool, tools } from "@/lib/tools/registry";

export function generateStaticParams() { return tools.map(({ category, slug }) => ({ category, tool: slug })); }

export async function generateMetadata({ params }: { params: Promise<{ category: string; tool: string }> }): Promise<Metadata> {
  const { category, tool: slug } = await params;
  const tool = getTool(category, slug);
  return tool ? {
    title: tool.metaTitle ?? tool.title,
    description: tool.description,
    alternates: { canonical: tool.href },
    openGraph: { title: `${tool.title} — Ujjwal Tools`, description: tool.description, url: tool.href, type: "website" },
  } : {};
}

export default async function ToolPage({ params }: { params: Promise<{ category: string; tool: string }> }) {
  const { category, tool: slug } = await params;
  const tool = getTool(category, slug);
  if (!tool) notFound();
  return <ToolShell tool={tool}><ToolRenderer slug={tool.slug} category={tool.category} /></ToolShell>;
}
