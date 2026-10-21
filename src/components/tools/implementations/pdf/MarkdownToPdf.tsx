"use client";

import { useMemo, useState } from "react";
import { MarkdownPreview } from "@/components/tools/markdown/MarkdownPreview";
import { MAX_MARKDOWN_INPUT_BYTES, formatMarkdownBytes, markdownByteLength } from "@/lib/tools/markdown";
import { createMarkdownPdf, DEFAULT_MARKDOWN_PDF_OPTIONS, type MarkdownPdfOptions } from "@/lib/tools/pdf/markdown-to-pdf";

type Result = { blob: Blob; filename: string; pageCount: number };

export function MarkdownToPdf() {
  const [source, setSource] = useState("");
  const [options, setOptions] = useState<MarkdownPdfOptions>(DEFAULT_MARKDOWN_PDF_OPTIONS);
  const [result, setResult] = useState<Result | null>(null);
  const [mobileView, setMobileView] = useState<"editor" | "preview">("editor");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const bytes = useMemo(() => markdownByteLength(source), [source]);
  const overLimit = bytes > MAX_MARKDOWN_INPUT_BYTES;

  function updateSource(value: string) { setSource(value); setResult(null); setError(""); setStatus(""); }
  function updateOptions(update: Partial<MarkdownPdfOptions>) { setOptions((current) => ({ ...current, ...update })); setResult(null); setError(""); setStatus(""); }

  async function generate() {
    if (!source.trim()) { setError("Add Markdown before generating a PDF."); return; }
    setWorking(true); setError(""); setStatus("Generating the PDF locally…"); setResult(null);
    try {
      const generated = await createMarkdownPdf(source, options);
      setResult(generated); setStatus(`PDF ready · ${generated.pageCount} ${generated.pageCount === 1 ? "page" : "pages"} · ${(generated.blob.size / 1024).toFixed(1)} KB`);
    } catch (caught) { setStatus(""); setError(caught instanceof Error ? caught.message : "The PDF could not be generated. Your Markdown is still available to edit."); }
    finally { setWorking(false); }
  }

  function reset() { setSource(""); setOptions(DEFAULT_MARKDOWN_PDF_OPTIONS); setResult(null); setMobileView("editor"); setError(""); setStatus(""); }

  return <div className="tool-workspace markdown-pdf-workspace">
    <p className="markdown-privacy">PDF layout and generation happen locally. Markdown and generated files are not uploaded or saved.</p>
    <div className="markdown-pdf-actions">
      <button className="button button-primary" type="button" onClick={() => void generate()} disabled={working || overLimit}>{working ? "Generating PDF…" : "Generate PDF"}</button>
      <button className="button button-secondary" type="button" onClick={() => { if (result) { const url = URL.createObjectURL(result.blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = result.filename; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); } }} disabled={!result}>Download PDF</button>
      <button className="button button-quiet" type="button" onClick={reset} disabled={working || (!source && !result && options === DEFAULT_MARKDOWN_PDF_OPTIONS)}>Clear</button>
      {status && <span className="markdown-status" role="status">{status}</span>}
    </div>
    {error && <p className="markdown-error" role="alert">{error}</p>}
    {overLimit && <p className="markdown-error" role="alert">Markdown source is {formatMarkdownBytes(bytes)}. The input limit is {formatMarkdownBytes(MAX_MARKDOWN_INPUT_BYTES)}; content is preserved and PDF generation is paused.</p>}
    <div className="markdown-pdf-options">
      <label className="field-group"><span className="field-label">Document title</span><input id="markdown-pdf-title" className="text-input" maxLength={200} value={options.title} onChange={(event) => updateOptions({ title: event.target.value })} placeholder="Optional title and PDF metadata" /></label>
      <label className="field-group"><span className="field-label">Paper size</span><select id="markdown-pdf-size" className="text-input" value={options.pageSize} onChange={(event) => updateOptions({ pageSize: event.target.value as MarkdownPdfOptions["pageSize"] })}><option value="a4">A4</option><option value="letter">US Letter</option></select></label>
      <label className="field-group"><span className="field-label">Orientation</span><select id="markdown-pdf-orientation" className="text-input" value={options.orientation} onChange={(event) => updateOptions({ orientation: event.target.value as MarkdownPdfOptions["orientation"] })}><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></label>
      <label className="field-group"><span className="field-label">Margins</span><select className="text-input" value={options.marginMm} onChange={(event) => updateOptions({ marginMm: Number(event.target.value) })}>{[10, 15, 20, 25, 30].map((margin) => <option key={margin} value={margin}>{margin} mm</option>)}</select></label>
      <label className="field-group"><span className="field-label">Font</span><select className="text-input" value={options.font} onChange={(event) => updateOptions({ font: event.target.value as MarkdownPdfOptions["font"] })}><option value="Helvetica">Helvetica</option><option value="TimesRoman">Times Roman</option><option value="Courier">Courier</option></select></label>
      <label className="field-group"><span className="field-label">Body size</span><select className="text-input" value={options.fontSize} onChange={(event) => updateOptions({ fontSize: Number(event.target.value) })}>{[9, 10, 11, 12, 14, 16].map((size) => <option key={size} value={size}>{size} pt</option>)}</select></label>
      <label className="inline-check markdown-pdf-page-numbers"><input type="checkbox" checked={options.pageNumbers} onChange={(event) => updateOptions({ pageNumbers: event.target.checked })} /> Add page numbers</label>
    </div>
    <p className="field-help">Built-in PDF fonts support basic Latin and many Windows-1252 accents. Unsupported Unicode characters are reported without substitution. Images are represented by their alt text and are never fetched. Raw HTML is shown as literal text; code blocks are displayed without execution.</p>
    <div className="markdown-pdf-tabs" role="tablist" aria-label="Markdown PDF views">
      {(["editor", "preview"] as const).map((view) => <button key={view} type="button" role="tab" aria-selected={mobileView === view} className={mobileView === view ? "selected" : ""} onClick={() => setMobileView(view)}>{view === "editor" ? "Markdown" : "Preview"}</button>)}
    </div>
    <div className="markdown-pdf-panes">
      <section className={`markdown-pdf-pane${mobileView === "editor" ? " is-mobile-active" : ""}`} aria-label="Markdown source">
        <div className="html-pane-heading"><h2>Markdown</h2><span>{formatMarkdownBytes(bytes)} UTF-8</span></div>
        <label className="visually-hidden" htmlFor="markdown-pdf-source">Markdown source</label>
        <textarea id="markdown-pdf-source" className="markdown-pdf-source" value={source} onChange={(event) => updateSource(event.target.value)} placeholder={'# A structured document\n\nWrite **Markdown**, use lists, tables, links, and fenced code.'} spellCheck={false} aria-describedby="markdown-pdf-count" />
        <p id="markdown-pdf-count" className="html-markdown-size">{formatMarkdownBytes(bytes)} of {formatMarkdownBytes(MAX_MARKDOWN_INPUT_BYTES)} maximum</p>
      </section>
      <section className={`markdown-pdf-pane markdown-pdf-preview${mobileView === "preview" ? " is-mobile-active" : ""}`} aria-label="Rendered Markdown preview">
        <div className="html-pane-heading"><h2>Preview</h2><span>GFM</span></div>
        {source ? <div className="markdown-preview-content"><MarkdownPreview source={source} /></div> : <div className="html-output-empty"><strong>Preview will appear here</strong><p>Markdown renders locally with the shared safe preview renderer.</p></div>}
      </section>
    </div>
  </div>;
}
