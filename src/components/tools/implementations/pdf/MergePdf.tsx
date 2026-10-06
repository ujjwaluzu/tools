"use client";

import { useState } from "react";
import { EmptyState, ErrorState, LoadingState, ResetButton, ResultPanel, type AcceptedFiles } from "@/components/tools/primitives";
import { PdfDownloads, PdfDropzone, PdfFileList } from "@/components/tools/pdf/PdfComponents";
import { mergePdfFiles } from "@/lib/tools/pdf/documents";
import type { PdfOutput } from "@/lib/tools/pdf/types";
import { MAX_PDF_FILE_BYTES, MAX_PDF_TOTAL_BYTES } from "@/lib/tools/pdf/types";
import { friendlyPdfError, validatePdfBatch, verifyPdfHeader } from "@/lib/tools/pdf/validation";

export function MergePdf() {
  const [files, setFiles] = useState<File[]>([]);
  const [output, setOutput] = useState<PdfOutput[]>([]);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [step, setStep] = useState("");

  async function addFiles(selection: AcceptedFiles) {
    setOutput([]);
    const rejected = [...selection.rejected];
    const validFiles: File[] = [];
    for (const file of selection.files) {
      if (await verifyPdfHeader(file)) validFiles.push(file);
      else rejected.push(`${file.name} doesn’t appear to be a PDF. Choose a readable PDF file.`);
    }
    const combined = [...files, ...validFiles];
    try {
      validatePdfBatch(combined);
      setFiles(combined);
      setError(rejected.join(" "));
    } catch (caught) {
      setError([friendlyPdfError(caught), ...rejected].join(" "));
    }
  }

  function moveFile(index: number, direction: -1 | 1) {
    setFiles((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setOutput([]);
  }

  async function merge() {
    setError("");
    setOutput([]);
    setWorking(true);
    setStep("");
    try {
      const blob = await mergePdfFiles(files, (completed, total) => setStep(`Added ${completed} of ${total} PDFs`));
      setOutput([{ name: "merged.pdf", blob }]);
    } catch (caught) {
      setError(friendlyPdfError(caught));
    } finally {
      setWorking(false);
      setStep("");
    }
  }

  function reset() {
    setFiles([]);
    setOutput([]);
    setError("");
    setStep("");
  }

  return <div className="tool-workspace pdf-workspace">
    <PdfDropzone onFiles={addFiles} multiple maxBytes={MAX_PDF_FILE_BYTES} />
    <div className="pdf-list-heading"><div><h2>Selected files</h2><p>Files are merged in this order.</p></div><span>{files.length} file{files.length === 1 ? "" : "s"} · {formatTotalSize(files)}</span></div>
    <PdfFileList files={files} onMove={moveFile} onRemove={(index) => { setFiles((current) => current.filter((_, item) => item !== index)); setOutput([]); }} />
    {error && <ErrorState>{error}</ErrorState>}
    {working && <div className="pdf-processing" role="status"><LoadingState label="Merging PDFs locally…" />{step && <span>{step}</span>}</div>}
    <div className="pdf-primary-actions">
      <button type="button" className="button button-primary" onClick={merge} disabled={working || files.length < 2}>Merge PDFs</button>
      <ResetButton onClick={reset} label="Reset" disabled={working} />
    </div>
    <ResultPanel title="Merged PDF">
      {output.length ? <PdfDownloads outputs={output} title="Merged PDF download" /> : <EmptyState title="Your merged PDF will appear here">Choose at least two PDFs, arrange them, then merge.</EmptyState>}
    </ResultPanel>
  </div>;
}

function formatTotalSize(files: File[]): string {
  const bytes = files.reduce((total, file) => total + file.size, 0);
  if (bytes > MAX_PDF_TOTAL_BYTES) return "Total size is over the 100 MB limit";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
