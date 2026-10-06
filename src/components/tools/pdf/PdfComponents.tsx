"use client";

import { useEffect, useState } from "react";
import { Dropzone, EmptyState, ErrorState, formatBytes, type AcceptedFiles } from "@/components/tools/primitives";
import { renderPdfThumbnails } from "@/lib/tools/pdf/render";
import { formatPageRanges, parsePageRanges } from "@/lib/tools/pdf/validation";
import type { PdfOutput } from "@/lib/tools/pdf/types";

export function PdfDropzone({ onFiles, multiple, maxBytes, accept = ["application/pdf", ".pdf"], disabled = false }: {
  onFiles: (selection: AcceptedFiles) => void;
  multiple: boolean;
  maxBytes: number;
  accept?: string[];
  disabled?: boolean;
}) {
  return <Dropzone onFiles={onFiles} multiple={multiple} maxBytes={maxBytes} accept={accept} disabled={disabled} />;
}

export function PdfFileList({ files, onMove, onRemove }: {
  files: File[];
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
}) {
  if (!files.length) return <EmptyState title="No files selected">Your selected files will appear here.</EmptyState>;
  return <ol className="pdf-file-list">{files.map((file, index) => <li className="pdf-file-item" key={`${file.name}-${file.size}-${file.lastModified}`}>
    <span className="pdf-file-position" aria-label={`File ${index + 1}`}>{index + 1}</span>
    <span className="pdf-file-copy"><strong title={file.name}>{file.name}</strong><small>{file.type || "PDF file"} · {formatBytes(file.size)}</small></span>
    <span className="pdf-file-controls">
      <button type="button" className="icon-button reorder-button" aria-label={`Move ${file.name} up`} title="Move up" disabled={index === 0} onClick={() => onMove(index, -1)}>↑</button>
      <button type="button" className="icon-button reorder-button" aria-label={`Move ${file.name} down`} title="Move down" disabled={index === files.length - 1} onClick={() => onMove(index, 1)}>↓</button>
      <button type="button" className="icon-button" aria-label={`Remove ${file.name}`} title="Remove file" onClick={() => onRemove(index)}>×</button>
    </span>
  </li>)}</ol>;
}

export function PdfPageSelector({ pageCount, selectedPages, onChange, thumbnails = [] }: {
  pageCount: number;
  selectedPages: number[];
  onChange: (pages: number[]) => void;
  thumbnails?: Array<{ page: number; src: string }>;
}) {
  const [range, setRange] = useState(() => formatPageRanges(selectedPages));
  const [rangeError, setRangeError] = useState("");
  function applyRange() {
    try {
      onChange(parsePageRanges(range, pageCount));
      setRangeError("");
    } catch (error) {
      setRangeError(error instanceof Error ? error.message : "Enter a valid page range.");
    }
  }

  return <section className="pdf-page-selection" aria-label="Select PDF pages">
    <div className="pdf-page-range-row">
      <div className="field-group pdf-range-field"><label className="field-label" htmlFor="pdf-page-range">Pages to select</label><input id="pdf-page-range" className="text-input" value={range} onChange={(event) => { setRange(event.target.value); setRangeError(""); }} placeholder="1-3, 5, 8-10" aria-describedby="pdf-range-help" /></div>
      <button type="button" className="button button-secondary apply-range-button" onClick={applyRange}>Apply range</button>
      <span id="pdf-range-help" className="pdf-range-help">Use commas and ranges, for example 1-3, 5, 8-10.</span>
    </div>
    {rangeError && <ErrorState>{rangeError}</ErrorState>}
    <div className="pdf-page-tools"><span>{selectedPages.length} of {pageCount} selected</span><span className="button-row"><button type="button" className="button button-quiet" onClick={() => { const pages = Array.from({ length: pageCount }, (_, index) => index + 1); onChange(pages); setRange(formatPageRanges(pages)); setRangeError(""); }}>Select all</button><button type="button" className="button button-quiet" onClick={() => { onChange([]); setRange(""); setRangeError(""); }}>Clear selection</button></span></div>
    <div className="pdf-page-grid">{Array.from({ length: pageCount }, (_, index) => {
      const page = index + 1;
      const selected = selectedPages.includes(page);
      const thumbnail = thumbnails.find((item) => item.page === page);
      return <label className={`pdf-page-card${selected ? " is-selected" : ""}`} key={page}>
      {thumbnail ? <>
        {/* These blob previews are local; Next's image optimizer cannot process object URLs. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={thumbnail.src} alt={`Preview of PDF page ${page}`} loading="lazy" />
      </> : <span className="pdf-page-placeholder" aria-hidden="true">▤</span>}
        <span className="pdf-page-card-footer"><input type="checkbox" checked={selected} onChange={() => { const pages = selected ? selectedPages.filter((item) => item !== page) : [...selectedPages, page].sort((a, b) => a - b); onChange(pages); setRange(formatPageRanges(pages)); setRangeError(""); }} aria-label={`Select page ${page}`} /><span>Page {page}</span></span>
      </label>;
    })}</div>
  </section>;
}

export function usePdfThumbnails(file: File | null, pageCount: number) {
  const [thumbnailState, setThumbnailState] = useState<{ file: File; pageCount: number; items: Array<{ page: number; src: string }> } | null>(null);

  useEffect(() => {
    if (!file || !pageCount) return;
    let active = true;
    let urls: string[] = [];
    void renderPdfThumbnails(file, pageCount).then((blobs) => {
      if (!active) return;
      urls = blobs.map((blob) => URL.createObjectURL(blob));
      setThumbnailState({ file, pageCount, items: urls.map((src, index) => ({ page: index + 1, src })) });
    }).catch(() => {
      if (active) setThumbnailState({ file, pageCount, items: [] });
    });
    return () => {
      active = false;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [file, pageCount]);

  const currentState = thumbnailState?.file === file && thumbnailState.pageCount === pageCount ? thumbnailState : null;
  return { thumbnails: currentState?.items ?? [], loading: Boolean(file && pageCount && !currentState) };
}

export function PdfImagePreviews({ files }: { files: File[] }) {
  const [previews, setPreviews] = useState<Array<{ file: File; src: string }>>([]);
  useEffect(() => {
    const entries = files.map((file) => ({ file, src: URL.createObjectURL(file) }));
    // Object URLs are browser resources, so create them here and revoke them on file changes/unmount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreviews(entries);
    return () => entries.forEach(({ src }) => URL.revokeObjectURL(src));
  }, [files]);

  if (!files.length) return null;
  return <div className="image-preview-grid">{previews.map(({ file, src }, index) => <figure className="image-preview-card" key={`${file.name}-${file.lastModified}`}>
    {/* These blob previews are local; Next's image optimizer cannot process object URLs. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={src} alt={`Preview of ${file.name}`} loading="lazy" />
    <figcaption><span>{index + 1}. {file.name}</span><small>{formatBytes(file.size)}</small></figcaption>
  </figure>)}</div>;
}

export function PdfDownloads({ outputs, title = "Downloads" }: { outputs: PdfOutput[]; title?: string }) {
  if (!outputs.length) return null;
  function download(output: PdfOutput) {
    const url = URL.createObjectURL(output.blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = output.name;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="pdf-download-list" aria-label={title}>{outputs.map(({ name, blob }) => <div className="pdf-download-row" key={name}>
    <span><strong>{name}</strong><small>{formatBytes(blob.size)}</small></span>
    <button type="button" className="button button-primary" onClick={() => download({ name, blob })}>Download {name.endsWith(".pdf") ? "PDF" : "image"}</button>
  </div>)}</div>;
}
