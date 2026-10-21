import Link from "next/link";
import { Icon, ToolIcon } from "@/components/Icon";
import type { ToolDefinition } from "@/lib/tools/registry";
import { getCategory } from "@/lib/tools/registry";

export function ToolCard({ tool }: { tool: ToolDefinition }) {
  const category = getCategory(tool.category);
  return (
    <Link className="tool-card" href={tool.href}>
      <span className="tool-icon" aria-hidden="true"><ToolIcon category={tool.category} slug={tool.slug} /></span>
      <span className="tool-card-content">
        <span className="tool-card-title">{tool.title}</span>
        <span className="tool-card-description">{tool.description}</span>
        <span className="tool-card-category">{category?.name}</span>
      </span>
      <span className="tool-card-arrow" aria-hidden="true"><Icon name="arrow-up-right" size={16} /></span>
    </Link>
  );
}
