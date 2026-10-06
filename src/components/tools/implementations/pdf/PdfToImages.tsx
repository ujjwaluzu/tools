"use client";

import { useRef, useState } from "react";
import { EmptyState, ErrorState, LoadingState, Progress, ResetButton, ResultPanel, type AcceptedFiles } from "@/components/tools/primitives";
import { PdfDownloads, PdfDropzone, PdfFileList, PdfPageSelector } from "@/components/tools/pdf/PdfComponents";
import { inspectPdfForRendering, renderPdfPages } from "@/lib/tools/pdf/render";
import { MAX_PDF_FILE_BYTES, MAX_RENDER_PAGES, type PdfImageType, type PdfOutput, type PdfPageProgress } from "@/lib/tools/pdf/types";
import { friendlyPdfError, PdfToolError, verifyPdfHeader } from "@/lib/tools/pdf/validation";

export function PdfToImages({ format }: { format: PdfImageType }) {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [mode, setMode] = useState<"all" | "selected">("all");
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [quality, setQuality] = useState(0.9);
  const [outputs, setOutputs] = useState<PdfOutput[]>([]);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState<PdfPageProgress | null>(null);
  const requestId = useRef(0);
  const isJpg = format === "jpg";

  async function chooseFile(selection: AcceptedFiles) {
    setOutputs([]);
    const candidate = selection.files[0];
    if (!candidate) { setError(selection.rejected.join(" ")); return; }
    const request = ++requestId.current;
    setChecking(true);
    setError(selection.rejected.join(" "));
    try {
      if (!await verifyPdfHeader(candidate)) throw new PdfToolError(`${candidate.name} doesn’t appear to be a PDF. Choose a readable PDF file.`);
      const count = await inspectPdfForRendering(candidate);
      if (request !== requestId.current) return;
      setFile(candidate);
      setPageCount(count);
      setSelectedPages([1]);
      setMode("all");
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

  async function convert() {
    if (!file) return;
    const pages = mode === "all" ? Array.from({ length: pageCount }, (_, index) => index + 1) : selectedPages;
    if (!pages.length) { setError("Select at least one page to convert."); return; }
    if (pages.length > MAX_RENDER_PAGES) {
      setError(`This selection has ${pages.length} pages. Convert ${MAX_RENDER_PAGES} pages or fewer at a time to protect browser memory.`);
      return;
    }
    setError("");
    setOutputs([]);
    setProgress(null);
    setWorking(true);
    try {
      const rendered = await renderPdfPages(file, pages, format, quality, setProgress);
      setOutputs(rendered);
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
    setMode("all");
    setOutputs([]);
    setProgress(null);
    setError("");
    setChecking(false);
  }

  return <div className="tool-workspace pdf-workspace">
    <PdfDropzone onFiles={chooseFile} multiple={false} maxBytes={MAX_PDF_FILE_BYTES} disabled={checking || working} />
    {checking && <LoadingState label="Checking PDF pages…" />}
    {file && <>
      <PdfFileList files={[file]} onMove={() => undefined} onRemove={reset} />
      <p className="pdf-page-count">{pageCount} page{pageCount === 1 ? "" : "s"} ready to render locally.</p>
      <div className="field-group"><span className="field-label">Pages</span><div className="segmented-control" role="group" aria-label="Pages to convert">
        <button type="button" className={mode === "all" ? "selected" : ""} aria-pressed={mode === "all"} onClick={() => setMode("all")}>All pages</button>
        <button type="button" className={mode === "selected" ? "selected" : ""} aria-pressed={mode === "selected"} onClick={() => setMode("selected")}>Choose pages</button>
      </div></div>
      {mode === "selected" && <PdfPageSelector key={`${file.name}-${file.lastModified}`} pageCount={pageCount} selectedPages={selectedPages} onChange={setSelectedPages} />}
      {isJpg && <div className="pdf-quality-control"><label className="field-label" htmlFor="jpg-quality">JPG image quality <strong>{Math.round(quality * 100)}%</strong></label><input id="jpg-quality" type="range" min="0.5" max="1" step="0.05" value={quality} onChange={(event) => setQuality(Number(event.target.value))} /><span>Higher quality creates larger files.</span></div>}
      {mode === "all" && pageCount > MAX_RENDER_PAGES && <p className="pdf-limit-note">To avoid excessive browser memory use, convert this document in selections of {MAX_RENDER_PAGES} pages or fewer.</p>}
    </>}
    {error && <ErrorState>{error}</ErrorState>}
    {working && <div className="pdf-render-progress" role="status">
      <LoadingState label={progress ? `Rendering page ${progress.page} of ${pageCount}…` : "Preparing PDF renderer…"} />
      {progress && <Progress value={(progress.completed / progress.total) * 100} label={`Rendered ${progress.completed} of ${progress.total} pages`} />}
    </div>}
    <div className="pdf-primary-actions">
      <button type="button" className="button button-primary" onClick={convert} disabled={!file || working || checking}>{isJpg ? "Convert to JPG" : "Convert to PNG"}</button>
      <ResetButton onClick={reset} label="Reset" disabled={working || checking} />
    </div>
    <ResultPanel title={outputs.length ? `${outputs.length} image${outputs.length === 1 ? "" : "s"} ready` : `PDF pages as ${isJpg ? "JPG" : "PNG"}`}>
      {outputs.length ? <PdfDownloads outputs={outputs} title="Converted page downloads" /> : <EmptyState title="Your page images will appear here">Choose a PDF, then convert all pages or a page selection.</EmptyState>}
    </ResultPanel>
  </div>;
}

export function PdfToPngTool() { return <PdfToImages format="png" />; }
export function PdfToJpgTool() { return <PdfToImages format="jpg" />; }
