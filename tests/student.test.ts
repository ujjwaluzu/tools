import assert from "node:assert/strict";
import test from "node:test";
import { countStudentText, formatCitation, generateFlashcards, importFlashcards, NOTES_STORAGE_KEY, notesToMarkdown, pauseTimer, resetTimer, searchStudyNotes, startTimer, timerRemaining, transformStudentText, validateStudyNotes, emptyCitationFields } from "../src/lib/tools/student.ts";
import { MAX_OCR_IMAGE_BYTES, recognizeImage, validateOcrImage } from "../src/lib/tools/ocr.ts";
import { getToolsForCategory } from "../src/lib/tools/registry.ts";

test("Student category reuses existing tools without duplicate paths", () => {
  const studentTools = getToolsForCategory("student");
  assert.equal(studentTools.length, 11);
  assert.equal(new Set(studentTools.map(({ href }) => href)).size, studentTools.length);
  assert.ok(studentTools.some(({ href }) => href === "/tools/pdf/inspect"));
  assert.ok(studentTools.some(({ href }) => href === "/tools/markdown/to-pdf"));
  assert.ok(studentTools.some(({ href }) => href === "/tools/developer/word-counter"));
});

test("word counter handles whitespace, contractions, hyphenated and non-Latin words", () => {
  assert.deepEqual(countStudentText("  \n\t"), { words: 0, characters: 4, charactersWithoutSpaces: 0, sentences: 0, paragraphs: 0, lines: 2, readingMinutes: 0 });
  const stats = countStudentText("It's well-known. नमस्ते 世界!\n\nNext line");
  assert.equal(stats.words, 6);
  assert.equal(stats.sentences, 2);
  assert.equal(stats.paragraphs, 2);
  assert.equal(countStudentText("one two three", 2).readingMinutes, 2);
});

test("notes formatter preserves plain text and applies only explicitly selected structure", () => {
  assert.equal(notesToMarkdown("First paragraph\ncontinues\n\nSecond."), "First paragraph\ncontinues\n\nSecond.");
  assert.equal(notesToMarkdown("Title\nBody", { firstLineIsTitle: true }), "# Title\n\nBody");
  assert.equal(notesToMarkdown("Intro\n- alpha\n* beta\n\n1) first\n2. second", { inferLists: true }), "Intro\n- alpha\n- beta\n\n1. first\n2. second");
  assert.equal(notesToMarkdown("[x] done\n[ ] pending", { checklists: true }), "- [x] done\n- [ ] pending");
  assert.equal(notesToMarkdown("**literal**\n# not a heading"), "**literal**\n# not a heading");
});

test("text operations are literal, Unicode-aware, and preserve their intended whitespace", () => {
  assert.equal(transformStudentText("Straße İSTANBUL", "upper"), "STRASSE İSTANBUL");
  assert.equal(transformStudentText("x.x x", "replace", ".", "!"), "x!x x");
  assert.equal(transformStudentText("b\na\nb", "dedupe"), "b\na");
  assert.equal(transformStudentText("b\na\n", "sort"), "\na\nb");
  assert.equal(transformStudentText("a\t  b", "spaces"), "a b");
  assert.equal(transformStudentText(" hi \nthere ", "trim"), "hi \nthere");
});

test("APA 7 drafts show missing fields and do not invent source metadata", () => {
  const fields = { ...emptyCitationFields(), authors: "Ada Lovelace", title: "Notes", publisher: "Example" };
  const book = formatCitation("book", "apa7", fields);
  assert.match(book.reference, /n\.d\./u);
  assert.match(book.reference, /Notes/u);
  assert.ok(book.warnings.some((warning) => warning.includes("Publication date")));
  assert.equal(formatCitation("journal", "apa7", emptyCitationFields()).reference, "");
  assert.match(formatCitation("website", "apa7", { ...fields, url: "https://example.org" }).reference, /https:\/\/example.org/u);
  assert.match(formatCitation("journal", "apa7", { ...fields, sourceTitle: "Journal", doi: "10.1234/example" }).reference, /https:\/\/doi.org\/10\.1234\/example/u);
  assert.match(formatCitation("book", "apa7", { ...fields, authors: "Ada Lovelace; Grace Hopper", year: "2020" }).inText, /Lovelace & Hopper/u);
});

