"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CopyButton, DownloadButton, Dropzone, EmptyState, ErrorState, LoadingState, Progress, ResetButton, formatBytes, type AcceptedFiles } from "@/components/tools/primitives";
import { extractPdfText } from "@/lib/tools/pdf/render";
import { formatPdfExtraction, inspectPdfDocument, type PdfInspection } from "@/lib/tools/pdf/inspector";
import { MAX_EXTRACT_PAGES, MAX_PDF_FILE_BYTES } from "@/lib/tools/pdf/types";
import { friendlyPdfError, parsePageRanges, safeBaseName, verifyPdfHeader } from "@/lib/tools/pdf/validation";

type State = { file: File; inspection: PdfInspection | null; error: string };

export function PdfInspector() {
  const [state, setState] = useState<State | null>(null);
  const [selectionError, setSelectionError] = useState("");
  const [pageRange, setPageRange] = useState("");
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [progress, setProgress] = useState<{ completed: number; total: number; page: number } | null>(null);
  const [output, setOutput] = useState("");
  const [emptyPages, setEmptyPages] = useState<number[]>([]);
  const sequence = useRef(0);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => { sequence.current += 1; controller.current?.abort(); }, []);

  async function chooseFile(input: AcceptedFiles) {
    const request = ++sequence.current;
    controller.current?.abort();
    controller.current = null;
    setExtracting(false); setProgress(null); setOutput(""); setEmptyPages([]); setSelectionError("");
    const file = input.files[0];
    if (!file) {
      if (input.rejected.length) setState({ file: new File([], "Rejected file"), inspection: null, error: input.rejected.join(" ") });
      return;
    }
    setState({ file, inspection: null, error: input.rejected.join(" ") });
    setSelectedPages([]); setPageRange("");
    if (file.size > MAX_PDF_FILE_BYTES) {
      setState({ file, inspection: null, error: `This file is larger than the ${formatBytes(MAX_PDF_FILE_BYTES)} PDF limit.` });
      return;
    }
    try {
      const hasSignature = await verifyPdfHeader(file);
      if (request !== sequence.current) return;
      if (!hasSignature) throw new Error("This file does not have a readable PDF signature. Choose a valid PDF.");
      const inspected = await inspectPdfDocument(file);
      if (request !== sequence.current) return;
      const all = Array.from({ length: inspected.pageCount }, (_, index) => index + 1);
      setState({ file, inspection: inspected, error: "" });
      setSelectedPages(all); setPageRange(`1-${inspected.pageCount}`);
    } catch (error) {
      if (request === sequence.current) setState({ file, inspection: null, error: error instanceof Error && error.message.includes("signature") ? error.message : friendlyPdfError(error) });
    }
  }

  function reset() {
    sequence.current += 1; controller.current?.abort(); controller.current = null;
    setState(null); setSelectionError(""); setPageRange(""); setSelectedPages([]); setExtracting(false); setProgress(null); setOutput(""); setEmptyPages([]);
  }

  function changeSelection(pages: number[], range = pageRange) {
    sequence.current += 1;
    setSelectedPages(pages); setPageRange(range); setSelectionError(""); setOutput(""); setEmptyPages([]);
    controller.current?.abort(); controller.current = null; setExtracting(false); setProgress(null);
  }

  async function runExtraction() {
    if (!state?.inspection) return;
    let pages: number[];
    try { pages = parsePageRanges(pageRange, state.inspection.pageCount); }
    catch (error) { setSelectionError(error instanceof Error ? error.message : "Enter a valid page selection."); return; }
    if (pages.length > MAX_EXTRACT_PAGES) { setSelectionError(`Select ${MAX_EXTRACT_PAGES} pages or fewer at a time.`); return; }
    changeSelection(pages, pageRange);
    const request = sequence.current;
    const abortController = new AbortController(); controller.current = abortController;
    setExtracting(true); setProgress({ completed: 0, total: pages.length, page: pages[0] });
    try {
      const result = await extractPdfText(state.file, pages, setProgress, abortController.signal);
      if (request !== sequence.current || abortController.signal.aborted) return;
      setOutput(formatPdfExtraction(result));
      setEmptyPages(result.filter(({ text }) => !text.trim()).map(({ page }) => page));
    } catch (error) {
      if (request === sequence.current && !abortController.signal.aborted) setSelectionError(friendlyPdfError(error));
    } finally {
      if (request === sequence.current) { setExtracting(false); setProgress(null); controller.current = null; }
    }
  }

  const inspection = state?.inspection;
  const metadataFields: Array<[string, string]> = inspection ? [
    ["Title", inspection.metadata.title ?? "Not present"], ["Author", inspection.metadata.author ?? "Not present"],
    ["Subject", inspection.metadata.subject ?? "Not present"], ["Creator", inspection.metadata.creator ?? "Not present"],
    ["Producer", inspection.metadata.producer ?? "Not present"], ["Creation date", formatDate(inspection.metadata.creationDate)],
    ["Modification date", formatDate(inspection.metadata.modificationDate)],
  ] : [];

  return <div className="tool-workspace pdf-inspector-workspace">
    <p className="file-info-privacy">Select a PDF. Its signature and document structure are checked locally in your browser. The file is not uploaded, and a valid signature does not prove a document is safe.</p>
    <Dropzone onFiles={chooseFile} maxBytes={Number.MAX_SAFE_INTEGER} displayMaxBytes={MAX_PDF_FILE_BYTES} accept={undefined} />
    <div className="file-info-actions"><div className="button-row">{state && <button type="button" className="button button-secondary" onClick={() => document.querySelector<HTMLInputElement>(".pdf-inspector-workspace input[type=file]")?.click()}>Replace PDF</button>}<ResetButton onClick={reset} label="Clear file and results" disabled={!state && !extracting} /></div></div>
    {!state && <EmptyState title="Choose a PDF to inspect">Select or drop a local PDF up to {formatBytes(MAX_PDF_FILE_BYTES)}.</EmptyState>}
    {state && <>
      <section className="file-info-section" aria-labelledby="pdf-inspector-general">
        <div className="file-info-section-heading"><div><span className="eyebrow">Selected document</span><h2 id="pdf-inspector-general">General information</h2></div></div>
        <dl className="file-info-grid"><Info label="Filename" value={state.file.name} /><Info label="File size" value={`${state.file.size.toLocaleString()} bytes (${formatBytes(state.file.size)})`} /><Info label="Page count" value={inspection ? `${inspection.pageCount} pages` : "Unavailable"} /><Info label="PDF metadata" value={inspection ? "Read successfully" : "Could not be read"} /></dl>
        {state.error && <ErrorState>{state.error} General file information is still available.</ErrorState>}
      </section>
      {inspection && <>
        <section className="file-info-section" aria-labelledby="pdf-inspector-metadata"><div className="file-info-section-heading"><div><span className="eyebrow">Document properties</span><h2 id="pdf-inspector-metadata">Metadata</h2></div><span className="pdf-metadata-status">{Object.keys(inspection.metadata).length ? "Some metadata is present" : "No supported metadata fields found"}</span></div>
          <dl className="file-info-grid">{metadataFields.map(([label, value]) => <Info key={label} label={label} value={value} />)}</dl>
          <p className="file-info-note">Metadata may be absent, incomplete, or changed. Missing values do not establish the document’s history.</p>
        </section>
        <section className="file-info-section" aria-labelledby="pdf-inspector-pages"><div className="file-info-section-heading"><div><span className="eyebrow">Page properties</span><h2 id="pdf-inspector-pages">Page dimensions</h2></div><span>{inspection.pageCount} pages</span></div>
          {inspection.pages.every((page) => Math.abs(page.width - inspection.pages[0].width) < 0.01 && Math.abs(page.height - inspection.pages[0].height) < 0.01)
            ? <p className="file-info-note">All pages: {formatPoints(inspection.pages[0].width)} × {formatPoints(inspection.pages[0].height)} points · {inspection.pages[0].orientation.toLowerCase()}.</p>
            : <div className="pdf-inspector-table-wrap"><table className="pdf-inspector-table"><caption>Dimensions are reported per page because page sizes vary.</caption><thead><tr><th>Page</th><th>Width</th><th>Height</th><th>Orientation</th></tr></thead><tbody>{inspection.pages.map((page) => <tr key={page.page}><th scope="row">{page.page}</th><td>{formatPoints(page.width)}</td><td>{formatPoints(page.height)}</td><td>{page.orientation}</td></tr>)}</tbody></table></div>}
        </section>
        <section className="file-info-section" aria-labelledby="pdf-inspector-extract"><div className="file-info-section-heading"><div><span className="eyebrow">Selectable text</span><h2 id="pdf-inspector-extract">Extract text</h2></div></div>
          <p className="file-info-note">PDF text positions do not always match reading order. Multi-column layouts, tables, and positioned text may be imperfect. This tool reads embedded text and does not perform OCR on scanned pages.</p>
          <div className="pdf-extract-controls"><div className="field-group"><label className="field-label" htmlFor="pdf-inspector-range">Pages to extract</label><input id="pdf-inspector-range" className="text-input" value={pageRange} onChange={(event) => changeSelection(selectedPages, event.target.value)} onBlur={() => { try { const pages = parsePageRanges(pageRange, inspection.pageCount); setSelectedPages(pages); setSelectionError(""); } catch { /* Show validation when the user starts extraction. */ } }} placeholder="1-3, 5" aria-describedby="pdf-inspector-range-help" /><small id="pdf-inspector-range-help">Enter individual pages and ranges, such as 1-3, 5. Up to {MAX_EXTRACT_PAGES} pages per extraction.</small><button type="button" className="button button-quiet pdf-select-all" onClick={() => changeSelection(Array.from({ length: inspection.pageCount }, (_, index) => index + 1), `1-${inspection.pageCount}`)}>Select all pages</button></div>
            <button type="button" className="button button-primary" onClick={runExtraction} disabled={extracting}>{extracting ? "Extracting…" : "Extract selected pages"}</button></div>
          {selectionError && <ErrorState>{selectionError}</ErrorState>}
          {extracting && progress && <><LoadingState label={`Extracting page ${progress.page} of ${inspection.pageCount}…`} /><Progress value={progress.completed / progress.total * 100} label={`${progress.completed} of ${progress.total} selected pages processed`} /></>}
          {output && <section className="result-panel" aria-labelledby="pdf-text-output-title"><div className="result-panel-heading"><h2 id="pdf-text-output-title">Extracted text · {selectedPages.length} pages processed</h2><div className="button-row"><CopyButton value={output} /><DownloadButton value={output} filename={`${safeBaseName(state.file.name)}-text.txt`} /></div></div>{emptyPages.length > 0 && <p className="pdf-empty-pages" role="status">No selectable text was found on page{emptyPages.length === 1 ? "" : "s"} {emptyPages.join(", ")}. For scanned pages, render or save the page as an image first, then try <Link href="/tools/student/image-to-text">Image to Text OCR</Link>. It supports printed English and is approximate.</p>}<textarea className="pdf-extracted-text" aria-label="Extracted PDF text" readOnly value={output} /></section>}
        </section>
      </>}
    </>}
  </div>;
}

function Info({ label, value }: { label: string; value: string }) { return <div className="file-info-field"><dt>{label}</dt><dd>{value}</dd></div>; }
function formatDate(value?: Date) { return value ? value.toLocaleString() : "Not present"; }
function formatPoints(value: number) { return `${value.toFixed(2)} pt`; }
