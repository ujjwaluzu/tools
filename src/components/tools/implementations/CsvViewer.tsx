"use client";

import { useMemo, useRef, useState } from "react";
import { Dropzone, EmptyState, ErrorState, ResetButton, formatBytes } from "@/components/tools/primitives";
import { MAX_CSV_COLUMNS, MAX_CSV_DATA_ROWS, MAX_CSV_INPUT_BYTES, parseCsv, serializeCsv, serializeSpreadsheetSafeCsv, type CsvTable } from "@/lib/tools/csv";

const PAGE_SIZE = 50;
const csvOptions = { maxRows: MAX_CSV_DATA_ROWS, maxColumns: MAX_CSV_COLUMNS };

type PreviewRow = { cells: string[]; sourceRow: number };

export function CsvViewer() {
  const [input, setInput] = useState("");
  const [table, setTable] = useState<CsvTable | null>(null);
  const [filter, setFilter] = useState("");
  const [removeBlankRows, setRemoveBlankRows] = useState(false);
  const [removeDuplicates, setRemoveDuplicates] = useState(false);
  const [trimValues, setTrimValues] = useState(false);
  const [spreadsheetSafe, setSpreadsheetSafe] = useState(true);
  const [exportScope, setExportScope] = useState<"all" | "filtered">("all");
  const [page, setPage] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [working, setWorking] = useState(false);
  const inputSequence = useRef(0);

  const cleanedRows = useMemo<PreviewRow[]>(() => {
    if (!table) return [];
    const seen = new Set<string>();
    const result: PreviewRow[] = [];
    table.rows.forEach((row, index) => {
      const cells = trimValues ? row.map((cell) => cell.trim()) : [...row];
      if (removeBlankRows && cells.every((cell) => !cell.trim())) return;
      if (removeDuplicates) {
        const key = JSON.stringify(cells);
        if (seen.has(key)) return;
        seen.add(key);
      }
      result.push({ cells, sourceRow: index + 1 });
    });
    return result;
  }, [table, removeBlankRows, removeDuplicates, trimValues]);

  const normalizedFilter = filter.trim().toLocaleLowerCase();
  const filteredRows = useMemo(() => normalizedFilter
    ? cleanedRows.filter(({ cells }) => cells.some((cell) => cell.toLocaleLowerCase().includes(normalizedFilter)))
    : cleanedRows,
  [cleanedRows, normalizedFilter]);
  const pageCount = Math.ceil(filteredRows.length / PAGE_SIZE);
  const visibleRows = filteredRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function loadText(text: string, source: string) {
    try {
      const parsed = parseCsv(text, csvOptions);
      setTable(parsed);
      setFilter("");
      setPage(0);
      setRemoveBlankRows(false);
      setRemoveDuplicates(false);
      setTrimValues(false);
      setError("");
      setNotice(`Loaded ${parsed.rows.length.toLocaleString()} data rows and ${parsed.headers.length} columns locally.`);
      return true;
    } catch (caught) {
      setTable(null);
      setError(caught instanceof Error ? (source === "Pasted CSV" && caught.message.includes("input limit") ? `${caught.message}. Reduce the pasted data or split it into smaller parts.` : caught.message) : "Could not parse this CSV.");
      setNotice("");
      return false;
    }
  }

  async function handleFiles(selection: { files: File[]; rejected: string[] }) {
    const request = ++inputSequence.current;
    setNotice("");
    if (selection.rejected.length) setError(selection.rejected.join(" "));
    const file = selection.files[0];
    if (!file) { setWorking(false); return; }
    if (file.size > MAX_CSV_INPUT_BYTES) {
      setTable(null);
      setError(`${file.name} exceeds the 10 MB input limit. Reduce the file or split it into smaller parts.`);
      setWorking(false);
      return;
    }

    setWorking(true);
    setError("");
    try {
      const bytes = await file.arrayBuffer();
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (request !== inputSequence.current) return;
      setInput(text);
      loadText(text, file.name);
    } catch {
      if (request === inputSequence.current) {
        setTable(null);
        setError(`${file.name} is not valid UTF-8 text. Save it as UTF-8 CSV and try again.`);
      }
    } finally {
      if (request === inputSequence.current) setWorking(false);
    }
  }

  function loadPastedInput() {
    inputSequence.current += 1;
    loadText(input, "Pasted CSV");
  }

  function reset() {
    inputSequence.current += 1;
    setInput("");
    setTable(null);
    setFilter("");
    setRemoveBlankRows(false);
    setRemoveDuplicates(false);
    setTrimValues(false);
    setSpreadsheetSafe(true);
    setExportScope("all");
    setPage(0);
    setError("");
    setNotice("");
    setWorking(false);
  }

  function downloadCsv() {
    if (!table) return;
    try {
      const rows = exportScope === "filtered" ? filteredRows : cleanedRows;
      const exportTable = { headers: table.headers, rows: rows.map(({ cells }) => cells) };
      const csv = spreadsheetSafe ? serializeSpreadsheetSafeCsv(exportTable, { lineEnding: "\r\n" }) : serializeCsv(exportTable, { lineEnding: "\r\n" });
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "cleaned-data.csv";
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setError("");
      setNotice(`Downloaded ${rows.length.toLocaleString()} ${exportScope === "filtered" ? "filtered" : "cleaned"} data rows as cleaned-data.csv.`);
    } catch (caught) {
      setError(caught instanceof Error ? `Could not export CSV: ${caught.message}` : "Could not export CSV. Try a smaller file.");
      setNotice("");
    }
  }

  return <div className="tool-workspace csv-workspace">
    <p className="csv-privacy-note">Your CSV is parsed and cleaned in this browser. Its contents are not uploaded.</p>
    <div className="csv-input-grid">
      <div className="csv-input-panel">
        <h2>Upload a CSV file</h2>
        <Dropzone onFiles={handleFiles} accept={[".csv", "text/csv"]} maxBytes={MAX_CSV_INPUT_BYTES} disabled={working} />
        <p className="field-help">CSV content is checked after selection; the file name and browser MIME type are not treated as proof of validity.</p>
      </div>
      <div className="csv-input-panel">
        <label className="field-label" htmlFor="csv-paste-input">Or paste CSV text</label>
        <textarea id="csv-paste-input" className="code-input csv-paste-input" value={input} onChange={(event) => { setInput(event.target.value); setError(""); setNotice(""); }} placeholder={'name,city\nAda,London'} spellCheck={false} disabled={working} />
        <div className="button-row"><button className="button button-primary" type="button" onClick={loadPastedInput} disabled={working}>Load pasted CSV</button><ResetButton onClick={reset} label="Reset tool" disabled={working} /></div>
      </div>
    </div>

    {working && <p className="csv-status" role="status">Reading and validating CSV locally…</p>}
    {error && <ErrorState>{error}</ErrorState>}
    {notice && <p className="csv-status" role="status" aria-live="polite">{notice}</p>}

    {table ? <>
      <section className="csv-controls" aria-label="CSV cleaning and export options">
        <div className="csv-filter-row">
          <label className="field-group" htmlFor="csv-row-filter"><span className="field-label">Filter rows across all columns</span><input id="csv-row-filter" className="text-input" type="search" value={filter} onChange={(event) => { setFilter(event.target.value); setPage(0); }} placeholder="Type to filter values" /></label>
          {filter && <button className="button button-secondary csv-clear-filter" type="button" onClick={() => { setFilter(""); setPage(0); }}>Clear filter</button>}
        </div>
        <div className="csv-option-grid">
          <label className="inline-check"><input type="checkbox" checked={removeBlankRows} onChange={(event) => { setRemoveBlankRows(event.target.checked); setPage(0); }} />Remove fully blank rows</label>
          <label className="inline-check"><input type="checkbox" checked={removeDuplicates} onChange={(event) => { setRemoveDuplicates(event.target.checked); setPage(0); }} />Remove exact duplicate rows</label>
          <label className="inline-check"><input type="checkbox" checked={trimValues} onChange={(event) => { setTrimValues(event.target.checked); setPage(0); }} />Trim surrounding whitespace from cells</label>
        </div>
        <p className="field-help">Duplicate matching is exact and case-sensitive across all columns. The first occurrence is kept. Filtering only changes the view; it does not remove data.</p>
        <div className="csv-export-row">
          <label className="field-group csv-export-scope"><span className="field-label">Rows to export</span><select className="text-input" value={exportScope} onChange={(event) => setExportScope(event.target.value as "all" | "filtered")}><option value="all">All cleaned rows ({cleanedRows.length.toLocaleString()})</option><option value="filtered">Filtered rows only ({filteredRows.length.toLocaleString()})</option></select></label>
          <label className="inline-check csv-safe-option"><input type="checkbox" checked={spreadsheetSafe} onChange={(event) => setSpreadsheetSafe(event.target.checked)} />Prefix formula-like text with an apostrophe for spreadsheet apps</label>
          <button className="button button-primary" type="button" onClick={downloadCsv}>Download cleaned CSV</button>
        </div>
        <p className="field-help">Spreadsheet-safe mode adds an apostrophe before text that resembles a formula, including values with leading whitespace or control characters. It preserves numeric-looking negatives. Spreadsheet applications differ, so this is a precaution, not a universal guarantee.</p>
      </section>

      <section className="csv-preview" aria-label="CSV data preview">
        <div className="csv-preview-heading"><div><h2>Data preview</h2><p>{filteredRows.length.toLocaleString()} matching of {cleanedRows.length.toLocaleString()} cleaned rows · {table.headers.length} columns</p></div><span>Showing up to {PAGE_SIZE} rows</span></div>
        {!filteredRows.length ? <EmptyState title={cleanedRows.length ? "No rows match this filter" : "No data rows remain"}>{cleanedRows.length ? "Clear or change the filter to see rows again." : "Turn off one or more cleaning options to restore rows."}</EmptyState> : <>
          <div className="csv-table-scroll" role="region" aria-label="CSV table preview" tabIndex={0}>
            <table className="csv-table"><thead><tr><th scope="col" className="csv-row-number">Row</th>{table.headers.map((header, index) => <th scope="col" key={`${header}-${index}`}>{header}</th>)}</tr></thead>
              <tbody>{visibleRows.map(({ cells, sourceRow }) => <tr key={sourceRow}><th scope="row" className="csv-row-number">{sourceRow}</th>{cells.map((cell, index) => <td key={index}>{cell === "" ? <span className="csv-empty-cell" aria-label="Empty cell" title="Empty cell">∅</span> : cell}</td>)}</tr>)}</tbody>
            </table>
          </div>
          <div className="csv-pagination"><span>Page {page + 1} of {pageCount.toLocaleString()}</span><div className="button-row"><button className="button button-secondary" type="button" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0}>Previous</button><button className="button button-secondary" type="button" onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))} disabled={page >= pageCount - 1}>Next</button></div></div>
        </>}
      </section>
    </> : <section className="result-panel"><EmptyState title="Your CSV preview will appear here">Load a UTF-8 CSV with a header row. The tool accepts up to {formatBytes(MAX_CSV_INPUT_BYTES)}, {MAX_CSV_DATA_ROWS.toLocaleString()} data rows, and {MAX_CSV_COLUMNS} columns.</EmptyState></section>}
  </div>;
}
