"use client";

import { useMemo, useState } from "react";
import { formatMarkdownBytes, markdownByteLength, MAX_MARKDOWN_INPUT_BYTES } from "@/lib/tools/markdown";
import { parseCsvTable, parseHtmlTable, parseTsv, tableInputToMarkdown, type TableInputFormat } from "@/lib/tools/table-to-markdown";
import type { MarkdownTableAlignment } from "@/lib/tools/markdown-table";

type Parsed = ReturnType<typeof parseTsv>;
type MobileView = "input" | "output";

export function TableToMarkdown() {
  const [source, setSource] = useState("");
  const [format, setFormat] = useState<TableInputFormat>("tsv");
  const [firstRowHeader, setFirstRowHeader] = useState(true);
  const [trimValues, setTrimValues] = useState(false);
  const [alignments, setAlignments] = useState<MarkdownTableAlignment[]>([]);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [markdown, setMarkdown] = useState("");
  const [mobileView, setMobileView] = useState<MobileView>("input");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const bytes = useMemo(() => markdownByteLength(source), [source]);
  const tooLarge = bytes > MAX_MARKDOWN_INPUT_BYTES;

  function updateSource(value: string) { setSource(value); setParsed(null); setMarkdown(""); setError(""); setStatus(""); }
  function updateFormat(value: TableInputFormat) { setFormat(value); setParsed(null); setMarkdown(""); setError(""); setStatus(""); }
  function setHeaderOption(value: boolean) { setFirstRowHeader(value); setMarkdown(""); setError(""); setStatus(""); }

  function convert() {
    setError(""); setStatus(""); setMarkdown(""); setParsed(null);
    if (!source.trim() && !(format === "tsv" && source.includes("\t"))) { setError(`Add ${format.toUpperCase()} data before converting.`); return; }
    try {
      const result = format === "tsv" ? parseTsv(source) : format === "csv" ? parseCsvTable(source, firstRowHeader) : parseHtmlTable(source, firstRowHeader);
      const width = result.rows[0]?.length ?? 0;
      const nextAlignments = Array.from({ length: width }, (_, index) => alignments[index] ?? "left");
      const output = tableInputToMarkdown(result.rows, firstRowHeader, nextAlignments, trimValues);
      setParsed(result); setAlignments(nextAlignments); setMarkdown(output); setMobileView("output");
      setStatus(`Converted ${result.rows.length.toLocaleString()} rows and ${width} columns to Markdown.${result.warning ? ` ${result.warning}` : ""}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The table could not be converted. Check the input and try again.");
    }
  }

  function updateAlignment(index: number, value: MarkdownTableAlignment) {
    const next = [...alignments]; next[index] = value; setAlignments(next);
    if (parsed) {
      try { setMarkdown(tableInputToMarkdown(parsed.rows, firstRowHeader, next, trimValues)); setStatus("Markdown table updated with the selected alignment."); }
      catch (caught) { setError(caught instanceof Error ? caught.message : "Could not update the table alignment."); }
    }
  }

  async function copy() {
    if (!markdown) return;
    try { await navigator.clipboard.writeText(markdown); setStatus("Markdown table copied to the clipboard."); setError(""); }
    catch { setError("Clipboard access is unavailable. Select and copy the Markdown output."); }
  }
  function download() {
    if (!markdown) return;
    const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "table.md"; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000); setStatus("Download started: table.md");
  }
  function clear() { setSource(""); setFormat("tsv"); setFirstRowHeader(true); setTrimValues(false); setAlignments([]); setParsed(null); setMarkdown(""); setMobileView("input"); setError(""); setStatus(""); }

  return <div className="tool-workspace table-markdown-workspace">
    <p className="markdown-privacy">TSV, CSV, and pasted HTML tables are parsed locally. Input is not rendered, uploaded, or saved.</p>
    <div className="table-markdown-controls">
      <label className="field-group"><span className="field-label">Input format</span><select id="table-markdown-format" className="text-input" value={format} onChange={(event) => updateFormat(event.target.value as TableInputFormat)}><option value="tsv">Tab-separated (TSV)</option><option value="csv">Comma-separated (CSV)</option><option value="html">HTML table</option></select></label>
      <label className="checkbox-label"><input type="checkbox" checked={firstRowHeader} onChange={(event) => setHeaderOption(event.target.checked)} /> First row is the header</label>
      <label className="checkbox-label"><input type="checkbox" checked={trimValues} onChange={(event) => { setTrimValues(event.target.checked); setMarkdown(""); setStatus(""); }} /> Trim spaces around cell values</label>
    </div>
    {parsed && <fieldset className="table-markdown-alignments"><legend>Column alignment</legend>{parsed.rows[0].map((_, index) => <label className="field-group" key={index}><span className="field-label">{firstRowHeader ? parsed.rows[0][index] || `Column ${index + 1}` : `Column ${index + 1}`}</span><select className="text-input" value={alignments[index] ?? "left"} onChange={(event) => updateAlignment(index, event.target.value as MarkdownTableAlignment)}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>)}</fieldset>}
    <div className="table-markdown-actions">
      <button className="button button-primary" type="button" onClick={convert} disabled={tooLarge}>Convert to Markdown</button>
      <button className="button button-secondary" type="button" onClick={() => void copy()} disabled={!markdown}>Copy Markdown</button>
      <button className="button button-secondary" type="button" onClick={download} disabled={!markdown}>Download .md</button>
      <button className="button button-quiet" type="button" onClick={clear} disabled={!source && !markdown}>Clear</button>
    </div>
    {status && <p className="markdown-status" role="status">{status}</p>}
    {error && <p className="markdown-error" role="alert">{error}</p>}
    {tooLarge && <p className="markdown-error" role="alert">Input is {formatMarkdownBytes(bytes)}. The limit is {formatMarkdownBytes(MAX_MARKDOWN_INPUT_BYTES)}; content is preserved and conversion is paused.</p>}
    <div className="markdown-pdf-tabs" role="tablist" aria-label="Table conversion views">
      {(["input", "output"] as const).map((view) => <button key={view} type="button" role="tab" aria-selected={mobileView === view} className={mobileView === view ? "selected" : ""} onClick={() => setMobileView(view)}>{view === "input" ? "Input" : "Markdown"}</button>)}
    </div>
    <div className="markdown-pdf-panes table-markdown-panes">
      <section className={`markdown-pdf-pane${mobileView === "input" ? " is-mobile-active" : ""}`} aria-label="Tabular input">
        <div className="html-pane-heading"><h2>{format.toUpperCase()} input</h2><span>{formatMarkdownBytes(bytes)} UTF-8</span></div>
        <label className="visually-hidden" htmlFor="table-markdown-source">{format.toUpperCase()} source</label>
        <textarea id="table-markdown-source" className="markdown-pdf-source" value={source} onChange={(event) => updateSource(event.target.value)} placeholder={format === "tsv" ? "Name\tRole\nAda\tWriter" : format === "csv" ? 'Name,Role\nAda,"Writer, editor"' : "<table><tr><th>Name</th><th>Role</th></tr><tr><td>Ada</td><td>Writer</td></tr></table>"} spellCheck={false} />
        <p className="html-markdown-size">{formatMarkdownBytes(bytes)} of {formatMarkdownBytes(MAX_MARKDOWN_INPUT_BYTES)} maximum</p>
      </section>
      <section className={`markdown-pdf-pane table-markdown-output-pane${mobileView === "output" ? " is-mobile-active" : ""}`} aria-label="Markdown output">
        <div className="html-pane-heading"><h2>Markdown</h2><span>{markdown ? `${markdownByteLength(markdown)} UTF-8 bytes` : "Output"}</span></div>
        {markdown ? <textarea id="table-markdown-output" className="markdown-table-output-source" value={markdown} readOnly spellCheck={false} /> : <div className="html-output-empty"><strong>Your Markdown table will appear here</strong><p>Convert a TSV, CSV, or HTML table to continue.</p></div>}
      </section>
    </div>
    <p className="field-help">Uneven row widths are reported with the row number; adjust the source so each row has the same number of cells. Empty cells are preserved. Multiline cells are represented with <code>&lt;br&gt;</code>.</p>
  </div>;
}
