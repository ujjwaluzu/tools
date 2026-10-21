"use client";

import { useMemo, useState } from "react";
import { assertHtmlInputSize, convertHtmlToMarkdown, markdownFilename, MAX_HTML_INPUT_BYTES } from "@/lib/tools/html-to-markdown";
import { formatMarkdownBytes, markdownByteLength } from "@/lib/tools/markdown";

export function HtmlToMarkdown() {
  const [source, setSource] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const bytes = useMemo(() => new TextEncoder().encode(source).byteLength, [source]);
  const tooLarge = bytes > MAX_HTML_INPUT_BYTES;

  function convert() {
    setError(""); setStatus(""); setResult("");
    if (!source.trim()) { setError("Add HTML before converting."); return; }
    try { assertHtmlInputSize(source); setResult(convertHtmlToMarkdown(source)); setStatus("Markdown is ready. Unsupported active content and unsafe image URLs were removed."); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "HTML conversion could not be completed."); }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(result); setStatus("Markdown copied to the clipboard."); setError(""); }
    catch { setError("Clipboard access is unavailable. Select and copy the Markdown output."); }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([result], { type: "text/markdown;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = markdownFilename("document"); anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000); setStatus(`Download started: ${anchor.download}`);
  }

  function clear() { setSource(""); setResult(""); setError(""); setStatus(""); }

  return <div className="tool-workspace html-markdown-workspace">
    <p className="markdown-privacy">HTML is parsed as inert text locally. It is not rendered, uploaded, or saved.</p>
    <div className="html-converter-actions">
      <button className="button button-primary" type="button" onClick={convert} disabled={tooLarge}>Convert to Markdown</button>
      <button className="button button-secondary" type="button" onClick={() => void copy()} disabled={!result}>Copy Markdown</button>
      <button className="button button-secondary" type="button" onClick={download} disabled={!result}>Download .md</button>
      <button className="button button-quiet" type="button" onClick={clear} disabled={!source && !result}>Clear</button>
    </div>
    {status && <p className="markdown-status" role="status">{status}</p>}
    {error && <p className="markdown-error" role="alert">{error}</p>}
    <div className="html-converter-layout html-markdown-layout">
      <section className="html-converter-pane" aria-label="HTML input">
        <div className="html-pane-heading"><h2>HTML</h2><span>Input</span></div>
        <label className="visually-hidden" htmlFor="html-markdown-source">HTML source</label>
        <textarea id="html-markdown-source" className="html-markdown-source" value={source} onChange={(event) => { setSource(event.target.value); setResult(""); setError(""); setStatus(""); }} placeholder={'<h1>Readable title</h1>\n<p>Paste HTML to convert.</p>'} spellCheck={false} aria-describedby="html-markdown-size" />
        <p className={`html-markdown-size${tooLarge ? " is-error" : ""}`} id="html-markdown-size">{formatMarkdownBytes(bytes)} of {formatMarkdownBytes(MAX_HTML_INPUT_BYTES)} maximum{tooLarge ? ": conversion is paused." : ""}</p>
      </section>
      <section className="html-converter-pane" aria-label="Markdown output">
        <div className="html-pane-heading"><h2>Markdown</h2><span>{result ? `${markdownByteLength(result)} UTF-8 bytes` : "Output"}</span></div>
        {result ? <pre className="html-source-output"><code>{result}</code></pre> : <div className="html-output-empty"><strong>Your Markdown will appear here</strong><p>Convert HTML to inspect the generated Markdown.</p></div>}
      </section>
    </div>
    <p className="html-safety-note">Scripts, styles, forms, embedded content, SVG, and unsafe elements are discarded. Only safe http, https, mailto, and tel links are retained; images must have relative URLs to avoid external requests. Some HTML semantics and styling cannot be represented in Markdown.</p>
  </div>;
}
