"use client";

import { useRef, useState } from "react";
import { CopyButton, DownloadButton, Dropzone, EmptyState, ErrorState, LoadingState, ResetButton, ResultPanel, formatBytes, type AcceptedFiles } from "@/components/tools/primitives";
import { assertXmlInputSize, formatXml, MAX_XML_INPUT_BYTES, parseXml, xmlToJson } from "@/lib/tools/xml";

type Action = "format" | "validate" | "json";

export function XmlInspector() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [action, setAction] = useState<Action>("format");
  const [working, setWorking] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  function changed(value: string) {
    setInput(value);
    setOutput("");
    setError("");
    setStatus("");
  }

  async function selectFiles(selection: AcceptedFiles) {
    const file = selection.files[0];
    setInput(""); setOutput(""); setStatus(""); setError(selection.rejected.join(" "));
    if (!file) return;
    if (file.size > MAX_XML_INPUT_BYTES) { setError(`This file is ${formatBytes(file.size)}. The XML input limit is ${formatBytes(MAX_XML_INPUT_BYTES)}.`); return; }
    setWorking(true);
    try {
      const bytes = await file.arrayBuffer();
      changed(new TextDecoder("utf-8").decode(bytes));
    } catch {
      setError("The file could not be read. Choose another local XML file.");
    } finally { setWorking(false); }
  }

  async function process(nextAction: Action) {
    setAction(nextAction); setError(""); setStatus(""); setOutput("");
    try { assertXmlInputSize(input); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Input is too large."); return; }
    if (!input.trim()) { setError("Add XML content before processing."); return; }
    setWorking(true);
    // Let the browser paint the progress state before the synchronous native XML parse.
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    try {
      const parsed = parseXml(input);
      if (nextAction === "format") { setOutput(formatXml(parsed)); setStatus("XML is well formed and formatted."); }
      else if (nextAction === "json") { setOutput(xmlToJson(parsed)); setStatus("XML is well formed and converted to JSON."); }
      else { setStatus("XML is well formed. This checks XML syntax only; no XSD, DTD, or application schema was checked."); }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not parse this XML.");
    } finally { setWorking(false); }
  }

  function reset() {
    changed(""); setAction("format"); setWorking(false);
    if (fileInput.current) fileInput.current.value = "";
  }

  const outputName = action === "json" ? "converted.json" : "formatted.xml";
  return <div className="tool-workspace xml-workspace">
    <p className="field-help">Paste XML or choose a local file. Files are decoded as UTF-8; browser decoding may replace invalid byte sequences. Content is processed in this browser and is never uploaded.</p>
    <Dropzone onFiles={selectFiles} maxBytes={MAX_XML_INPUT_BYTES} disabled={working} />
    <label className="field-group" htmlFor="xml-input"><span className="field-label">XML input</span>
      <textarea id="xml-input" className="code-input" value={input} onChange={(event) => changed(event.target.value)} placeholder={'Paste XML here…\n\n<person id="7"><name>Ada</name></person>'} spellCheck={false} disabled={working} />
    </label>
    <p className="field-help">Maximum input size: {formatBytes(MAX_XML_INPUT_BYTES)}. Size is checked before parsing; input is never truncated.</p>
    <div className="workspace-actions"><div className="button-row">
      <button type="button" className="button button-primary" onClick={() => void process("format")} disabled={working}>Format XML</button>
      <button type="button" className="button button-secondary" onClick={() => void process("validate")} disabled={working}>Validate XML</button>
      <button type="button" className="button button-secondary" onClick={() => void process("json")} disabled={working}>Convert to JSON</button>
      <button type="button" className="button button-quiet" onClick={() => fileInput.current?.click()} disabled={working}>Replace file</button>
      <input ref={fileInput} className="visually-hidden" type="file" accept=".xml,text/xml,application/xml" aria-label="Replace XML input file" onChange={(event) => { if (event.currentTarget.files) void selectFiles({ files: Array.from(event.currentTarget.files), rejected: [] }); event.currentTarget.value = ""; }} />
    </div><ResetButton onClick={reset} disabled={working} /></div>
    {working && <LoadingState label="Parsing XML locally…" />}
    {error && <ErrorState>{error}</ErrorState>}
    {status && <p className="xml-success" role="status">{status}</p>}
    <ResultPanel title={action === "json" ? "JSON output" : action === "validate" ? "Validation" : "Formatted XML"} actions={<><CopyButton value={output}/><DownloadButton value={output} filename={outputName}/></>}>
      {output ? <pre className="code-result" aria-live="polite"><code>{output}</code></pre> : <EmptyState title={status ? "Validation complete" : "Your result will appear here"}>{status && action === "validate" ? "XML syntax check completed." : "Choose an action to process your XML. Results clear when the input changes."}</EmptyState>}
    </ResultPanel>
    <details className="xml-mapping"><summary>XML to JSON mapping and limitations</summary>
      <ul><li>Attributes are grouped under <code>@attributes</code>; element and attribute qualified names, including namespace prefixes, are retained.</li><li>Child names are object keys; repeated siblings become arrays, and a single child stays a single value.</li><li>Text-only elements become strings. Attributes and text use <code>#text</code> where needed; empty elements become an empty string.</li><li>Mixed text and child elements use ordered <code>#content</code> arrays. Comments and processing instructions are omitted from JSON. The XML declaration is document metadata, not an element.</li><li>Formatting preserves mixed text and CDATA without inserting layout whitespace there. Element-only indentation is added; serialization may normalize quote style, declarations, or empty-element notation.</li></ul>
    </details>
    <p className="field-help">Browser parser error details vary and may not include reliable line and column numbers. This tool never resolves external entities, loads URLs, executes scripts, or renders XML as HTML.</p>
  </div>;
}
