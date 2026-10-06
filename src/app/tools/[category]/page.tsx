import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ToolCard } from "@/components/tools/ToolCard";
import { categories, getCategory, getToolsForCategory } from "@/lib/tools/registry";

export function generateStaticParams() { return categories.map(({ slug }) => ({ category: slug })); }

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category: slug } = await params;
  const category = getCategory(slug);
  return category ? { title: `${category.name} tools`, description: category.description, alternates: { canonical: `/tools/${slug}` } } : {};
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();
  const categoryTools = getToolsForCategory(slug);
  return <main className="page-width listing-page">
    <div className="breadcrumbs"><Link href="/tools">All tools</Link><span>/</span><span>{category.name}</span></div>
    <div className="listing-heading"><span className="category-icon large-category-icon" aria-hidden="true">{category.icon}</span><div><span className="eyebrow">Category</span><h1>{category.name}</h1><p>{category.description}</p></div></div>
    {categoryTools.length ? <div className="tool-grid">{categoryTools.map((tool) => <ToolCard key={tool.href} tool={tool} />)}</div> : <div className="empty-state large-empty"><span aria-hidden="true">✳</span><h2>This drawer is being stocked.</h2><p>There aren’t any tools in this category yet. Browse the full toolbox to find something useful.</p><Link className="button button-secondary" href="/tools">Browse all tools</Link></div>}
  </main>;
}
