import type { Metadata } from "next";
import Link from "next/link";
import { ToolCard } from "@/components/tools/ToolCard";
import { ToolSearch } from "@/components/tools/ToolSearch";
import { categories, tools } from "@/lib/tools/registry";

export const metadata: Metadata = {
  title: "Small tools for annoying tasks",
  description: "Find quick, private tools for code, text, color, encoding, and more.",
  alternates: { canonical: "/tools" },
};

export default function ToolsHomePage() {
  const popularTools = tools.filter((tool) => tool.popular);
  return (
    <main>
      <section className="hero page-width">
        <div className="hero-copy">
          <span className="eyebrow"><span className="status-dot" /> A little toolbox for the web</span>
          <h1>Small tools for<br /><span>annoying tasks.</span></h1>
          <p>Quick, useful utilities that get out of your way. Private by default, with local processing whenever possible.</p>
          <ToolSearch />
          <div className="privacy-inline"><span aria-hidden="true">⌑</span> Your inputs stay in your browser for these tools.</div>
        </div>
        <div className="hero-note" aria-hidden="true">
          <div className="note-top"><span>TOOLBOX / 001</span><span>✳</span></div>
          <div className="note-symbol">{ }</div>
          <div className="note-rule" />
          <div className="note-bottom"><span>Less busywork.</span><span>More doing.</span></div>
        </div>
      </section>

      <section className="section page-width" id="categories">
        <div className="section-heading"><div><span className="eyebrow">Find your drawer</span><h2>Browse categories</h2></div></div>
        <div className="category-grid">
          {categories.map((category) => {
            const count = tools.filter((tool) => tool.category === category.slug).length;
            return <Link className="category-link" href={`/tools/${category.slug}`} key={category.slug}>
              <span className="category-icon" aria-hidden="true">{category.icon}</span>
              <span className="category-name">{category.name}</span>
              <span className="category-count">{count || "Soon"}</span>
            </Link>;
          })}
        </div>
      </section>

      <section className="section page-width">
        <div className="section-heading"><div><span className="eyebrow">A good place to start</span><h2>Popular tools</h2></div></div>
        <div className="tool-grid">{popularTools.map((tool) => <ToolCard key={tool.href} tool={tool} />)}</div>
      </section>

      <section className="section page-width catalogue-section">
        <div className="section-heading"><div><span className="eyebrow">The toolbox</span><h2>All available tools</h2></div><span className="subtle-count">{tools.length} tools</span></div>
        {tools.length ? <div className="tool-grid">{tools.map((tool) => <ToolCard key={tool.href} tool={tool} />)}</div> : <p className="empty-state">New tools are being made. Check back soon.</p>}
      </section>

      <section className="privacy-banner page-width">
        <span className="privacy-banner-icon" aria-hidden="true">⌑</span>
        <div><strong>Your data stays yours.</strong><p>These tools run right in your browser. Your inputs aren’t sent to a server.</p></div>
        <Link href="/tools/security">Explore private tools <span aria-hidden="true">→</span></Link>
      </section>
    </main>
  );
}
