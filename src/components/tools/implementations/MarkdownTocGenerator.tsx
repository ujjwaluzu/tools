"use client";

import { useMemo, useState } from "react";
import { formatMarkdownBytes, markdownByteLength, MAX_MARKDOWN_INPUT_BYTES } from "@/lib/tools/markdown";
import { extractMarkdownHeadings, generateMarkdownToc, type MarkdownHeading, type MarkdownHeadingLevel } from "@/lib/tools/markdown-toc";

const headingLevels: MarkdownHeadingLevel[] = [1, 2, 3, 4, 5, 6];
const initialLevels: MarkdownHeadingLevel[] = [1, 2, 3];
type MobileView = "input" | "output";

export function MarkdownTocGenerator() {
  const [source, setSource] = useState("");
  const [headings, setHeadings] = useState<MarkdownHeading[]>([]);
  const [includedLevels, setIncludedLevels] = useState<MarkdownHeadingLevel[]>(initialLevels);
  const [markdown, setMarkdown] = useState("");
  const [mobileView, setMobileView] = useState<MobileView>("input");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const bytes = useMemo(() => markdownByteLength(source), [source]);
  const tooLarge = bytes > MAX_MARKDOWN_INPUT_BYTES;
  const includedCount = headings.filter(({ level }) => includedLevels.includes(level)).length;

  function updateSource(value: string) { setSource(value); setHeadings([]); setMarkdown(""); setError(""); setStatus(""); }
  function generate() {
    setError(""); setStatus(""); setMarkdown(""); setHeadings([]);
    if (!source.trim()) { setStatus("Add Markdown with headings to generate a table of contents."); return; }
    try {
      const extracted = extractMarkdownHeadings(source);
      const output = generateMarkdownToc(extracted, includedLevels);
      setHeadings(extracted); setMarkdown(output); setMobileView("output");
      setStatus(output ? `Generated ${includedCountFor(extracted, includedLevels)} table-of-contents links from ${extracted.length} headings.` : "No eligible headings were found for the selected levels.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Headings could not be extracted. Your Markdown is still available to edit."); }
  }
  function toggleLevel(level: MarkdownHeadingLevel) {
    const next = includedLevels.includes(level) ? includedLevels.filter((item) => item !== level) : [...includedLevels, level].sort((a, b) => a - b);
    setIncludedLevels(next);
    if (headings.length) {
      const output = generateMarkdownToc(headings, next);
      setMarkdown(output);
      setStatus(output ? `Generated ${includedCountFor(headings, next)} table-of-contents links.` : "No eligible headings were found for the selected levels.");
    }
  }
  async function copy() {
    if (!markdown) return;
    try { await navigator.clipboard.writeText(markdown); setStatus("Table of contents copied to the clipboard."); setError(""); }
    catch { setError("Clipboard access is unavailable. Select and copy the generated table of contents."); }
  }
  function download() {
    if (!markdown) return;
    const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "table-of-contents.md"; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000); setStatus("Download started: table-of-contents.md");
  }
  function clear() { setSource(""); setHeadings([]); setIncludedLevels(initialLevels); setMarkdown(""); setMobileView("input"); setError(""); setStatus(""); }

  return <div className="tool-workspace markdown-toc-workspace">
    <p className="markdown-privacy">Heading extraction and TOC generation happen locally from the shared CommonMark/GFM syntax tree. Source is not saved or uploaded.</p>
    <fieldset className="markdown-toc-levels"><legend>Include heading levels</legend>{headingLevels.map((level) => <label className="checkbox-label" key={level}><input type="checkbox" checked={includedLevels.includes(level)} onChange={() => toggleLevel(level)} /> H{level}</label>)}</fieldset>
    <div className="markdown-toc-actions">
      <button className="button button-primary" type="button" onClick={generate} disabled={tooLarge}>Generate TOC</button>
      <button className="button button-secondary" type="button" onClick={() => void copy()} disabled={!markdown}>Copy TOC</button>
      <button className="button button-secondary" type="button" onClick={download} disabled={!markdown}>Download .md</button>
      <button className="button button-quiet" type="button" onClick={clear} disabled={!source && !markdown}>Clear</button>
    </div>
    {status && <p className="markdown-status" role="status">{status}</p>}
    {error && <p className="markdown-error" role="alert">{error}</p>}
    {tooLarge && <p className="markdown-error" role="alert">Markdown input is {formatMarkdownBytes(bytes)}. The limit is {formatMarkdownBytes(MAX_MARKDOWN_INPUT_BYTES)}; source is preserved and extraction is paused.</p>}
    {headings.length > 0 && <p className="field-help">Found {headings.length} headings; {includedCount} match the selected levels.</p>}
    <div className="markdown-pdf-tabs" role="tablist" aria-label="Table of contents views">
      {(["input", "output"] as const).map((view) => <button key={view} type="button" role="tab" aria-selected={mobileView === view} className={mobileView === view ? "selected" : ""} onClick={() => setMobileView(view)}>{view === "input" ? "Markdown" : "TOC"}</button>)}
    </div>
    <div className="markdown-pdf-panes markdown-toc-panes">
      <section className={`markdown-pdf-pane${mobileView === "input" ? " is-mobile-active" : ""}`} aria-label="Markdown source">
        <div className="html-pane-heading"><h2>Markdown</h2><span>{formatMarkdownBytes(bytes)} UTF-8</span></div>
        <label className="visually-hidden" htmlFor="markdown-toc-source">Markdown source</label>
        <textarea id="markdown-toc-source" className="markdown-pdf-source" value={source} onChange={(event) => updateSource(event.target.value)} placeholder={'# Project\n\n## Getting started\n\n### Install\n\n## Usage'} spellCheck={false} />
        <p className="html-markdown-size">{formatMarkdownBytes(bytes)} of {formatMarkdownBytes(MAX_MARKDOWN_INPUT_BYTES)} maximum</p>
      </section>
      <section className={`markdown-pdf-pane markdown-toc-output-pane${mobileView === "output" ? " is-mobile-active" : ""}`} aria-label="Generated table of contents">
        <div className="html-pane-heading"><h2>Table of contents</h2><span>{markdown ? `${includedCount} links` : "Output"}</span></div>
        {markdown ? <textarea id="markdown-toc-output" className="markdown-toc-output-source" value={markdown} readOnly spellCheck={false} /> : <div className="html-output-empty"><strong>{headings.length ? "No headings at the selected levels" : "Your TOC will appear here"}</strong><p>Generate links from the Markdown headings you select.</p></div>}
      </section>
    </div>
    <p className="field-help">Anchors use a deterministic GitHub-inspired rule: lowercase, remove punctuation, hyphenate spaces, and append numbers to duplicate slugs. Unicode letters are preserved. Anchor behavior varies between Markdown platforms, so verify links in your publishing target.</p>
  </div>;
}

function includedCountFor(headings: readonly MarkdownHeading[], levels: readonly MarkdownHeadingLevel[]) {
  const included = new Set(levels);
  return headings.filter(({ level }) => included.has(level)).length;
}
