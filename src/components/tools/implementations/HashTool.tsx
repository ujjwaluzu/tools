"use client";

import { useRef, useState } from "react";
import { CopyButton, Dropzone, EmptyState, ErrorState, LoadingState, ResetButton, ResultPanel, formatBytes, type AcceptedFiles } from "@/components/tools/primitives";
import {
  HASH_ALGORITHMS, MAX_HASH_FILE_BYTES, expectedDigestLength, hashFile, hashText,
  isDigestCurrent, isVerificationCurrent, verifyChecksum, type DigestRecord,
  type HashAlgorithm, type VerificationRecord,
} from "@/lib/tools/hash";

type HashMode = "text" | "file";

export function HashTool() {
  const [mode, setMode] = useState<HashMode>("text");
  const [algorithm, setAlgorithm] = useState<HashAlgorithm>("SHA-256");
  const [text, setText] = useState("");
  const [textRevision, setTextRevision] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [fileRevision, setFileRevision] = useState<number | null>(null);
  const [digest, setDigest] = useState<DigestRecord | null>(null);
  const [expected, setExpected] = useState("");
  const [verification, setVerification] = useState<VerificationRecord | null>(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [workingLabel, setWorkingLabel] = useState("");
  const requestId = useRef(0);
  const busy = useRef(false);
  const textRevisionRef = useRef(0);
  const currentSourceId = mode === "file" ? fileRevision : textRevision;
  const currentDigest = currentSourceId !== null && isDigestCurrent(digest, algorithm, mode, currentSourceId);
  const currentVerification = mode === "file" && currentDigest && fileRevision !== null
    && isVerificationCurrent(verification, algorithm, fileRevision, expected, digest.value);

  function invalidatePending() {
    requestId.current += 1;
    if (busy.current) setWorkingLabel("Finishing the previous local hash; its result will be discarded…");
  }

  function chooseMode(next: HashMode) {
    if (next === mode) return;
    invalidatePending();
    setMode(next);
    setVerification(null);
    setError("");
  }

  function changeAlgorithm(value: string) {
    invalidatePending();
    setAlgorithm(value as HashAlgorithm);
    setVerification(null);
    setError("");
  }

  function chooseFile(selection: AcceptedFiles) {
    invalidatePending();
    const candidate = selection.files[0] ?? null;
    setFile(candidate);
    setFileRevision(candidate ? requestId.current : null);
    setVerification(null);
    setError(selection.rejected.join(" "));
  }

  function changeText(value: string) {
    invalidatePending();
    textRevisionRef.current += 1;
    setTextRevision(textRevisionRef.current);
    setText(value);
    setVerification(null);
    setError("");
  }

  async function calculate() {
    if (busy.current) return;
    const sourceId = currentSourceId;
    if (sourceId === null || (mode === "file" && !file)) {
      setError(mode === "file" ? "Choose a file before calculating its digest." : "Enter text before calculating its digest.");
      return;
    }
    const request = ++requestId.current;
    const sourceFile = file;
    const sourceText = text;
    const sourceMode = mode;
    const selectedAlgorithm = algorithm;
    busy.current = true;
    setWorkingLabel(sourceMode === "file" ? "Hashing file locally…" : "Hashing text locally…");
    setError("");
    setDigest(null);
    setVerification(null);
    setWorking(true);
    try {
      const value = sourceMode === "file"
        ? await hashFile(sourceFile as File, selectedAlgorithm)
        : await hashText(sourceText, selectedAlgorithm);
      if (request === requestId.current) {
        setDigest({ algorithm: selectedAlgorithm, source: sourceMode, sourceId, sourceLabel: sourceMode === "file" ? sourceFile?.name ?? "Selected file" : "Text input", value });
      }
    } catch (caught) {
      if (request === requestId.current) {
        setError(caught instanceof Error ? caught.message : "Could not calculate this digest. Check Web Crypto support and try again.");
      }
    } finally {
      busy.current = false;
      setWorkingLabel("");
      setWorking(false);
    }
  }

  function verify() {
    if (!currentDigest || !digest || mode !== "file" || fileRevision === null) {
      setVerification(null);
      setError("Calculate the current file digest before verifying a checksum.");
      return;
    }
    try {
      const matches = verifyChecksum(digest.value, expected, algorithm);
      setVerification({ algorithm, sourceId: fileRevision, expectedInput: expected, calculated: digest.value, matches });
      setError("");
    } catch (caught) {
      setVerification(null);
      setError(caught instanceof Error ? caught.message : "Enter a valid expected checksum.");
    }
  }

  function reset() {
    invalidatePending();
    textRevisionRef.current += 1;
    setMode("text");
    setAlgorithm("SHA-256");
    setText("");
    setTextRevision(textRevisionRef.current);
    setFile(null);
    setFileRevision(null);
    setDigest(null);
    setExpected("");
    setVerification(null);
    setError("");
  }

  return <div className="tool-workspace hash-workspace">
    <p className="hash-privacy">Text and files are hashed locally in your browser. Nothing is uploaded or stored by this tool.</p>
    <div className="field-group"><span className="field-label">Hash input</span><div className="segmented-control" role="group" aria-label="Hash input mode">
      <button type="button" className={mode === "text" ? "selected" : ""} aria-pressed={mode === "text"} onClick={() => chooseMode("text")}>Text</button>
      <button type="button" className={mode === "file" ? "selected" : ""} aria-pressed={mode === "file"} onClick={() => chooseMode("file")}>File</button>
    </div></div>
    <label className="field-group" htmlFor="hash-algorithm"><span className="field-label">Hash algorithm</span><select id="hash-algorithm" className="text-input hash-algorithm" value={algorithm} onChange={(event) => changeAlgorithm(event.target.value)}>
      {HASH_ALGORITHMS.map((item) => <option value={item} key={item}>{item}</option>)}
    </select></label>

    {mode === "text" ? <label className="field-group" htmlFor="hash-text-input"><span className="field-label">Text to hash</span><textarea id="hash-text-input" className="code-input" value={text} onChange={(event) => changeText(event.target.value)} placeholder="Type or paste text to hash…" spellCheck={false} /></label> : <>
      <Dropzone onFiles={chooseFile} maxBytes={MAX_HASH_FILE_BYTES} />
      {file && <div className="hash-file-summary"><span><strong title={file.name}>{file.name}</strong><small>{file.size.toLocaleString()} bytes · {formatBytes(file.size)}</small></span><button type="button" className="button button-secondary" onClick={() => document.querySelector<HTMLInputElement>(".hash-workspace input[type='file']")?.click()}>Replace file</button></div>}
      <p className="field-help">The Web Crypto digest API reads a file into memory as one buffer; it does not stream. Files are limited to 25 MiB to reduce browser memory pressure.</p>
    </>}

    {working && <LoadingState label={workingLabel} />}
    {error && <ErrorState>{error}</ErrorState>}
    <div className="workspace-actions hash-actions">
      <button type="button" className="button button-primary" onClick={() => void calculate()} disabled={working || (mode === "file" && !file)}>{currentDigest ? "Recalculate digest" : "Calculate digest"}</button>
      <ResetButton onClick={reset} label="Reset" disabled={false} />
    </div>

    <ResultPanel title="Calculated digest" actions={<CopyButton value={currentDigest && digest ? digest.value : ""} label="Copy digest" />}>
      {digest ? <div className="hash-result">
        <div className="hash-result-meta"><strong>{digest.algorithm}</strong><span>{digest.source === "file" ? digest.sourceLabel : "Text input"}</span></div>
        <code className="hash-digest" aria-label={`${digest.algorithm} digest`}>{digest.value}</code>
        {currentDigest ? <p className="hash-result-status" role="status">Current digest for the selected {mode === "file" ? "file" : "text"}.</p> : <p className="hash-result-stale" role="status">This digest is stale because the algorithm or input changed. Recalculate before copying or verifying.</p>}
      </div> : <EmptyState title="Your digest will appear here">Choose an algorithm and calculate a digest locally.</EmptyState>}
    </ResultPanel>

    {mode === "file" && <section className="hash-verify" aria-labelledby="hash-verify-heading">
      <div><h2 id="hash-verify-heading">Verify an expected checksum</h2><p>Compare this file’s calculated digest with a checksum from a source you trust.</p></div>
      <label className="field-group" htmlFor="expected-checksum"><span className="field-label">Expected {algorithm} checksum ({expectedDigestLength(algorithm)} hexadecimal characters)</span><input id="expected-checksum" className="text-input hash-checksum-input" type="text" inputMode="text" autoComplete="off" spellCheck={false} value={expected} onChange={(event) => { setExpected(event.target.value); setVerification(null); setError(""); }} placeholder="Paste expected checksum" /></label>
      <button type="button" className="button button-secondary" onClick={verify} disabled={working || !currentDigest}>Verify checksum</button>
      {currentVerification && <p className={verification.matches ? "hash-match" : "hash-mismatch"} role="status" aria-live="polite">{verification.matches ? "Match" : "Mismatch"} · compared using {verification.algorithm}. A match only confirms equality with the checksum you supplied; it does not prove file safety or checksum provenance.</p>}
      {!currentVerification && <p className="field-help">A match is not a malware scan, authentication check, or proof that the supplied checksum is trustworthy.</p>}
    </section>}
  </div>;
}
