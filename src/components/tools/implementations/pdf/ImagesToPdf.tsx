"use client";

import { useState } from "react";
import { EmptyState, ErrorState, LoadingState, ResetButton, ResultPanel, type AcceptedFiles } from "@/components/tools/primitives";
import { PdfDownloads, PdfDropzone, PdfFileList, PdfImagePreviews } from "@/components/tools/pdf/PdfComponents";
import { detectImageType, makePdfFromImages, validateImageBatch, type PdfImageSettings } from "@/lib/tools/pdf/images-to-pdf";
import { MAX_IMAGE_FILE_BYTES } from "@/lib/tools/pdf/types";
import { friendlyPdfError } from "@/lib/tools/pdf/validation";
import type { PdfOutput } from "@/lib/tools/pdf/types";

const imageTypes = ["image/png", "image/jpeg", "image/webp", ".png", ".jpg", ".jpeg", ".webp"];

export function ImagesToPdf() {
  const [files, setFiles] = useState<File[]>([]);
  const [settings, setSettings] = useState<PdfImageSettings>({ pageSize: "a4", orientation: "portrait", margin: 24 });
  const [output, setOutput] = useState<PdfOutput[]>([]);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  async function addFiles(selection: AcceptedFiles) {
    setOutput([]);
    const rejected = [...selection.rejected];
    const valid: File[] = [];
    for (const file of selection.files) {
      if (await detectImageType(file)) valid.push(file);
      else rejected.push(`${file.name} isn’t a readable PNG, JPG, or WebP image.`);
    }
    const combined = [...files, ...valid];
    try {
      validateImageBatch(combined);
      setFiles(combined);
      setError(rejected.join(" "));
    } catch (caught) {
      if (!combined.length && caught instanceof Error) setError(rejected.concat(caught.message).filter(Boolean).join(" "));
      else setError(rejected.concat(friendlyPdfError(caught)).filter(Boolean).join(" "));
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

  async function createPdf() {
    setError("");
    setOutput([]);
    setWorking(true);
    try {
      const blob = await makePdfFromImages(files, settings);
      setOutput([{ name: "images-to-pdf.pdf", blob }]);
    } catch (caught) {
      setError(friendlyPdfError(caught));
    } finally {
      setWorking(false);
    }
  }

  function reset() {
    setFiles([]);
    setOutput([]);
    setError("");
    setSettings({ pageSize: "a4", orientation: "portrait", margin: 24 });
  }

  return <div className="tool-workspace pdf-workspace">
    <PdfDropzone onFiles={addFiles} multiple maxBytes={MAX_IMAGE_FILE_BYTES} accept={imageTypes} disabled={working} />
    <div className="pdf-list-heading"><div><h2>Selected images</h2><p>Each image becomes one PDF page. Drag order can be changed below.</p></div><span>{files.length} image{files.length === 1 ? "" : "s"}</span></div>
    <PdfFileList files={files} onMove={moveFile} onRemove={(index) => { setFiles((current) => current.filter((_, item) => item !== index)); setOutput([]); }} />
    <PdfImagePreviews files={files} />
    <div className="pdf-settings-grid">
      <div className="field-group"><label className="field-label" htmlFor="image-pdf-size">Page size</label><select id="image-pdf-size" className="text-input" value={settings.pageSize} onChange={(event) => setSettings((current) => ({ ...current, pageSize: event.target.value as PdfImageSettings["pageSize"] }))}><option value="a4">A4</option><option value="letter">US Letter</option></select></div>
      <div className="field-group"><label className="field-label" htmlFor="image-pdf-orientation">Orientation</label><select id="image-pdf-orientation" className="text-input" value={settings.orientation} onChange={(event) => setSettings((current) => ({ ...current, orientation: event.target.value as PdfImageSettings["orientation"] }))}><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></div>
      <div className="field-group"><label className="field-label" htmlFor="image-pdf-margin">Margins</label><select id="image-pdf-margin" className="text-input" value={settings.margin} onChange={(event) => setSettings((current) => ({ ...current, margin: Number(event.target.value) }))}><option value={0}>None</option><option value={18}>Small</option><option value={24}>Standard</option><option value={36}>Wide</option></select></div>
      <p className="pdf-setting-note">Images are scaled to fit the page while keeping their proportions.</p>
    </div>
    {error && <ErrorState>{error}</ErrorState>}
    {working && <LoadingState label="Creating PDF from your images…" />}
    <div className="pdf-primary-actions">
      <button type="button" className="button button-primary" onClick={createPdf} disabled={!files.length || working}>Create PDF</button>
      <ResetButton onClick={reset} label="Reset" disabled={working} />
    </div>
    <ResultPanel title="PDF from images">
      {output.length ? <PdfDownloads outputs={output} title="PDF download" /> : <EmptyState title="Your PDF will appear here">Add one or more PNG, JPG, or WebP images.</EmptyState>}
    </ResultPanel>
  </div>;
}
