"use client";

import { useMemo, useState } from "react";
import { assertMarkdownInputSize, countMarkdown, formatMarkdownBytes, markdownByteLength, MAX_MARKDOWN_INPUT_BYTES } from "@/lib/tools/markdown";
import { convertMarkdownToSafeHtml } from "@/lib/tools/markdown-to-html";

type MobileView = "editor" | "html" | "preview";
type OutputView = "html" | "preview";
type Conversion = Awaited<ReturnType<typeof convertMarkdownToSafeHtml>>;

export function MarkdownToHtml() {
  const [source, setSource] = useState("");
  const [title, setTitle] = useState("");
  const [result, setResult] = useState<Conversion | null>(null);
  const [mobileView, setMobileView] = useState<MobileView>("editor");
  const [outputView, setOutputView] = useState<OutputView>("html");
  const [working, setWorking] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const stats = useMemo(() => countMarkdown(source), [source]);
  const bytes = useMemo(() => markdownByteLength(source), [source]);
  const tooLarge = bytes > MAX_MARKDOWN_INPUT_BYTES;

  async function convert() {
    setError("");
    setStatus("");
    setResult(null);
    if (!source.trim()) {
      setError("Add Markdown before converting.");
      return;
    }
    try { assertMarkdownInputSize(source); }
    catch (caught) {
      setError(caught instanceof Error ? caught.message : "Markdown input exceeds the supported size.");
      return;
    }
    setWorking(true);
    try {
      const converted = await convertMarkdownToSafeHtml(source, title);
      setResult(converted);
      setOutputView("html");
      setMobileView("html");
      setStatus("Sanitized HTML is ready. Preview, copy, and download use this same output.");
    } catch {
      setError("Conversion could not be completed. Your Markdown source is still available to edit.");
    } finally {
      setWorking(false);
    }
  }

  async function copyHtml() {
    if (!result) return;
    setStatus("");
    setError("");
    try {
      await navigator.clipboard.writeText(result.document);
      setStatus("Sanitized HTML copied to the clipboard.");
    } catch {
      setError("Clipboard access is unavailable. Select and copy the HTML source from the output.");
    }
  }

  function downloadHtml() {
    if (!result) return;
    setStatus("");
    setError("");
    try {
      const objectUrl = URL.createObjectURL(new Blob([result.document], { type: "text/html;charset=utf-8" }));
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = result.filename;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      setStatus(`Download started: ${result.filename}`);
    } catch {
      setError("The HTML file could not be downloaded. Try again.");
    }
  }

  function reset() {
    setSource("");
    setTitle("");
    setResult(null);
    setMobileView("editor");
    setOutputView("html");
    setStatus("");
    setError("");
  }

  const outputReady = Boolean(result);
  const inputPaneClass = `html-converter-pane html-input-pane${mobileView === "editor" ? " is-mobile-active" : ""}`;
  const outputPaneClass = `html-converter-pane html-output-pane${mobileView !== "editor" ? " is-mobile-active" : ""}`;
  const htmlViewClass = `html-output-view html-source-view${mobileView === "html" || (mobileView === "editor" && outputView === "html") ? " is-mobile-active" : ""}`;
  const previewViewClass = `html-output-view html-rendered-view${mobileView === "preview" || (mobileView === "editor" && outputView === "preview") ? " is-mobile-active" : ""}`;

  return <div className="tool-workspace markdown-html-workspace">
    <p className="markdown-privacy">Conversion runs locally. Source and generated HTML are not uploaded or saved.</p>
    <div className="html-converter-actions">
      <button className="button button-primary" type="button" onClick={() => void convert()} disabled={working || tooLarge}>{working ? "Converting…" : "Convert to HTML"}</button>
      <button className="button button-secondary" type="button" onClick={() => void copyHtml()} disabled={!outputReady}>Copy HTML</button>
      <button className="button button-secondary" type="button" onClick={downloadHtml} disabled={!outputReady}>Download HTML</button>
      <button className="button button-quiet" type="button" onClick={reset} disabled={working || (!source && !title && !result)}>Clear</button>
    </div>
    {status && <p className="markdown-status" role="status">{status}</p>}
    {error && <p className="markdown-error" role="alert">{error}</p>}

    <div className="html-mobile-tabs" role="tablist" aria-label="Markdown to HTML views">
      {(["editor", "html", "preview"] as const).map((view) => <button key={view} type="button" role="tab" aria-selected={mobileView === view} className={mobileView === view ? "selected" : ""} onClick={() => setMobileView(view)}>{view === "editor" ? "Markdown" : view === "html" ? "HTML" : "Preview"}</button>)}
    </div>

    <div className="html-converter-layout">
      <section className={inputPaneClass} aria-label="Markdown input">
        <div className="html-pane-heading"><h2>Markdown</h2><span>Input</span></div>
        <label className="html-title-field" htmlFor="html-document-title"><span>Document title <small>(optional)</small></span><input id="html-document-title" className="text-input" value={title} onChange={(event) => { setTitle(event.currentTarget.value); setResult(null); setStatus(""); }} placeholder="Document" disabled={working} /></label>
        <label className="visually-hidden" htmlFor="markdown-html-source">Markdown source</label>
        <textarea id="markdown-html-source" className="html-markdown-source" value={source} onChange={(event) => { setSource(event.currentTarget.value); setResult(null); setStatus(""); setError(""); }} placeholder={'# A clean document\n\nWrite **Markdown** here.\n\n- Lists and `code`\n- GFM tables and task lists\n\n> The preview is sanitized before rendering.'} spellCheck={false} aria-describedby="html-markdown-counts html-markdown-size" disabled={working} />
        <div className="html-markdown-counts" id="html-markdown-counts" aria-live="polite"><span>{stats.characters} characters</span><span>{stats.words} words</span><span>{stats.lines} lines</span><span>{formatMarkdownBytes(bytes)} UTF-8</span></div>
        <p className={`html-markdown-size${tooLarge ? " is-error" : ""}`} id="html-markdown-size">{tooLarge ? `Markdown source is ${formatMarkdownBytes(bytes)}. The input limit is ${formatMarkdownBytes(MAX_MARKDOWN_INPUT_BYTES)}. Input is preserved; conversion is paused.` : `${formatMarkdownBytes(bytes)} of ${formatMarkdownBytes(MAX_MARKDOWN_INPUT_BYTES)} maximum`}</p>
      </section>

      <section className={outputPaneClass} aria-label="HTML output and preview">
        <div className="html-pane-heading"><h2>Output</h2><span>{outputReady && result ? result.filename : "HTML document"}</span></div>
        <div className="html-output-tabs" role="tablist" aria-label="HTML output view">
          <button type="button" role="tab" aria-selected={outputView === "html"} className={outputView === "html" ? "selected" : ""} onClick={() => { setOutputView("html"); setMobileView("html"); }}>HTML source</button>
          <button type="button" role="tab" aria-selected={outputView === "preview"} className={outputView === "preview" ? "selected" : ""} onClick={() => { setOutputView("preview"); setMobileView("preview"); }}>Preview</button>
        </div>
        <div className={htmlViewClass}>
          {result ? <pre className="html-source-output"><code>{result.document}</code></pre> : <div className="html-output-empty"><strong>Your HTML will appear here</strong><p>Convert Markdown to inspect the sanitized HTML document.</p></div>}
        </div>
        <div className={previewViewClass}>
          {result ? <div className="html-preview-document">
            <div className="html-preview-title">{title.trim() || "Document"}</div>
            {/* The fragment is DOMPurify-sanitized with the same policy used in the downloaded document. */}
            <div className="html-preview-content" dangerouslySetInnerHTML={{ __html: result.fragment }} />
          </div> : <div className="html-output-empty"><strong>Preview will appear here</strong><p>The sanitized document preview follows the same HTML policy as copy and download.</p></div>}
        </div>
      </section>
    </div>
    <p className="html-safety-note">Raw HTML is ignored. Links are limited to http, https, mailto, and tel; images must use relative paths. Sanitization removes scripts, event handlers, SVG, embedded content, and user CSS. Export is sanitized for this tool’s supported HTML policy; downstream environments can apply additional rules.</p>
  </div>;
}
