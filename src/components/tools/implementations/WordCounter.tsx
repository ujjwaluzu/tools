"use client";

import { useMemo, useState } from "react";
import { ResetButton } from "@/components/tools/primitives";

export function WordCounter() {
  const [text, setText] = useState("");
  const counts = useMemo(() => {
    const trimmed = text.trim();
    return {
      words: trimmed ? trimmed.split(/\s+/u).length : 0,
      characters: Array.from(text).length,
      noSpaces: Array.from(text.replace(/\s/gu, "")).length,
      lines: text ? text.split(/\r\n|\r|\n/u).length : 0,
    };
  }, [text]);
  return <div className="tool-workspace">
    <label className="field-label" htmlFor="counter-input">Your text</label>
    <textarea id="counter-input" className="code-input text-area" value={text} onChange={(event) => setText(event.target.value)} placeholder="Start typing or paste your text here…" />
    <div className="workspace-actions"><span className="live-label"><span className="status-dot" /> Counts update as you type</span><ResetButton onClick={() => setText("")} /></div>
    <div className="counter-grid" aria-live="polite">
      <div className="counter-card counter-primary"><span>Words</span><strong>{counts.words.toLocaleString()}</strong></div>
      <div className="counter-card"><span>Characters</span><strong>{counts.characters.toLocaleString()}</strong></div>
      <div className="counter-card"><span>Without spaces</span><strong>{counts.noSpaces.toLocaleString()}</strong></div>
      <div className="counter-card"><span>Lines</span><strong>{counts.lines.toLocaleString()}</strong></div>
    </div>
  </div>;
}
