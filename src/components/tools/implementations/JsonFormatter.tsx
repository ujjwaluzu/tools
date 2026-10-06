"use client";

import { useState } from "react";
import { CopyButton, DownloadButton, EmptyState, ErrorState, ResetButton, ResultPanel } from "@/components/tools/primitives";

type Action = "format" | "minify";

export function JsonFormatter() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [action, setAction] = useState<Action>("format");

  function processJson(nextAction: Action) {
    setAction(nextAction);
    setError("");
    setResult("");
    if (!input.trim()) { setError("Paste some JSON to get started."); return; }
    try {
      const parsed: unknown = JSON.parse(input);
      setResult(JSON.stringify(parsed, null, nextAction === "format" ? 2 : undefined));
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Check the syntax and try again.";
      setError(`That JSON isn’t valid. ${message}`);
    }
  }

  function reset() { setInput(""); setResult(""); setError(""); }

  return <div className="tool-workspace">
    <label className="field-label" htmlFor="json-input">Your JSON</label>
    <textarea id="json-input" className="code-input" value={input} onChange={(event) => { setInput(event.target.value); setError(""); }} placeholder={'Paste JSON here…\n\n{"hello":"world"}'} spellCheck={false} />
    <div className="workspace-actions"><div className="button-row"><button type="button" className="button button-primary" onClick={() => processJson("format")}>Format JSON</button><button type="button" className="button button-secondary" onClick={() => processJson("minify")}>Minify</button><button type="button" className="button button-quiet" onClick={() => { setError(""); processJson(action); }}>Validate</button></div><ResetButton onClick={reset} /></div>
    {error && <ErrorState>{error}</ErrorState>}
    <ResultPanel title={action === "format" ? "Formatted JSON" : "Minified JSON"} actions={<><CopyButton value={result} /><DownloadButton value={result} filename="formatted.json" /></>}>
      {result ? <pre className="code-result"><code>{result}</code></pre> : <EmptyState title="Your result will appear here">Paste JSON above, then format, minify, or validate it.</EmptyState>}
    </ResultPanel>
  </div>;
}
