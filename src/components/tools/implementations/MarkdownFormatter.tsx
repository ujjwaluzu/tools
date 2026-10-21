"use client";

import { useMemo, useState } from "react";
import { formatMarkdownResult } from "@/lib/tools/markdown-formatter";
import { formatMarkdownBytes, markdownByteLength, MAX_MARKDOWN_INPUT_BYTES } from "@/lib/tools/markdown";

type MobileView = "input" | "output";

export function MarkdownFormatter() {
  const [source, setSource] = useState("");
  const [formatted, setFormatted] = useState("");
  const [mobileView, setMobileView] = useState<MobileView>("input");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const bytes = useMemo(() => markdownByteLength(source), [source]);
  const tooLarge = bytes > MAX_MARKDOWN_INPUT_BYTES;

  function updateSource(value: string) { setSource(value); setFormatted(""); setError(""); setStatus(""); }
  function format() {
    setFormatted(""); setError(""); setStatus("");
    if (!source.trim()) { setError("Add Markdown before formatting."); return; }
    try {
      const result = formatMarkdownResult(source);
      setFormatted(result.markdown); setMobileView("output");
      setStatus(result.mathPreserved ? "Math notation was detected, so the original Markdown was preserved without reformatting." : "Markdown formatted locally. Code contents and Markdown link targets are preserved.");
    }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Markdown could not be formatted. Your source is still available to edit."); }
  }
  async function copy() {
    if (!formatted) return;
    try { await navigator.clipboard.writeText(formatted); setStatus("Formatted Markdown copied to the clipboard."); setError(""); }
    catch { setError("Clipboard access is unavailable. Select and copy the formatted Markdown."); }
  }
  function download() {
    if (!formatted) return;
    const url = URL.createObjectURL(new Blob([formatted], { type: "text/markdown;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "formatted.md"; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000); setStatus("Download started: formatted.md");
  }
  function clear() { setSource(""); setFormatted(""); setMobileView("input"); setError(""); setStatus(""); }

  return <div className="tool-workspace markdown-formatter-workspace">
    <p className="markdown-privacy">Formatting runs locally from the shared CommonMark/GFM syntax tree. The tool does not render, save, or upload your Markdown.</p>
    <div className="markdown-formatter-actions">
      <button className="button button-primary" type="button" onClick={format} disabled={tooLarge}>Format Markdown</button>
      <button className="button button-secondary" type="button" onClick={() => void copy()} disabled={!formatted}>Copy</button>
      <button className="button button-secondary" type="button" onClick={download} disabled={!formatted}>Download .md</button>
      <button className="button button-quiet" type="button" onClick={clear} disabled={!source && !formatted}>Clear</button>
    </div>
    {status && <p className="markdown-status" role="status">{status}</p>}
    {error && <p className="markdown-error" role="alert">{error}</p>}
    {tooLarge && <p className="markdown-error" role="alert">Markdown input is {formatMarkdownBytes(bytes)}. The limit is {formatMarkdownBytes(MAX_MARKDOWN_INPUT_BYTES)}; source is preserved and formatting is paused.</p>}
    <div className="markdown-pdf-tabs" role="tablist" aria-label="Markdown formatter views">
      {(["input", "output"] as const).map((view) => <button key={view} type="button" role="tab" aria-selected={mobileView === view} className={mobileView === view ? "selected" : ""} onClick={() => setMobileView(view)}>{view === "input" ? "Input" : "Formatted"}</button>)}
    </div>
    <div className="markdown-pdf-panes markdown-formatter-panes">
      <section className={`markdown-pdf-pane${mobileView === "input" ? " is-mobile-active" : ""}`} aria-label="Markdown input">
        <div className="html-pane-heading"><h2>Markdown input</h2><span>{formatMarkdownBytes(bytes)} UTF-8</span></div>
        <label className="visually-hidden" htmlFor="markdown-formatter-source">Markdown source</label>
        <textarea id="markdown-formatter-source" className="markdown-pdf-source" value={source} onChange={(event) => updateSource(event.target.value)} placeholder={'# A heading\n- a list\n  - a nested item\n\n| Name | Value |\n| --- | ---: |\n| Ada | 10 |'} spellCheck={false} />
        <p className="html-markdown-size">{formatMarkdownBytes(bytes)} of {formatMarkdownBytes(MAX_MARKDOWN_INPUT_BYTES)} maximum</p>
      </section>
      <section className={`markdown-pdf-pane markdown-formatter-output-pane${mobileView === "output" ? " is-mobile-active" : ""}`} aria-label="Formatted Markdown output">
        <div className="html-pane-heading"><h2>Formatted Markdown</h2><span>{formatted ? `${markdownByteLength(formatted)} UTF-8 bytes` : "Output"}</span></div>
        {formatted ? <textarea id="markdown-formatter-output" className="markdown-formatter-output-source" value={formatted} readOnly spellCheck={false} /> : <div className="html-output-empty"><strong>Your formatted Markdown will appear here</strong><p>Format a document to see normalized syntax and spacing.</p></div>}
      </section>
    </div>
    <p className="field-help">Style: ATX headings, hyphen bullets, period ordered markers, two-space list nesting, backtick code fences, spaced GFM tables, and blank lines between blocks. Prose wrapping is preserved. Fenced code contents, inline code values, Markdown destinations, raw HTML text, and math notation are not intentionally rewritten. Unsafe link destinations are rejected.</p>
  </div>;
}
