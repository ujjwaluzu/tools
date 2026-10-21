"use client";

import { useMemo, useState } from "react";
import { MarkdownPreview } from "@/components/tools/markdown/MarkdownPreview";
import { assertMarkdownInputSize, countMarkdown, formatMarkdownBytes, markdownByteLength, MAX_MARKDOWN_INPUT_BYTES } from "@/lib/tools/markdown";

type MobilePane = "editor" | "preview";

export function MarkdownEditor() {
  const [source, setSource] = useState("");
  const [activePane, setActivePane] = useState<MobilePane>("editor");
  const [message, setMessage] = useState("");
  const [copyError, setCopyError] = useState("");
  const stats = useMemo(() => countMarkdown(source), [source]);
  const bytes = useMemo(() => markdownByteLength(source), [source]);
  const tooLarge = bytes > MAX_MARKDOWN_INPUT_BYTES;

  async function copySource() {
    setMessage("");
    setCopyError("");
    try {
      await navigator.clipboard.writeText(source);
      setMessage("Markdown copied to clipboard.");
    } catch {
      setCopyError("Clipboard access is unavailable. Select and copy the source from the editor.");
    }
  }

  function downloadSource() {
    try {
      const url = URL.createObjectURL(new Blob([source], { type: "text/markdown;charset=utf-8" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "document.md";
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("Markdown download started.");
      setCopyError("");
    } catch {
      setCopyError("The Markdown file could not be downloaded. Try again.");
    }
  }

  function clearSource() {
    setSource("");
    setActivePane("editor");
    setMessage("");
    setCopyError("");
  }

  let sizeError = "";
  if (tooLarge) {
    try { assertMarkdownInputSize(source); }
    catch (error) { sizeError = error instanceof Error ? error.message : "Markdown input exceeds the supported size."; }
  }

  return <div className="tool-workspace markdown-workspace">
    <p className="markdown-privacy">Your source and preview stay in this browser. Nothing is uploaded or saved.</p>
    <div className="markdown-toolbar">
      <div className="button-row">
        <button className="button button-secondary" type="button" onClick={() => void copySource()} disabled={!source || tooLarge}>Copy Markdown</button>
        <button className="button button-secondary" type="button" onClick={downloadSource} disabled={!source || tooLarge}>Download .md</button>
      </div>
      <button className="button button-quiet" type="button" onClick={clearSource} disabled={!source}>Clear</button>
    </div>
    {message && <p className="markdown-status" role="status">{message}</p>}
    {copyError && <p className="markdown-error" role="alert">{copyError}</p>}
    <div className="markdown-tabs" role="tablist" aria-label="Markdown workspace view">
      <button type="button" role="tab" id="markdown-editor-tab" aria-selected={activePane === "editor"} aria-controls="markdown-editor-pane" className={activePane === "editor" ? "selected" : ""} onClick={() => setActivePane("editor")}>Editor</button>
      <button type="button" role="tab" id="markdown-preview-tab" aria-selected={activePane === "preview"} aria-controls="markdown-preview-pane" className={activePane === "preview" ? "selected" : ""} onClick={() => setActivePane("preview")}>Preview</button>
    </div>
    <div className="markdown-panes">
      <section id="markdown-editor-pane" className={`markdown-pane markdown-editor-pane${activePane === "editor" ? " is-active-mobile" : ""}`} role="tabpanel" aria-labelledby="markdown-editor-tab">
        <div className="markdown-pane-heading"><h2>Markdown</h2><span>Source</span></div>
        <label className="visually-hidden" htmlFor="markdown-source">Markdown source</label>
        <textarea id="markdown-source" className="markdown-source" value={source} onChange={(event) => { setSource(event.currentTarget.value); setMessage(""); setCopyError(""); }} placeholder={'# A heading\n\nWrite a little **Markdown** and watch it take shape.\n\n- Add lists\n- `inline code`\n\n> Or add a quote\n\n| Feature | Support |\n| --- | --- |\n| Tables | Yes |'} spellCheck={false} aria-describedby="markdown-counts markdown-size-note" />
        <div className="markdown-counts" id="markdown-counts" aria-live="polite"><span>{stats.characters} characters</span><span>{stats.words} words</span><span>{stats.lines} lines</span></div>
        <p className={`markdown-size-note${tooLarge ? " is-error" : ""}`} id="markdown-size-note">{tooLarge ? sizeError : `${formatMarkdownBytes(bytes)} of ${formatMarkdownBytes(MAX_MARKDOWN_INPUT_BYTES)} maximum`}</p>
      </section>
      <section id="markdown-preview-pane" className={`markdown-pane markdown-preview-pane${activePane === "preview" ? " is-active-mobile" : ""}`} role="tabpanel" aria-labelledby="markdown-preview-tab">
        <div className="markdown-pane-heading"><h2>Preview</h2><span>Live</span></div>
        <div className="markdown-preview-content" aria-live="polite" aria-label="Rendered Markdown preview">
          {tooLarge
            ? <div className="markdown-empty"><strong>Preview paused</strong><p>Reduce the source below 1 MiB to preview it. Your text has not been changed.</p></div>
            : source.trim()
              ? <MarkdownPreview source={source} />
              : <div className="markdown-empty"><span aria-hidden="true">M↓</span><strong>Your preview will appear here</strong><p>Start typing or paste Markdown in the editor to see the rendered result.</p></div>}
        </div>
      </section>
    </div>
    <details className="markdown-reference"><summary>Markdown syntax quick reference</summary><div className="markdown-reference-grid">
      <code># Heading</code><code>**bold** · *italic* · ~~strike~~</code><code>- List item · 1. Numbered</code><code>&gt; Blockquote</code><code>`inline code` · ```code block```</code><code>[link](https://example.com)</code><code>| Table | Header |</code><code>- [ ] Task · - [x] Done</code>
    </div><p>Raw HTML is not rendered. Only relative image paths are shown; remote images are blocked to avoid third-party requests. Links allow http, https, mailto, and tel.</p></details>
  </div>;
}
