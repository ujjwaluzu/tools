"use client";

import { useRef, useState } from "react";
import { EmptyState, ErrorState, LoadingState, ResetButton, ResultPanel, type AcceptedFiles } from "@/components/tools/primitives";
import { PdfDownloads, PdfDropzone, PdfFileList, PdfPageSelector, usePdfThumbnails } from "@/components/tools/pdf/PdfComponents";
import { extractPdfPages, inspectPdf } from "@/lib/tools/pdf/documents";
import { MAX_EXTRACT_PAGES, MAX_PDF_FILE_BYTES, type PdfOutput } from "@/lib/tools/pdf/types";
import { friendlyPdfError, PdfToolError, verifyPdfHeader } from "@/lib/tools/pdf/validation";

export function SplitPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [output, setOutput] = useState<PdfOutput[]>([]);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [working, setWorking] = useState(false);
  const requestId = useRef(0);
  const thumbnails = usePdfThumbnails(file, pageCount);

  async function chooseFile(selection: AcceptedFiles) {
    setOutput([]);
    const candidate = selection.files[0];
    if (!candidate) {
      setError(selection.rejected.join(" "));
      return;
    }
    const request = ++requestId.current;
    setChecking(true);
    setError(selection.rejected.join(" "));
    try {
      if (!await verifyPdfHeader(candidate)) throw new PdfToolError(`${candidate.name} doesn’t appear to be a PDF. Choose a readable PDF file.`);
      const count = await inspectPdf(candidate);
      if (request !== requestId.current) return;
      setFile(candidate);
      setPageCount(count);
      setSelectedPages([1]);
    } catch (caught) {
      if (request === requestId.current) {
        setFile(null);
        setPageCount(0);
        setSelectedPages([]);
        setError(selection.rejected.concat(friendlyPdfError(caught)).filter(Boolean).join(" "));
      }
    } finally {
      if (request === requestId.current) setChecking(false);
    }
  }

  async function extract() {
    if (!file) return;
    if (!selectedPages.length) { setError("Select at least one page to extract."); return; }
    if (selectedPages.length > MAX_EXTRACT_PAGES) { setError(`Select ${MAX_EXTRACT_PAGES} pages or fewer at a time.`); return; }
    setError("");
    setOutput([]);
    setWorking(true);
    try {
      const blob = await extractPdfPages(file, selectedPages);
      setOutput([{ name: "split-pages.pdf", blob }]);
    } catch (caught) {
      setError(friendlyPdfError(caught));
    } finally {
      setWorking(false);
    }
  }

  function reset() {
    requestId.current += 1;
    setFile(null);
    setPageCount(0);
    setSelectedPages([]);
    setOutput([]);
    setError("");
    setChecking(false);
  }

  return <div className="tool-workspace pdf-workspace">
    <PdfDropzone onFiles={chooseFile} multiple={false} maxBytes={MAX_PDF_FILE_BYTES} disabled={checking || working} />
    {checking && <LoadingState label="Checking PDF pages…" />}
    {file && <>
      <PdfFileList files={[file]} onMove={() => undefined} onRemove={reset} />
      <div className="pdf-page-count">{pageCount} page{pageCount === 1 ? "" : "s"} · {thumbnails.loading ? "Making page previews…" : `Previewing up to ${Math.min(pageCount, thumbnails.thumbnails.length)} pages`}</div>
      <PdfPageSelector key={`${file.name}-${file.lastModified}`} pageCount={pageCount} selectedPages={selectedPages} onChange={setSelectedPages} thumbnails={thumbnails.thumbnails} />
    </>}
    {error && <ErrorState>{error}</ErrorState>}
    {working && <LoadingState label="Extracting selected pages…" />}
    <div className="pdf-primary-actions">
      <button type="button" className="button button-primary" onClick={extract} disabled={!file || working || checking}>Extract selected pages</button>
      <ResetButton onClick={reset} label="Reset" disabled={working || checking} />
    </div>
    <ResultPanel title="Extracted PDF">
      {output.length ? <PdfDownloads outputs={output} title="Extracted PDF download" /> : <EmptyState title="Your extracted PDF will appear here">Choose the pages you want, or enter a page range.</EmptyState>}
    </ResultPanel>
  </div>;
}
