import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, ToolIcon } from "@/components/Icon";
import type { ToolDefinition } from "@/lib/tools/registry";
import { getCategory, getRelatedTools } from "@/lib/tools/registry";
import { ToolCard } from "@/components/tools/ToolCard";
import { ToolFaqs } from "@/components/tools/ToolFaqs";

export function ToolShell({ tool, children }: { tool: ToolDefinition; children: ReactNode }) {
  const category = getCategory(tool.category);
  const related = getRelatedTools(tool);
  const inputGuidance = tool.category === "pdf" || tool.category === "images"
    ? "Choose or drop the file this tool should work on."
    : tool.category === "converters" || tool.category === "everyday"
      ? "Enter the value you want to work with."
      : tool.category === "markdown" || tool.category === "data"
        ? "Paste or type your content in the input area."
        : tool.category === "web-seo"
          ? "Paste page content or enter the URL or details requested below."
          : "Paste or type the text, code, or value you want to work with.";
  return <main className="page-width tool-page">
    <div className="breadcrumbs"><Link href="/tools">All tools</Link><span>/</span><Link href={`/tools/${tool.category}`}>{category?.name}</Link><span>/</span><span>{tool.title}</span></div>
    <div className="tool-page-heading"><div className="tool-icon large-tool-icon" aria-hidden="true"><ToolIcon category={tool.category} slug={tool.slug} size={23} /></div><div><span className="eyebrow">{category?.name}</span><h1>{tool.title}</h1><p>{tool.description}</p></div></div>
    <div className="tool-privacy"><Icon name="shield" size={15} />{tool.privacyNote}</div>
    <section className="workspace" aria-label={`${tool.title} workspace`}>
      <div className="tool-guide" aria-label="How to use this tool">
        <div className="tool-guide-heading"><span className="eyebrow">Quick start</span><strong>Three steps to your result</strong></div>
        <ol>
          <li><span>1</span><p><strong>Add your input</strong>{inputGuidance}</p></li>
          <li><span>2</span><p><strong>Set any options</strong>Use the controls below if you want to customize the result.</p></li>
          <li><span>3</span><p><strong>Get your result</strong>Your result appears below or updates as you work. Copy or download it when available.</p></li>
        </ol>
      </div>
      {children}
    </section>
    <ToolFaqs tool={tool} />
    {related.length > 0 && <section className="related-section"><div className="section-heading"><div><span className="eyebrow">Keep going</span><h2>Related tools</h2></div></div><div className="tool-grid">{related.map((item) => <ToolCard key={item.href} tool={item} />)}</div></section>}
  </main>;
}
