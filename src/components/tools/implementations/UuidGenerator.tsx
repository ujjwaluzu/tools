"use client";

import { useState } from "react";
import { CopyButton, EmptyState, ResultPanel } from "@/components/tools/primitives";

function createUuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function UuidGenerator() {
  const [count, setCount] = useState(1);
  const [uuids, setUuids] = useState<string[]>([]);
  const [error, setError] = useState("");
  function generate() {
    if (!Number.isInteger(count) || count < 1 || count > 100) { setError("Choose a number between 1 and 100."); return; }
    if (!globalThis.crypto?.getRandomValues) { setError("Secure random generation is unavailable in this browser."); return; }
    setError(""); setUuids(Array.from({ length: count }, createUuid));
  }
  const output = uuids.join("\n");
  return <div className="tool-workspace">
    <div className="uuid-controls"><div className="field-group"><label className="field-label" htmlFor="uuid-count">How many?</label><input id="uuid-count" className="text-input count-input" type="number" min={1} max={100} step={1} value={count} onChange={(event) => setCount(Number(event.target.value))} /></div><button type="button" className="button button-primary" onClick={generate}>✳ Generate UUID{count === 1 ? "" : "s"}</button></div>
    {error && <div className="error-state" role="alert"><span aria-hidden="true">!</span><p>{error}</p></div>}
    <ResultPanel title={uuids.length ? `${uuids.length} UUID${uuids.length === 1 ? "" : "s"}` : "Generated UUIDs"} actions={<CopyButton value={output} label="Copy all" />}>
      {uuids.length ? <ol className="uuid-list">{uuids.map((uuid) => <li key={uuid}><code>{uuid}</code></li>)}</ol> : <EmptyState title="Ready when you are">UUID v4 values use secure browser randomness.</EmptyState>}
    </ResultPanel>
  </div>;
}
