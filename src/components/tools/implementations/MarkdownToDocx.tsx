"use client";

import { useMemo, useState } from "react";
import { MarkdownPreview } from "@/components/tools/markdown/MarkdownPreview";
import { MAX_MARKDOWN_INPUT_BYTES, formatMarkdownBytes, markdownByteLength } from "@/lib/tools/markdown";
import { createMarkdownDocx } from "@/lib/tools/markdown-to-docx";

type Result = { blob: Blob; filename: string };

export function MarkdownToDocx() {
  const [source, setSource] = useState("");
  const [title, setTitle] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [mobileView, setMobileView] = useState<"editor" | "preview">("editor");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const bytes = useMemo(() => markdownByteLength(source), [source]);
  const overLimit = bytes > MAX_MARKDOWN_INPUT_BYTES;

  function updateSource(value: string) { setSource(value); setResult(null); setError(""); setStatus(""); }

  async function generate() {
    if (!source.trim()) { setError("Add Markdown before generating a DOCX file."); return; }
    setWorking(true); setError(""); setStatus("Generating a Word document locally…"); setResult(null);
    try {
      const generated = await createMarkdownDocx(source, { title });
      setResult(generated); setStatus(`DOCX ready · ${(generated.blob.size / 1024).toFixed(1)} KB`);
    } catch (caught) { setStatus(""); setError(caught instanceof Error ? caught.message : "The DOCX file could not be generated. Your Markdown is still available to edit."); }
    finally { setWorking(false); }
  }

  function download() {
    if (!result) return;
    const url = URL.createObjectURL(result.blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = result.filename; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function reset() { setSource(""); setTitle(""); setResult(null); setMobileView("editor"); setError(""); setStatus(""); }

  return <div className="tool-workspace markdown-docx-workspace">
    <p className="markdown-privacy">DOCX formatting and generation happen locally. Markdown and generated files are not uploaded or saved.</p>
    <div className="markdown-pdf-actions">
      <button className="button button-primary" type="button" onClick={() => void generate()} disabled={working || overLimit}>{working ? "Generating DOCX…" : "Generate DOCX"}</button>
      <button className="button button-secondary" type="button" onClick={download} disabled={!result}>Download .docx</button>
      <button className="button button-quiet" type="button" onClick={reset} disabled={working || (!source && !title && !result)}>Clear</button>
      {status && <span className="markdown-status" role="status">{status}</span>}
    </div>
    {error && <p className="markdown-error" role="alert">{error}</p>}
    {overLimit && <p className="markdown-error" role="alert">Markdown source is {formatMarkdownBytes(bytes)}. The input limit is {formatMarkdownBytes(MAX_MARKDOWN_INPUT_BYTES)}; content is preserved and DOCX generation is paused.</p>}
    <label className="field-group markdown-docx-title"><span className="field-label">Document title <small>(optional)</small></span><input id="markdown-docx-title" className="text-input" maxLength={200} value={title} onChange={(event) => { setTitle(event.target.value); setResult(null); setStatus(""); setError(""); }} placeholder="Shown in the document and properties" /></label>
    <p className="field-help">Headings use Word heading styles; lists, code, tables, blockquotes, and safe hyperlinks are represented with Word formatting. Embedded HTML is shown as literal text and is never executed. Image alt text is included; images are not fetched or embedded.</p>
    <div className="markdown-pdf-tabs" role="tablist" aria-label="Markdown DOCX views">
      {(["editor", "preview"] as const).map((view) => <button key={view} type="button" role="tab" aria-selected={mobileView === view} className={mobileView === view ? "selected" : ""} onClick={() => setMobileView(view)}>{view === "editor" ? "Markdown" : "Preview"}</button>)}
    </div>
    <div className="markdown-pdf-panes">
      <section className={`markdown-pdf-pane${mobileView === "editor" ? " is-mobile-active" : ""}`} aria-label="Markdown source">
        <div className="html-pane-heading"><h2>Markdown</h2><span>{formatMarkdownBytes(bytes)} UTF-8</span></div>
        <label className="visually-hidden" htmlFor="markdown-docx-source">Markdown source</label>
        <textarea id="markdown-docx-source" className="markdown-pdf-source" value={source} onChange={(event) => updateSource(event.target.value)} placeholder={'# A Word document\n\nWrite **Markdown**, add lists, links, tables, and code.'} spellCheck={false} aria-describedby="markdown-docx-count" />
        <p id="markdown-docx-count" className="html-markdown-size">{formatMarkdownBytes(bytes)} of {formatMarkdownBytes(MAX_MARKDOWN_INPUT_BYTES)} maximum</p>
      </section>
      <section className={`markdown-pdf-pane markdown-pdf-preview${mobileView === "preview" ? " is-mobile-active" : ""}`} aria-label="Rendered Markdown preview">
        <div className="html-pane-heading"><h2>Preview</h2><span>GFM</span></div>
        {source ? <div className="markdown-preview-content"><MarkdownPreview source={source} /></div> : <div className="html-output-empty"><strong>Preview will appear here</strong><p>Markdown renders locally with the shared safe preview renderer.</p></div>}
      </section>
    </div>
  </div>;
}
