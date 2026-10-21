export type WordStats = { words: number; characters: number; charactersWithoutSpaces: number; sentences: number; paragraphs: number; lines: number; readingMinutes: number };

export function countStudentText(text: string, wordsPerMinute = 200): WordStats {
  const words = text.match(/[\p{L}\p{N}\p{M}]+(?:['’][\p{L}\p{N}\p{M}]+)*(?:[-‐‑‒–—][\p{L}\p{N}\p{M}]+(?:['’][\p{L}\p{N}\p{M}]+)*)*/gu)?.length ?? 0;
  const sentences = text.trim() ? Math.max(1, text.match(/[.!?]+(?:["'”’)]*)?(?=\s|$)/gu)?.length ?? 0) : 0;
  const paragraphs = text.trim() ? text.trim().split(/\n\s*\n+/u).filter((part) => part.trim()).length : 0;
  return { words, characters: Array.from(text).length, charactersWithoutSpaces: Array.from(text.replace(/\s/gu, "")).length, sentences, paragraphs, lines: text ? text.split(/\r\n|\r|\n/u).length : 0, readingMinutes: words ? Math.max(1, Math.ceil(words / Math.max(1, wordsPerMinute))) : 0 };
}

export type NotesOptions = { title?: string; firstLineIsTitle?: boolean; checklists?: boolean; inferLists?: boolean };
export function notesToMarkdown(source: string, options: NotesOptions = {}): string {
  const lines = source.replace(/\r\n?/gu, "\n").split("\n");
  const output: string[] = [];
  const title = options.title?.trim();
  if (title) output.push(`# ${title}`, "");
  let start = 0;
  if (options.firstLineIsTitle && !title && lines[0]?.trim()) { output.push(`# ${lines[0].trim()}`, ""); start = 1; }
  if (!options.inferLists && !options.checklists) { const content = lines.slice(start).join("\n"); return title || (options.firstLineIsTitle && start) ? `${output.join("\n")}\n${content}`.trimEnd() : content; }
  let listMode: "bullet" | "number" | "check" | null = null;
  let block: string[] = [];
  const flush = () => { if (!block.length) return; output.push(...block); block = []; listMode = null; };
  for (const line of lines.slice(start)) {
    const trimmed = line.trim();
    if (!trimmed) { flush(); if (output.length && output[output.length - 1] !== "") output.push(""); continue; }
    const checkbox = options.checklists && /^(?:\[([ xX])\]|[-*]\s*\[([ xX])\])\s*(.*)$/u.exec(trimmed);
    const bullet = options.inferLists && /^(?:[-*+])\s+(.+)$/u.exec(trimmed);
    const numbered = options.inferLists && /^\d+[.)]\s+(.+)$/u.exec(trimmed);
    if (checkbox) { if (listMode !== "check") flush(); listMode = "check"; block.push(`- [${(checkbox[1] ?? checkbox[2] ?? " ").toLowerCase() === "x" ? "x" : " "}] ${checkbox[3]}`); }
    else if (bullet) { if (listMode !== "bullet") flush(); listMode = "bullet"; block.push(`- ${bullet[1]}`); }
    else if (numbered) { if (listMode !== "number") flush(); listMode = "number"; block.push(`${block.filter((item) => /^\d+\./u.test(item)).length + 1}. ${numbered[1]}`); }
    else { flush(); block.push(trimmed); }
  }
  flush();
  return output.join("\n").replace(/\n{3,}/gu, "\n\n").trim();
}

export type TextOperation = "upper" | "lower" | "title" | "sentence" | "trim" | "dedupe" | "sort" | "no-blank" | "spaces" | "replace";
export function transformStudentText(text: string, operation: TextOperation, find = "", replacement = ""): string {
  switch (operation) {
    case "upper": return text.toLocaleUpperCase();
    case "lower": return text.toLocaleLowerCase();
    case "title": return text.toLocaleLowerCase().replace(/(^|[\s\p{P}])([\p{L}\p{N}])/gu, (_all, prefix: string, char: string) => prefix + char.toLocaleUpperCase());
    case "sentence": { let beginning = true; return text.toLocaleLowerCase().replace(/[\p{L}\p{N}\p{M}]+/gu, (word) => { if (!beginning) return word; beginning = false; const [first, ...rest] = Array.from(word); return first.toLocaleUpperCase() + rest.join(""); }).replace(/([.!?]+\s+)([\p{L}\p{N}])/gu, (_all, punctuation: string, char: string) => { beginning = false; return punctuation + char.toLocaleUpperCase(); }); }
    case "trim": return text.trim();
    case "dedupe": { const seen = new Set<string>(); return text.split(/\r\n|\r|\n/u).filter((line) => { if (seen.has(line)) return false; seen.add(line); return true; }).join("\n"); }
    case "sort": return text.split(/\r\n|\r|\n/u).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base", numeric: true })).join("\n");
    case "no-blank": return text.split(/\r\n|\r|\n/u).filter((line) => line.trim()).join("\n");
    case "spaces": return text.replace(/[\t ]{2,}/gu, " ");
    case "replace": return find ? text.split(find).join(replacement) : text;
  }
}

export type CitationSource = "book" | "journal" | "website" | "report" | "chapter";
export type CitationStyle = "apa7" | "mla9" | "chicago-author-date";
export type CitationFields = { authors: string; authorIsOrganization?: boolean; year: string; title: string; sourceTitle: string; publisher: string; volume: string; issue: string; pages: string; url: string; doi: string; editor: string };
export const emptyCitationFields = (): CitationFields => ({ authors: "", authorIsOrganization: false, year: "", title: "", sourceTitle: "", publisher: "", volume: "", issue: "", pages: "", url: "", doi: "", editor: "" });
const authors = (value: string) => value.split(/\s*;\s*/u).map((name) => name.trim()).filter(Boolean);
const family = (name: string) => name.includes(",") ? name.split(",")[0].trim() : name.trim().split(/\s+/u).at(-1) ?? name;
const yearText = (year: string) => year.trim() || "n.d.";
const clean = (parts: Array<string | undefined>) => parts.filter((part): part is string => Boolean(part?.trim())).join(" ").replace(/\s+([,.])/gu, "$1").trim();
export function formatCitation(source: CitationSource, style: CitationStyle, fields: CitationFields) {
  const names = authors(fields.authors);
  const author = fields.authorIsOrganization ? names.join("; ") : style === "mla9" ? names.length > 2 ? `${formatMlaName(names[0])}, et al.` : names.map((name, index) => index ? name : formatMlaName(name)).join(", and ")
    : style === "chicago-author-date" ? names.length > 3 ? `${formatChicagoName(names[0])} et al.` : names.map(formatChicagoName).join(" and ")
      : names.length > 2 ? `${family(names[0])}, et al.` : names.length === 2 ? `${formatApaName(names[0])} & ${formatApaName(names[1])}` : formatApaName(names[0] ?? "");
  const title = fields.title.trim(); const sourceTitle = fields.sourceTitle.trim(); const year = yearText(fields.year);
  let reference = "";
  if (style === "apa7") {
    const formatAuthor = (name: string) => fields.authorIsOrganization ? name : formatApaName(name);
    const authorText = names.length ? names.length > 20 ? `${names.slice(0, 19).map(formatAuthor).join(", ")}, … ${formatAuthor(names[names.length - 1])}` : names.map(formatAuthor).join(", ") : "";
    if (source === "book") reference = clean([authorText && `${authorText} (${year}).`, title && `*${title}*.`, fields.publisher && `${fields.publisher}.`]);
    if (source === "journal") reference = clean([authorText && `${authorText} (${year}).`, title && `${title}.`, sourceTitle && `*${sourceTitle}*${fields.volume ? `, *${fields.volume}*` : ""}${fields.issue ? `(${fields.issue})` : ""}${fields.pages ? `, ${fields.pages}` : ""}.`, doiUrl(fields.doi, fields.url)]);
    if (source === "website") reference = clean([authorText && `${authorText} (${year}).`, title && `*${title}*.`, sourceTitle && `${sourceTitle}.`, doiUrl(fields.doi, fields.url)]);
    if (source === "report") reference = clean([authorText && `${authorText} (${year}).`, title && `*${title}*.`, fields.publisher && fields.publisher !== fields.authors ? `${fields.publisher}.` : "", doiUrl(fields.doi, fields.url)]);
    if (source === "chapter") reference = clean([authorText && `${authorText} (${year}).`, title && `${title}.`, fields.editor && `In ${fields.editor} (Ed.),`, sourceTitle && `*${sourceTitle}*`, fields.pages && `(${fields.pages}).`, fields.publisher && `${fields.publisher}.`, doiUrl(fields.doi, fields.url)]);
  } else if (style === "mla9") {
    if (source === "book") reference = clean([names.length ? `${family(names[0])}, ${names[0].split(/\s+/u)[0]}${names.length > 1 ? `, and ${names.slice(1).join(", ")}` : ""}.` : "", title && `*${title}*.`, fields.publisher && `${fields.publisher},`, year && `${year}.`]);
    else reference = clean([author && `${author}.`, title && `“${title}.”`, sourceTitle && `*${sourceTitle}*,`, fields.volume && `vol. ${fields.volume},`, fields.issue && `no. ${fields.issue},`, fields.publisher && `${fields.publisher},`, year && `${year},`, fields.pages && `pp. ${fields.pages}.`, doiUrl(fields.doi, fields.url)]);
  } else {
    reference = clean([author && `${author}.`, year && `${year}.`, title && `“${title}.”`, sourceTitle && `*${sourceTitle}*`, fields.volume && fields.volume, fields.issue && `(${fields.issue})`, fields.pages && `: ${fields.pages}.`, fields.publisher && `${fields.publisher}.`, doiUrl(fields.doi, fields.url)]);
  }
  const warnings: string[] = [];
  if (!names.length) warnings.push("Add an author or organization if the source names one.");
  if (!fields.year.trim()) warnings.push("Publication date is missing; n.d. is used where this style defines it.");
  if (!title) warnings.push("Title is required for a complete reference.");
  if (source === "book" && !fields.publisher.trim()) warnings.push("Publisher is missing.");
  if (source === "journal" && !sourceTitle) warnings.push("Journal title is missing.");
  if (source === "chapter" && !sourceTitle) warnings.push("Edited book title is missing.");
  if (source === "website" && !fields.url.trim()) warnings.push("Website URL is missing.");
  if (source === "report" && !fields.publisher.trim()) warnings.push("Report publisher is missing.");
  const inTextAuthor = fields.authorIsOrganization ? names[0] ?? "" : style === "apa7" && names.length > 2 ? `${family(names[0])} et al.` : names.length === 2 && style === "apa7" ? `${family(names[0])} & ${family(names[1])}` : family(names[0] ?? "");
  return { reference, inText: names.length ? style === "mla9" ? `(${family(names[0])}${fields.pages ? ` ${fields.pages}` : ""})` : `(${inTextAuthor}, ${year})` : year === "n.d." ? "(n.d.)" : `(${year})`, warnings };
}
function doiUrl(doi: string, url: string) { const value = doi.trim() || url.trim(); if (!value) return ""; return `${value.startsWith("http") ? value : doi.trim() ? `https://doi.org/${value.replace(/^doi:\s*/iu, "")}` : `https://${value}`}`; }
function formatApaName(name: string) { const value = name.trim(); if (!value) return ""; const pieces = value.includes(",") ? value.split(",").map((piece) => piece.trim()) : [value.split(/\s+/u).at(-1) ?? "", value.split(/\s+/u).slice(0, -1).join(" ")]; const surname = pieces[0]; const initials = (pieces[1] ?? "").split(/[\s-]+/u).filter(Boolean).map((part) => `${part[0].toLocaleUpperCase()}.`).join(" "); return initials ? `${surname}, ${initials}` : surname; }
function formatMlaName(name: string) { const value = name.trim(); if (value.includes(",")) return value; const parts = value.split(/\s+/u); const surname = parts.pop() ?? ""; return `${surname}, ${parts.join(" ")}`; }
function formatChicagoName(name: string) { const value = name.trim(); return value.includes(",") ? value : formatMlaName(value); }

export type TimerState = { phase: "focus" | "short-break" | "long-break"; durationMs: number; remainingMs: number; running: boolean; startedAt: number | null };
export function createTimerState(durationMs = 25 * 60_000, phase: TimerState["phase"] = "focus"): TimerState { return { phase, durationMs, remainingMs: durationMs, running: false, startedAt: null }; }
export function timerRemaining(state: TimerState, now: number) { return Math.max(0, state.remainingMs - (state.running && state.startedAt !== null ? now - state.startedAt : 0)); }
export function startTimer(state: TimerState, now: number): TimerState { return state.running ? state : { ...state, running: true, startedAt: now }; }
export function pauseTimer(state: TimerState, now: number): TimerState { return state.running ? { ...state, remainingMs: timerRemaining(state, now), running: false, startedAt: null } : state; }
export function resetTimer(state: TimerState): TimerState { return createTimerState(state.durationMs, state.phase); }

export type Flashcard = { id: string; front: string; back: string };
export function generateFlashcards(notes: string, mode: "pairs" | "lines" | "paragraphs" = "pairs"): Flashcard[] {
  const cards: Flashcard[] = [];
  if (mode === "pairs") for (const line of notes.split(/\r\n|\r|\n/u)) { const pair = line.match(/^\s*(.+?)\s*(?:—|–|::|\s-\s|\|)\s*(.+?)\s*$/u); if (pair) cards.push({ id: cryptoSafeId(cards.length), front: pair[1].trim(), back: pair[2].trim() }); }
  else { const chunks = mode === "lines" ? notes.split(/\r\n|\r|\n/u) : notes.split(/\n\s*\n+/u); for (const chunk of chunks) { const value = chunk.trim(); if (!value) continue; const sentence = value.split(/(?<=[.!?])\s+/u); cards.push({ id: cryptoSafeId(cards.length), front: sentence.length > 1 ? sentence[0] : `Review: ${value.slice(0, 72)}${value.length > 72 ? "…" : ""}`, back: sentence.length > 1 ? sentence.slice(1).join(" ") : value }); } }
  const seen = new Set<string>();
  return cards.filter((card) => { const key = `${card.front}\0${card.back}`.toLocaleLowerCase(); if (!card.front || !card.back || seen.has(key)) return false; seen.add(key); return true; });
}
function cryptoSafeId(n: number) { return globalThis.crypto?.randomUUID?.() ?? `card-${Date.now()}-${n}`; }
export function importFlashcards(value: string, maxCards = 500): Flashcard[] { const parsed: unknown = JSON.parse(value); if (!Array.isArray(parsed) || parsed.length > maxCards) throw new Error(`Choose a JSON array of up to ${maxCards} cards.`); const ids = new Set<string>(); const pairs = new Set<string>(); const cards: Flashcard[] = []; parsed.forEach((item, index) => { if (!item || typeof item !== "object" || typeof (item as Flashcard).front !== "string" || typeof (item as Flashcard).back !== "string") throw new Error(`Card ${index + 1} needs string front and back fields.`); const front = (item as Flashcard).front.trim(); const back = (item as Flashcard).back.trim(); if (!front || !back) return; const pair = `${front}\0${back}`.toLocaleLowerCase(); if (pairs.has(pair)) return; pairs.add(pair); const requested = typeof (item as Flashcard).id === "string" ? (item as Flashcard).id : `import-${index}`; const id = ids.has(requested) ? `import-${index}` : requested; ids.add(id); cards.push({ id, front, back }); }); return cards; }

export type StudyNote = { id: string; title: string; body: string; tags: string[]; updatedAt: number };
export const NOTES_STORAGE_KEY = "ujjwal-student-notes-v1";
export function validateStudyNotes(value: unknown, maxNotes = 500): StudyNote[] {
  if (!Array.isArray(value) || value.length > maxNotes) throw new Error(`Notes must be a JSON array of up to ${maxNotes} items.`);
  const ids = new Set<string>();
  return value.map((item, index) => { if (!item || typeof item !== "object") throw new Error(`Note ${index + 1} is invalid.`); const note = item as Partial<StudyNote>; if (typeof note.title !== "string" || typeof note.body !== "string" || !Array.isArray(note.tags) || note.tags.some((tag) => typeof tag !== "string")) throw new Error(`Note ${index + 1} must have a title, body, and string tags.`); const id = typeof note.id === "string" && !ids.has(note.id) ? note.id : `note-${index}`; ids.add(id); return { id, title: note.title.slice(0, 200), body: note.body.slice(0, 100_000), tags: note.tags.slice(0, 30).map((tag) => tag.slice(0, 50)), updatedAt: typeof note.updatedAt === "number" && Number.isFinite(note.updatedAt) ? note.updatedAt : 0 }; });
}
export function searchStudyNotes(notes: StudyNote[], query: string) { const q = query.trim().toLocaleLowerCase(); return q ? notes.filter((note) => `${note.title}\n${note.body}\n${note.tags.join(" ")}`.toLocaleLowerCase().includes(q)) : notes; }
