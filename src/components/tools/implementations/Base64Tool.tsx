"use client";

import { useState } from "react";
import { CopyButton, EmptyState, ErrorState, ResetButton, ResultPanel } from "@/components/tools/primitives";

type Mode = "encode" | "decode";

function encodeBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeBase64(value: string): string {
  const binary = atob(value.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export function Base64Tool() {
  const [mode, setMode] = useState<Mode>("encode");
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  function run() {
    setError(""); setResult("");
    if (!input) { setError(`Enter text to ${mode}.`); return; }
    try { setResult(mode === "encode" ? encodeBase64(input) : decodeBase64(input)); }
    catch { setError(mode === "encode" ? "This text could not be encoded." : "That value isn’t valid Base64 text. Check the characters and UTF-8 content."); }
  }

  function swapMode() { setMode((current) => current === "encode" ? "decode" : "encode"); setInput(result || input); setResult(""); setError(""); }
  function reset() { setInput(""); setResult(""); setError(""); }

  return <div className="tool-workspace">
    <div className="field-group"><span className="field-label">Mode</span><div className="segmented-control" role="group" aria-label="Base64 mode">
      <button type="button" aria-pressed={mode === "encode"} className={mode === "encode" ? "selected" : ""} onClick={() => { setMode("encode"); setError(""); setResult(""); }}>Encode</button>
      <button type="button" aria-pressed={mode === "decode"} className={mode === "decode" ? "selected" : ""} onClick={() => { setMode("decode"); setError(""); setResult(""); }}>Decode</button>
    </div></div>
    <label className="field-label" htmlFor="base64-input">{mode === "encode" ? "Text to encode" : "Base64 to decode"}</label>
    <textarea id="base64-input" className="code-input compact-input" value={input} onChange={(event) => { setInput(event.target.value); setError(""); }} placeholder={mode === "encode" ? "Type or paste text…" : "Paste a Base64 value…"} spellCheck={false} />
    <div className="workspace-actions"><div className="button-row"><button type="button" className="button button-primary" onClick={run}>{mode === "encode" ? "Encode to Base64" : "Decode Base64"}</button><button type="button" className="button button-secondary" onClick={swapMode}>⇄ Swap mode</button></div><ResetButton onClick={reset} /></div>
    {error && <ErrorState>{error}</ErrorState>}
    <ResultPanel title="Result" actions={<CopyButton value={result} />}>
      {result ? <pre className="code-result"><code>{result}</code></pre> : <EmptyState title="Your result will appear here">Values are encoded or decoded only in this browser.</EmptyState>}
    </ResultPanel>
  </div>;
}
