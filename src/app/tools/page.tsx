import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { Cell, DotShape, Grid, Tag } from "@/components/home/DesignPrimitives";
import { HeroDroid } from "@/components/home/HeroDroid";
import { ToolSearch } from "@/components/tools/ToolSearch";
import { categories, tools } from "@/lib/tools/registry";

export const metadata: Metadata = {
  title: "Small tools for annoying tasks",
  description: "Find quick, private tools for code, text, color, encoding, and more.",
  alternates: { canonical: "/tools" },
};

// href is the catalogue identity; a few registry entries share a slug across categories.
const uniqueTools = Array.from(new Map(tools.map((tool) => [tool.href, tool])).values());
const popularTools = uniqueTools.filter((tool) => tool.popular);
/** Position in the hero's entrance cascade; the CSS turns --i into a delay. */
const cue = (index: number) => ({ "--i": index }) as CSSProperties;
const FORMATS = ["JSON", "XML", "CSV", "YAML", "Markdown", "HTML", "TXT", "PDF", "DOCX", "XLSX", "PPTX", "PNG", "JPG", "GIF", "WebP", "AVIF", "SVG", "Base64", "JWT"];

const DIFFERENCES = [
  { type: "corner" as const, tag: "Local", title: "Runs in your browser", copy: "Your inputs stay on your device whenever a tool can process them locally." },
  { type: "sphere" as const, tag: "Focused", title: "One tool, one job", copy: "Each tool does a single annoying task well, with no menus to dig through." },
  { type: "plus" as const, tag: "Fast", title: "Find it in seconds", copy: "Search or browse by drawer, paste or drop your file, and get on with your day." },
];

export default function ToolsHomePage() {
  const categoryName = (slug: string) => categories.find((category) => category.slug === slug)?.name ?? "";
  return (
    <main className="tools-home">
      <section className="home-hero">
        <Tag className="hero-enter" style={cue(0)}>New · {uniqueTools.length} tools</Tag>
        <h1 className="hero-enter" style={cue(1)}>Small tools for<br /><span>annoying tasks.</span></h1>
        <div className="hero-droid-stage hero-droid-right"><HeroDroid variant="converter" /></div>
        <p className="hero-enter" style={cue(2)}>Quick, useful utilities that get out of your way. Private by default, with local processing whenever possible.</p>
        <div className="hero-enter hero-search" style={cue(3)}><ToolSearch /></div>
        <p className="privacy-inline hero-enter" style={cue(4)}>Your inputs stay in your browser for these tools.</p>
        <div className="hero-droid-stage hero-droid-left"><HeroDroid variant="fixer" /></div>
      </section>

      <section className="formats-strip">
        <Tag>Formats and files we handle</Tag>
        <div className="formats-marquee" role="group" aria-label={`Supported formats: ${FORMATS.join(", ")}`}>
          <div className="formats-track">
            {[0, 1].map((copy) => (
              <div className="formats-group" key={copy} aria-hidden={copy === 1}>
                {FORMATS.map((format) => <span key={format}>{format}</span>)}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="home-heading">
        <Tag>Why it’s different</Tag>
        <h2>Simple tools, <span>kept private and out of your way.</span></h2>
      </section>
      <Grid className="difference-grid">
        {DIFFERENCES.map((item) => (
          <Cell key={item.tag}>
            <DotShape type={item.type} />
            <Tag>{item.tag}</Tag>
            <h3>{item.title}</h3>
            <p>{item.copy}</p>
          </Cell>
        ))}
      </Grid>

      <section className="home-heading" id="categories">
        <Tag>Find your drawer</Tag>
        <h2>Browse <span>categories</span></h2>
      </section>
      <Grid className="categories-grid">
        {categories.map((category, index) => {
          const count = uniqueTools.filter((tool) => tool.category === category.slug).length;
          const content = (
            <>
              <span className="category-number">{String(index + 1).padStart(2, "0")}</span>
              <span>{category.name}{count === 0 && " · Soon"}</span>
            </>
          );
          return count
            ? <Link className="cell category-cell" href={`/tools/${category.slug}`} key={category.slug}>{content}</Link>
            : <Cell className="category-cell category-soon" key={category.slug}>{content}</Cell>;
        })}
      </Grid>

      <section className="home-heading">
        <Tag>A good place to start</Tag>
        <h2>Popular <span>tools</span></h2>
      </section>
      <Grid className="popular-grid">
        {popularTools.map((tool) => (
          <Link className="cell popular-cell" href={tool.href} key={tool.href}>
            <div><Tag>{categoryName(tool.category)}</Tag><span aria-hidden="true">↗</span></div>
            <h3>{tool.title}</h3>
            <p>{tool.description}</p>
          </Link>
        ))}
        <Link className="cell browse-all-cell" href="#all-tools">
          <Tag>The toolbox</Tag>
          <h3>Browse all {uniqueTools.length} tools →</h3>
        </Link>
      </Grid>

      <section className="home-heading" id="all-tools">
        <Tag>The toolbox</Tag>
        <h2>All available <span>tools</span></h2>
      </section>
      <section className="tool-list" aria-label="All available tools">
        {uniqueTools.map((tool) => (
          <Link href={tool.href} key={tool.href}>
            <strong>{tool.title}</strong>
            <span>{tool.description}</span>
            <Tag>{categoryName(tool.category)}</Tag>
          </Link>
        ))}
      </section>

      <section className="privacy-callout">
        <div className="privacy-callout-box">
          <div>
            <h3>Your data stays yours.</h3>
            <p>These tools run right in your browser. Your inputs aren’t sent to a server.</p>
          </div>
          <Link href="/tools/security">Explore private tools →</Link>
        </div>
      </section>
    </main>
  );
}