test("citation style templates cover supported sources, organization authors, DOI/URL, and in-text rules", () => {
  const journalFields = { ...emptyCitationFields(), authors: "Ada Lovelace; Grace Hopper; Dorothy Vaughan", year: "2024", title: "Useful research", sourceTitle: "Journal of Examples", volume: "12", issue: "2", pages: "21-34", doi: "10.5555/example" };
  const journal = formatCitation("journal", "apa7", journalFields);
  assert.match(journal.reference, /Lovelace, A\., Hopper, G\., Vaughan, D\. \(2024\)\./u);
  assert.match(journal.reference, /\*Journal of Examples\*, \*12\*\(2\), 21-34\./u);
  assert.equal(journal.inText, "(Lovelace et al., 2024)");
  const website = formatCitation("website", "apa7", { ...emptyCitationFields(), authors: "Example Organization", authorIsOrganization: true, year: "2023", title: "Page title", sourceTitle: "Example site", url: "https://example.org/page" });
  assert.match(website.reference, /Example Organization \(2023\)\./u);
  assert.match(website.inText, /Example Organization/u);
  assert.match(formatCitation("report", "apa7", { ...emptyCitationFields(), authors: "Agency", authorIsOrganization: true, title: "Report", publisher: "Agency", url: "https://agency.example/report" }).reference, /Agency \(n\.d\.\)/u);
  const chapter = formatCitation("chapter", "apa7", { ...emptyCitationFields(), authors: "Author Example", year: "2020", title: "Chapter title", sourceTitle: "Book title", editor: "Editor Example", pages: "10-20", publisher: "Press" });
  assert.match(chapter.reference, /In Editor Example \(Ed\.\), \*Book title\* \(10-20\)\. Press\./u);
  assert.match(formatCitation("book", "mla9", { ...emptyCitationFields(), authors: "Ada Lovelace", title: "Notes", publisher: "Example Press", year: "2020" }).reference, /Lovelace, Ada\. \*Notes\*\. Example Press, 2020\./u);
  assert.match(formatCitation("website", "chicago-author-date", { ...emptyCitationFields(), authors: "Ada Lovelace", title: "Page", sourceTitle: "Site", year: "2020", url: "https://example.org" }).reference, /Lovelace, Ada\. 2020\. “Page\.” \*Site\*/u);
});

test("timer state calculations support start, pause, resume, reset, and completion", () => {
  const initial = { phase: "focus" as const, durationMs: 10_000, remainingMs: 10_000, running: false, startedAt: null };
  const running = startTimer(initial, 100);
  assert.equal(timerRemaining(running, 3_100), 7_000);
  const paused = pauseTimer(running, 3_100);
  assert.equal(paused.remainingMs, 7_000);
  assert.equal(timerRemaining(startTimer(paused, 5_000), 7_000), 5_000);
  assert.equal(timerRemaining(running, 20_000), 0);
  assert.deepEqual(resetTimer(paused), initial);
  assert.equal(startTimer(running, 500).startedAt, 100);
});

test("flashcards parse explicit pairs and import validates untrusted JSON", () => {
  const cards = generateFlashcards("Term — definition\nQuestion? | answer\nTerm — definition", "pairs");
  assert.equal(cards.length, 2);
  assert.deepEqual(cards.map(({ front, back }) => [front, back]), [["Term", "definition"], ["Question?", "answer"]]);
  assert.deepEqual(generateFlashcards(" \n ", "lines"), []);
  assert.throws(() => importFlashcards("{}"), /JSON array/u);
  assert.throws(() => importFlashcards('[{"front":1,"back":"x"}]'), /string front and back/u);
  assert.deepEqual(importFlashcards('[{"front":"  Q ","back":" A "},{"front":"","back":"x"}]').map(({ front, back }) => [front, back]), [["Q", "A"]]);
});

test("notes validation, search, and storage key support local organizer recovery", () => {
  assert.equal(NOTES_STORAGE_KEY, "ujjwal-student-notes-v1");
  const notes = validateStudyNotes([{ title: "Study", body: "Cell biology", tags: ["exam"], updatedAt: 10 }]);
  assert.equal(notes[0].id, "note-0");
  assert.equal(searchStudyNotes(notes, "biology").length, 1);
  assert.equal(searchStudyNotes(notes, "missing").length, 0);
  assert.throws(() => validateStudyNotes({ title: "invalid" }), /JSON array/u);
});

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
function imageFile(bytes = png, type = "image/png", name = "image.png") { return new File([bytes], name, { type }); }

test("OCR image validation checks types, size, emptiness, and file signatures", () => {
  assert.equal(validateOcrImage(imageFile()), null);
  assert.match(validateOcrImage(imageFile(png, "image/jpeg"), png) ?? "", /contents do not match/u);
  assert.match(validateOcrImage({ size: 0, type: "image/png" }) ?? "", /content/u);
  assert.match(validateOcrImage({ size: MAX_OCR_IMAGE_BYTES + 1, type: "image/png" }) ?? "", /20 MB/u);
  assert.match(validateOcrImage({ size: 1, type: "text/plain" }) ?? "", /PNG, JPEG/u);
});

test("OCR returns mocked text, reports no text, cleans up worker, and propagates errors", async () => {
  let terminations = 0;
  const makeWorker = async () => ({ recognize: async () => ({ data: { text: " Hello OCR \n" } }), terminate: () => { terminations++; } });
  assert.equal(await recognizeImage(imageFile(), { createWorker: makeWorker }), "Hello OCR");
  assert.equal(terminations, 1);
  assert.equal(await recognizeImage(imageFile(), { createWorker: async () => ({ recognize: async () => ({ data: { text: " " } }), terminate: () => { terminations++; } }) }), "");
  await assert.rejects(recognizeImage(imageFile(), { createWorker: async () => ({ recognize: async () => { throw new Error("engine failed"); }, terminate: () => { terminations++; } }) }), /engine failed/u);
  assert.equal(terminations, 3);
});

test("OCR cancellation terminates the worker and never performs a fetch", async () => {
  let finish!: (value: { data: { text: string } }) => void; let terminated = 0;
  const controller = new AbortController();
  const pending = recognizeImage(imageFile(), { signal: controller.signal, createWorker: async () => ({ recognize: () => new Promise((resolve) => { finish = resolve; }), terminate: () => { terminated++; } }) });
  await new Promise((resolve) => setTimeout(resolve, 0));
  controller.abort(); finish({ data: { text: "ignored" } });
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(terminated, 1);
});
