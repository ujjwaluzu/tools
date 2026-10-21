"use client";

import { useEffect, useRef, useState } from "react";
import { ErrorState, ResetButton } from "@/components/tools/primitives";
import { countCharacters, countLines, countUtf8Bytes, countWords, createTextPdf, DEFAULT_TEXT_PDF_OPTIONS, MAX_TEXT_BYTES, sanitizePdfFilename, type TextPdfOptions } from "@/lib/tools/pdf/text-to-pdf";

type GeneratedPdf = { blob: Blob; pageCount: number; filename: string };

export function TextToPdf() {
  const [text, setText] = useState("");
  const [options, setOptions] = useState<TextPdfOptions>(DEFAULT_TEXT_PDF_OPTIONS);
  const [output, setOutput] = useState<GeneratedPdf | null>(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [status, setStatus] = useState("");
  const request = useRef(false);
  const objectUrl = useRef<string | null>(null);
  const bytes = countUtf8Bytes(text);
  const overLimit = bytes > MAX_TEXT_BYTES;

  useEffect(() => {
    if (!output) return;
    const url = URL.createObjectURL(output.blob);
    objectUrl.current = url;
    return () => {
      URL.revokeObjectURL(url);
      if (objectUrl.current === url) objectUrl.current = null;
    };
  }, [output]);

  function invalidateOutput() {
    setOutput(null);
    setStatus("");
    setError("");
  }

  function updateText(value: string) {
    setText(value);
    invalidateOutput();
  }

  function updateOptions(update: Partial<TextPdfOptions>) {
    setOptions((current) => ({ ...current, ...update }));
    invalidateOutput();
  }

  async function generate() {
    if (request.current) return;
    request.current = true;
    setWorking(true);
    setError("");
    setStatus("Preparing your PDF locally…");
    try {
      const result = await createTextPdf(text, options);
      setOutput({ ...result, filename: sanitizePdfFilename(options.title) });
      setStatus(`PDF ready · ${result.pageCount} ${result.pageCount === 1 ? "page" : "pages"} · ${(result.blob.size / 1024).toFixed(1)} KB`);
    } catch (reason) {
      setStatus("");
      setError(reason instanceof Error ? reason.message : "The PDF could not be generated. Your text and settings are still available; please try again.");
    } finally {
      request.current = false;
      setWorking(false);
    }
  }

  function download() {
    if (!output || !objectUrl.current) return;
    const anchor = document.createElement("a");
    anchor.href = objectUrl.current;
    anchor.download = output.filename;
    anchor.click();
  }

  function reset() {
    setText("");
    setOptions(DEFAULT_TEXT_PDF_OPTIONS);
    setOutput(null);
    setError("");
    setStatus("");
  }

  return <div className="tool-workspace text-pdf-workspace">
    <p className="file-info-privacy">Your text and PDF are processed locally in this browser. Nothing is uploaded or saved.</p>
    <div className="field-group">
      <label className="field-label" htmlFor="text-pdf-input">Text to convert</label>
      <textarea id="text-pdf-input" className="code-input text-area text-pdf-input" value={text} onChange={(event) => updateText(event.target.value)} placeholder={'e.g. Meeting notes\n\n- Review the draft\n- Share the final version'} aria-describedby="text-pdf-counts text-pdf-font-note" spellCheck />
      <div id="text-pdf-counts" className="text-pdf-counts" aria-live="polite"><span>{formatCount(countCharacters(text))} characters</span><span>{formatCount(countWords(text))} words</span><span>{formatCount(countLines(text))} lines</span><span>{formatCount(bytes)} / {formatCount(MAX_TEXT_BYTES)} UTF-8 bytes</span></div>
      <p className="field-help" id="text-pdf-font-note">Standard PDF fonts support Latin text and many Windows-1252 accents and punctuation. Emoji and many non-Latin scripts are not supported; the tool will identify unsupported characters instead of replacing them.</p>
    </div>

    <section className="file-info-section" aria-labelledby="text-pdf-page-setup">
      <div className="file-info-section-heading"><div><span className="eyebrow">Format</span><h2 id="text-pdf-page-setup">Page setup</h2></div></div>
      <div className="text-pdf-options-grid">
        <Field label="Paper size" id="text-pdf-size"><select id="text-pdf-size" className="text-input" value={options.pageSize} onChange={(event) => updateOptions({ pageSize: event.target.value as TextPdfOptions["pageSize"] })}><option value="a4">A4</option><option value="letter">US Letter</option></select></Field>
        <Field label="Orientation" id="text-pdf-orientation"><select id="text-pdf-orientation" className="text-input" value={options.orientation} onChange={(event) => updateOptions({ orientation: event.target.value as TextPdfOptions["orientation"] })}><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></Field>
        <Field label="Margins (mm)" id="text-pdf-margin"><select id="text-pdf-margin" className="text-input" value={options.marginMm} onChange={(event) => updateOptions({ marginMm: Number(event.target.value) })}><option value={10}>Small · 10 mm</option><option value={15}>Compact · 15 mm</option><option value={20}>Standard · 20 mm</option><option value={25}>Wide · 25 mm</option><option value={30}>Extra wide · 30 mm</option></select></Field>
        <Field label="Font family" id="text-pdf-font"><select id="text-pdf-font" className="text-input" value={options.font} onChange={(event) => updateOptions({ font: event.target.value as TextPdfOptions["font"] })}><option value="Helvetica">Helvetica</option><option value="TimesRoman">Times Roman</option><option value="Courier">Courier</option></select></Field>
        <Field label="Font size" id="text-pdf-font-size"><select id="text-pdf-font-size" className="text-input" value={options.fontSize} onChange={(event) => updateOptions({ fontSize: Number(event.target.value) })}>{[8, 9, 10, 11, 12, 14, 16, 18, 24, 36].map((size) => <option key={size} value={size}>{size} pt</option>)}</select></Field>
        <Field label="Line spacing" id="text-pdf-spacing"><select id="text-pdf-spacing" className="text-input" value={options.lineSpacing} onChange={(event) => updateOptions({ lineSpacing: Number(event.target.value) })}><option value={1}>Single</option><option value={1.25}>1.25×</option><option value={1.5}>1.5×</option></select></Field>
      </div>
    </section>

    <section className="file-info-section" aria-labelledby="text-pdf-document-elements">
      <div className="file-info-section-heading"><div><span className="eyebrow">Optional</span><h2 id="text-pdf-document-elements">Document details</h2></div></div>
      <div className="text-pdf-options-grid">
        <Field label="Document title" id="text-pdf-title"><input id="text-pdf-title" className="text-input" maxLength={200} value={options.title} onChange={(event) => updateOptions({ title: event.target.value })} placeholder="e.g. Meeting notes" /></Field>
        <Field label="Header · one line" id="text-pdf-header"><input id="text-pdf-header" className="text-input" maxLength={180} value={options.header} onChange={(event) => updateOptions({ header: event.target.value })} placeholder="e.g. Project update" /></Field>
        <Field label="Footer · one line" id="text-pdf-footer"><input id="text-pdf-footer" className="text-input" maxLength={180} value={options.footer} onChange={(event) => updateOptions({ footer: event.target.value })} placeholder="e.g. Page 1" /></Field>
      </div>
      <label className="inline-check text-pdf-page-number"><input type="checkbox" checked={options.pageNumbers} onChange={(event) => updateOptions({ pageNumbers: event.target.checked })} /> Add page numbers</label>
      <p className="field-help">The document title is stored as PDF metadata and used for the download filename. It is not added to the body text.</p>
    </section>

    <div className="workspace-actions text-pdf-actions"><button type="button" className="button button-primary" onClick={generate} disabled={working || !text.trim() || overLimit}>{working ? "Generating PDF…" : "Generate PDF"}</button><ResetButton onClick={reset} label="Clear text and settings" disabled={working} /></div>
    {overLimit && <ErrorState>Your text is over the 1 MiB limit. Remove some text before generating; it will not be truncated.</ErrorState>}
    {error && <ErrorState>{error}</ErrorState>}
    {status && <p className="text-pdf-status" role="status">{status}</p>}
    {output && <div className="text-pdf-download"><p>The generated PDF is ready to download.</p><button type="button" className="button button-secondary" onClick={download}>Download {output.filename}</button></div>}
  </div>;
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return <div className="field-group"><label className="field-label" htmlFor={id}>{label}</label>{children}</div>;
}

function formatCount(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/gu, ",");
}
