import Link from "next/link";
import type { ReactNode } from "react";
import type { ToolDefinition } from "@/lib/tools/registry";
import { getCategory, getRelatedTools } from "@/lib/tools/registry";
import { ToolCard } from "@/components/tools/ToolCard";

export function ToolShell({ tool, children }: { tool: ToolDefinition; children: ReactNode }) {
  const category = getCategory(tool.category);
  const related = getRelatedTools(tool);
  return <main className="page-width tool-page">
    <div className="breadcrumbs"><Link href="/tools">All tools</Link><span>/</span><Link href={`/tools/${tool.category}`}>{category?.name}</Link><span>/</span><span>{tool.title}</span></div>
    <div className="tool-page-heading"><div className="tool-icon large-tool-icon" aria-hidden="true">{tool.icon}</div><div><span className="eyebrow">{category?.name}</span><h1>{tool.title}</h1><p>{tool.description}</p></div></div>
    <div className="tool-privacy"><span aria-hidden="true">⌑</span>{tool.privacyNote}</div>
    <section className="workspace" aria-label={`${tool.title} workspace`}>{children}</section>
    {related.length > 0 && <section className="related-section"><div className="section-heading"><div><span className="eyebrow">Keep going</span><h2>Related tools</h2></div></div><div className="tool-grid">{related.map((item) => <ToolCard key={item.href} tool={item} />)}</div></section>}
  </main>;
}
