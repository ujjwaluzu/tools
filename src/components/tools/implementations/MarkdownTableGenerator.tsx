"use client";

import { useMemo, useState } from "react";
import { serializeMarkdownTable, type MarkdownTableAlignment } from "@/lib/tools/markdown-table";

type TableState = { headers: string[]; rows: string[][]; alignments: MarkdownTableAlignment[] };
const initialTable = (): TableState => ({ headers: ["Feature", "Description"], rows: [["Alignment", "Choose left, center, or right"], ["Escaping", "Pipes and line breaks stay in one cell"]], alignments: ["left", "left"] });

export function MarkdownTableGenerator() {
  const [table, setTable] = useState<TableState>(initialTable);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const markdown = useMemo(() => serializeMarkdownTable(table.headers, table.rows, table.alignments), [table]);

  function updateHeader(column: number, value: string) {
    setTable((current) => ({ ...current, headers: current.headers.map((header, index) => index === column ? value : header) }));
    setMessage(""); setError("");
  }
  function updateCell(row: number, column: number, value: string) {
    setTable((current) => ({ ...current, rows: current.rows.map((cells, rowIndex) => rowIndex === row ? cells.map((cell, columnIndex) => columnIndex === column ? value : cell) : cells) }));
    setMessage(""); setError("");
  }
  function addColumn() {
    setTable((current) => ({ headers: [...current.headers, `Column ${current.headers.length + 1}`], rows: current.rows.map((row) => [...row, ""]), alignments: [...current.alignments, "left"] }));
  }
  function removeColumn(column: number) {
    if (table.headers.length <= 1) return;
    setTable((current) => ({ headers: current.headers.filter((_, index) => index !== column), rows: current.rows.map((row) => row.filter((_, index) => index !== column)), alignments: current.alignments.filter((_, index) => index !== column) }));
  }
  function addRow() { setTable((current) => ({ ...current, rows: [...current.rows, current.headers.map(() => "")] })); }
  function removeRow(rowIndex: number) {
    if (table.rows.length <= 1) return;
    setTable((current) => ({ ...current, rows: current.rows.filter((_, index) => index !== rowIndex) }));
  }
  function updateAlignment(column: number, alignment: MarkdownTableAlignment) {
    setTable((current) => ({ ...current, alignments: current.alignments.map((value, index) => index === column ? alignment : value) }));
  }

  async function copy() {
    try { await navigator.clipboard.writeText(markdown); setMessage("Markdown table copied to the clipboard."); setError(""); }
    catch { setError("Clipboard access is unavailable. Select and copy the Markdown output."); setMessage(""); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "table.md"; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000); setMessage("Download started: table.md"); setError("");
  }
  function reset() { setTable(initialTable()); setMessage(""); setError(""); }

  return <div className="tool-workspace markdown-table-workspace">
    <p className="markdown-privacy">Build a Markdown table in your browser. Cell contents stay local and are not saved.</p>
    <div className="markdown-table-actions">
      <button className="button button-secondary" type="button" onClick={addRow}>Add row</button>
      <button className="button button-secondary" type="button" onClick={addColumn}>Add column</button>
      <button className="button button-primary" type="button" onClick={() => void copy()}>Copy Markdown</button>
      <button className="button button-secondary" type="button" onClick={download}>Download .md</button>
      <button className="button button-quiet" type="button" onClick={reset}>Reset table</button>
    </div>
    {message && <p className="markdown-status" role="status">{message}</p>}
    {error && <p className="markdown-error" role="alert">{error}</p>}
    <div className="markdown-table-editor-scroll" role="region" aria-label="Editable Markdown table" tabIndex={0}>
      <table className="markdown-table-editor"><thead><tr>
        {table.headers.map((header, column) => <th key={column} scope="col">
          <label htmlFor={`markdown-table-header-${column}`}>Column {column + 1} heading</label>
          <input id={`markdown-table-header-${column}`} className="text-input" value={header} onChange={(event) => updateHeader(column, event.target.value)} placeholder={`e.g. ${header || `Column ${column + 1}`}`} />
          <label htmlFor={`markdown-table-align-${column}`}>Alignment for column {column + 1}</label>
          <select id={`markdown-table-align-${column}`} className="text-input" value={table.alignments[column]} onChange={(event) => updateAlignment(column, event.target.value as MarkdownTableAlignment)}>
            <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
          </select>
          <button className="button button-quiet markdown-table-remove" type="button" onClick={() => removeColumn(column)} disabled={table.headers.length <= 1} aria-label={`Remove column ${column + 1}`}>Remove column</button>
        </th>)}
        <th className="markdown-table-row-actions" scope="col">Actions</th>
      </tr></thead><tbody>
        {table.rows.map((row, rowIndex) => <tr key={rowIndex}>
          {row.map((cell, column) => <td key={column}>
            <label className="visually-hidden" htmlFor={`markdown-table-cell-${rowIndex}-${column}`}>Row {rowIndex + 1}, {table.headers[column] || `column ${column + 1}`}</label>
            <textarea id={`markdown-table-cell-${rowIndex}-${column}`} className="text-input markdown-table-cell" value={cell} onChange={(event) => updateCell(rowIndex, column, event.target.value)} rows={2} placeholder="e.g. Add a value" />
          </td>)}
          <td className="markdown-table-row-actions"><button className="button button-quiet markdown-table-remove" type="button" onClick={() => removeRow(rowIndex)} disabled={table.rows.length <= 1} aria-label={`Remove row ${rowIndex + 1}`}>Remove row</button></td>
        </tr>)}
      </tbody></table>
    </div>
    <section className="markdown-table-output" aria-label="Generated Markdown table">
      <div className="html-pane-heading"><h2>Markdown output</h2><span>Live</span></div>
      <label className="visually-hidden" htmlFor="markdown-table-output">Generated Markdown table source</label>
      <textarea id="markdown-table-output" className="markdown-table-output-source" value={markdown} readOnly spellCheck={false} />
    </section>
    <p className="field-help">Pipes and backslashes are escaped. Newlines inside a cell become <code>&lt;br&gt;</code>, a common Markdown table convention.</p>
  </div>;
}
