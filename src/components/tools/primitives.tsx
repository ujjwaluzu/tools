"use client";

import { useEffect, useRef, useState } from "react";

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timeout.current) clearTimeout(timeout.current); }, []);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => setCopied(false), 1600);
    } catch { setCopied(false); }
  }
  return <button type="button" className="button button-secondary" onClick={copy} disabled={!value}>{copied ? "Copied" : label}</button>;
}

export function DownloadButton({ value, filename = "result.txt", label = "Download" }: { value: string; filename?: string; label?: string }) {
  function download() {
    const url = URL.createObjectURL(new Blob([value], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  return <button type="button" className="button button-secondary" onClick={download} disabled={!value}>{label}</button>;
}

export function ResetButton({ onClick, label = "Clear", disabled = false }: { onClick: () => void; label?: string; disabled?: boolean }) {
  return <button type="button" className="button button-quiet" onClick={onClick} disabled={disabled}>{label}</button>;
}

export function ErrorState({ children }: { children: React.ReactNode }) {
  return <div className="error-state" role="alert"><span aria-hidden="true">!</span><p>{children}</p></div>;
}

export function EmptyState({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="result-empty"><span aria-hidden="true">↳</span><strong>{title}</strong><p>{children}</p></div>;
}

export function LoadingState({ label = "Working…" }: { label?: string }) {
  return <div className="loading-state" role="status"><span className="spinner" aria-hidden="true" />{label}</div>;
}

export function Progress({ value, label = "Processing" }: { value: number; label?: string }) {
  const progress = Math.max(0, Math.min(100, Math.round(value)));
  return <div className="progress-wrap">
    <div className="progress-label"><span>{label}</span><span>{progress}%</span></div>
    <div className="progress-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
      <span className="progress-value" style={{ width: `${progress}%` }} />
    </div>
  </div>;
}

export type AcceptedFiles = {
  files: File[];
  rejected: string[];
};

export function Dropzone({ onFiles, accept, multiple = false, maxBytes = 25 * 1024 * 1024, disabled = false }: {
  onFiles: (result: AcceptedFiles) => void;
  accept?: string[];
  multiple?: boolean;
  maxBytes?: number;
  disabled?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  function validate(selected: FileList | File[]) {
    const files = Array.from(selected);
    const accepted: File[] = [];
    const rejected: string[] = [];
    for (const file of (multiple ? files : files.slice(0, 1))) {
      if (file.size > maxBytes) rejected.push(`${file.name} is larger than ${formatBytes(maxBytes)}.`);
      else if (accept?.length && !accept.some((type) => file.type === type || file.name.toLowerCase().endsWith(type))) rejected.push(`${file.name} has an unsupported file type.`);
      else accepted.push(file);
    }
    onFiles({ files: accepted, rejected });
  }
  return <div className={`dropzone${dragging ? " is-dragging" : ""}${disabled ? " is-disabled" : ""}`} onDragOver={(event) => { event.preventDefault(); if (!disabled) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); if (!disabled) validate(event.dataTransfer.files); }}>
    <input ref={input} type="file" className="visually-hidden" accept={accept?.join(",")} multiple={multiple} disabled={disabled} onChange={(event) => { if (event.target.files) validate(event.target.files); event.target.value = ""; }} />
    <span className="dropzone-icon" aria-hidden="true">↥</span><strong>Drop a file here</strong><span>or choose a file from your device</span>
    <button type="button" className="button button-secondary" disabled={disabled} onClick={() => input.current?.click()}>Browse files</button>
    <small>Up to {formatBytes(maxBytes)}{accept?.length ? ` · ${accept.join(", ")}` : ""}</small>
  </div>;
}

export function FileList({ files, onRemove }: { files: File[]; onRemove: (index: number) => void }) {
  if (!files.length) return null;
  return <ul className="file-list">{files.map((file, index) => <li className="file-row" key={`${file.name}-${file.lastModified}`}>
    <span className="file-icon" aria-hidden="true">▤</span><span className="file-info"><strong>{file.name}</strong><small>{file.type || "Unknown type"} · {formatBytes(file.size)}</small></span>
    <button type="button" className="icon-button" aria-label={`Remove ${file.name}`} onClick={() => onRemove(index)}>×</button>
  </li>)}</ul>;
}

export function ResultPanel({ title = "Result", children, actions }: { title?: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return <section className="result-panel"><div className="result-panel-heading"><h2>{title}</h2><div className="button-row">{actions}</div></div>{children}</section>;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
