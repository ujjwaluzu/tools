import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryIcon, Icon } from "@/components/Icon";
import { ToolCard } from "@/components/tools/ToolCard";
import { categories, getCategory, getToolsForCategory } from "@/lib/tools/registry";
import { JsonLd } from "@/components/JsonLd";
import { canonicalUrl, siteUrl } from "@/lib/tools/metadata";

export function generateStaticParams() { return categories.map(({ slug }) => ({ category: slug })); }

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category: slug } = await params;
  const category = getCategory(slug);
  return category ? { title: `${category.name} tools`, description: category.description, keywords: [category.name, `${category.name} online tools`, `${category.name} utilities`], alternates: { canonical: `/tools/${slug}` }, openGraph: { title: `${category.name} tools - Ujjwal Tools`, description: category.description, url: `/tools/${slug}`, siteName: "Ujjwal Tools", type: "website" }, twitter: { card: "summary", title: `${category.name} tools - Ujjwal Tools`, description: category.description } } : {};
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();
  const categoryTools = getToolsForCategory(slug);
  const categorySchema = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", name: `${category.name} tools`, description: category.description, url: canonicalUrl(`/tools/${slug}`), isPartOf: { "@id": `${siteUrl}/#website` }, mainEntity: { "@type": "ItemList", itemListElement: categoryTools.map((tool, index) => ({ "@type": "ListItem", position: index + 1, url: canonicalUrl(tool.href), name: tool.title })) } },
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Tools", item: canonicalUrl("/tools") }, { "@type": "ListItem", position: 2, name: category.name, item: canonicalUrl(`/tools/${slug}`) }] },
    ],
  };
  return <main className="page-width listing-page">
    <JsonLd data={categorySchema} />
    <div className="breadcrumbs"><Link href="/tools">All tools</Link><span>/</span><span>{category.name}</span></div>
    <div className="listing-heading"><span className="category-icon large-category-icon" aria-hidden="true"><CategoryIcon category={category.slug} size={23} /></span><div><span className="eyebrow">Category</span><h1>{category.name}</h1><p>{category.description}</p></div></div>
    {categoryTools.length ? <div className="tool-grid">{categoryTools.map((tool) => <ToolCard key={tool.href} tool={tool} />)}</div> : <div className="empty-state large-empty"><span aria-hidden="true"><Icon name="sparkles" size={24} /></span><h2>This drawer is being stocked.</h2><p>There aren’t any tools in this category yet. Browse the full toolbox to find something useful.</p><Link className="button button-secondary" href="/tools">Browse all tools</Link></div>}
  </main>;
}
