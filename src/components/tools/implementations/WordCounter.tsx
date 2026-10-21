"use client";

import { useMemo, useState } from "react";
import { CopyButton, ResetButton } from "@/components/tools/primitives";
import { countStudentText } from "@/lib/tools/student";

export function WordCounter() {
  const [text, setText] = useState("");
  const [wordsPerMinute, setWordsPerMinute] = useState(200);
  const counts = useMemo(() => countStudentText(text, wordsPerMinute), [text, wordsPerMinute]);
  return <div className="tool-workspace">
    <label className="field-label" htmlFor="counter-input">Your text</label>
    <textarea id="counter-input" className="code-input text-area" value={text} onChange={(event) => setText(event.target.value)} placeholder="Start typing or paste your text here…" />
    <div className="workspace-actions"><span className="live-label"><span className="status-dot" /> Counts update as you type</span><CopyButton value={text} label="Copy text" /><ResetButton onClick={() => setText("")} /></div>
    <label className="field-label" htmlFor="counter-wpm">Estimated reading speed (words per minute)</label><input id="counter-wpm" className="text-input" type="number" min="1" max="2000" value={wordsPerMinute} onChange={(event) => setWordsPerMinute(Math.max(1, Number(event.target.value) || 1))} />
    <p className="field-help">Words are Unicode letter/number groups; contractions and hyphenated compounds count as one. Punctuation alone is not a word. Reading time is rounded up to at least one minute.</p>
    <div className="counter-grid" aria-live="polite">
      <div className="counter-card counter-primary"><span>Words</span><strong>{counts.words.toLocaleString()}</strong></div>
      <div className="counter-card"><span>Characters</span><strong>{counts.characters.toLocaleString()}</strong></div>
      <div className="counter-card"><span>Without whitespace</span><strong>{counts.charactersWithoutSpaces.toLocaleString()}</strong></div>
      <div className="counter-card"><span>Sentences</span><strong>{counts.sentences.toLocaleString()}</strong></div>
      <div className="counter-card"><span>Paragraphs</span><strong>{counts.paragraphs.toLocaleString()}</strong></div>
      <div className="counter-card"><span>Lines</span><strong>{counts.lines.toLocaleString()}</strong></div>
      <div className="counter-card"><span>Reading time (estimate)</span><strong>{counts.readingMinutes} min</strong></div>
    </div>
  </div>;
}
